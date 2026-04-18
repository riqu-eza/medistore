/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// STORE ALLOCATION SERVICE
// Handles: Sorting & Store Allocation after GRN approval
// ============================================================================

import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Session } from "next-auth";
import { Prisma } from "@prisma/client";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface StoreAllocationInput {
  batchId: string;
  targetStoreId: string;
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface BulkStoreAllocationInput {
  grnId: string;
  allocations: Array<{
    batchId: string;
    targetStoreId: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface StoreValidationResult {
  isValid: boolean;
  store?: any;
  reasons: string[];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate if store can accept drug based on storage conditions
 */
export async function validateStoreForDrug(
  storeId: string,
  drugId: string,
): Promise<StoreValidationResult> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return {
      isValid: false,
      reasons: ["Store not found"],
    };
  }

  if (!store.isActive) {
    return {
      isValid: false,
      store,
      reasons: ["Store is not active"],
    };
  }

  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
    include: {
      category: true,
    },
  });

  if (!drug) {
    return {
      isValid: false,
      store,
      reasons: ["Drug not found"],
    };
  }

  const reasons: string[] = [];

  // Check if store allows controlled substances
  if (drug.isControlled && !store.allowsControlled) {
    reasons.push("Store does not allow controlled substances");
  }

  // Check storage conditions match
  if (drug.storageConditionGroup) {
    const storeType = store.storeType;

    // Temperature-controlled drugs
    if (drug.storageConditionGroup === "cold" && storeType !== "cold") {
      reasons.push("Drug requires cold storage but store is not cold storage");
    }

    // Controlled substance storage
    if (
      drug.storageConditionGroup === "controlled" &&
      storeType !== "controlled"
    ) {
      reasons.push("Drug requires controlled storage area");
    }
  }

  // Check temperature requirements if specified
  const storageReqs = drug.storageRequirements as any;
  if (storageReqs?.temp_min !== undefined && store.temperatureMax) {
    if (storageReqs.temp_min > store.temperatureMax.toNumber()) {
      reasons.push(
        `Drug minimum temperature (${storageReqs.temp_min}°C) exceeds store maximum (${store.temperatureMax}°C)`,
      );
    }
  }

  if (storageReqs?.temp_max !== undefined && store.temperatureMin) {
    if (storageReqs.temp_max < store.temperatureMin.toNumber()) {
      reasons.push(
        `Drug maximum temperature (${storageReqs.temp_max}°C) is below store minimum (${store.temperatureMin}°C)`,
      );
    }
  }

  // Check allowed drug types if specified
  if (store.allowedDrugTypes && Array.isArray(store.allowedDrugTypes)) {
    const allowedTypes = store.allowedDrugTypes as string[];
    if (allowedTypes.length > 0) {
      const drugCategory = drug.category.name;
      if (!allowedTypes.includes(drugCategory)) {
        reasons.push(`Store does not accept drug category: ${drugCategory}`);
      }
    }
  }

  // Check capacity utilization
  if (store.currentUtilization && store.currentUtilization.toNumber() >= 95) {
    reasons.push("Store is at capacity (>95% utilization)");
  }

  return {
    isValid: reasons.length === 0,
    store,
    reasons,
  };
}

/**
 * Suggest best store for a drug based on rules
 */
