/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================================
// GRN DETAIL VIEW
// View GRN details and perform approval/rejection
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { useGRN, useApproveGRN, useRejectGRN } from '@/hooks/use-grn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  CheckCircle, 
  XCircle, 
  Package, 
  User, 
  Calendar,
  Truck,
  Thermometer,
  FileText,
  ArrowRight
} from 'lucide-react'
import { format } from 'date-fns'

interface GRNItem {
  id: string
  drug?: {
    genericName: string
    brandName?: string
  }
  batchNumber: string
  expiryDate: string
  receivedQuantity: number
  rejectedQuantity?: number
  acceptedQuantity: number
  unitCost?: number
  totalCost?: number
}

interface GRNDetailViewProps {
  grnId: string
  onApproved?: () => void
}

export default function GRNDetailView({ grnId, onApproved }: GRNDetailViewProps) {
  const { grn, loading, fetchGRN } = useGRN(grnId)
  const { approveGRN, loading: approving } = useApproveGRN()
  const { rejectGRN, loading: rejecting } = useRejectGRN()
  
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchGRN()
  }, [fetchGRN])

  const handleApprove = async () => {
    try {
      await approveGRN(grnId)
      setShowApproveDialog(false)
      fetchGRN()
      onApproved?.()
    } catch (error) {
      console.error('Failed to approve GRN:', error)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return
    }

    try {
      await rejectGRN(grnId, rejectionReason)
      setShowRejectDialog(false)
      setRejectionReason('')
      fetchGRN()
    } catch (error) {
      console.error('Failed to reject GRN:', error)
    }
  }

  if (loading || !grn) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const canApprove = grn.status === 'pending'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-blue-500 font-bold">{grn.grnNumber}</h1>
          <p className="text-muted-foreground text-gray-800">Goods Receipt Note Details</p>
        </div>
        <div className="flex text-blue-400 gap-2">
          {canApprove && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                disabled={rejecting}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => setShowApproveDialog(true)}
                disabled={approving}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <Badge 
          variant="secondary"
          className={
            grn.status === 'approved' 
              ? 'bg-green-500/10 text-green-500' 
              : grn.status === 'rejected'
              ? 'bg-red-500/10 text-red-500'
              : 'bg-yellow-500/10 text-yellow-500'
          }
        >
          {grn.status.toUpperCase()}
        </Badge>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex text-gray-700 items-center gap-2">
              <Package className="w-5 h-5" />
              Supplier Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-600">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{grn.supplier?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="font-medium">{grn.supplier?.code}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex text-gray-700 items-center gap-2">
              <Calendar className="w-5 h-5" />
              Receiving Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-600">
            <div>
              <p className="text-sm text-muted-foreground">Received Date</p>
              <p className="font-medium">
                {format(new Date(grn.receivedDate), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received By</p>
              <p className="font-medium">{grn.receivingOfficer?.name}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Details */}
      {(grn.vehicleNumber || grn.driverName || grn.deliveryTemperature) && (
        <Card>
          <CardHeader>
            <CardTitle className=" text-gray-700 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-gray-600">
              {grn.vehicleNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle Number</p>
                  <p className="font-medium">{grn.vehicleNumber}</p>
                </div>
              )}
              {grn.driverName && (
                <div>
                  <p className="text-sm text-muted-foreground">Driver Name</p>
                  <p className="font-medium">{grn.driverName}</p>
                </div>
              )}
              {grn.driverPhone && (
                <div>
                  <p className="text-sm text-muted-foreground">Driver Phone</p>
                  <p className="font-medium">{grn.driverPhone}</p>
                </div>
              )}
              {grn.deliveryTemperature && (
                <div>
                  <p className="text-sm text-muted-foreground">Temperature</p>
                  <p className="font-medium flex items-center gap-1">
                    <Thermometer className="w-4 h-4" />
                    {grn.deliveryTemperature}°C
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Checks */}
      <Card>
        <CardHeader className='text-gray-700' >
          <CardTitle>Quality Checks</CardTitle>
        </CardHeader>
        <CardContent className='text-gray-600'>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {grn.temperatureCompliant ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm">Temperature Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              {grn.packagingIntact ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm">Packaging Intact</span>
            </div>
            <div className="flex items-center gap-2">
              {grn.labelsLegible ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm">Labels Legible</span>
            </div>
            <div className="flex items-center gap-2">
              {grn.documentsComplete ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm">Documents Complete</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="text-gray-700" >
          <CardTitle>GRN Items ({grn.items?.length || 0})</CardTitle>
          <CardDescription>
            Total Value: ${grn.totalValue?.toLocaleString() || '0'}
          </CardDescription>
        </CardHeader>
        <CardContent className='text-gray-600' >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Rejected</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.items?.map((item: GRNItem) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.drug?.genericName}</p>
                      {item.drug?.brandName && (
                        <p className="text-sm text-muted-foreground">
                          {item.drug.brandName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.batchNumber}</TableCell>
                  <TableCell>
                    {format(new Date(item.expiryDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{item.receivedQuantity}</TableCell>
                  <TableCell>{item.rejectedQuantity || 0}</TableCell>
                  <TableCell className="font-medium">
                    {item.acceptedQuantity}
                  </TableCell>
                  <TableCell>
                    {item.unitCost ? `Ksh ${item.unitCost}` : '-'}
                  </TableCell>
                  <TableCell>
                    {item.totalCost ? `Ksh ${item.totalCost}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval/Rejection Info */}
      {grn.status !== 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-700 ">
              {grn.status === 'approved' ? 'Approval' : 'Rejection'} Information
            </CardTitle>
          </CardHeader>
          <CardContent className=" text-gray-600 space-y-4">
            {grn.approver && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {grn.status === 'approved' ? 'Approved' : 'Rejected'} By
                </p>
                <p className="font-medium">{grn.approver.name}</p>
              </div>
            )}
            {grn.approvedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(grn.approvedAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            )}
            {grn.rejectionReason && (
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="font-medium">{grn.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve GRN?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve the goods receipt and move all items to the receiving zone. 
              The batches will be available for store allocation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approving}>
              {approving ? 'Approving...' : 'Approve GRN'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog  open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className='className="text-red-600"' >
          <DialogHeader>
            <DialogTitle>Reject GRN</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this GRN. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              placeholder="Enter rejection reason (minimum 10 characters)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting || rejectionReason.trim().length < 10}
            >
              {rejecting ? 'Rejecting...' : 'Reject GRN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}