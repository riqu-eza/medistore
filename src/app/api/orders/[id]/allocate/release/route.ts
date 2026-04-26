/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/orders/[id]/allocate/release/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { AllocationService } from '@/server/services/allocation.service';
import { PERMISSIONS } from '@/lib/auth/permissions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasCancelPermission = session.user.permissions?.includes(PERMISSIONS.ORDERS_CANCEL);
    if (!hasCancelPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const { id: orderId } = await params;
    const { reason } = await req.json();
    
    if (!reason) {
      return NextResponse.json({ error: 'Release reason is required' }, { status: 400 });
    }
    
    await AllocationService.releaseAllocation(orderId, session.user.id, reason);
    
    return NextResponse.json({
      success: true,
      message: 'Allocation released successfully',
    });
    
  } catch (error: any) {
    console.error('Release allocation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}