export async function suggestStoreForDrug(
  drugId: string,
): Promise<Array<{ store: any; score: number; reasons: string[] }>> {
  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
    include: {
      category: true,
    },
  });

  if (!drug) {
    throw new Error("Drug not found");
  }

  // Get all active stores (exclude receiving zone)
  const stores = await prisma.store.findMany({
    where: {
      isActive: true,
      isReceivingZone: false,
    },
  });

  // Score each store
  const scored = await Promise.all(
    stores.map(async (store) => {
      const validation = await validateStoreForDrug(store.id, drugId);

      let score = 0;
      const reasons: string[] = [];

      if (!validation.isValid) {
        return { store, score: -1, reasons: validation.reasons };
      }

      // Perfect match: storage condition group matches store type
      if (drug.storageConditionGroup === store.storeType) {
        score += 50;
        reasons.push("Perfect storage condition match");
      }

      // Temperature match
      const storageReqs = drug.storageRequirements as any;
      if (
        storageReqs?.temp_min !== undefined &&
        storageReqs?.temp_max !== undefined
      ) {
        if (store.temperatureMin && store.temperatureMax) {
          const storeMin = store.temperatureMin.toNumber();
          const storeMax = store.temperatureMax.toNumber();

          if (
            storageReqs.temp_min >= storeMin &&
            storageReqs.temp_max <= storeMax
          ) {
            score += 30;
            reasons.push("Temperature range within store limits");
          }
        }
      }

      // Capacity available
      const utilization = store.currentUtilization?.toNumber() || 0;
      if (utilization < 50) {
        score += 20;
        reasons.push("Low utilization (<50%)");
      } else if (utilization < 75) {
        score += 10;
        reasons.push("Moderate utilization (<75%)");
      }

      // Check current inventory of same drug
      const existingInventory = await prisma.inventory.findFirst({
        where: {
          storeId: store.id,
          drugId: drug.id,
          availableQuantity: { gt: 0 },
        },
      });

      if (existingInventory) {
        score += 15;
        reasons.push("Already has stock of this drug");
      }

      return { store, score, reasons };
    }),
  );

  // Filter out invalid stores and sort by score
  return scored.filter((s) => s.score >= 0).sort((a, b) => b.score - a.score);
}

/**
 * Generate transfer number
 * Format: TRF-YYYYMMDD-XXXX
 */
export async function generateTransferNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.inventoryTransfer.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  const sequence = (count + 1).toString().padStart(4, "0");
  return `TRF-${dateStr}-${sequence}`;
}

// ============================================================================
// ALLOCATION OPERATIONS
// ============================================================================

/**
 * Allocate single batch to store with validation
 */
