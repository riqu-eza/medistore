// server/services/dispatch.service.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DispatchInput {
  driverName: string;
  vehicleNumber: string;
  driverPhone?: string;
  notes?: string;
  temperatureAtDispatch?: number;
  packagingVerified: boolean;
  labelsVerified: boolean;
  documentationComplete: boolean;
}

export interface DispatchResult {
  dispatchNote: {
    id: string;
    dispatchNumber: string;
    status: string;
    dispatchDate: Date;
    totalItems: number;
    driverName: string;
    vehicleNumber: string;
  };
  itemsDispatched: number;
  totalQuantityDispatched: number;
  warnings: string[];
}

export interface DeliveryConfirmInput {
  receiverName: string;
  proofOfDeliveryUrl?: string;
  deliveryNotes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateDispatchNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `DSP-${y}${m}${d}-${rand}`;
}

// ─── confirmDispatch ──────────────────────────────────────────────────────────
/**
 * Transitions an allocated order to dispatched:
 *  1. Validate order state
 *  2. Create DispatchNote with full QC metadata
 *  3. Per allocation: DispatchItem → inventory decrement → ledger entry
 *  4. Update OrderItem.dispatchedQuantity + status
 *  5. Update Order.status → "dispatched"
 *  6. Write AuditLog
 *
 * All inside a serializable transaction.
 */
// server/services/dispatch.service.ts - Fixed version

