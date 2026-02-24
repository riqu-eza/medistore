// ============================================================================
// SUPPLIER FORM - Create/Edit
// File: src/app/(dashboard)/suppliers/create/page.tsx (and [id]/edit/page.tsx)
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface SupplierFormData {
  name: string
  code: string
  companyType: string
  contactPerson: string
  email: string
  phone: string
  alternatePhone: string
  website: string
  address: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  licenseNumber: string
  licenseExpiry: string
  taxId: string
  bankDetails: {
    bankName: string
    accountNumber: string
    accountName: string
    swiftCode: string
  }
  notes: string
}

const initialFormData: SupplierFormData = {
  name: '',
  code: '',
  companyType: '',
  contactPerson: '',
  email: '',
  phone: '',
  alternatePhone: '',
  website: '',
  address: {
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  },
  licenseNumber: '',
  licenseExpiry: '',
  taxId: '',
  bankDetails: {
    bankName: '',
    accountNumber: '',
    accountName: '',
    swiftCode: '',
  },
  notes: '',
}

export default function SupplierForm({ isEdit = false }: { isEdit?: boolean }) {
  const router = useRouter()
  const params = useParams()
  const supplierId = params?.id as string

  const [formData, setFormData] = useState<SupplierFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isEdit && supplierId) {
      fetchSupplier()
    }
  }, [supplierId])

  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}`)
      const supplier = await res.json()

      if (res.ok) {
        setFormData({
          name: supplier.name || '',
          code: supplier.code || '',
          companyType: supplier.companyType || '',
          contactPerson: supplier.contactPerson || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          alternatePhone: supplier.alternatePhone || '',
          website: supplier.website || '',
          address: supplier.address || initialFormData.address,
          licenseNumber: supplier.licenseNumber || '',
          licenseExpiry: supplier.licenseExpiry
            ? new Date(supplier.licenseExpiry).toISOString().split('T')[0]
            : '',
          taxId: supplier.taxId || '',
          bankDetails: supplier.bankDetails || initialFormData.bankDetails,
          notes: supplier.notes || '',
        })
      }
    } catch (error) {
      console.error('Error fetching supplier:', error)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.code.trim()) newErrors.code = 'Code is required'
    if (!formData.companyType) newErrors.companyType = 'Company type is required'
    if (!formData.address.city) newErrors['address.city'] = 'City is required'
    if (!formData.address.country) newErrors['address.country'] = 'Country is required'

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      const url = isEdit ? `/api/admin/suppliers/${supplierId}` : '/api/admin//suppliers'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/admin/suppliers')
        router.refresh()
      } else {
        alert(data.error || 'Failed to save supplier')
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {isEdit ? 'Update supplier information' : 'Register a new supplier'}
          </p>
        </div>
        <Link
          href="/admin/suppliers"
          className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 text-gray-600 md:grid-cols-2 gap-6">
            <FormField
              label="Supplier Name"
              required
              error={errors.name}
            >
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., PharmaCorp Ltd"
              />
            </FormField>

            <FormField
              label="Supplier Code"
              required
              error={errors.code}
            >
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                className="input"
                placeholder="e.g., SUPP-001"
              />
            </FormField>

            <FormField
              label="Company Type"
              required
              error={errors.companyType}
            >
              <select
                value={formData.companyType}
                onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                className="input"
              >
                <option value="">Select type...</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="distributor">Distributor</option>
                <option value="wholesaler">Wholesaler</option>
              </select>
            </FormField>

            <FormField label="Contact Person">
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="input"
                placeholder="Full name"
              />
            </FormField>

            <FormField label="Email" error={errors.email}>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="supplier@example.com"
              />
            </FormField>

            <FormField label="Phone">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+254 567 8900"
              />
            </FormField>

            <FormField label="Alternate Phone">
              <input
                type="tel"
                value={formData.alternatePhone}
                onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                className="input"
                placeholder="+254 567 8901"
              />
            </FormField>

            <FormField label="Website">
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input"
                placeholder="https://example.com"
              />
            </FormField>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 text-gray-600 gap-6">
            <FormField label="Street Address" className="md:col-span-2">
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value },
                  })
                }
                className="input"
                placeholder="123 Main Street"
              />
            </FormField>

            <FormField label="City" required error={errors['address.city']}>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value },
                  })
                }
                className="input"
                placeholder="City"
              />
            </FormField>

            <FormField label="County">
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, state: e.target.value },
                  })
                }
                className="input"
                placeholder="County"
              />
            </FormField>

            <FormField label="Country" required error={errors['address.country']}>
              <input
                type="text"
                value={formData.address.country}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, country: e.target.value },
                  })
                }
                className="input"
                placeholder="Country"
              />
            </FormField>

            <FormField label="Postal Code">
              <input
                type="text"
                value={formData.address.postalCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, postalCode: e.target.value },
                  })
                }
                className="input"
                placeholder="12345"
              />
            </FormField>
          </div>
        </div>

        {/* Legal & Regulatory */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Legal & Regulatory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-600">
            <FormField label="License Number">
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="input"
                placeholder="BN201..."
              />
            </FormField>

            <FormField label="License Expiry">
              <input
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                className="input"
              />
            </FormField>

            <FormField label="Tax ID">
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="input"
                placeholder="P05170..."
              />
            </FormField>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Banking Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 text-gray-600 gap-6">
            <FormField label="Bank Name">
              <input
                type="text"
                value={formData.bankDetails.bankName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, bankName: e.target.value },
                  })
                }
                className="input"
                placeholder="Bank name"
              />
            </FormField>

            <FormField label="Account Name">
              <input
                type="text"
                value={formData.bankDetails.accountName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, accountName: e.target.value },
                  })
                }
                className="input"
                placeholder="Account holder name"
              />
            </FormField>

            <FormField label="Account Number">
              <input
                type="text"
                value={formData.bankDetails.accountNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, accountNumber: e.target.value },
                  })
                }
                className="input"
                placeholder="1234567890"
              />
            </FormField>

            <FormField label="SWIFT Code">
              <input
                type="text"
                value={formData.bankDetails.swiftCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, swiftCode: e.target.value },
                  })
                }
                className="input"
                placeholder="ABCDUS33"
              />
            </FormField>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border text-gray-600 border-slate-200 p-6">
          <FormField label="Notes">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={4}
              placeholder="Additional notes or comments..."
            />
          </FormField>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/suppliers"
            className="px-6 py-2 border border-slate-300 rounded-lg text-red-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Supplier' : 'Create Supplier'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .input {
          @apply w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent;
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// FORM FIELD COMPONENT
// ============================================================================

function FormField({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}