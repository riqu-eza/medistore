import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { decimalToNumber } from "@/lib/inventory/helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Permission check
    if (!hasPermission(session.user.permissions, PERMISSIONS.INVENTORY_ADJUST)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { inventoryId, quantityChange, reason, notes } = body;

    if (!inventoryId || quantityChange === undefined || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: inventoryId, quantityChange, reason" },
        { status: 400 }
      );
    }

    if (quantityChange === 0) {
      return NextResponse.json(
        { error: "Quantity change must be non-zero" },
        { status: 400 }
      );
    }

    // Fetch inventory with relationships
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { drug: true, batch: true, store: true },
    });

    if (!inventory) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
    }

    const currentAvailable = decimalToNumber(inventory.availableQuantity);
    const newAvailable = currentAvailable + quantityChange;

    if (newAvailable < 0) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${currentAvailable}` },
        { status: 400 }
      );
    }

    // Perform adjustment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          availableQuantity: newAvailable,
          totalQuantity: newAvailable + decimalToNumber(inventory.reservedQuantity),
          lastMovementDate: new Date(),
          lastMovementType: "ADJUSTMENT",
        },
      });

      // Create ledger entry
      const quantityIn = quantityChange > 0 ? Math.abs(quantityChange) : 0;
      const quantityOut = quantityChange < 0 ? Math.abs(quantityChange) : 0;
      const newBalance = decimalToNumber(updatedInventory.availableQuantity);

      await tx.inventoryLedger.create({
        data: {
          drugId: inventory.drugId,
          batchId: inventory.batchId,
          storeId: inventory.storeId,
          quantityIn,
          quantityOut,
          balanceAfter: newBalance,
          actionType: "ADJUSTMENT",
          performedBy: session.user.id,
          referenceType: "ADJUSTMENT",
          referenceId: inventoryId,
          notes: `${reason}: ${notes || "No additional notes"}`,
          metadata: { reason, requestedChange: quantityChange },
        },
      });

      // If adjustment type is 'expiry' and quantity reduces to zero, optionally mark batch as depleted
      if (reason === "expiry" && newAvailable === 0) {
        await tx.batch.update({
          where: { id: inventory.batchId },
          data: { status: "expired", statusReason: "All stock expired" },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "ADJUST",
          entityType: "Inventory",
          entityId: inventoryId,
          beforeValue: { availableQuantity: currentAvailable },
          afterValue: { availableQuantity: newAvailable, reason, notes },
        },
      });

      return updatedInventory;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Inventory adjustment error:", error);
    return NextResponse.json(
      { error: "Failed to adjust inventory" },
      { status: 500 }
    );
  }
}