// app/api/stores/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stores = await prisma.store.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, storeType: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ success: true, data: stores });
}