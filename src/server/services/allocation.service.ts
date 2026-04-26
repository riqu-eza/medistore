/* eslint-disable @typescript-eslint/no-explicit-any */
// server/services/allocation.service.ts
import { prisma } from '@/lib/prisma';
import { FEFOEngine } from './fefo.engine';
import { OrderRepository } from '../repositories/order.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { AllocationResult, AllocatedItem, PartialAllocation } from '@/types/order';

export interface AllocationContext {
  orderId: string;
  allocatedBy: string;
  storeIds: string[];
  strategy?: 'FEFO' | 'FIFO' | 'MANUAL';
  allowCrossStore: boolean;
  overrideRestrictions: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface AllocationDecisionLog {
  timestamp: Date;
  step: string;
  decision: string;
  reason: string;
  data?: any;
  severity: 'info' | 'warning' | 'error';
}

export interface AllocationDebugInfo {
  logs: AllocationDecisionLog[];
  itemDecisions: Map<string, AllocationDecisionLog[]>;
  summary: {
    totalItemsProcessed: number;
    fullyAllocatedItems: number;
    partiallyAllocatedItems: number;
    failedItems: number;
    totalAllocatedQuantity: number;
    totalRequestedQuantity: number;
  };
}

export class AllocationService {
  private static debugInfo: AllocationDebugInfo = {
    logs: [],
    itemDecisions: new Map(),
    summary: {
      totalItemsProcessed: 0,
      fullyAllocatedItems: 0,
      partiallyAllocatedItems: 0,
      failedItems: 0,
      totalAllocatedQuantity: 0,
      totalRequestedQuantity: 0,
    },
  };

