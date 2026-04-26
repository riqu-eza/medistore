import { prisma } from "@/lib/prisma";
import { allocateOrderItems } from "./allocation.service";

export async function createOrderWithAllocation(data: any) {
  const order = await prisma.$transaction(async (tx) => {
    // 1. Create order header
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

    // 2. Create order items (requested quantities)
    const orderItems = [];
    for (const item of data.items) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          drugId: item.drugId,
          requestedQuantity: item.quantity,
          unitPrice: item.unitPrice,
        },
      });
      orderItems.push(orderItem);
    }

    // 3. Run FEFO allocation (if you want auto-allocate)
    if (data.autoAllocate !== false) {
      await allocateOrderItems(order.id, data.sourceStoreId, tx);
    }

    return order;
  });

  return order;
}