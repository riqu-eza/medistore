/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    // Non-admin users only see orders from their store; admins see all
    where: session.user.storeId
      ? { sourceStoreId: session.user.storeId }
      : undefined,
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { drug: true } } },
  });

  const serialized = orders.map((order) => ({
    ...order,
    totalValue: order.totalValue?.toNumber() ?? 0,
  }));

  return NextResponse.json({ success: true, data: serialized });
}



export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    customerName,
    customerPhone,
    customerEmail,
    shippingAddress,
    items,
    priority,
    deliveryDate,
    sourceStoreId, // Optional - can be provided or auto-detected
  } = body;

  if (!customerName || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // ─── Determine sourceStoreId with intelligent fallback ───────────────────
  let resolvedSourceStoreId: string | null = sourceStoreId || null;
  
  // If no store provided AND user has a store, use theirs
  if (!resolvedSourceStoreId && session.user.storeId) {
    resolvedSourceStoreId = session.user.storeId;
  }
  
  // If still no store, try to auto-detect based on items
  if (!resolvedSourceStoreId) {
    // Check if all items are available in a single store
    const drugIds = items.map((item: any) => item.drugId);
    
    const storeAvailability = await prisma.inventory.groupBy({
      by: ['storeId'],
      where: {
        drugId: { in: drugIds },
        availableQuantity: { gt: 0 },
        isExpired: false,
      },
      _count: {
        drugId: true,
      },
    });
    
    // Find store that has ALL requested drugs
    for (const store of storeAvailability) {
      if (store._count.drugId === drugIds.length) {
        resolvedSourceStoreId = store.storeId;
        break;
      }
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        shippingAddress: shippingAddress && Object.keys(shippingAddress).length
          ? shippingAddress
          : { raw: 'Not provided' },
        priority: priority || 'normal',
        sourceStoreId: resolvedSourceStoreId,
        createdBy: session.user.id,
        // If store is assigned, auto-approve; otherwise keep pending
        status: resolvedSourceStoreId ? 'approved' : 'pending_approval',
        deliveryDate: deliveryDate
          ? new Date(deliveryDate)
          : new Date(Date.now() + 7 * 86_400_000),
        orderDate: new Date(),
      },
    });

    // Create order items
    let totalValue = 0;

    for (const item of items) {
      const unitPrice = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 1;
      const lineTotal = unitPrice * qty;
      totalValue += lineTotal;

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          drugId: item.drugId,
          requestedQuantity: qty,
          unitPrice: unitPrice > 0 ? unitPrice : null,
          totalPrice: lineTotal > 0 ? lineTotal : null,
        },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        totalItems: items.length,
        totalValue,
      },
    });
  });

  // If no store was assigned, create notification for inventory officers
  if (!resolvedSourceStoreId) {
    await prisma.notification.create({
      data: {
        userId: 'SYSTEM', // Would send to all inventory officers
        type: 'ORDER_NEEDS_STORE',
        priority: 'high',
        title: 'Order Requires Store Assignment',
        message: `Order ${order.orderNumber} from ${customerName} needs store assignment before allocation`,
        entityType: 'Order',
        entityId: order.id,
        channels: ['in_app', 'email'],
      },
    });
  }

  return NextResponse.json({ 
    success: true, 
    data: order,
    message: resolvedSourceStoreId 
      ? 'Order created and ready for allocation' 
      : 'Order created. An inventory officer will assign a store.',
  }, { status: 201 });
}