export async function allocateBatchToStore(
  input: StoreAllocationInput,
  session: Session,
) {
  // Permission check
  if (!session.user.permissions.includes(PERMISSIONS.INVENTORY_TRANSFER)) {
    throw new Error("Insufficient permissions to allocate inventory");
  }

  // Get batch with details
  const batch = await prisma.batch.findUnique({
    where: { id: input.batchId },
    include: {
      drug: true,
      currentStore: true,
      inventory: true,
    },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (!batch.currentStoreId) {
    throw new Error("Batch has no current store assigned");
  }

  // Ensure batch is in receiving zone
  if (!batch.currentStore?.isReceivingZone) {
    throw new Error("Batch must be in receiving zone for initial allocation");
  }

  // if (batch.qualityStatus !== 'passed') {
  //   throw new Error('Batch must pass quality inspection before allocation')
  // }

  // Validate target store
  const storeValidation = await validateStoreForDrug(
    input.targetStoreId,
    batch.drugId,
  );

  if (!storeValidation.isValid) {
    throw new Error(
      `Store validation failed: ${storeValidation.reasons.join(", ")}`,
    );
  }

  // Check available quantity in receiving zone
  const receivingInventory = batch.inventory.find(
    (inv) => inv.storeId === batch.currentStoreId,
  );

  if (!receivingInventory) {
    throw new Error("No inventory found in receiving zone");
  }

  if (receivingInventory.availableQuantity.toNumber() < input.quantity) {
    throw new Error(
      `Insufficient quantity. Available: ${receivingInventory.availableQuantity}, Requested: ${input.quantity}`,
    );
  }

  // Perform transfer in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Generate transfer number
    const transferNumber = await generateTransferNumber();

    // Create transfer record
    const transfer = await tx.inventoryTransfer.create({
      data: {
        transferNumber,
        fromStoreId: batch.currentStoreId!,
        toStoreId: input.targetStoreId,
        transferType: "receiving_to_store",
        requestedBy: session.user.id,
        status: "approved", // Auto-approve for receiving zone transfers
        approvedBy: session.user.id,
        approvedAt: new Date(),
        reason: input.reason || "Initial store allocation after GRN approval",
        notes: input.notes,
        totalItems: 1,
      },
    });

    // Create transfer item
    await tx.transferItem.create({
      data: {
        transferId: transfer.id,
        drugId: batch.drugId,
        batchId: batch.id,
        requestedQuantity: input.quantity,
        transferredQuantity: input.quantity,
        receivedQuantity: input.quantity,
      },
    });

    // Update receiving zone inventory
    const updatedReceivingQty =
      receivingInventory.availableQuantity.toNumber() - input.quantity;

    if (updatedReceivingQty > 0) {
      await tx.inventory.update({
        where: { id: receivingInventory.id },
        data: {
          availableQuantity: updatedReceivingQty,
          totalQuantity: updatedReceivingQty,
          lastMovementDate: new Date(),
          lastMovementType: "TRANSFER_OUT",
        },
      });
    } else {
      // Delete inventory record if depleted
      await tx.inventory.delete({
        where: { id: receivingInventory.id },
      });
    }

    // Create ledger entry for outgoing
    await tx.inventoryLedger.create({
      data: {
        drugId: batch.drugId,
        batchId: batch.id,
        storeId: batch.currentStoreId!,
        quantityIn: 0,
        quantityOut: input.quantity,
        balanceAfter: updatedReceivingQty,
        actionType: "TRANSFER_OUT",
        performedBy: session.user.id,
        referenceType: "TRANSFER",
        referenceId: transfer.id,
        notes: `Transfer to ${storeValidation.store!.name}`,
      },
    });

    // Check if target store inventory exists
    const targetInventory = await tx.inventory.findFirst({
      where: {
        drugId: batch.drugId,
        batchId: batch.id,
        storeId: input.targetStoreId,
      },
    });

    if (targetInventory) {
      // Update existing inventory
      const newQty =
        targetInventory.availableQuantity.toNumber() + input.quantity;
      await tx.inventory.update({
        where: { id: targetInventory.id },
        data: {
          availableQuantity: newQty,
          totalQuantity: newQty,
          lastMovementDate: new Date(),
          lastMovementType: "TRANSFER_IN",
        },
      });

      // Create ledger entry for incoming
      await tx.inventoryLedger.create({
        data: {
          drugId: batch.drugId,
          batchId: batch.id,
          storeId: input.targetStoreId,
          quantityIn: input.quantity,
          quantityOut: 0,
          balanceAfter: newQty,
          actionType: "TRANSFER_IN",
          performedBy: session.user.id,
          referenceType: "TRANSFER",
          referenceId: transfer.id,
          notes: `Transfer from ${batch.currentStore!.name}`,
        },
      });
    } else {
      // Create new inventory record
      await tx.inventory.create({
        data: {
          storeId: input.targetStoreId,
          drugId: batch.drugId,
          batchId: batch.id,
          availableQuantity: input.quantity,
          reservedQuantity: 0,
          totalQuantity: input.quantity,
          expiryDate: batch.expiryDate,
          isExpired: false,
          isNearExpiry:
            batch.expiryDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          isLowStock: false,
          lastMovementDate: new Date(),
          lastMovementType: "TRANSFER_IN",
        },
      });

      // Create ledger entry
      await tx.inventoryLedger.create({
        data: {
          drugId: batch.drugId,
          batchId: batch.id,
          storeId: input.targetStoreId,
          quantityIn: input.quantity,
          quantityOut: 0,
          balanceAfter: input.quantity,
          actionType: "TRANSFER_IN",
          performedBy: session.user.id,
          referenceType: "TRANSFER",
          referenceId: transfer.id,
          notes: `Transfer from ${batch.currentStore!.name}`,
        },
      });
    }

    // Update batch current store if fully transferred
    if (updatedReceivingQty === 0) {
      await tx.batch.update({
        where: { id: batch.id },
        data: {
          currentStoreId: input.targetStoreId,
        },
      });
    }

    // Update transfer status
    await tx.inventoryTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "received",
        receivedBy: session.user.id,
        receivedAt: new Date(),
        dispatchedAt: new Date(),
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ALLOCATE",
        entityType: "InventoryTransfer",
        entityId: transfer.id,
        afterValue: {
          batchId: batch.id,
          fromStore: batch.currentStoreId,
          toStore: input.targetStoreId,
          quantity: input.quantity,
        },
      },
    });

    return transfer;
  });

  return result;
}

/**
 * Bulk allocate all batches from a GRN
 */
