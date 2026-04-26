/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { confirmDispatch } from "@/server/services/dispatch.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: orderId } = await params;
    const body = await req.json();
    const { driverName, vehicleNumber, driverPhone, notes } = body;

    const dispatchNote = await confirmDispatch(orderId, session.user.id, {
      driverName,
      vehicleNumber,
      driverPhone,
      notes,
    });

    return NextResponse.json({ success: true, data: dispatchNote });
  } catch (error: any) {
    console.error("Dispatch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}