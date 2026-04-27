/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { AllocationService } from "./allocation.service";

export async function createOrderWithAllocation(data: any) {
  // 1. Create order and items in transaction
  const order = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        customerName: data.customerName,
        sourceStoreId: data.sourceStoreId,
        priority: data.priority,
        createdBy: data.userId,
        status: "pending_approval",
        orderDate: new Date(),
        deliveryDate: new Date(Date.now() + 7 * 86400000),
        shippingAddress: data.shippingAddress || {},
      },
    });

    for (const item of data.items) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          drugId: item.drugId,
          requestedQuantity: item.quantity,
          unitPrice: item.unitPrice,
        },
      });
    }

    return order;
  });

  // 2. Run allocation outside the transaction (it creates its own internally)
  if (data.autoAllocate !== false) {
    await AllocationService.allocateOrder({   // ← call the static method, not the class
      orderId: order.id,
      allocatedBy: data.userId,
      storeIds: [data.sourceStoreId],
      allowCrossStore: false,
      overrideRestrictions: false,
    });
  }

  return order;
}