export async function bulkAllocateFromGRN(
  input: BulkStoreAllocationInput,
  session: Session,
) {
  // Permission check
  if (!session.user.permissions.includes(PERMISSIONS.INVENTORY_TRANSFER)) {
    throw new Error("Insufficient permissions to allocate inventory");
  }

  // Validate GRN
  const grn = await prisma.goodsReceiptNote.findUnique({
    where: { id: input.grnId },
    include: {
      batches: {
        include: {
          drug: true,
          currentStore: true,
        },
      },
    },
  });

  if (!grn) {
    throw new Error("GRN not found");
  }

  if (grn.status !== "approved") {
    throw new Error("GRN must be approved before allocation");
  }

  // Validate all allocations before processing
  const validations = await Promise.all(
    input.allocations.map(async (alloc) => {
      const batch = grn.batches.find((b) => b.id === alloc.batchId);
      if (!batch) {
        return {
          valid: false,
          error: `Batch ${alloc.batchId} not found in GRN`,
        };
      }

      const storeValidation = await validateStoreForDrug(
        alloc.targetStoreId,
        batch.drugId,
      );

      if (!storeValidation.isValid) {
        return {
          valid: false,
          error: `Store validation failed for batch ${batch.batchNumber}: ${storeValidation.reasons.join(", ")}`,
        };
      }

      return { valid: true };
    }),
  );

  const failures = validations.filter((v) => !v.valid);
  if (failures.length > 0) {
    throw new Error(
      `Validation failed:\n${failures.map((f) => f.error).join("\n")}`,
    );
  }

  // Process all allocations
  const results = await Promise.all(
    input.allocations.map(async (alloc) => {
      return allocateBatchToStore(
        {
          batchId: alloc.batchId,
          targetStoreId: alloc.targetStoreId,
          quantity: alloc.quantity,
          notes: input.notes,
        },
        session,
      );
    }),
  );

  return {
    totalAllocated: results.length,
    transfers: results,
  };
}

/**
 * Auto-allocate batches based on best store suggestions
 */
export async function autoAllocateBatches(grnId: string, session: Session) {
  // Permission check
  if (!session.user.permissions.includes(PERMISSIONS.INVENTORY_TRANSFER)) {
    throw new Error("Insufficient permissions to auto-allocate inventory");
  }

  const grn = await prisma.goodsReceiptNote.findUnique({
    where: { id: grnId },
    include: {
      batches: {
        include: {
          drug: true,
          inventory: true,
        },
      },
    },
  });

  if (!grn) {
    throw new Error("GRN not found");
  }

  if (grn.status !== "approved") {
    throw new Error("GRN must be approved before allocation");
  }

  // Get suggestions for each batch
  const allocations: Array<{
    batchId: string;
    targetStoreId: string;
    quantity: number;
  }> = [];

  for (const batch of grn.batches) {
    const suggestions = await suggestStoreForDrug(batch.drugId);

    if (suggestions.length === 0) {
      throw new Error(
        `No suitable store found for batch ${batch.batchNumber} (${batch.drug.genericName})`,
      );
    }

    // Use best suggestion
    const bestStore = suggestions[0].store;

    // Get available quantity from receiving zone
    const receivingInventory = batch.inventory.find(
      (inv) => inv.storeId === batch.currentStoreId,
    );

    if (
      receivingInventory &&
      receivingInventory.availableQuantity.toNumber() > 0
    ) {
      allocations.push({
        batchId: batch.id,
        targetStoreId: bestStore.id,
        quantity: receivingInventory.availableQuantity.toNumber(),
      });
    }
  }

  // Execute bulk allocation
  return bulkAllocateFromGRN(
    {
      grnId,
      allocations,
      notes: "Auto-allocated by system based on store rules",
    },
    session,
  );
}

/**
 * Get batches pending allocation (in receiving zone)
 */
export async function getPendingAllocations(session: Session) {
  const receivingZone = await prisma.store.findFirst({
    where: {
      isReceivingZone: true,
      isActive: true,
    },
  });

  if (!receivingZone) {
    return [];
  }

  const inventory = await prisma.inventory.findMany({
    where: {
      storeId: receivingZone.id,
      availableQuantity: { gt: 0 },
    },
    include: {
      drug: {
        include: {
          category: true,
        },
      },
      batch: {
        include: {
          supplier: true,
          grn: true,
        },
      },
      store: true,
    },
    orderBy: {
      batch: {
        expiryDate: "asc",
      },
    },
  });

  // Add store suggestions for each
  const withSuggestions = await Promise.all(
    inventory.map(async (inv) => {
      const suggestions = await suggestStoreForDrug(inv.drugId);
      return {
        ...inv,
        suggestedStores: suggestions.slice(0, 3), // Top 3 suggestions
      };
    }),
  );

  return withSuggestions;
}
