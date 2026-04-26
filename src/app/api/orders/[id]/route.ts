// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      sourceStore: { select: { id: true, name: true, code: true } },
      items: {
        include: {
          drug: { select: { genericName: true, brandName: true } },
          allocations: {
            include: {
              batch: { select: { batchNumber: true, expiryDate: true } },
              store: { select: { name: true } },
            },
          },
        },
      },
      allocations: {
        include: {
          batch: { select: { batchNumber: true, expiryDate: true } },
          store: { select: { name: true } },
          orderItem: {
            include: {
              drug: { select: { genericName: true, brandName: true } },
            },
          },
        },
        orderBy: { allocatedAt: 'desc' },
      },
      dispatchNotes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Serialize Decimal fields
  const serialized = {
    ...order,
    totalValue: order.totalValue?.toNumber() ?? 0,
    items: order.items.map((item) => ({
      ...item,
      requestedQuantity: Number(item.requestedQuantity),
      allocatedQuantity: Number(item.allocatedQuantity),
      dispatchedQuantity: Number(item.dispatchedQuantity),
      backorderQuantity: Number(item.backorderQuantity),
      unitPrice: item.unitPrice?.toNumber() ?? 0,
      totalPrice: item.totalPrice?.toNumber() ?? 0,
    })),
    allocations: order.allocations.map((alloc) => ({
      ...alloc,
      allocatedQuantity: Number(alloc.allocatedQuantity),
    })),
  };

  return NextResponse.json({ success: true, data: serialized });
}