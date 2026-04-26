// types/order.ts
export interface OrderAllocationRequest {
  orderId: string;
  allocatedBy: string;
  strategy?: 'FEFO' | 'FIFO' | 'MANUAL';
  allowCrossStore?: boolean;
  overrideRestrictions?: boolean;
  storeIds?: string[];
}

export interface AllocationResult {
  success: boolean;
  allocations: AllocatedItem[];
  partialAllocations: PartialAllocation[];
  errors: AllocationError[];
  auditId: string;
  async?: boolean;
  message?: string;
}

export interface AllocatedItem {
  orderItemId: string;
  drugId: string;
  drugName: string;
  batchId: string;
  batchNumber: string;
  storeId: string;
  storeName: string;
  allocatedQuantity: number;
  expiryDate: Date;
  status: 'RESERVED' | 'PENDING_PICKING' | 'PICKED';
}

export interface PartialAllocation {
  orderItemId: string;
  drugId: string;
  drugName?: string;
  requestedQuantity: number;
  allocatedQuantity: number;
  reason: string;
}

export interface AllocationError {
  orderItemId: string;
  error: string;
  severity: 'warning' | 'error';
}

export interface BatchSelection {
  batchId: string;
  storeId: string;
  drugId: string;
  batchNumber: string;
  allocatedQuantity: number;
  expiryDate: Date;
  originalQuantity: number;
}

export interface InventoryBatch {
  id: string;
  batchId: string;
  batchNumber: string;
  drugId: string;
  storeId: string;
  storeName: string;
  availableQuantity: number;
  expiryDate: Date;
  manufacturingDate: Date;
  receivedDate: Date;
  qualityStatus: string;
  batch: {
    isRecalled: boolean;
    status: string;
  };
}