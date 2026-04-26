// server/repositories/inventory.repository.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { InventoryBatch } from '@/types/order';

export class InventoryRepository {
  static async findAvailableBatchesForAllocation(
    drugId: string,
    storeIds: string[],
    options?: {
      excludeExpired?: boolean;
      excludeRecalled?: boolean;
      minAvailableQuantity?: number;
    }
  ): Promise<InventoryBatch[]> {
    const where: any = {
      drugId,
      storeId: { in: storeIds },
      availableQuantity: { gt: options?.minAvailableQuantity || 0 },
    };
    
    if (options?.excludeExpired !== false) {
      where.isExpired = false;
    }
    
    if (options?.excludeRecalled !== false) {
      where.batch = {
        isRecalled: false,
        status: 'active',
      };
    }
    
    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        batch: {
          include: {
            drug: true,
            supplier: true,
          },
        },
        store: true,
      },
      orderBy: {
        expiryDate: 'asc', // FEFO
      },
    });
    
    return inventory.map(inv => ({
      id: inv.id,
      batchId: inv.batchId,
      batchNumber: inv.batch.batchNumber,
      drugId: inv.drugId,
      storeId: inv.storeId,
      storeName: inv.store.name,
      availableQuantity: Number(inv.availableQuantity),
      expiryDate: inv.expiryDate,
      manufacturingDate: inv.batch.manufacturingDate,
      receivedDate: inv.batch.receivedDate,
      qualityStatus: inv.batch.qualityStatus,
      batch: {
        isRecalled: inv.batch.isRecalled,
        status: inv.batch.status,
      },
    }));
  }
  
  static async reserveStock(
    inventoryId: string,
    quantity: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    
    const inventory = await client.inventory.findUnique({
      where: { id: inventoryId },
    });
    
    if (!inventory) throw new Error(`Inventory ${inventoryId} not found`);
    if (Number(inventory.availableQuantity) < quantity) {
      throw new Error(`Insufficient stock in inventory ${inventoryId}`);
    }
    
    return client.inventory.update({
      where: { id: inventoryId },
      data: {
        availableQuantity: { decrement: quantity },
        reservedQuantity: { increment: quantity },
        lastMovementDate: new Date(),
        lastMovementType: 'RESERVE',
      },
    });
  }
  
  static async releaseReservedStock(
    inventoryId: string,
    quantity: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    
    return client.inventory.update({
      where: { id: inventoryId },
      data: {
        availableQuantity: { increment: quantity },
        reservedQuantity: { decrement: quantity },
        lastMovementDate: new Date(),
        lastMovementType: 'RELEASE',
      },
    });
  }
}