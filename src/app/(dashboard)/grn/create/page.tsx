'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  CameraIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  BeakerIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'

interface Supplier {
  id: string
  name: string
  code: string
}

interface Drug {
  id: string
  drugCode: string
  genericName: string
  brandName: string
  dosageForm: string
  strength: string
  packSize: number
  unitOfMeasure: string
  storageConditionGroup: string | null
  isControlled: boolean
}

interface GRNItem {
  id: string
  drugId: string
  drug?: Drug
  batchNumber: string
  manufacturingDate: string
  expiryDate: string
  orderedQuantity: number
  receivedQuantity: number
  rejectedQuantity: number
  acceptedQuantity: number
  unitType: 'bulk' | 'pieces'
  packSize: number | null
  unitCost: number | null
  totalCost: number | null
  inspectionStatus: 'pending' | 'passed' | 'failed'
  inspectionNotes: string
  hasDamage: boolean
  damageDescription: string
}

export default function CreateGRNPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Data for dropdowns
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Form data
  const [formData, setFormData] = useState({
    supplierId: '',
    purchaseOrderRef: '',
    deliveryNoteRef: '',
    invoiceRef: '',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedTime: new Date().toTimeString().slice(0, 5),
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    deliveryTemperature: '',
    temperatureCompliant: true,
    packagingIntact: true,
    labelsLegible: true,
    documentsComplete: true,
    notes: '',
    items: [] as GRNItem[],
    photoUrls: [] as string[],
    documentUrls: [] as string[],
  })

  // Load initial data
  useEffect(() => {
    loadSuppliers()
    loadDrugs()
  }, [])

  async function loadSuppliers() {
    try {
      const res = await fetch('/api/suppliers?status=approved')
      const data = await res.json()
      setSuppliers(data.data || [])
    } catch (error) {
      console.error('Failed to load suppliers:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function loadDrugs() {
    try {
      const res = await fetch('/api/drugs?status=active')
      const data = await res.json()
      setDrugs(data.data || [])
    } catch (error) {
      console.error('Failed to load drugs:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const addItem = () => {
    const newItem: GRNItem = {
      id: Date.now().toString(),
      drugId: '',
      batchNumber: '',
      manufacturingDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      orderedQuantity: 0,
      receivedQuantity: 0,
      rejectedQuantity: 0,
      acceptedQuantity: 0,
      unitType: 'bulk',
      packSize: null,
      unitCost: null,
      totalCost: null,
      inspectionStatus: 'pending',
      inspectionNotes: '',
      hasDamage: false,
      damageDescription: '',
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }))
  }

  const updateItem = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          
          // Auto-calculate accepted quantity
          if (field === 'receivedQuantity' || field === 'rejectedQuantity') {
            updatedItem.acceptedQuantity = 
              (updatedItem.receivedQuantity || 0) - (updatedItem.rejectedQuantity || 0)
          }
          
          // Auto-calculate total cost
          if (field === 'unitCost' || field === 'acceptedQuantity') {
            updatedItem.totalCost = 
              (updatedItem.unitCost || 0) * (updatedItem.acceptedQuantity || 0)
          }

          // If drug is selected, auto-fill packSize
          if (field === 'drugId') {
            const drug = drugs.find(d => d.id === value)
            if (drug) {
              updatedItem.packSize = drug.packSize
            }
          }

          return updatedItem
        }
        return item
      })
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required'
    }

    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required'
    }

    formData.items.forEach((item, index) => {
      if (!item.drugId) {
        newErrors[`item-${index}-drug`] = 'Drug is required'
      }
      if (!item.batchNumber) {
        newErrors[`item-${index}-batch`] = 'Batch number is required'
      }
      if (!item.expiryDate) {
        newErrors[`item-${index}-expiry`] = 'Expiry date is required'
      }
      if (item.receivedQuantity <= 0) {
        newErrors[`item-${index}-quantity`] = 'Received quantity must be positive'
      }
      
      // Validate expiry date (must be in future)
      const expiryDate = new Date(item.expiryDate)
      const today = new Date()
      if (expiryDate <= today) {
        newErrors[`item-${index}-expiry`] = 'Expiry date must be in the future'
      }
      
      // Check expiry threshold (3 months)
      const threeMonthsFromNow = new Date()
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
      if (expiryDate <= threeMonthsFromNow) {
        newErrors[`item-${index}-expiry-warning`] = 'Warning: Expires within 3 months'
      }
    })

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    setErrors({})

    try {
      const receivedDateTime = new Date(`${formData.receivedDate}T${formData.receivedTime}`)

      const submitData = {
        supplierId: formData.supplierId,
        purchaseOrderRef: formData.purchaseOrderRef || undefined,
        deliveryNoteRef: formData.deliveryNoteRef || undefined,
        invoiceRef: formData.invoiceRef || undefined,
        receivedDate: receivedDateTime.toISOString(),
        vehicleNumber: formData.vehicleNumber || undefined,
        driverName: formData.driverName || undefined,
        driverPhone: formData.driverPhone || undefined,
        deliveryTemperature: formData.deliveryTemperature ? parseFloat(formData.deliveryTemperature) : undefined,
        temperatureCompliant: formData.temperatureCompliant,
        packagingIntact: formData.packagingIntact,
        labelsLegible: formData.labelsLegible,
        documentsComplete: formData.documentsComplete,
        notes: formData.notes || undefined,
        photoUrls: formData.photoUrls,
        documentUrls: formData.documentUrls,
        items: formData.items.map(item => ({
          drugId: item.drugId,
          batchNumber: item.batchNumber,
          manufacturingDate: new Date(item.manufacturingDate).toISOString(),
          expiryDate: new Date(item.expiryDate).toISOString(),
          orderedQuantity: item.orderedQuantity || undefined,
          receivedQuantity: item.receivedQuantity,
          rejectedQuantity: item.rejectedQuantity || 0,
          unitType: item.unitType,
          packSize: item.packSize || undefined,
          unitCost: item.unitCost || undefined,
          inspectionNotes: item.inspectionNotes || undefined,
          hasDamage: item.hasDamage,
          damageDescription: item.damageDescription || undefined,
        })),
      }

      const res = await fetch('/api/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error) {
          setErrors({ form: data.error })
        }
        return
      }

      // Success - redirect to GRN detail
      router.push(`/grn/${data.data.id}`)
      router.refresh()
    } catch (error) {
      setErrors({ form: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading form data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/grn"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Goods Receipt Note</h1>
                <p className="text-sm text-gray-500 mt-1">Record incoming supplier delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/grn"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Create GRN
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {errors.form && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Delivery Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Supplier Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BuildingStorefrontIcon className="w-5 h-5 text-gray-500" />
                Supplier Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.supplierId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code})
                      </option>
                    ))}
                  </select>
                  {errors.supplierId && <p className="mt-1 text-sm text-red-600">{errors.supplierId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Order Reference
                  </label>
                  <input
                    type="text"
                    name="purchaseOrderRef"
                    value={formData.purchaseOrderRef}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="PO-2024-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Note Reference
                  </label>
                  <input
                    type="text"
                    name="deliveryNoteRef"
                    value={formData.deliveryNoteRef}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="DN-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Reference
                  </label>
                  <input
                    type="text"
                    name="invoiceRef"
                    value={formData.invoiceRef}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="INV-2024-001"
                  />
                </div>
              </div>
            </div>

            {/* Receiving Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-gray-500" />
                Receiving Information
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Date *
                    </label>
                    <input
                      type="date"
                      name="receivedDate"
                      value={formData.receivedDate}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Time *
                    </label>
                    <input
                      type="time"
                      name="receivedTime"
                      value={formData.receivedTime}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="ABC-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    name="driverName"
                    value={formData.driverName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Phone
                  </label>
                  <input
                    type="text"
                    name="driverPhone"
                    value={formData.driverPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </div>

            {/* Temperature Check */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BeakerIcon className="w-5 h-5 text-gray-500" />
                Temperature Check
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Temperature (°C)
                  </label>
                  <input
                    type="number"
                    name="deliveryTemperature"
                    value={formData.deliveryTemperature}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., 5.0"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="temperatureCompliant"
                    checked={formData.temperatureCompliant}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Temperature compliant</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="packagingIntact"
                    checked={formData.packagingIntact}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Packaging intact</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="labelsLegible"
                    checked={formData.labelsLegible}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Labels legible</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="documentsComplete"
                    checked={formData.documentsComplete}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Documents complete</span>
                </label>
              </div>
            </div>

            {/* Documents & Photos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DocumentArrowUpIcon className="w-5 h-5 text-gray-500" />
                Documents & Photos
              </h2>
              
              <div className="space-y-4">
                <button
                  type="button"
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <CameraIcon className="w-5 h-5" />
                  Add Photos
                </button>
                
                <button
                  type="button"
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <DocumentArrowUpIcon className="w-5 h-5" />
                  Upload Documents
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Received Items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {errors.items && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {errors.items}
                </div>
              )}

              {formData.items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No items added yet</p>
                  <p className="text-sm text-gray-500 mt-1">Click "Add Item" to start adding received products</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.items.map((item, index) => {
                    const selectedDrug = drugs.find(d => d.id === item.drugId)
                    
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-200 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium text-gray-900">Item {index + 1}</h3>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Drug Selection */}
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Drug *
                            </label>
                            <select
                              value={item.drugId}
                              onChange={(e) => updateItem(item.id, 'drugId', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                errors[`item-${index}-drug`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            >
                              <option value="">Select drug</option>
                              {drugs.map((drug) => (
                                <option key={drug.id} value={drug.id}>
                                  {drug.genericName} - {drug.strength} ({drug.drugCode})
                                </option>
                              ))}
                            </select>
                            {errors[`item-${index}-drug`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`item-${index}-drug`]}</p>
                            )}
                          </div>

                          {/* Batch Information */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Batch Number *
                            </label>
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => updateItem(item.id, 'batchNumber', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                errors[`item-${index}-batch`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                              placeholder="BATCH-001"
                            />
                            {errors[`item-${index}-batch`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`item-${index}-batch`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Manufacturing Date *
                            </label>
                            <input
                              type="date"
                              value={item.manufacturingDate}
                              onChange={(e) => updateItem(item.id, 'manufacturingDate', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Expiry Date *
                            </label>
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                errors[`item-${index}-expiry`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {errors[`item-${index}-expiry`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`item-${index}-expiry`]}</p>
                            )}
                            {errors[`item-${index}-expiry-warning`] && (
                              <p className="mt-1 text-sm text-yellow-600">{errors[`item-${index}-expiry-warning`]}</p>
                            )}
                          </div>

                          {/* Quantities */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ordered Qty
                            </label>
                            <input
                              type="number"
                              value={item.orderedQuantity}
                              onChange={(e) => updateItem(item.id, 'orderedQuantity', parseFloat(e.target.value))}
                              min="0"
                              step="0.01"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Received Qty *
                            </label>
                            <input
                              type="number"
                              value={item.receivedQuantity}
                              onChange={(e) => updateItem(item.id, 'receivedQuantity', parseFloat(e.target.value))}
                              min="0"
                              step="0.01"
                              required
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                errors[`item-${index}-quantity`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                              placeholder="0"
                            />
                            {errors[`item-${index}-quantity`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`item-${index}-quantity`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rejected Qty
                            </label>
                            <input
                              type="number"
                              value={item.rejectedQuantity}
                              onChange={(e) => updateItem(item.id, 'rejectedQuantity', parseFloat(e.target.value))}
                              min="0"
                              step="0.01"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Type
                            </label>
                            <select
                              value={item.unitType}
                              onChange={(e) => updateItem(item.id, 'unitType', e.target.value as 'bulk' | 'pieces')}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="bulk">Bulk</option>
                              <option value="pieces">Pieces</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Pack Size
                            </label>
                            <input
                              type="number"
                              value={item.packSize || ''}
                              onChange={(e) => updateItem(item.id, 'packSize', parseInt(e.target.value))}
                              min="1"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder={selectedDrug?.packSize?.toString() || 'Pack size'}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Cost
                            </label>
                            <input
                              type="number"
                              value={item.unitCost || ''}
                              onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value))}
                              min="0"
                              step="0.01"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total Cost
                            </label>
                            <input
                              type="number"
                              value={item.totalCost || ''}
                              readOnly
                              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Damage Check */}
                          <div className="md:col-span-2">
                            <label className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={item.hasDamage}
                                onChange={(e) => updateItem(item.id, 'hasDamage', e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-700">Has damage</span>
                            </label>
                            
                            {item.hasDamage && (
                              <input
                                type="text"
                                value={item.damageDescription}
                                onChange={(e) => updateItem(item.id, 'damageDescription', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Describe the damage"
                              />
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Inspection Notes
                            </label>
                            <textarea
                              value={item.inspectionNotes}
                              onChange={(e) => updateItem(item.id, 'inspectionNotes', e.target.value)}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Any observations during inspection..."
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Summary */}
              {formData.items.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Total Items</p>
                      <p className="text-lg font-semibold text-gray-900">{formData.items.length}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Total Received</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formData.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Total Rejected</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formData.items.reduce((sum, item) => sum + (item.rejectedQuantity || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Total Accepted</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formData.items.reduce((sum, item) => sum + (item.acceptedQuantity || 0), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Any additional information about this delivery..."
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}