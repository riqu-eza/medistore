// server/services/fefo.engine.ts
import { Decimal } from '@prisma/client/runtime/library';
import { InventoryBatch, BatchSelection } from '@/types/order';

export class FEFOEngine {
  /**
   * Industrial-grade FEFO (First Expiry, First Out) algorithm
   */
  static selectBatches(
    batches: InventoryBatch[],
    requestedQuantity: number,
    options?: {
      excludeExpiringWithinDays?: number;
      preferBatchesFrom?: string[];
      blockRecalledBatches?: boolean;
      minRemainingShelfLife?: number;
    }
  ): BatchSelection[] {
    // Filter batches based on industrial criteria
    let eligibleBatches = batches.filter(batch => {
      if (batch.availableQuantity <= 0) return false;
      if (options?.blockRecalledBatches !== false && batch.batch.isRecalled) return false;
      if (batch.qualityStatus !== 'passed') return false;
      
      // Remaining shelf life check
      if (options?.minRemainingShelfLife) {
        const daysToExpiry = Math.ceil(
          (batch.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysToExpiry < options.minRemainingShelfLife) return false;
      }
      
      // Expiry horizon
      if (options?.excludeExpiringWithinDays) {
        const daysToExpiry = Math.ceil(
          (batch.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysToExpiry <= options.excludeExpiringWithinDays) return false;
      }
      
      return true;
    });
    
    // Sort by expiry date (FEFO)
    eligibleBatches.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    
    // If preferred stores, bring them to front
    if (options?.preferBatchesFrom?.length) {
      eligibleBatches.sort((a, b) => {
        const aPreferred = options.preferBatchesFrom!.includes(a.storeId);
        const bPreferred = options.preferBatchesFrom!.includes(b.storeId);
        if (aPreferred && !bPreferred) return -1;
        if (!aPreferred && bPreferred) return 1;
        return a.expiryDate.getTime() - b.expiryDate.getTime();
      });
    }
    
    // Allocate
    const selections: BatchSelection[] = [];
    let remainingToAllocate = requestedQuantity;
    
    for (const batch of eligibleBatches) {
      if (remainingToAllocate <= 0) break;
      
      const allocateQty = Math.min(remainingToAllocate, batch.availableQuantity);
      
      selections.push({
        batchId: batch.batchId,
        storeId: batch.storeId,
        drugId: batch.drugId,
        batchNumber: batch.batchNumber,
        allocatedQuantity: allocateQty,
        expiryDate: batch.expiryDate,
        originalQuantity: batch.availableQuantity,
      });
      
      remainingToAllocate -= allocateQty;
    }
    
    return selections;
  }
  
  /**
   * Enhanced allocation with batch splitting and expiry optimization
   */
  static allocateWithOptimization(
    batches: InventoryBatch[],
    requestedQuantity: number,
    targetExpiryDate?: Date
  ): {
    selections: BatchSelection[];
    optimizationScore: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let optimizedBatches = [...batches];
    
    if (targetExpiryDate) {
      const goodBatches = batches.filter(b => b.expiryDate >= targetExpiryDate);
      const expiringBatches = batches.filter(b => b.expiryDate < targetExpiryDate);
      
      if (goodBatches.length > 0) {
        optimizedBatches = goodBatches;
      } else if (expiringBatches.length > 0) {
        warnings.push(`No batches with expiry after ${targetExpiryDate.toISOString()}. Using expiring batches.`);
        optimizedBatches = expiringBatches;
      }
    }
    
    const selections = this.selectBatches(optimizedBatches, requestedQuantity);
    
    // Calculate optimization score
    const avgDaysToExpiry = selections.reduce((sum, sel) => {
      const days = (sel.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / (selections.length || 1);
    
    const optimizationScore = Math.min(100, (avgDaysToExpiry / 365) * 100);
    
    return { selections, optimizationScore, warnings };
  }
}