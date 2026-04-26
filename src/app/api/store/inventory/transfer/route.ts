import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { decimalToNumber } from '@/lib/inventory/helpers';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.INVENTORY_TRANSFER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { fromInventoryId, toStoreId, quantity, reason } = body;

    if (!fromInventoryId || !toStoreId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields: fromInventoryId, toStoreId, quantity' },
        { status: 400 }
      );
    }

    // Fetch source inventory
    const sourceInventory = await prisma.inventory.findUnique({
      where: { id: fromInventoryId },
      include: { drug: true, batch: true, store: true },
    });

    if (!sourceInventory) {
      return NextResponse.json({ error: 'Source inventory not found' }, { status: 404 });
    }

    // Check sufficient available quantity
    const available = decimalToNumber(sourceInventory.availableQuantity);
    if (available < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${available}` },
        { status: 400 }
      );
    }

    // Check destination store exists
    const destStore = await prisma.store.findUnique({
      where: { id: toStoreId, isActive: true },
    });
    if (!destStore) {
      return NextResponse.json({ error: 'Destination store not found or inactive' }, { status: 404 });
    }

    // Generate transfer number
    const transferNumber = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Perform transfer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transfer record
      const transfer = await tx.inventoryTransfer.create({
        data: {
          transferNumber,
          fromStoreId: sourceInventory.storeId,
          toStoreId,
          requestedBy: session.user.id,
          requestedAt: new Date(),
          status: 'approved', // Auto-approve for simplicity; could be 'pending'
          totalItems: 1,
          reason: reason || 'Stock transfer',
          items: {
            create: {
              drugId: sourceInventory.drugId,
              batchId: sourceInventory.batchId,
              requestedQuantity: quantity,
              transferredQuantity: quantity,
            },
          },
        },
        include: { items: true },
      });

      // Reduce source inventory
      const newSourceAvailable = available - quantity;
      await tx.inventory.update({
        where: { id: fromInventoryId },
        data: {
          availableQuantity: newSourceAvailable,
          totalQuantity: newSourceAvailable + decimalToNumber(sourceInventory.reservedQuantity),
          lastMovementDate: new Date(),
          lastMovementType: 'TRANSFER_OUT',
        },
      });

      // Create source ledger entry (out)
      await tx.inventoryLedger.create({
        data: {
          drugId: sourceInventory.drugId,
          batchId: sourceInventory.batchId,
          storeId: sourceInventory.storeId,
          quantityIn: 0,
          quantityOut: quantity,
          balanceAfter: newSourceAvailable,
          actionType: 'TRANSFER_OUT',
          performedBy: session.user.id,
          referenceType: 'TRANSFER',
          referenceId: transfer.id,
          notes: `Transfer to ${destStore.name}`,
        },
      });

      // Check if destination inventory already exists
      let destInventory = await tx.inventory.findUnique({
        where: {
          drugId_batchId_storeId: {
            drugId: sourceInventory.drugId,
            batchId: sourceInventory.batchId,
            storeId: toStoreId,
          },
        },
      });

      if (destInventory) {
        // Update existing inventory
        const destAvailable = decimalToNumber(destInventory.availableQuantity);
        await tx.inventory.update({
          where: { id: destInventory.id },
          data: {
            availableQuantity: destAvailable + quantity,
            totalQuantity: destAvailable + quantity + decimalToNumber(destInventory.reservedQuantity),
            lastMovementDate: new Date(),
            lastMovementType: 'TRANSFER_IN',
          },
        });
      } else {
        // Create new inventory record in destination store
        destInventory = await tx.inventory.create({
          data: {
            storeId: toStoreId,
            drugId: sourceInventory.drugId,
            batchId: sourceInventory.batchId,
            availableQuantity: quantity,
            reservedQuantity: 0,
            totalQuantity: quantity,
            expiryDate: sourceInventory.expiryDate,
            isExpired: sourceInventory.isExpired,
            isNearExpiry: sourceInventory.isNearExpiry,
          },
        });
      }

      // Create destination ledger entry (in)
      await tx.inventoryLedger.create({
        data: {
          drugId: sourceInventory.drugId,
          batchId: sourceInventory.batchId,
          storeId: toStoreId,
          quantityIn: quantity,
          quantityOut: 0,
          balanceAfter: quantity,
          actionType: 'TRANSFER_IN',
          performedBy: session.user.id,
          referenceType: 'TRANSFER',
          referenceId: transfer.id,
          notes: `Transfer from ${sourceInventory.store.name}`,
        },
      });

      // Update batch current store if entire quantity moved? Optional
      // For simplicity, we don't change batch.currentStoreId unless entire batch moved.

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TRANSFER',
          entityType: 'InventoryTransfer',
          entityId: transfer.id,
          beforeValue: { fromStore: sourceInventory.storeId, quantity },
          afterValue: { toStore: toStoreId, status: 'approved' },
        },
      });

      return transfer;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Inventory transfer error:', error);
    return NextResponse.json(
      { error: 'Failed to complete transfer' },
      { status: 500 }
    );
  }
}