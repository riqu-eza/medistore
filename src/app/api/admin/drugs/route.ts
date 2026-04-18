import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { DrugQuerySchema, DrugSchema } from "@/lib/validators/drug";
import { getDrugs , createDrug,
  getDrugByCode,} from "@/server/services/drug.service";

// ─── GET /api/drugs ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const rawParams = Object.fromEntries(searchParams.entries());
    const params = DrugQuerySchema.parse(rawParams);

    const result = await getDrugs(params);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[GET /api/drugs]", err);
    return NextResponse.json(
      { error: "Failed to fetch drugs" },
      { status: 500 }
    );
  }
}

// ─── POST /api/drugs ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = DrugSchema.parse(body);

    // Unique drug code check
    const existing = await getDrugByCode(data.drugCode);
    if (existing) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: { drugCode: [`Drug code "${data.drugCode}" is already in use`] },
        },
        { status: 409 }
      );
    }

    const drug = await createDrug(data);
    return NextResponse.json(drug, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.flatten().fieldErrors },
        { status: 422 }
      );
    }
    console.error("[POST /api/drugs]", err);
    return NextResponse.json(
      { error: "Failed to create drug" },
      { status: 500 }
    );
  }
}