export async function confirmDispatch(
  orderId: string,
  dispatchedBy: string,
  input: DispatchInput
): Promise<DispatchResult> {
  const warnings: string[] = [];

  return await prisma.$transaction(
    async (tx) => {
      // ── 1. Load & validate - FIXED to include drug info ──────────────────
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          sourceStore: { select: { id: true, name: true } },
          items: {
            select: {
              id: true,
              drugId: true,
              requestedQuantity: true,
              allocatedQuantity: true,
              dispatchedQuantity: true,
              status: true,
            },
          },
          allocations: {
            where: { status: { in: ["reserved", "picked"] } },
            include: {
              batch: {
                select: { 
                  id: true, 
                  batchNumber: true, 
                  expiryDate: true,
                  drugId: true,  // ← ADD THIS - get drugId from batch
                  drug: {        // ← Include drug relation for name if needed
                    select: { id: true, genericName: true }
                  }
                }
              },
              store: { select: { id: true, name: true } },
              orderItem: {     // ← Include orderItem to get drugId as fallback
                select: { drugId: true }
              }
            },
          },
        },
      });

      if (!order) throw new Error(`Order ${orderId} not found`);

      if (!["allocated", "partially_allocated"].includes(order.status)) {
        throw new Error(
          `Order cannot be dispatched — current status is "${order.status}". ` +
            `Must be "allocated" or "partially_allocated".`
        );
      }

      if (order.allocations.length === 0) {
        throw new Error(
          "No reserved allocations found. Run stock allocation before dispatching."
        );
      }

      // ── 2. Resolve dispatch store ────────────────────────────────────────
      const dispatchStoreId =
        order.sourceStoreId ?? order.allocations[0].storeId;

      // ── 3. Create DispatchNote ───────────────────────────────────────────
      const dispatchNote = await tx.dispatchNote.create({
        data: {
          dispatchNumber: generateDispatchNumber(),
          orderId,
          storeId: dispatchStoreId,
          dispatchBy: dispatchedBy,
          dispatchDate: new Date(),
          status: "dispatched",
          driverName: input.driverName,
          vehicleNumber: input.vehicleNumber,
          driverPhone: input.driverPhone ?? null,
          notes: input.notes ?? null,
          temperatureAtDispatch: input.temperatureAtDispatch ?? null,
          packagingVerified: input.packagingVerified,
          labelsVerified: input.labelsVerified,
          documentationComplete: input.documentationComplete,
          totalItems: order.allocations.length,
        },
      });

      // ── 4. Process each allocation ───────────────────────────────────────
      const itemDispatchMap = new Map<string, number>(); // orderItemId → qty
      let totalQuantityDispatched = 0;

      for (const alloc of order.allocations) {
        const qty = Number(alloc.allocatedQuantity);
        
        // FIX: Get drugId from batch or orderItem
        const drugId = alloc.batch.drugId || alloc.orderItem?.drugId;
        
        if (!drugId) {
          warnings.push(
            `Cannot determine drugId for allocation ${alloc.id}. Skipping ledger entry.`
          );
          continue;
        }

        // Find live inventory record
        const inventory = await tx.inventory.findFirst({
          where: {
            drugId: drugId,
            batchId: alloc.batchId,
            storeId: alloc.storeId,
          },
        });

        if (!inventory) {
          warnings.push(
            `Inventory record not found for batch ${alloc.batch.batchNumber} ` +
              `in store "${alloc.store.name}". Stock may be inconsistent.`
          );
          continue;
        }

        // 4a. Create DispatchItem
        await tx.dispatchItem.create({
          data: {
            dispatchNoteId: dispatchNote.id,
            orderItemId: alloc.orderItemId,
            batchId: alloc.batchId,
            quantityDispatched: qty,
            pickedBy: dispatchedBy,
            pickedAt: new Date(),
            qualityChecked: input.packagingVerified && input.labelsVerified,
          },
        });

        // 4b. Decrement inventory (stock leaves warehouse)
        const prevTotal = Number(inventory.totalQuantity);
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            reservedQuantity: { decrement: qty },
            totalQuantity: { decrement: qty },
            lastMovementDate: new Date(),
            lastMovementType: "DISPATCH",
          },
        });

        // 4c. Mark allocation dispatched
        await tx.orderAllocation.update({
          where: { id: alloc.id },
          data: { status: "dispatched" },
        });

        // 4d. Immutable ledger - FIXED: Use drugId from batch
        await tx.inventoryLedger.create({
          data: {
            drug: {
              connect: { id: drugId }  // ← NOW USING CORRECT drugId
            },
            batch: {
              connect: { id: alloc.batchId }
            },
            store: {
              connect: { id: alloc.storeId }
            },
            user: {
              connect: { id: dispatchedBy }
            },
            quantityIn: 0,
            quantityOut: qty,
            balanceAfter: Math.max(0, prevTotal - qty),
            actionType: "DISPATCH",
            referenceType: "ORDER",
            referenceId: orderId,
            notes: `Dispatched via ${dispatchNote.dispatchNumber} — ${input.driverName} / ${input.vehicleNumber}`,
            metadata: {
              dispatchNoteId: dispatchNote.id,
              dispatchNumber: dispatchNote.dispatchNumber,
              driverName: input.driverName,
              vehicleNumber: input.vehicleNumber,
              batchNumber: alloc.batch.batchNumber,
              expiryDate: alloc.batch.expiryDate,
              temperatureAtDispatch: input.temperatureAtDispatch ?? null,
            },
          },
        });

        itemDispatchMap.set(
          alloc.orderItemId,
          (itemDispatchMap.get(alloc.orderItemId) ?? 0) + qty
        );
        totalQuantityDispatched += qty;
      }

      // ── 5. Update OrderItem totals & status ──────────────────────────────
      for (const [orderItemId, qtyDispatched] of itemDispatchMap) {
        const orderItem = order.items.find((i) => i.id === orderItemId);
        if (!orderItem) continue;

        const newDispatched = Number(orderItem.dispatchedQuantity) + qtyDispatched;
        const requested = Number(orderItem.requestedQuantity);
        const itemStatus = newDispatched >= requested ? "dispatched" : "partially_allocated";

        await tx.orderItem.update({
          where: { id: orderItemId },
          data: { dispatchedQuantity: newDispatched, status: itemStatus },
        });
      }

      // ── 6. Update Order ──────────────────────────────────────────────────
      await tx.order.update({
        where: { id: orderId },
        data: { status: "dispatched", dispatchedAt: new Date() },
      });

      // ── 7. Audit ─────────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          userId: dispatchedBy,
          action: "DISPATCH",
          entityType: "Order",
          entityId: orderId,
          beforeValue: { status: order.status },
          afterValue: {
            status: "dispatched",
            dispatchNumber: dispatchNote.dispatchNumber,
            driverName: input.driverName,
            vehicleNumber: input.vehicleNumber,
          },
        },
      });

      return {
        dispatchNote: {
          id: dispatchNote.id,
          dispatchNumber: dispatchNote.dispatchNumber,
          status: dispatchNote.status,
          dispatchDate: dispatchNote.dispatchDate,
          totalItems: dispatchNote.totalItems,
          driverName: input.driverName,
          vehicleNumber: input.vehicleNumber,
        },
        itemsDispatched: itemDispatchMap.size,
        totalQuantityDispatched,
        warnings,
      };
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}
// ─── confirmDelivery ──────────────────────────────────────────────────────────
export async function confirmDelivery(
  dispatchNoteId: string,
  confirmedBy: string,
  input: DeliveryConfirmInput
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const note = await tx.dispatchNote.findUnique({
      where: { id: dispatchNoteId },
      select: { id: true, orderId: true, status: true, dispatchNumber: true },
    });

    if (!note) throw new Error(`Dispatch note not found`);
    if (note.status === "delivered") throw new Error("Already marked as delivered");
    if (note.status !== "dispatched")
      throw new Error(`Cannot confirm — status is "${note.status}"`);

    await tx.dispatchNote.update({
      where: { id: dispatchNoteId },
      data: {
        status: "delivered",
        deliveredAt: new Date(),
        receivedBy: input.receiverName,
        proofOfDeliveryUrl: input.proofOfDeliveryUrl ?? null,
      },
    });

    await tx.order.update({
      where: { id: note.orderId },
      data: { status: "completed", completedAt: new Date() },
    });

    await tx.orderItem.updateMany({
      where: { orderId: note.orderId, status: "dispatched" },
      data: { status: "completed" },
    });

    await tx.auditLog.create({
      data: {
        userId: confirmedBy,
        action: "DELIVER",
        entityType: "DispatchNote",
        entityId: dispatchNoteId,
        beforeValue: { status: "dispatched" },
        afterValue: {
          status: "delivered",
          receivedBy: input.receiverName,
          deliveredAt: new Date().toISOString(),
        },
      },
    });
  });
}

