import { prisma } from "@/lib/prisma";
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function confirmDispatch(orderId: string, userId: string, deliveryDetails: any) {
  return prisma.$transaction(async (tx) => {
    // 1. Get all allocations for this order that are reserved
    const allocations = await tx.orderAllocation.findMany({
      where: { orderId, status: "reserved" },
      include: { orderItem: true, batch: true },
    });

    if (allocations.length === 0) {
      throw new Error("No reserved allocations found for this order");
    }

    const storeId = allocations[0].storeId;

    // 2. Create dispatch note
    const dispatchNote = await tx.dispatchNote.create({
      data: {
        dispatchNumber: `DN-${Date.now()}`,
        orderId,
        storeId,
        dispatchBy: userId,
        dispatchDate: new Date(),
        driverName: deliveryDetails.driverName,
        vehicleNumber: deliveryDetails.vehicleNumber,
        driverPhone: deliveryDetails.driverPhone,
        notes: deliveryDetails.notes,
        status: "dispatched",
      },
    });

    // 3. Process each allocation -> dispatch item & finalize inventory
    for (const alloc of allocations) {
      // Create dispatch item
      await tx.dispatchItem.create({
        data: {
          dispatchNoteId: dispatchNote.id,
          orderItemId: alloc.orderItemId,
          batchId: alloc.batchId,
          quantityDispatched: alloc.allocatedQuantity,
          pickedBy: userId,
          pickedAt: new Date(),
        },
      });

      // Update inventory: reduce totalQuantity and reservedQuantity
      const inventory = await tx.inventory.findUnique({
        where: {
          drugId_batchId_storeId: {
            drugId: alloc.orderItem.drugId,
            batchId: alloc.batchId,
            storeId: alloc.storeId,
          },
        },
      });
      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            totalQuantity: { decrement: alloc.allocatedQuantity },
            reservedQuantity: { decrement: alloc.allocatedQuantity },
            lastMovementDate: new Date(),
            lastMovementType: "DISPATCH",
          },
        });
      }

      // Ledger: DISPATCH
      const newBalance = (inventory?.availableQuantity ?? 0) - alloc.allocatedQuantity;
      await tx.inventoryLedger.create({
        data: {
          drugId: alloc.orderItem.drugId,
          batchId: alloc.batchId,
          storeId: alloc.storeId,
          quantityOut: alloc.allocatedQuantity,
          balanceAfter: newBalance,
          actionType: "DISPATCH",
          performedBy: userId,
          referenceType: "ORDER",
          referenceId: orderId,
          notes: `Dispatched via ${dispatchNote.dispatchNumber}`,
        },
      });

      // Update allocation status
      await tx.orderAllocation.update({
        where: { id: alloc.id },
        data: { status: "dispatched" },
      });

      // Update order item dispatched quantity
      await tx.orderItem.update({
        where: { id: alloc.orderItemId },
        data: {
          dispatchedQuantity: { increment: alloc.allocatedQuantity },
          status: "dispatched",
        },
      });
    }

    // 4. Update order status
    await tx.order.update({
      where: { id: orderId },
      data: { status: "dispatched", dispatchedAt: new Date() },
    });

    return dispatchNote;
  });
}