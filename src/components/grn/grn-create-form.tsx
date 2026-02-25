// ============================================================================
// GRN CREATION FORM
// Multi-step form for creating Goods Receipt Notes
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateGRN, CreateGRNInput, GRNItem } from '@/hooks/use-grn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Package, Truck, ClipboardCheck, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface GRNCreateFormProps {
  suppliers: Array<{ id: string; name: string; code: string }>
  drugs: Array<{ id: string; genericName: string; brandName?: string; drugCode: string }>
}

export default function GRNCreateForm({ suppliers, drugs }: GRNCreateFormProps) {
  const router = useRouter()
  const { createGRN, loading } = useCreateGRN()
  const [step, setStep] = useState(1)

  // Form state
  const [supplierId, setSupplierId] = useState('')
  const [receivedDate, setReceivedDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [purchaseOrderRef, setPurchaseOrderRef] = useState('')
  const [deliveryNoteRef, setDeliveryNoteRef] = useState('')
  const [invoiceRef, setInvoiceRef] = useState('')
  
  // Delivery details
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [deliveryTemperature, setDeliveryTemperature] = useState('')
  
  // Quality checks
  const [temperatureCompliant, setTemperatureCompliant] = useState(true)
  const [packagingIntact, setPackagingIntact] = useState(true)
  const [labelsLegible, setLabelsLegible] = useState(true)
  const [documentsComplete, setDocumentsComplete] = useState(true)
  
  // Items
  const [items, setItems] = useState<Partial<GRNItem>[]>([{
    drugId: '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    receivedQuantity: 0,
    rejectedQuantity: 0,
    unitType: 'bulk',
    packSize: 100,
    unitCost: 0
  }])
  
  const [notes, setNotes] = useState('')

  const addItem = () => {
    setItems([...items, {
      drugId: '',
      batchNumber: '',
      manufacturingDate: '',
      expiryDate: '',
      receivedQuantity: 0,
      rejectedQuantity: 0,
      unitType: 'bulk',
      packSize: 100,
      unitCost: 0
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof GRNItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async () => {
    try {
      const data: CreateGRNInput = {
        supplierId,
        receivedDate,
        purchaseOrderRef: purchaseOrderRef || undefined,
        deliveryNoteRef: deliveryNoteRef || undefined,
        invoiceRef: invoiceRef || undefined,
        vehicleNumber: vehicleNumber || undefined,
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
        deliveryTemperature: deliveryTemperature ? parseFloat(deliveryTemperature) : undefined,
        temperatureCompliant,
        packagingIntact,
        labelsLegible,
        documentsComplete,
        notes: notes || undefined,
        items: items as GRNItem[]
      }

      const grn = await createGRN(data)
      router.push(`/grn/${grn.id}`)
    } catch (error) {
      console.error('Failed to create GRN:', error)
    }
  }

  const canProceed = () => {
    if (step === 1) {
      return supplierId && receivedDate
    }
    if (step === 2) {
      return true // Optional fields
    }
    if (step === 3) {
      return items.every(item => 
        item.drugId && 
        item.batchNumber && 
        item.manufacturingDate && 
        item.expiryDate && 
        item.receivedQuantity && 
        item.receivedQuantity > 0
      )
    }
    return true
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, title: 'Basic Info', icon: FileText },
          { num: 2, title: 'Delivery Details', icon: Truck },
          { num: 3, title: 'Items', icon: Package },
          { num: 4, title: 'Review', icon: ClipboardCheck }
        ].map(({ num, title, icon: Icon }) => (
          <div key={num} className="flex items-center">
            <div className={`flex items-center gap-2 ${step >= num ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= num ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'
              }`}>
                {step > num ? '✓' : <Icon className="w-5 h-5" />}
              </div>
              <span className="font-medium hidden sm:inline">{title}</span>
            </div>
            {num < 4 && (
              <div className={`w-12 sm:w-24 h-0.5 mx-2 ${step > num ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the basic details of the goods receipt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivedDate">Received Date *</Label>
                <Input
                  id="receivedDate"
                  type="datetime-local"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poRef">Purchase Order Reference</Label>
                <Input
                  id="poRef"
                  value={purchaseOrderRef}
                  onChange={(e) => setPurchaseOrderRef(e.target.value)}
                  placeholder="PO-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryRef">Delivery Note Reference</Label>
                <Input
                  id="deliveryRef"
                  value={deliveryNoteRef}
                  onChange={(e) => setDeliveryNoteRef(e.target.value)}
                  placeholder="DN-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceRef">Invoice Reference</Label>
                <Input
                  id="invoiceRef"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder="INV-2024-001"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Delivery Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
            <CardDescription>Record delivery and quality check information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="KAA 123X"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverPhone">Driver Phone</Label>
                <Input
                  id="driverPhone"
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+254700000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Delivery Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={deliveryTemperature}
                onChange={(e) => setDeliveryTemperature(e.target.value)}
                placeholder="25.5"
              />
            </div>

            <div className="space-y-4">
              <Label>Quality Checks</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tempCompliant"
                    checked={temperatureCompliant}
                    onCheckedChange={(checked) => setTemperatureCompliant(checked as boolean)}
                  />
                  <label htmlFor="tempCompliant" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Temperature compliant
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="packagingIntact"
                    checked={packagingIntact}
                    onCheckedChange={(checked) => setPackagingIntact(checked as boolean)}
                  />
                  <label htmlFor="packagingIntact" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Packaging intact
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="labelsLegible"
                    checked={labelsLegible}
                    onCheckedChange={(checked) => setLabelsLegible(checked as boolean)}
                  />
                  <label htmlFor="labelsLegible" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Labels legible
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="documentsComplete"
                    checked={documentsComplete}
                    onCheckedChange={(checked) => setDocumentsComplete(checked as boolean)}
                  />
                  <label htmlFor="documentsComplete" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Documents complete
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Items */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>GRN Items</CardTitle>
                <CardDescription>Add all received items with batch details</CardDescription>
              </div>
              <Button onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Drug *</Label>
                    <Select
                      value={item.drugId}
                      onValueChange={(value) => updateItem(index, 'drugId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select drug" />
                      </SelectTrigger>
                      <SelectContent>
                        {drugs.map(drug => (
                          <SelectItem key={drug.id} value={drug.id}>
                            {drug.genericName} {drug.brandName && `(${drug.brandName})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Batch Number *</Label>
                    <Input
                      value={item.batchNumber}
                      onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                      placeholder="BATCH-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Manufacturing Date *</Label>
                    <Input
                      type="date"
                      value={item.manufacturingDate}
                      onChange={(e) => updateItem(index, 'manufacturingDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiry Date *</Label>
                    <Input
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Received Quantity *</Label>
                    <Input
                      type="number"
                      value={item.receivedQuantity}
                      onChange={(e) => updateItem(index, 'receivedQuantity', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rejected Quantity</Label>
                    <Input
                      type="number"
                      value={item.rejectedQuantity}
                      onChange={(e) => updateItem(index, 'rejectedQuantity', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit Type *</Label>
                    <Select
                      value={item.unitType}
                      onValueChange={(value: 'bulk' | 'pieces') => updateItem(index, 'unitType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bulk">Bulk</SelectItem>
                        <SelectItem value="pieces">Pieces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {item.unitType === 'bulk' && (
                    <div className="space-y-2">
                      <Label>Pack Size</Label>
                      <Input
                        type="number"
                        value={item.packSize}
                        onChange={(e) => updateItem(index, 'packSize', parseInt(e.target.value))}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>Review all details before creating the GRN</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Supplier</h4>
              <p className="text-sm text-muted-foreground">
                {suppliers.find(s => s.id === supplierId)?.name}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Items Summary</h4>
              <p className="text-sm text-muted-foreground">
                {items.length} item(s) • Total Quantity: {items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
            >
              {loading ? 'Creating...' : 'Create GRN'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}