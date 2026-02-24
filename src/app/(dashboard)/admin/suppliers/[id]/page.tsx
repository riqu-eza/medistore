// SUPPLIER DETAIL PAGE - View with Tabs
// File: src/app/(dashboard)/suppliers/[id]/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { PERMISSIONS } from '@/lib/auth/permissions'

interface Supplier {
  id: string
  name: string
  code: string
  companyType: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  alternatePhone: string | null
  website: string | null
  address: any
  licenseNumber: string | null
  licenseExpiry: string | null
  taxId: string | null
  bankDetails: any
  status: string
  rating: number | null
  totalOrders: number
  onTimeDeliveryRate: number | null
  qualityScore: number | null
  notes: string | null
  createdAt: string
  supplierDrugs: any[]
  documents: any[]
  grns: any[]
  _count: {
    supplierDrugs: number
    grns: number
    batches: number
    documents: number
  }
}

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission } = useAuth()
  
  const supplierId = params.id as string
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const canUpdate = hasPermission(PERMISSIONS.SUPPLIERS_UPDATE)
  const canApprove = hasPermission(PERMISSIONS.SUPPLIERS_APPROVE)

  useEffect(() => {
    fetchSupplier()
  }, [supplierId])

const id = supplierId
  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`)
      const data = await res.json()

      if (res.ok) {
        setSupplier(data)
      } else {
        alert('Supplier not found')
        router.push('/admin/suppliers')
      }
    } catch (error) {
      console.error('Error fetching supplier:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return

    try {
      const res = await fetch(`/api/suppliers/${supplierId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      })

      if (res.ok) {
        fetchSupplier()
        alert('Status updated successfully')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!supplier) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
            <StatusBadge status={supplier.status} />
          </div>
          <p className="text-sm text-slate-600 mt-1">Code: {supplier.code}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/suppliers"
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Back
          </Link>
          {canUpdate && (
            <Link
              href={`/admin//suppliers/${supplierId}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Drugs" value={supplier._count.supplierDrugs} icon="💊" />
        <StatCard label="Total GRNs" value={supplier._count.grns} icon="📋" />
        <StatCard label="Total Batches" value={supplier._count.batches} icon="📦" />
        <StatCard
          label="Rating"
          value={supplier.rating ? `${supplier.rating.toFixed(1)} ⭐` : 'N/A'}
          icon="⭐"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex gap-8 px-6">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === 'drugs'}
              onClick={() => setActiveTab('drugs')}
              badge={supplier._count.supplierDrugs}
            >
              Drugs
            </TabButton>
            <TabButton
              active={activeTab === 'grns'}
              onClick={() => setActiveTab('grns')}
              badge={supplier.grns.length}
            >
              Recent GRNs
            </TabButton>
            <TabButton
              active={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
              badge={supplier._count.documents}
            >
              Documents
            </TabButton>
            <TabButton
              active={activeTab === 'performance'}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </TabButton>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab supplier={supplier} />}
          {activeTab === 'drugs' && <DrugsTab drugs={supplier.supplierDrugs} />}
          {activeTab === 'grns' && <GRNsTab grns={supplier.grns} />}
          {activeTab === 'documents' && <DocumentsTab documents={supplier.documents} />}
          {activeTab === 'performance' && <PerformanceTab supplier={supplier} />}
        </div>
      </div>

      {/* Actions */}
      {canApprove && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Status Management</h3>
          <div className="flex items-center gap-3">
            {supplier.status !== 'approved' && (
              <button
                onClick={() => handleStatusChange('approved')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve Supplier
              </button>
            )}
            {supplier.status !== 'suspended' && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for suspension:')
                  if (reason) handleStatusChange('suspended', reason)
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Suspend
              </button>
            )}
            {supplier.status !== 'blacklisted' && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for blacklisting:')
                  if (reason) handleStatusChange('blacklisted', reason)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Blacklist
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function OverviewTab({ supplier }: { supplier: Supplier }) {
  return (
    <div className="space-y-6">
      <InfoSection title="Company Information">
        <InfoRow label="Company Type" value={supplier.companyType} capitalize />
        <InfoRow label="Contact Person" value={supplier.contactPerson} />
        <InfoRow label="Email" value={supplier.email} />
        <InfoRow label="Phone" value={supplier.phone} />
        <InfoRow label="Alternate Phone" value={supplier.alternatePhone} />
        <InfoRow label="Website" value={supplier.website} link />
      </InfoSection>

      <InfoSection title="Address">
        {supplier.address && (
          <>
            <InfoRow label="Street" value={supplier.address.street} />
            <InfoRow label="City" value={supplier.address.city} />
            <InfoRow label="State" value={supplier.address.state} />
            <InfoRow label="Country" value={supplier.address.country} />
            <InfoRow label="Postal Code" value={supplier.address.postalCode} />
          </>
        )}
      </InfoSection>

      <InfoSection title="Legal & Regulatory">
        <InfoRow label="License Number" value={supplier.licenseNumber} />
        <InfoRow
          label="License Expiry"
          value={
            supplier.licenseExpiry
              ? new Date(supplier.licenseExpiry).toLocaleDateString()
              : null
          }
        />
        <InfoRow label="Tax ID" value={supplier.taxId} />
      </InfoSection>

      {supplier.bankDetails && (
        <InfoSection title="Banking Information">
          <InfoRow label="Bank Name" value={supplier.bankDetails.bankName} />
          <InfoRow label="Account Name" value={supplier.bankDetails.accountName} />
          <InfoRow label="Account Number" value={supplier.bankDetails.accountNumber} />
          <InfoRow label="SWIFT Code" value={supplier.bankDetails.swiftCode} />
        </InfoSection>
      )}

      {supplier.notes && (
        <InfoSection title="Notes">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{supplier.notes}</p>
        </InfoSection>
      )}
    </div>
  )
}

function DrugsTab({ drugs }: { drugs: any[] }) {
  if (drugs.length === 0) {
    return <EmptyState message="No drugs associated with this supplier yet" />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Drug</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Code</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Unit Cost</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Lead Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {drugs.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{item.drug.genericName}</div>
                {item.drug.brandName && (
                  <div className="text-sm text-slate-500">{item.drug.brandName}</div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{item.drug.drugCode}</td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {item.unitCost ? `$${item.unitCost}` : 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {item.leadTimeDays ? `${item.leadTimeDays} days` : 'N/A'}
              </td>
              <td className="px-4 py-3">
                {item.isPreferred && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                    Preferred
                  </span>
                )}
                {item.isActive ? (
                  <span className="text-green-600 text-sm">●</span>
                ) : (
                  <span className="text-red-600 text-sm">●</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GRNsTab({ grns }: { grns: any[] }) {
  if (grns.length === 0) {
    return <EmptyState message="No GRNs found for this supplier" />
  }

  return (
    <div className="space-y-3">
      {grns.map((grn) => (
        <Link
          key={grn.id}
          href={`/grn/${grn.id}`}
          className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">{grn.grnNumber}</div>
              <div className="text-sm text-slate-500">
                {new Date(grn.receivedDate).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <StatusBadge status={grn.status} />
              {grn.totalValue && (
                <div className="text-sm text-slate-600 mt-1">
                  ${grn.totalValue.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function DocumentsTab({ documents }: { documents: any[] }) {
  if (documents.length === 0) {
    return <EmptyState message="No documents uploaded yet" />
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
        >
          <div>
            <div className="font-medium text-slate-900">{doc.documentName}</div>
            <div className="text-sm text-slate-500 capitalize">{doc.documentType}</div>
            {doc.expiryDate && (
              <div className="text-xs text-slate-500 mt-1">
                Expires: {new Date(doc.expiryDate).toLocaleDateString()}
              </div>
            )}
          </div>
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            View
          </a>
        </div>
      ))}
    </div>
  )
}

function PerformanceTab({ supplier }: { supplier: Supplier }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Overall Rating"
          value={supplier.rating ? `${supplier.rating.toFixed(1)} / 5.0` : 'N/A'}
        />
        <MetricCard
          label="On-Time Delivery"
          value={
            supplier.onTimeDeliveryRate ? `${supplier.onTimeDeliveryRate.toFixed(1)}%` : 'N/A'
          }
        />
        <MetricCard
          label="Quality Score"
          value={supplier.qualityScore ? `${supplier.qualityScore.toFixed(1)} / 5.0` : 'N/A'}
        />
      </div>

      <InfoSection title="Order Statistics">
        <InfoRow label="Total Orders" value={supplier.totalOrders.toString()} />
        <InfoRow label="Total GRNs" value={supplier._count.grns.toString()} />
        <InfoRow label="Total Batches" value={supplier._count.batches.toString()} />
      </InfoSection>
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({ label, value, icon }: { label: string; value: any; icon: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean
  onClick: () => void
  badge?: number
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`py-4 border-b-2 font-medium text-sm transition-colors ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-slate-600 hover:text-slate-900'
      }`}
    >
      <span className="flex items-center gap-2">
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold">
            {badge}
          </span>
        )}
      </span>
    </button>
  )
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  capitalize,
  link,
}: {
  label: string
  value?: string | null
  capitalize?: boolean
  link?: boolean
}) {
  if (!value) return null

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className={`text-sm text-slate-900 ${capitalize ? 'capitalize' : ''}`}>
          {value}
        </span>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    suspended: 'bg-orange-100 text-orange-800',
    blacklisted: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-500">{message}</p>
    </div>
  )
}