// app/api/orders/[id]/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { confirmDispatch } from "@/server/services/dispatch.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[dispatch] user:", session.user);
    const canDispatch =
      session.user.permissions?.includes(PERMISSIONS.ORDERS_DISPATCH) ||
      session.user.permissions?.includes(PERMISSIONS.ALL);

    if (!canDispatch) {
      return NextResponse.json({ error: "Insufficient permissions to dispatch orders" }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await req.json();

    // Validate required fields
    if (!body.driverName?.trim()) {
      return NextResponse.json({ error: "Driver name is required" }, { status: 400 });
    }
    if (!body.vehicleNumber?.trim()) {
      return NextResponse.json({ error: "Vehicle number is required" }, { status: 400 });
    }
    if (!body.packagingVerified) {
      return NextResponse.json({ error: "Packaging verification is required" }, { status: 400 });
    }
    if (!body.labelsVerified) {
      return NextResponse.json({ error: "Label verification is required" }, { status: 400 });
    }

    const result = await confirmDispatch(orderId, session.user.id, {
      driverName: body.driverName.trim(),
      vehicleNumber: body.vehicleNumber.trim(),
      driverPhone: body.driverPhone?.trim(),
      notes: body.notes?.trim(),
      temperatureAtDispatch: body.temperatureAtDispatch
        ? Number(body.temperatureAtDispatch)
        : undefined,
      packagingVerified: Boolean(body.packagingVerified),
      labelsVerified: Boolean(body.labelsVerified),
      documentationComplete: Boolean(body.documentationComplete),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Dispatch failed";
    console.error("[dispatch] error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}