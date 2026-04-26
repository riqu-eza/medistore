// app/api/dispatch/queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDispatchQueue } from "@/server/services/dispatch.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canDispatch =
      session.user.permissions?.includes(PERMISSIONS.ORDERS_DISPATCH) ||
      session.user.permissions?.includes(PERMISSIONS.ALL);

    if (!canDispatch) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admins see all stores; store users see only their store
    const storeId = session.user.permissions?.includes(PERMISSIONS.ALL)
      ? req.nextUrl.searchParams.get("storeId") ?? undefined
      : session.user.storeId ?? undefined;

    const queue = await getDispatchQueue(storeId);

    return NextResponse.json({ success: true, data: queue });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load dispatch queue";
    console.error("[dispatch/queue]", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}