  private static addLog(
    step: string,
    decision: string,
    reason: string,
    severity: 'info' | 'warning' | 'error' = 'info',
    data?: any
  ) {
    const log: AllocationDecisionLog = {
      timestamp: new Date(),
      step,
      decision,
      reason,
      severity,
      data,
    };
    this.debugInfo.logs.push(log);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ALLOCATION:${step}] ${decision} - ${reason}`);
      if (data) console.debug('Data:', data);
    }
    
    return log;
  }

  private static addItemLog(
    orderItemId: string,
    step: string,
    decision: string,
    reason: string,
    severity: 'info' | 'warning' | 'error' = 'info',
    data?: any
  ) {
    const log: AllocationDecisionLog = {
      timestamp: new Date(),
      step,
      decision,
      reason,
      severity,
      data,
    };
    
    if (!this.debugInfo.itemDecisions.has(orderItemId)) {
      this.debugInfo.itemDecisions.set(orderItemId, []);
    }
    this.debugInfo.itemDecisions.get(orderItemId)!.push(log);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ALLOCATION:${orderItemId}:${step}] ${decision} - ${reason}`);
    }
    
    return log;
  }

  static clearDebugInfo() {
    this.debugInfo = {
      logs: [],
      itemDecisions: new Map(),
      summary: {
        totalItemsProcessed: 0,
        fullyAllocatedItems: 0,
        partiallyAllocatedItems: 0,
        failedItems: 0,
        totalAllocatedQuantity: 0,
        totalRequestedQuantity: 0,
      },
    };
  }

  static getDebugInfo(): AllocationDebugInfo {
    return this.debugInfo;
  }

  static async allocateOrder(context: AllocationContext): Promise<AllocationResult> {
    this.clearDebugInfo();
    
    this.addLog(
      'INIT',
      'Allocation Started',
      `Starting allocation for order ${context.orderId} by user ${context.allocatedBy}`,
      'info',
      { context }
    );
    
    try {
      const result = await this.executeAllocation(context);
      
      this.addLog(
        'COMPLETE',
        'Allocation Completed',
        `Successfully completed allocation. Fully allocated: ${this.debugInfo.summary.fullyAllocatedItems}, Partially: ${this.debugInfo.summary.partiallyAllocatedItems}, Failed: ${this.debugInfo.summary.failedItems}`,
        'info',
        { summary: this.debugInfo.summary }
      );
      
      return {
        success: true,
        allocations: result.allocations,
        partialAllocations: result.partialAllocations,
        errors: [],
        auditId: `audit-${Date.now()}`,
        debugInfo: process.env.NODE_ENV === 'development' ? this.debugInfo : undefined,
      };
    } catch (error: any) {
      this.addLog(
        'ERROR',
        'Allocation Failed',
        error.message,
        'error',
        { stack: error.stack }
      );
      
      return {
        success: false,
        allocations: [],
        partialAllocations: [],
        errors: [{ orderItemId: 'all', error: error.message, severity: 'error' }],
        auditId: `audit-${Date.now()}`,
        debugInfo: process.env.NODE_ENV === 'development' ? this.debugInfo : undefined,
      };
    }
  }
  
  private static async executeAllocation(
    context: AllocationContext
  ): Promise<{
    allocations: AllocatedItem[];
    partialAllocations: PartialAllocation[];
    orderStatus: string;
  }> {
    
    this.addLog(
      'TRANSACTION_START',
      'Database Transaction Started',
      'Starting Prisma transaction for allocation',
      'info'
    );
    
    return await prisma.$transaction(async (tx) => {
      // 1. Get order with lock
      this.addLog('FETCH_ORDER', 'Fetching Order', `Fetching order ${context.orderId} with lock`);
      
      const order = await OrderRepository.getOrderForAllocation(context.orderId, tx);
      
      this.addLog(
        'ORDER_DETAILS',
        'Order Retrieved',
        `Order ${order.orderNumber} has ${order.items.length} items, status: ${order.status}`,
        'info',
        {
          orderNumber: order.orderNumber,
          itemCount: order.items.length,
          currentStatus: order.status,
        }
      );
      
      // Validate order can be allocated
      const allocatableStatuses = ['approved', 'pending_approval', 'partially_allocated'];
      if (!allocatableStatuses.includes(order.status)) {
        const errorMsg = `Order status ${order.status} cannot be allocated. Valid statuses: ${allocatableStatuses.join(', ')}`;
        this.addLog('VALIDATION', 'Invalid Order Status', errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      // 2. Determine stores to allocate from
      let storeIds = context.storeIds;
      const originalStoreCount = storeIds.length;
      
      if (!context.allowCrossStore && storeIds.length > 1) {
        storeIds = [storeIds[0]];
        this.addLog(
          'STORE_FILTER',
          'Cross-Store Allocation Disabled',
          `User does not have cross-store permission. Limiting from ${originalStoreCount} stores to just ${storeIds[0]}`,
          'warning',
          { originalStores: context.storeIds, allowedStores: storeIds }
        );
      } else {
        this.addLog(
          'STORE_FILTER',
          'Stores Selected',
          `Allocating from ${storeIds.length} store(s): ${storeIds.join(', ')}`,
          'info',
          { storeIds, allowCrossStore: context.allowCrossStore }
        );
      }
      
      const allocations: AllocatedItem[] = [];
      const partialAllocations: PartialAllocation[] = [];
      
      this.debugInfo.summary.totalItemsProcessed = order.items.length;
      this.debugInfo.summary.totalRequestedQuantity = order.items.reduce(
        (sum, item) => sum + Number(item.requestedQuantity), 0
      );
      
      // 3. Allocate each item
      for (let idx = 0; idx < order.items.length; idx++) {
        const item = order.items[idx];
        const currentAllocated = Number(item.allocatedQuantity);
        const requested = Number(item.requestedQuantity);
        const remainingNeeded = requested - currentAllocated;
        
        this.addItemLog(
          item.id,
          'ITEM_START',
          `Processing Item ${idx + 1}/${order.items.length}`,
          `Drug: ${item.drug.genericName}, Requested: ${requested}, Already Allocated: ${currentAllocated}, Remaining: ${remainingNeeded}`,
          'info',
          {
            drugId: item.drugId,
            drugName: item.drug.genericName,
            requested,
            currentAllocated,
            remainingNeeded,
          }
        );
        
        if (remainingNeeded <= 0) {
          this.addItemLog(
            item.id,
            'ITEM_SKIPPED',
            'Item Already Fully Allocated',
            `No additional allocation needed. Requested: ${requested}, Already allocated: ${currentAllocated}`,
            'info'
          );
          
          allocations.push({
            orderItemId: item.id,
            drugId: item.drugId,
            drugName: item.drug.genericName,
            batchId: '',
            batchNumber: '',
            storeId: '',
            storeName: '',
            allocatedQuantity: 0,
            expiryDate: new Date(),
            status: 'RESERVED',
          });
          
          this.debugInfo.summary.fullyAllocatedItems++;
          continue;
        }
        
        // Get available batches
        this.addItemLog(
          item.id,
          'FETCH_BATCHES',
          'Searching for Available Batches',
          `Looking for batches of drug ${item.drug.genericName} in stores: ${storeIds.join(', ')}`,
          'info'
        );
        
        const availableBatches = await InventoryRepository.findAvailableBatchesForAllocation(
          item.drugId,
          storeIds
        );
        
        this.addItemLog(
          item.id,
          'BATCHES_FOUND',
          availableBatches.length > 0 ? 'Batches Available' : 'No Batches Found',
          `Found ${availableBatches.length} batch(es) with total available quantity: ${availableBatches.reduce((sum, b) => sum + b.availableQuantity, 0)}`,
          availableBatches.length === 0 ? 'warning' : 'info',
          {
            batchCount: availableBatches.length,
            totalAvailable: availableBatches.reduce((sum, b) => sum + b.availableQuantity, 0),
            batches: availableBatches.map(b => ({
              batchNumber: b.batchNumber,
              store: b.storeName,
              available: b.availableQuantity,
              expiryDate: b.expiryDate,
              qualityStatus: b.qualityStatus,
            })),
          }
        );
        
        if (availableBatches.length === 0) {
          const reason = `No available batches found for drug ${item.drug.genericName} in stores ${storeIds.join(', ')}`;
          this.addItemLog(
            item.id,
            'ALLOCATION_FAILED',
            'No Batches Available',
            reason,
            'error'
          );
          
          partialAllocations.push({
            orderItemId: item.id,
            drugId: item.drugId,
            drugName: item.drug.genericName,
            requestedQuantity: remainingNeeded,
            allocatedQuantity: 0,
            reason,
          });
          
          this.debugInfo.summary.failedItems++;
          continue;
        }
        
        // Apply FEFO strategy
        this.addItemLog(
          item.id,
          'APPLY_STRATEGY',
          `Applying ${context.strategy || 'FEFO'} Strategy`,
          `Using ${context.strategy || 'FEFO'} (First Expiry, First Out) to select best batches`,
          'info'
        );
        
        const { selections, optimizationScore, warnings } = FEFOEngine.allocateWithOptimization(
          availableBatches,
          remainingNeeded
        );
        
        if (warnings.length > 0) {
          warnings.forEach(warning => {
            this.addItemLog(
              item.id,
              'STRATEGY_WARNING',
              'Optimization Warning',
              warning,
              'warning'
            );
          });
        }
        
        this.addItemLog(
          item.id,
          'SELECTIONS_MADE',
          `Selected ${selections.length} batch(es) for allocation`,
          `Optimization score: ${optimizationScore.toFixed(2)}%, Total selected: ${selections.reduce((sum, s) => sum + s.allocatedQuantity, 0)} of ${remainingNeeded} needed`,
          'info',
          {
            selectionsCount: selections.length,
            optimizationScore,
            selections: selections.map(s => ({
              batchNumber: s.batchNumber,
              allocatedQuantity: s.allocatedQuantity,
              expiryDate: s.expiryDate,
            })),
          }
        );
        
        if (selections.length === 0) {
          const reason = `Insufficient stock across all stores. Needed: ${remainingNeeded}, Available: ${availableBatches.reduce((sum, b) => sum + b.availableQuantity, 0)}`;
          this.addItemLog(
            item.id,
            'ALLOCATION_FAILED',
            'Insufficient Stock',
            reason,
            'error',
            { needed: remainingNeeded, available: availableBatches.reduce((sum, b) => sum + b.availableQuantity, 0) }
          );
          
          partialAllocations.push({
            orderItemId: item.id,
            drugId: item.drugId,
            drugName: item.drug.genericName,
            requestedQuantity: remainingNeeded,
            allocatedQuantity: 0,
            reason,
          });
          
          this.debugInfo.summary.failedItems++;
          continue;
        }
        
        // Create allocations and reserve stock
        let totalAllocated = 0;
        
        for (const selection of selections) {
          this.addItemLog(
            item.id,
            'PROCESS_BATCH',
            `Processing Batch ${selection.batchNumber}`,
            `Attempting to allocate ${selection.allocatedQuantity} units from batch ${selection.batchNumber} in store ${selection.storeId}`,
            'info',
            selection
          );
          
          // Get inventory record for this batch
          const inventory = await tx.inventory.findFirst({
            where: {
              drugId: item.drugId,
              batchId: selection.batchId,
              storeId: selection.storeId,
            },
          });
          
          if (!inventory) {
            const errorMsg = `Inventory not found for batch ${selection.batchId}`;
            this.addItemLog(
              item.id,
              'INVENTORY_MISSING',
              'Inventory Record Not Found',
              errorMsg,
              'error',
              { batchId: selection.batchId }
            );
            console.error(errorMsg);
            continue;
          }
          
          // Check if enough stock
          if (Number(inventory.availableQuantity) < selection.allocatedQuantity) {
            const errorMsg = `Insufficient stock in inventory. Available: ${inventory.availableQuantity}, Requested: ${selection.allocatedQuantity}`;
            this.addItemLog(
              item.id,
              'INSUFFICIENT_STOCK',
              'Not Enough Stock Available',
              errorMsg,
              'error',
              { available: Number(inventory.availableQuantity), requested: selection.allocatedQuantity }
            );
            continue;
          }
          
          // Create allocation record
          const allocation = await tx.orderAllocation.create({
            data: {
              orderId: context.orderId,
              orderItemId: item.id,
              batchId: selection.batchId,
              storeId: selection.storeId,
              allocatedQuantity: selection.allocatedQuantity,
              allocatedBy: context.allocatedBy,
              status: 'reserved',
              allocatedAt: new Date(),
            },
          });
          
          this.addItemLog(
            item.id,
            'ALLOCATION_CREATED',
            `Allocation Record Created`,
            `Created allocation record with ID: ${allocation.id}`,
            'info',
            { allocationId: allocation.id }
          );
          
          // Reserve stock
          await InventoryRepository.reserveStock(inventory.id, selection.allocatedQuantity, tx);
          
          this.addItemLog(
            item.id,
            'STOCK_RESERVED',
            `Stock Reserved`,
            `Reserved ${selection.allocatedQuantity} units from inventory ${inventory.id}. Available went from ${inventory.availableQuantity} to ${Number(inventory.availableQuantity) - selection.allocatedQuantity}`,
            'info',
            {
              inventoryId: inventory.id,
              beforeQuantity: Number(inventory.availableQuantity),
              reservedQuantity: selection.allocatedQuantity,
              afterQuantity: Number(inventory.availableQuantity) - selection.allocatedQuantity,
            }
          );
          
          // Create ledger entry
          await tx.inventoryLedger.create({
            data: {
              drugId: item.drugId,
              batchId: selection.batchId,
              storeId: selection.storeId,
              quantityOut: selection.allocatedQuantity,
              balanceAfter: Number(inventory.availableQuantity) - selection.allocatedQuantity,
              actionType: 'RESERVE',
              performedBy: context.allocatedBy,
              referenceType: 'ORDER',
              referenceId: context.orderId,
              metadata: {
                allocationId: allocation.id,
                optimizationScore,
                strategy: context.strategy || 'FEFO',
                batchNumber: selection.batchNumber,
                expiryDate: selection.expiryDate,
              },
            },
          });
          
          this.addItemLog(
            item.id,
            'LEDGER_ENTRY',
            `Ledger Entry Created`,
            `Created inventory ledger entry for reservation`,
            'info'
          );
          
          totalAllocated += selection.allocatedQuantity;
          
          allocations.push({
            orderItemId: item.id,
            drugId: item.drugId,
            drugName: item.drug.genericName,
            batchId: selection.batchId,
            batchNumber: selection.batchNumber,
            storeId: selection.storeId,
            storeName: availableBatches.find(b => b.batchId === selection.batchId)?.storeName || '',
            allocatedQuantity: selection.allocatedQuantity,
            expiryDate: selection.expiryDate,
            status: 'RESERVED',
          });
        }
        
        // Update order item
        const newAllocatedQuantity = Number(item.allocatedQuantity) + totalAllocated;
        const itemStatus = newAllocatedQuantity >= Number(item.requestedQuantity)
          ? 'allocated'
          : 'partially_allocated';
        
        const newBackorderQuantity = remainingNeeded - totalAllocated;
        
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            allocatedQuantity: newAllocatedQuantity,
            status: itemStatus,
            backorderQuantity: newBackorderQuantity,
          },
        });
        
        this.addItemLog(
          item.id,
          'ORDER_ITEM_UPDATED',
          `Order Item Updated`,
          `Allocated quantity: ${currentAllocated} → ${newAllocatedQuantity} (added ${totalAllocated}). Status: ${itemStatus}. Backorder: ${newBackorderQuantity}`,
          'info',
          {
            beforeAllocated: currentAllocated,
            afterAllocated: newAllocatedQuantity,
            addedQuantity: totalAllocated,
            newStatus: itemStatus,
            backorderQuantity: newBackorderQuantity,
          }
        );
        
        // Track summary
        this.debugInfo.summary.totalAllocatedQuantity += totalAllocated;
        
        if (newAllocatedQuantity >= Number(item.requestedQuantity)) {
          this.debugInfo.summary.fullyAllocatedItems++;
          this.addItemLog(
            item.id,
            'ITEM_FULLY_ALLOCATED',
            'Item Fully Allocated',
            `Successfully allocated all ${item.requestedQuantity} units requested`,
            'info'
          );
        } else if (totalAllocated > 0) {
          this.debugInfo.summary.partiallyAllocatedItems++;
          
          const partialReason = `Partially allocated: ${totalAllocated} of ${remainingNeeded} needed units. Shortfall: ${newBackorderQuantity} units`;
          this.addItemLog(
            item.id,
            'ITEM_PARTIALLY_ALLOCATED',
            'Item Partially Allocated',
            partialReason,
            'warning',
            {
              needed: remainingNeeded,
              allocated: totalAllocated,
              shortfall: newBackorderQuantity,
            }
          );
          
          partialAllocations.push({
            orderItemId: item.id,
            drugId: item.drugId,
            drugName: item.drug.genericName,
            requestedQuantity: remainingNeeded,
            allocatedQuantity: totalAllocated,
            reason: partialReason,
          });
        } else {
          this.debugInfo.summary.failedItems++;
          this.addItemLog(
            item.id,
            'ITEM_FAILED',
            'Allocation Failed',
            `Could not allocate any units for this item`,
            'error'
          );
        }
      }
      
      // 4. Update order status
      const allItems = await tx.orderItem.findMany({
        where: { orderId: context.orderId },
      });
      
      const allFullyAllocated = allItems.every(item =>
        Number(item.allocatedQuantity) >= Number(item.requestedQuantity)
      );
      
      const orderStatus = allFullyAllocated ? 'allocated' : 'partially_allocated';
      
      this.addLog(
        'ORDER_STATUS_UPDATE',
        'Updating Order Status',
        `Setting order status to ${orderStatus}. All items fully allocated: ${allFullyAllocated}`,
        'info',
        {
          previousStatus: order.status,
          newStatus: orderStatus,
          allFullyAllocated,
          itemStatuses: allItems.map(i => ({
            id: i.id,
            requested: Number(i.requestedQuantity),
            allocated: Number(i.allocatedQuantity),
            isFullyAllocated: Number(i.allocatedQuantity) >= Number(i.requestedQuantity),
          })),
        }
      );
      
      await OrderRepository.updateOrderAllocationStatus(context.orderId, orderStatus, tx);
      
      this.addLog(
        'TRANSACTION_COMMIT',
        'Transaction Committed',
        `Successfully committed allocation transaction`,
        'info',
        { summary: this.debugInfo.summary }
      );
      
      return {
        allocations,
        partialAllocations,
        orderStatus,
      };
    });
  }
  
  static async releaseAllocation(
    orderId: string,
    releasedBy: string,
    reason: string
  ): Promise<void> {
    this.addLog(
      'RELEASE_START',
      'Allocation Release Started',
      `Starting release of allocation for order ${orderId} by ${releasedBy}. Reason: ${reason}`,
      'info'
    );
    
    await prisma.$transaction(async (tx) => {
      const allocations = await tx.orderAllocation.findMany({
        where: {
          orderId,
          status: { in: ['reserved', 'picked'] },
        },
      });
      
      this.addLog(
        'RELEASE_FETCH',
        'Found Allocations to Release',
        `Found ${allocations.length} allocation(s) to release`,
        'info',
        { allocationCount: allocations.length }
      );
      
      for (let idx = 0; idx < allocations.length; idx++) {
        const allocation = allocations[idx];
        
        this.addLog(
          'RELEASE_ITEM',
          `Releasing Allocation ${idx + 1}/${allocations.length}`,
          `Processing allocation ${allocation.id} for batch ${allocation.batchId}`,
          'info',
          { allocationId: allocation.id, batchId: allocation.batchId }
        );
        
        // Get inventory record
        const inventory = await tx.inventory.findFirst({
          where: {
            drugId: allocation.drugId,
            batchId: allocation.batchId,
            storeId: allocation.storeId,
          },
        });
        
        if (inventory) {
          const beforeAvailable = Number(inventory.availableQuantity);
          const beforeReserved = Number(inventory.reservedQuantity);
          
          await InventoryRepository.releaseReservedStock(
            inventory.id,
            Number(allocation.allocatedQuantity),
            tx
          );
          
          this.addLog(
            'RELEASE_STOCK',
            `Stock Released`,
            `Released ${allocation.allocatedQuantity} units. Available: ${beforeAvailable} → ${beforeAvailable + Number(allocation.allocatedQuantity)}, Reserved: ${beforeReserved} → ${beforeReserved - Number(allocation.allocatedQuantity)}`,
            'info',
            {
              inventoryId: inventory.id,
              releasedQuantity: Number(allocation.allocatedQuantity),
              beforeAvailable,
              afterAvailable: beforeAvailable + Number(allocation.allocatedQuantity),
              beforeReserved,
              afterReserved: beforeReserved - Number(allocation.allocatedQuantity),
            }
          );
        }
        
        // Update allocation status
        await tx.orderAllocation.update({
          where: { id: allocation.id },
          data: {
            status: 'cancelled',
            releasedAt: new Date(),
            releaseReason: reason,
          },
        });
        
        this.addLog(
          'RELEASE_UPDATE',
          `Allocation Status Updated`,
          `Marked allocation ${allocation.id} as cancelled`,
          'info'
        );
        
        // Audit ledger
        await tx.inventoryLedger.create({
          data: {
            drugId: allocation.drugId,
            batchId: allocation.batchId,
            storeId: allocation.storeId,
            quantityIn: Number(allocation.allocatedQuantity),
            balanceAfter: inventory ? Number(inventory.availableQuantity) + Number(allocation.allocatedQuantity) : 0,
            actionType: 'RELEASE',
            performedBy: releasedBy,
            referenceType: 'ORDER',
            referenceId: orderId,
            notes: `Released due to: ${reason}`,
          },
        });
        
        this.addLog(
          'RELEASE_LEDGER',
          `Ledger Entry Created`,
          `Created release entry in inventory ledger`,
          'info'
        );
      }
      
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason },
      });
      
      this.addLog(
        'RELEASE_COMPLETE',
        'All Release Complete',
        `Successfully released all allocations and cancelled order ${orderId}`,
        'info'
      );
    });
  }
}