// ─── getDispatchQueue ─────────────────────────────────────────────────────────
export async function getDispatchQueue(storeId?: string) {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["allocated", "partially_allocated"] },
      ...(storeId ? { sourceStoreId: storeId } : {}),
    },
    include: {
      items: {
        include: { drug: { select: { genericName: true, brandName: true } } },
      },
      allocations: {
        where: { status: { in: ["reserved", "picked"] } },
        include: {
          store: { select: { id: true, name: true } },
          batch: { select: { batchNumber: true, expiryDate: true } },
        },
      },
      sourceStore: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "asc" }, { deliveryDate: "asc" }],
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerFacility: o.customerFacility,
    customerPhone: o.customerPhone,
    priority: o.priority,
    status: o.status,
    deliveryDate: o.deliveryDate,
    totalValue: o.totalValue ? Number(o.totalValue) : 0,
    totalItems: o.totalItems,
    sourceStore: o.sourceStore,
    shippingAddress: o.shippingAddress as Record<string, string>,
    allocatedItemCount: o.allocations.length,
    totalAllocatedQty: o.allocations.reduce(
      (s, a) => s + Number(a.allocatedQuantity),
      0
    ),
    items: o.items.map((i) => ({
      id: i.id,
      drugName: `${i.drug.genericName}${i.drug.brandName ? ` (${i.drug.brandName})` : ""}`,
      requestedQuantity: Number(i.requestedQuantity),
      allocatedQuantity: Number(i.allocatedQuantity),
      dispatchedQuantity: Number(i.dispatchedQuantity),
    })),
    batches: o.allocations.map((a) => ({
      batchNumber: a.batch.batchNumber,
      expiryDate: a.batch.expiryDate,
      storeName: a.store.name,
      qty: Number(a.allocatedQuantity),
    })),
  }));
}

// ─── getDispatchHistory ───────────────────────────────────────────────────────
export async function getDispatchHistory(options?: {
  storeId?: string;
  status?: string;
  limit?: number;
}) {
  const notes = await prisma.dispatchNote.findMany({
    where: {
      ...(options?.storeId ? { storeId: options.storeId } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          customerFacility: true,
          priority: true,
          shippingAddress: true,
        },
      },
      store: { select: { name: true } },
      items: {
        include: {
          batch: { select: { batchNumber: true } },
          orderItem: { include: { drug: { select: { genericName: true } } } },
        },
      },
    },
    orderBy: { dispatchDate: "desc" },
    take: options?.limit ?? 50,
  });

  return notes.map((n) => ({
    id: n.id,
    dispatchNumber: n.dispatchNumber,
    status: n.status,
    dispatchDate: n.dispatchDate,
    deliveredAt: n.deliveredAt,
    receivedBy: n.receivedBy,
    driverName: n.driverName,
    vehicleNumber: n.vehicleNumber,
    driverPhone: n.driverPhone,
    temperatureAtDispatch: n.temperatureAtDispatch
      ? Number(n.temperatureAtDispatch)
      : null,
    packagingVerified: n.packagingVerified,
    labelsVerified: n.labelsVerified,
    documentationComplete: n.documentationComplete,
    totalItems: n.totalItems,
    notes: n.notes,
    store: n.store,
    order: n.order,
    items: n.items.map((i) => ({
      batchNumber: i.batch.batchNumber,
      drugName: i.orderItem.drug.genericName,
      quantityDispatched: Number(i.quantityDispatched),
    })),
  }));
}