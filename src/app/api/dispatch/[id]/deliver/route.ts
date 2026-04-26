// app/api/dispatch/[id]/deliver/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { confirmDelivery } from "@/server/services/dispatch.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Store managers and dispatchers can confirm delivery
    const canConfirm =
      session.user.permissions?.includes(PERMISSIONS.ORDERS_DISPATCH) ||
      session.user.permissions?.includes(PERMISSIONS.ALL);

    if (!canConfirm) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id: dispatchNoteId } = await params;
    const body = await req.json();

    if (!body.receiverName?.trim()) {
      return NextResponse.json(
        { error: "Receiver name is required to confirm delivery" },
        { status: 400 }
      );
    }

    await confirmDelivery(dispatchNoteId, session.user.id, {
      receiverName: body.receiverName.trim(),
      proofOfDeliveryUrl: body.proofOfDeliveryUrl?.trim(),
      deliveryNotes: body.deliveryNotes?.trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Delivery confirmed. Order marked as completed.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Delivery confirmation failed";
    console.error("[deliver] error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}