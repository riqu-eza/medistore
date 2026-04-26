import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Authenticated user:', session.user);

    const storeId = session.user.storeId;
    if (!storeId) {
      return NextResponse.json(
        { error: 'No store assigned to this user' },
        { status: 403 }
      );
    }
     console.log('Fetching inventory for storeId:', storeId);
    // Fetch inventory with drug and batch details
    const inventory = await prisma.inventory.findMany({
      where: {
        storeId,
        availableQuantity: { gt: 0 },
      },
      include: {
        drug: true,
        batch: true,
      },
      orderBy: [{ expiryDate: 'asc' }], // FEFO ready
    });

    // Convert Decimal values to numbers for JSON response
    const serializedInventory = inventory.map((item) => ({
      ...item,
      availableQuantity: item.availableQuantity.toNumber(),
      reservedQuantity: item.reservedQuantity.toNumber(),
      totalQuantity: item.totalQuantity.toNumber(),
      drug: {
        ...item.drug,
        unitCost: item.drug.unitCost?.toNumber() ?? null,
        sellingPrice: item.drug.sellingPrice?.toNumber() ?? null,
      },
      batch: {
        ...item.batch,
        receivedQuantity: item.batch.receivedQuantity.toNumber(),
        totalPieces: item.batch.totalPieces?.toNumber() ?? null,
      },
    }));

    return NextResponse.json({ success: true, data: serializedInventory });
  } catch (error) {
    console.error('Inventory API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}