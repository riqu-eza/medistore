import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { UpdateDrugSchema } from "@/lib/validators/drug";
import {
  deleteDrug,
  getDrugById,
  updateDrug,
  discontinueDrug,
  getDrugByCode,
} from "@/server/services/drug.service";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/drugs/[id] ──────────────────────────────────────────────────────
export async function GET(_req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params;
 
  try {
    const drug = await getDrugById(id);

    if (!drug) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    }

    return NextResponse.json(drug);
  } catch (err) {
    console.error(`[GET /api/admin/drugs/${id}]`, err);
    return NextResponse.json(
      { error: "Failed to fetch drug" },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/drugs/[id] ────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, ctx: RouteContext) {
      const { id } = await ctx.params;

  try {

    const existing = await getDrugById(id);
    if (!existing) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = UpdateDrugSchema.parse(body);

    // If drugCode is being changed, ensure uniqueness
    if (data.drugCode && data.drugCode !== existing.drugCode) {
      const codeConflict = await getDrugByCode(data.drugCode, id);
      if (codeConflict) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: {
              drugCode: [`Drug code "${data.drugCode}" is already in use`],
            },
          },
          { status: 409 },
        );
      }
    }

    const updated = await updateDrug(id, data);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.flatten().fieldErrors },
        { status: 422 },
      );
    }
    console.error(`[PATCH /api/admin/drugs/$[id]]`, err);
    return NextResponse.json(
      { error: "Failed to update drug" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/drugs/[id] ───────────────────────────────────────────────────
export async function DELETE(req: NextRequest, ctx: RouteContext) {
    const { id } = await ctx.params;
  
  try {
    const { searchParams } = new URL(req.url);
    const soft = searchParams.get("soft") === "true";

    const existing = await getDrugById(id);
    if (!existing) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    }

    if (soft) {
      // Soft delete: discontinue
      const body = await req.json().catch(() => ({}));
      const { reason, replacementDrugId } = z
        .object({
          reason: z.string().min(1, "Reason is required for discontinuation"),
          replacementDrugId: z.string().uuid().optional(),
        })
        .parse(body);

      const discontinued = await discontinueDrug(id, reason, replacementDrugId);
      return NextResponse.json(discontinued);
    }

    // Hard delete
    await deleteDrug(id);
    return NextResponse.json(
      { message: "Drug deleted successfully" },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.flatten().fieldErrors },
        { status: 422 },
      );
    }
    console.error(`[DELETE /api/admin/drugs/${id}]`, err);
    return NextResponse.json(
      { error: "Failed to delete drug" },
      { status: 500 },
    );
  }
}
