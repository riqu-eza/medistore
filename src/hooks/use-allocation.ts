// ============================================================================
// STORE ALLOCATION REACT HOOKS
// Client-side hooks for allocation operations
// ============================================================================

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

export interface StoreValidation {
  isValid: boolean
  store?: any
  reasons: string[]
}

export interface StoreSuggestion {
  store: any
  score: number
  reasons: string[]
}

export interface PendingAllocation {
  id: string
  drug: any
  batch: any
  store: any
  availableQuantity: number
  suggestedStores: StoreSuggestion[]
}

export interface AllocationInput {
  batchId: string
  targetStoreId: string
  quantity: number
  reason?: string
  notes?: string
}

export interface BulkAllocationInput {
  grnId: string
  allocations: Array<{
    batchId: string
    targetStoreId: string
    quantity: number
  }>
  notes?: string
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for validating store for drug
 */
export function useValidateStore() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateStore = useCallback(async (storeId: string, drugId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/allocation/validate?storeId=${storeId}&drugId=${drugId}`
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to validate store')
      }

      return result.data as StoreValidation
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to validate store'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { validateStore, loading, error }
}

/**
 * Hook for getting store suggestions
 */
export function useStoreSuggestions() {
  const [suggestions, setSuggestions] = useState<StoreSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuggestions = useCallback(async (drugId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/allocation/suggest?drugId=${drugId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch suggestions')
      }

      setSuggestions(result.data)
      return result.data as StoreSuggestion[]
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch suggestions'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { suggestions, fetchSuggestions, loading, error }
}

/**
 * Hook for allocating single batch
 */
export function useAllocateBatch() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allocateBatch = useCallback(async (input: AllocationInput) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/allocation/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to allocate batch')
      }

      toast.success('Batch allocated successfully')
      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to allocate batch'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { allocateBatch, loading, error }
}

/**
 * Hook for bulk allocation
 */
export function useBulkAllocate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bulkAllocate = useCallback(async (input: BulkAllocationInput) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/allocation/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to allocate batches')
      }

      toast.success(result.message || 'Batches allocated successfully')
      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to allocate batches'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { bulkAllocate, loading, error }
}

/**
 * Hook for auto allocation
 */
export function useAutoAllocate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const autoAllocate = useCallback(async (grnId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/allocation/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grnId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to auto-allocate')
      }

      toast.success(result.message || 'Auto-allocation completed')
      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to auto-allocate'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { autoAllocate, loading, error }
}

/**
 * Hook for fetching pending allocations
 */
export function usePendingAllocations() {
  const [allocations, setAllocations] = useState<PendingAllocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingAllocations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/allocation/pending')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch pending allocations')
      }

      setAllocations(result.data)
      return result.data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch pending allocations'
      setError(errorMsg)
      toast.error(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { 
    allocations, 
    fetchPendingAllocations, 
    loading, 
    error,
    refetch: fetchPendingAllocations 
  }
}

/**
 * Combined hook for all allocation operations
 */
export function useAllocationOperations() {
  const { validateStore, loading: validating, error: validateError } = useValidateStore()
  const { fetchSuggestions, loading: suggesting, error: suggestError } = useStoreSuggestions()
  const { allocateBatch, loading: allocating, error: allocateError } = useAllocateBatch()
  const { bulkAllocate, loading: bulkAllocating, error: bulkError } = useBulkAllocate()
  const { autoAllocate, loading: autoAllocating, error: autoError } = useAutoAllocate()

  return {
    validateStore,
    fetchSuggestions,
    allocateBatch,
    bulkAllocate,
    autoAllocate,
    loading: validating || suggesting || allocating || bulkAllocating || autoAllocating,
    error: validateError || suggestError || allocateError || bulkError || autoError
  }
}