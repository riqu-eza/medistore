/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/orders/[id]/allocate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { AllocationService } from '@/server/services/allocation.service';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('Received allocation request for order ID:', await params.then(p => p.id));
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAllocatePermission = session.user.permissions?.includes(PERMISSIONS.ORDERS_ALLOCATE);
    if (!hasAllocatePermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await req.json().catch(() => ({}));

    // ─── CORE FIX: Resolve storeIds correctly ───────────────────────────────
    //
    // Priority:
    //  1. Explicit storeIds passed in request body (manual override)
    //  2. Admin → all active stores (cross-store allocation)
    //  3. Regular user → their assigned store + the order's sourceStoreId
    //
    let userStoreIds: string[] = [];

    if (body.storeIds?.length) {
      // Caller explicitly specified which stores to allocate from
      userStoreIds = body.storeIds;
    } else if (session.user.permissions?.includes(PERMISSIONS.ALL)) {
      // Admin: fetch every active store
      const allStores = await prisma.store.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      userStoreIds = allStores.map((s) => s.id);
    } else {
      // Regular user: use their assigned store. Also include the order's
      // sourceStoreId so inventory attached to that store is always considered.
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { sourceStoreId: true },
      });
      console.log('User store ID:', order);
      console.log('Order source store ID:', order?.sourceStoreId);
      const storeSet = new Set<string>();

      if (session.user.storeId) {
        storeSet.add(session.user.storeId);
      }
      if (order?.sourceStoreId) {
        storeSet.add(order.sourceStoreId);
      }

      userStoreIds = [...storeSet];
    }

    // If after all that we still have no stores, return a clear error
    if (userStoreIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'No stores are available for allocation. ' +
            'Ensure your account is assigned to a store or the order has a source store.',
        },
        { status: 400 }
      );
    }

    // ─── Allow cross-store if admin or explicitly requested ─────────────────
    const allowCrossStore =
      body.allowCrossStore === true ||
      session.user.permissions?.includes(PERMISSIONS.ALL) ||
      false;

    const allocationContext = {
      orderId,
      allocatedBy: session.user.id,
      storeIds: userStoreIds,
      strategy: body.strategy || 'FEFO',
      allowCrossStore,
      overrideRestrictions: body.overrideRestrictions || false,
      ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    };

    const result = await AllocationService.allocateOrder(allocationContext);

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors[0]?.error || 'Allocation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        allocations: result.allocations,
        partialAllocations: result.partialAllocations,
        summary: {
          totalAllocated: result.allocations.length,
          partialCount: result.partialAllocations.length,
          storesSearched: userStoreIds.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Allocation error:', error);
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}