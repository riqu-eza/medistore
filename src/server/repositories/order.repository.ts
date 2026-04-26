// server/repositories/order.repository.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class OrderRepository {
  static async getOrderForAllocation(orderId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            drug: {
              include: { category: true },
            },
          },
        },
        allocations: {
          include: {
            batch: true,
            store: true,
          },
        },
      },
    });
    
    if (!order) throw new Error(`Order ${orderId} not found`);
    
    // Validate order can be allocated
    if (!['approved', 'pending_approval', 'partially_allocated'].includes(order.status)) {
      throw new Error(`Order status ${order.status} cannot be allocated`);
    }
    
    return order;
  }
  
  static async updateOrderAllocationStatus(
    orderId: string,
    status: 'allocated' | 'partially_allocated',
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    
    return client.order.update({
      where: { id: orderId },
      data: {
        status,
        allocatedAt: status === 'allocated' ? new Date() : undefined,
      },
    });
  }
  
  static async getOrderItemsWithAllocations(orderId: string) {
    return prisma.orderItem.findMany({
      where: { orderId },
      include: {
        allocations: {
          include: {
            batch: true,
            store: true,
          },
        },
        drug: true,
      },
    });
  }
}