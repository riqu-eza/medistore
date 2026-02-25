// ============================================================================
// STORE ALLOCATION WIZARD
// Smart allocation interface with suggestions
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  usePendingAllocations, 
  useStoreSuggestions,
  useAllocateBatch,
  useBulkAllocate,
  useAutoAllocate 
} from '@/hooks/use-allocation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Warehouse,
  Package,
  TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'

interface AllocationWizardProps {
  grnId?: string
  onComplete?: () => void
}

export default function AllocationWizard({ grnId, onComplete }: AllocationWizardProps) {
  const router = useRouter()
  const { allocations, loading, fetchPendingAllocations } = usePendingAllocations()
  const { allocateBatch, loading: allocating } = useAllocateBatch()
  const { bulkAllocate, loading: bulkAllocating } = useBulkAllocate()
  const { autoAllocate, loading: autoAllocating } = useAutoAllocate()

  const [selectedAllocations, setSelectedAllocations] = useState<Map<string, {
    storeId: string
    storeName: string
    quantity: number
  }>>(new Map())
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [activeItem, setActiveItem] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingAllocations()
  }, [fetchPendingAllocations])

  // Filter by GRN if provided
  const filteredAllocations = grnId 
    ? allocations.filter(a => a.batch.grnId === grnId)
    : allocations

  const handleSelectStore = (itemId: string, storeId: string, storeName: string, maxQuantity: number) => {
    const newMap = new Map(selectedAllocations)
    newMap.set(itemId, { storeId, storeName, quantity: maxQuantity })
    setSelectedAllocations(newMap)
    setActiveItem(null)
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const allocation = selectedAllocations.get(itemId)
    if (allocation) {
      const newMap = new Map(selectedAllocations)
      newMap.set(itemId, { ...allocation, quantity })
      setSelectedAllocations(newMap)
    }
  }

  const handleAutoAllocate = async () => {
    if (!grnId) return
    
    try {
      await autoAllocate(grnId)
      fetchPendingAllocations()
      onComplete?.()
    } catch (error) {
      console.error('Auto-allocation failed:', error)
    }
  }

  const handleManualAllocate = async () => {
    if (selectedAllocations.size === 0) return

    const allocationsArray = Array.from(selectedAllocations.entries()).map(([itemId, data]) => {
      const item = filteredAllocations.find(a => a.id === itemId)
      return {
        batchId: item!.batch.id,
        targetStoreId: data.storeId,
        quantity: data.quantity
      }
    })

    try {
      if (grnId) {
        await bulkAllocate({
          grnId,
          allocations: allocationsArray
        })
      } else {
        // Allocate individually
        for (const alloc of allocationsArray) {
          await allocateBatch(alloc)
        }
      }
      
      setSelectedAllocations(new Map())
      fetchPendingAllocations()
      onComplete?.()
    } catch (error) {
      console.error('Manual allocation failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (filteredAllocations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Pending Allocations</h3>
          <p className="text-muted-foreground">
            All items have been allocated to stores
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Store Allocation</h2>
          <p className="text-muted-foreground">
            {filteredAllocations.length} item(s) awaiting allocation
          </p>
        </div>
        {grnId && (
          <Button
            onClick={handleAutoAllocate}
            disabled={autoAllocating}
            variant="outline"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {autoAllocating ? 'Auto-Allocating...' : 'Auto-Allocate All'}
          </Button>
        )}
      </div>

      {/* Allocation List */}
      <div className="space-y-4">
        {filteredAllocations.map((item) => {
          const selection = selectedAllocations.get(item.id)
          const suggestions = item.suggestedStores || []
          const bestSuggestion = suggestions[0]

          return (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {item.drug.genericName}
                      {item.drug.brandName && (
                        <span className="text-muted-foreground font-normal ml-2">
                          ({item.drug.brandName})
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Batch: {item.batch.batchNumber} • 
                      Expiry: {format(new Date(item.batch.expiryDate), 'MMM dd, yyyy')} • 
                      Available: {item.availableQuantity} units
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {item.store.name}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Selection */}
                {selection ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        <span className="font-medium">Allocated to: {selection.storeName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newMap = new Map(selectedAllocations)
                          newMap.delete(item.id)
                          setSelectedAllocations(newMap)
                        }}
                      >
                        Change
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <Label className="text-sm">Quantity:</Label>
                      <Input
                        type="number"
                        min="1"
                        max={item.availableQuantity}
                        value={selection.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value))}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">
                        of {item.availableQuantity}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Recommended Stores
                        </h4>
                        <div className="space-y-2">
                          {suggestions.slice(0, 3).map((suggestion) => (
                            <button
                              key={suggestion.store.id}
                              onClick={() => handleSelectStore(
                                item.id,
                                suggestion.store.id,
                                suggestion.store.name,
                                item.availableQuantity
                              )}
                              className="w-full text-left border rounded-lg p-3 hover:border-primary hover:bg-primary/5 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Warehouse className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {suggestion.store.name}
                                    </span>
                                    <Badge variant="secondary" className="ml-auto">
                                      Score: {suggestion.score}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Type: {suggestion.store.storeType}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {suggestion.reasons.map((reason, idx) => (
                                      <Badge 
                                        key={idx} 
                                        variant="outline" 
                                        className="text-xs"
                                      >
                                        {reason}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestions.length === 0 && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">
                          No suitable stores found. Please check storage requirements.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Action Buttons */}
      {selectedAllocations.size > 0 && (
        <div className="flex justify-between items-center border-t pt-6">
          <p className="text-sm text-muted-foreground">
            {selectedAllocations.size} of {filteredAllocations.length} items allocated
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedAllocations(new Map())}
            >
              Clear All
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={allocating || bulkAllocating}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              {allocating || bulkAllocating ? 'Allocating...' : 'Confirm Allocation'}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Store Allocation</DialogTitle>
            <DialogDescription>
              Review and confirm the allocations below. This will move items from receiving zone to the selected stores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {Array.from(selectedAllocations.entries()).map(([itemId, data]) => {
              const item = filteredAllocations.find(a => a.id === itemId)
              return (
                <div key={itemId} className="flex items-center justify-between text-sm border rounded-lg p-3">
                  <div>
                    <p className="font-medium">{item?.drug.genericName}</p>
                    <p className="text-muted-foreground">
                      Batch: {item?.batch.batchNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{data.storeName}</p>
                    <p className="text-muted-foreground">{data.quantity} units</p>
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowConfirmDialog(false)
                handleManualAllocate()
              }}
              disabled={allocating || bulkAllocating}
            >
              {allocating || bulkAllocating ? 'Allocating...' : 'Confirm & Allocate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}