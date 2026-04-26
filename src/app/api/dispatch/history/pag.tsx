// app/api/dispatch/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDispatchHistory } from "@/server/services/dispatch.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.permissions?.includes(PERMISSIONS.ALL);
    const params = req.nextUrl.searchParams;

    const storeId = isAdmin
      ? (params.get("storeId") ?? undefined)
      : (session.user.storeId ?? undefined);

    const history = await getDispatchHistory({
      storeId,
      status: params.get("status") ?? undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : 50,
    });

    return NextResponse.json({ success: true, data: history });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load history";
    console.error("[dispatch/history]", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}