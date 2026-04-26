import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions (assuming ORDER_APPROVE permission)
    if (!hasPermission(session.user.permissions, PERMISSIONS.ORDER_APPROVE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending_approval") {
      return NextResponse.json(
        { error: `Cannot approve order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // Update order status to approved
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "approved",
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "APPROVE",
        entityType: "Order",
        entityId: orderId,
        beforeValue: { status: "pending_approval" },
        afterValue: { status: "approved" },
      },
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error("Order approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve order" },
      { status: 500 }
    );
  }
}