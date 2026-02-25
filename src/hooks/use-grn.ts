// ============================================================================
// GRN REACT HOOKS
// Client-side hooks for GRN operations
// ============================================================================

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

export interface GRNItem {
  drugId: string
  batchNumber: string
  manufacturingDate: string
  expiryDate: string
  orderedQuantity?: number
  receivedQuantity: number
  rejectedQuantity?: number
  unitType: 'bulk' | 'pieces'
  packSize?: number
  unitCost?: number
  inspectionNotes?: string
  hasDamage?: boolean
  damageDescription?: string
}

export interface CreateGRNInput {
  supplierId: string
  purchaseOrderRef?: string
  deliveryNoteRef?: string
  invoiceRef?: string
  receivedDate: string
  vehicleNumber?: string
  driverName?: string
  driverPhone?: string
  deliveryTemperature?: number
  temperatureCompliant?: boolean
  packagingIntact?: boolean
  labelsLegible?: boolean
  documentsComplete?: boolean
  notes?: string
  photoUrls?: string[]
  documentUrls?: string[]
  items: GRNItem[]
}

export interface GRN {
  id: string
  grnNumber: string
  supplierId: string
  supplier: any
  receivedDate: string
  receivedBy: string
  receivingOfficer: any
  status: string
  approvedBy?: string
  approver?: any
  approvedAt?: string
  rejectionReason?: string
  totalItems: number
  totalValue: number
  items: any[]
  batches: any[]
  createdAt: string
  updatedAt: string
}

export interface GRNFilters {
  supplierId?: string
  status?: string
  receivedBy?: string
  grnNumber?: string
  dateFrom?: string
  dateTo?: string
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for creating GRN
 */
export function useCreateGRN() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createGRN = useCallback(async (data: CreateGRNInput) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/grn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create GRN')
      }

      toast.success(`GRN ${result.data.grnNumber} created successfully`)
      return result.data as GRN
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create GRN'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { createGRN, loading, error }
}

/**
 * Hook for fetching GRNs list
 */
export function useGRNs(filters?: GRNFilters, page: number = 1, limit: number = 20) {
  const [grns, setGrns] = useState<GRN[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const fetchGRNs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.supplierId && { supplierId: filters.supplierId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.receivedBy && { receivedBy: filters.receivedBy }),
        ...(filters?.grnNumber && { grnNumber: filters.grnNumber }),
        ...(filters?.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters?.dateTo && { dateTo: filters.dateTo })
      })

      const response = await fetch(`/api/grn?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch GRNs')
      }

      setGrns(result.data)
      setPagination(result.pagination)

      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch GRNs'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [filters, page, limit])

  return { grns, loading, error, pagination, fetchGRNs, refetch: fetchGRNs }
}

/**
 * Hook for fetching single GRN
 */
export function useGRN(id: string | null) {
  const [grn, setGrn] = useState<GRN | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGRN = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/grn/${id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch GRN')
      }

      setGrn(result.data)
      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch GRN'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [id])

  return { grn, loading, error, fetchGRN, refetch: fetchGRN }
}

/**
 * Hook for approving GRN
 */
export function useApproveGRN() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approveGRN = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/grn/${id}/approve`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve GRN')
      }

      toast.success('GRN approved successfully')
      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to approve GRN'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { approveGRN, loading, error }
}

/**
 * Hook for rejecting GRN
 */
export function useRejectGRN() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rejectGRN = useCallback(async (id: string, rejectionReason: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/grn/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejectionReason })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject GRN')
      }

      toast.success('GRN rejected')
      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to reject GRN'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { rejectGRN, loading, error }
}

/**
 * Hook for updating GRN
 */
export function useUpdateGRN() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateGRN = useCallback(async (id: string, data: { notes?: string }) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/grn/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update GRN')
      }

      toast.success('GRN updated successfully')
      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update GRN'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateGRN, loading, error }
}

/**
 * Combined hook for all GRN operations
 */
export function useGRNOperations() {
  const { createGRN, loading: creating, error: createError } = useCreateGRN()
  const { approveGRN, loading: approving, error: approveError } = useApproveGRN()
  const { rejectGRN, loading: rejecting, error: rejectError } = useRejectGRN()
  const { updateGRN, loading: updating, error: updateError } = useUpdateGRN()

  return {
    createGRN,
    approveGRN,
    rejectGRN,
    updateGRN,
    loading: creating || approving || rejecting || updating,
    error: createError || approveError || rejectError || updateError
  }
}