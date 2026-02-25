'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon,
  BeakerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'

interface Store {
  id: string
  name: string
  code: string
  storeType: string
  temperatureMin: number | null
  temperatureMax: number | null
  allowsControlled: boolean
  allowedDrugTypes: string[] | null
  isActive: boolean
}

interface Batch {
  id: string
  batchNumber: string
  drugId: string
  drug: {
    id: string
    genericName: string
    brandName: string
    drugCode: string
    storageConditionGroup: string | null
    isControlled: boolean
    requiresColdChain: boolean
  }
  receivedQuantity: number
  availableQuantity: number
  expiryDate: string
  status: string
}

interface Allocation {
  batchId: string
  targetStoreId: string
  quantity: number
  drugId: string
  batchNumber: string
  drugName: string
  storeName?: string
}

interface ValidationResult {
  valid: boolean
  reason?: string
  temperatureCompliant?: boolean
  drugTypeAllowed?: boolean
  controlledAllowed?: boolean
}

export default function AllocatePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState<string | null>(null)

  // Data
  const [grn, setGrn] = useState<any>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({})

  // UI State
  const [activeTab, setActiveTab] = useState<'pending' | 'allocated'>('pending')
  const [autoAllocating, setAutoAllocating] = useState(false)

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    setLoading(true)
    try {
      // Load GRN details
      const grnRes = await fetch(`/api/grn/${params.id}`)
      const grnData = await grnRes.json()
      setGrn(grnData.data)

      // Load pending batches
      const batchesRes = await fetch(`/api/allocation/pending?grnId=${params.id}`)
      const batchesData = await batchesRes.json()
      setBatches(batchesData.data || [])

      // Load available stores
      const storesRes = await fetch('/api/stores?isActive=true')
      const storesData = await storesRes.json()
      setStores(storesData.stores || [])

    } catch (error) {
      console.error('Failed to load data:', error)
      setErrors({ load: 'Failed to load allocation data' })
    } finally {
      setLoading(false)
    }
  }

  const validateAllocation = async (batchId: string, storeId: string) => {
    const batch = batches.find(b => b.id === batchId)
    if (!batch) return

    try {
      const res = await fetch(`/api/allocation/validate?storeId=${storeId}&drugId=${batch.drugId}`)
      const data = await res.json()
      
      setValidationResults(prev => ({
        ...prev,
        [batchId]: data.data
      }))
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const addAllocation = (batch: Batch) => {
    // Check if already allocated
    if (allocations.some(a => a.batchId === batch.id)) {
      setErrors({ allocation: 'This batch already has an allocation' })
      return
    }

    setAllocations(prev => [
      ...prev,
      {
        batchId: batch.id,
        targetStoreId: '',
        quantity: batch.availableQuantity,
        drugId: batch.drugId,
        batchNumber: batch.batchNumber,
        drugName: batch.drug.genericName,
      }
    ])
  }

  const updateAllocation = (batchId: string, field: string, value: any) => {
    setAllocations(prev => 
      prev.map(alloc => {
        if (alloc.batchId === batchId) {
          const updated = { ...alloc, [field]: value }
          
          // Validate when store changes
          if (field === 'targetStoreId' && value) {
            validateAllocation(batchId, value)
          }
          
          return updated
        }
        return alloc
      })
    )
  }

  const removeAllocation = (batchId: string) => {
    setAllocations(prev => prev.filter(a => a.batchId !== batchId))
    setValidationResults(prev => {
      const newResults = { ...prev }
      delete newResults[batchId]
      return newResults
    })
  }

  const handleAutoAllocate = async () => {
    if (!window.confirm('Auto-allocate all batches based on store rules?')) return

    setAutoAllocating(true)
    try {
      const res = await fetch('/api/allocation/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grnId: params.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setSuccess(data.message)
      
      // Reload data to show updated allocations
      setTimeout(() => {
        loadData()
        setAllocations([])
      }, 2000)

    } catch (error: any) {
      setErrors({ auto: error.message })
    } finally {
      setAutoAllocating(false)
    }
  }

  const handleSubmitAllocations = async () => {
    // Validate all allocations have stores
    const invalidAllocations = allocations.filter(a => !a.targetStoreId)
    if (invalidAllocations.length > 0) {
      setErrors({ allocation: 'Please select stores for all allocations' })
      return
    }

    // Check validation results
    for (const alloc of allocations) {
      const validation = validationResults[alloc.batchId]
      if (validation && !validation.valid) {
        setErrors({ allocation: `Invalid allocation for batch ${alloc.batchNumber}: ${validation.reason}` })
        return
      }
    }

    setSaving(true)
    setErrors({})
    setSuccess(null)

    try {
      const res = await fetch('/api/allocation/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grnId: params.id,
          allocations: allocations.map(a => ({
            batchId: a.batchId,
            targetStoreId: a.targetStoreId,
            quantity: a.quantity,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setSuccess(`Successfully allocated ${data.data.totalAllocated} batches`)
      
      // Clear allocations and reload data
      setTimeout(() => {
        loadData()
        setAllocations([])
      }, 2000)

    } catch (error: any) {
      setErrors({ submit: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading allocation data...</p>
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
                href={`/grn/${params.id}`}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Store Allocation</h1>
                <p className="text-sm text-gray-500 mt-1">
                  GRN: {grn?.grnNumber} • Assign batches to stores
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAutoAllocate}
                disabled={autoAllocating || batches.length === 0}
                className="px-4 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {autoAllocating ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <SparklesIcon className="w-4 h-4" />
                )}
                Auto-Allocate
              </button>
              <button
                onClick={handleSubmitAllocations}
                disabled={saving || allocations.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Submit Allocations
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
        
        {errors.load && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{errors.load}</span>
          </div>
        )}
        
        {errors.auto && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{errors.auto}</span>
          </div>
        )}
        
        {errors.submit && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Pending Batches */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Pending Batches</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {batches.length} batch{batches.length !== 1 ? 'es' : ''} awaiting allocation
                </p>
              </div>

              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {batches.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <BuildingStorefrontIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No batches pending allocation</p>
                  </div>
                ) : (
                  batches.map((batch) => {
                    const isAllocated = allocations.some(a => a.batchId === batch.id)
                    
                    return (
                      <div key={batch.id} className={`p-4 hover:bg-gray-50 transition-colors ${isAllocated ? 'bg-purple-50' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{batch.batchNumber}</p>
                            <p className="text-sm text-gray-600">{batch.drug.genericName}</p>
                            <p className="text-xs text-gray-500 mt-1">{batch.drug.drugCode}</p>
                          </div>
                          {isAllocated ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                              Allocated
                            </span>
                          ) : (
                            <button
                              onClick={() => addAllocation(batch)}
                              className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                              Allocate
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                          <div>
                            <span className="text-gray-500">Available:</span>
                            <span className="ml-1 font-medium text-gray-900">{batch.availableQuantity}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Expires:</span>
                            <span className="ml-1 font-medium text-gray-900">
                              {new Date(batch.expiryDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Requirements */}
                        <div className="flex gap-2 mt-2">
                          {batch.drug.isControlled && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1">
                              <ShieldCheckIcon className="w-3 h-3" />
                              Controlled
                            </span>
                          )}
                          {batch.drug.storageConditionGroup === 'cold' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                              <BeakerIcon className="w-3 h-3" />
                              Cold Chain
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Allocations */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Current Allocations</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {allocations.length} batch{allocations.length !== 1 ? 'es' : ''} ready for submission
                  </p>
                </div>
                {errors.allocation && (
                  <p className="text-sm text-red-600">{errors.allocation}</p>
                )}
              </div>

              {allocations.length === 0 ? (
                <div className="p-12 text-center">
                  <TruckIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No allocations yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Select batches from the left to start allocating
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {allocations.map((allocation) => {
                    const validation = validationResults[allocation.batchId]
                    const isValid = validation?.valid !== false
                    
                    return (
                      <div key={allocation.batchId} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{allocation.drugName}</h3>
                            <p className="text-sm text-gray-500">Batch: {allocation.batchNumber}</p>
                          </div>
                          <button
                            onClick={() => removeAllocation(allocation.batchId)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Target Store *
                            </label>
                            <select
                              value={allocation.targetStoreId}
                              onChange={(e) => updateAllocation(allocation.batchId, 'targetStoreId', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="">Select store</option>
                              {stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                  {store.name} ({store.storeType})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              value={allocation.quantity}
                              onChange={(e) => updateAllocation(allocation.batchId, 'quantity', parseFloat(e.target.value))}
                              min="0.01"
                              max={batches.find(b => b.id === allocation.batchId)?.availableQuantity}
                              step="0.01"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* Validation Results */}
                        {validation && (
                          <div className={`mt-4 p-3 rounded-lg ${isValid ? 'bg-green-50' : 'bg-red-50'}`}>
                            {isValid ? (
                              <div className="flex items-center gap-2 text-green-700">
                                <CheckCircleIcon className="w-5 h-5" />
                                <span className="text-sm">Store is valid for this drug</span>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2 text-red-700">
                                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{validation.reason}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Store Details (if selected) */}
                        {allocation.targetStoreId && (
                          <div className="mt-4 text-sm bg-gray-50 p-3 rounded-lg">
                            {(() => {
                              const store = stores.find(s => s.id === allocation.targetStoreId)
                              if (!store) return null
                              
                              return (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-gray-500">Type:</span>
                                    <span className="ml-1 font-medium">{store.storeType}</span>
                                  </div>
                                  {store.temperatureMin && store.temperatureMax && (
                                    <div>
                                      <span className="text-gray-500">Temp Range:</span>
                                      <span className="ml-1 font-medium">
                                        {store.temperatureMin}°C - {store.temperatureMax}°C
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}