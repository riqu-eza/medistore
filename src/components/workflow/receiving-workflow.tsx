// ============================================================================
// COMPLETE RECEIVING WORKFLOW
// End-to-end workflow from GRN creation to store allocation
// ============================================================================

'use client'

import { useState } from 'react'
import GRNDetailView from '@/components/grn/grn-detail-view'
import AllocationWizard from '@/components/allocation/allocation-wizard'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Package, Warehouse } from 'lucide-react'

interface ReceivingWorkflowProps {
  grnId: string
  initialStatus?: string
}

export default function ReceivingWorkflow({ grnId, initialStatus = 'pending' }: ReceivingWorkflowProps) {
  const [status, setStatus] = useState(initialStatus)
  const [activeTab, setActiveTab] = useState<string>(
    initialStatus === 'approved' ? 'allocation' : 'grn'
  )

  const handleGRNApproved = () => {
    setStatus('approved')
    setActiveTab('allocation')
  }

  const handleAllocationComplete = () => {
    // Could redirect or show success message
    console.log('Allocation complete!')
  }

  const isApproved = status === 'approved'

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4">
            {/* Step 1: GRN Review */}
            <div className="flex items-center">
              <div className={`flex items-center gap-2 ${
                status !== 'pending' ? 'text-green-500' : 'text-primary'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  status !== 'pending' 
                    ? 'border-green-500 bg-green-500 text-white' 
                    : 'border-primary bg-primary text-primary-foreground'
                }`}>
                  {status !== 'pending' ? <CheckCircle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium">GRN Review</p>
                  <p className="text-xs text-muted-foreground">Approve goods receipt</p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className={`w-12 h-0.5 ${status === 'approved' ? 'bg-green-500' : 'bg-muted'}`} />

            {/* Step 2: Store Allocation */}
            <div className="flex items-center">
              <div className={`flex items-center gap-2 ${
                isApproved ? 'text-primary' : 'text-muted-foreground'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  isApproved 
                    ? 'border-primary bg-primary text-primary-foreground' 
                    : 'border-muted'
                }`}>
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Store Allocation</p>
                  <p className="text-xs text-muted-foreground">Assign to stores</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grn" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            GRN Details
          </TabsTrigger>
          <TabsTrigger 
            value="allocation" 
            disabled={!isApproved}
            className="flex items-center gap-2"
          >
            <Warehouse className="w-4 h-4" />
            Store Allocation
            {!isApproved && (
              <Badge variant="secondary" className="ml-2">
                Locked
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grn" className="mt-6">
          <GRNDetailView 
            grnId={grnId} 
            onApproved={handleGRNApproved}
          />
        </TabsContent>

        <TabsContent value="allocation" className="mt-6">
          {isApproved ? (
            <AllocationWizard 
              grnId={grnId}
              onComplete={handleAllocationComplete}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Warehouse className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">GRN Not Approved</h3>
                <p className="text-muted-foreground">
                  Please approve the GRN before proceeding to store allocation
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}