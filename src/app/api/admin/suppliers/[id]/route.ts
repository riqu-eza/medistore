/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// SUPPLIERS API - Individual Supplier Operations
// File: src/app/api/suppliers/[id]/route.ts
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

// ============================================================================
// GET SINGLE SUPPLIER
// ============================================================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.SUPPLIERS_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        supplierDrugs: {
          include: {
            drug: {
              select: {
                id: true,
                drugCode: true,
                genericName: true,
                brandName: true,
                dosageForm: true,
                strength: true,
              },
            },
          },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
        grns: {
          take: 10,
          orderBy: { receivedDate: "desc" },
          select: {
            id: true,
            grnNumber: true,
            receivedDate: true,
            status: true,
            totalValue: true,
          },
        },
        _count: {
          select: {
            supplierDrugs: true,
            grns: true,
            batches: true,
            documents: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 },
    );
  }
}

// ============================================================================
// UPDATE SUPPLIER
// ============================================================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !hasPermission(session.user.permissions, PERMISSIONS.SUPPLIERS_UPDATE)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
const { id } = await context.params
    // Get existing supplier
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: id },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // If code is being changed, check uniqueness
    if (body.code && body.code !== existingSupplier.code) {
      const codeExists = await prisma.supplier.findUnique({
        where: { code: body.code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Supplier code already exists" },
          { status: 400 },
        );
      }
    }

    // Build update data
    const updateData: any = {};

    // String fields
    const stringFields = [
      "name",
      "code",
      "companyType",
      "contactPerson",
      "email",
      "phone",
      "alternatePhone",
      "website",
      "licenseNumber",
      "taxId",
      "notes",
    ];

    stringFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    });

    // Date fields
    if (body.licenseExpiry !== undefined) {
      updateData.licenseExpiry = body.licenseExpiry
        ? new Date(body.licenseExpiry)
        : null;
    }

    // JSON fields
    if (body.address !== undefined) {
      updateData.address = body.address;
    }

    if (body.bankDetails !== undefined) {
      updateData.bankDetails = body.bankDetails;
    }

    // Numeric fields
    if (body.rating !== undefined) {
      updateData.rating = body.rating;
    }

    if (body.onTimeDeliveryRate !== undefined) {
      updateData.onTimeDeliveryRate = body.onTimeDeliveryRate;
    }

    if (body.qualityScore !== undefined) {
      updateData.qualityScore = body.qualityScore;
    }

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id: id },
      data: updateData,
      include: {
        _count: {
          select: {
            supplierDrugs: true,
            grns: true,
            documents: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "update",
        entityType: "Supplier",
        entityId: supplier.id,
        beforeValue: existingSupplier,
        afterValue: supplier,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE SUPPLIER
// ============================================================================

export async function DELETE(
  request: NextRequest,
    context: { params:Promise <{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !hasPermission(session.user.permissions, PERMISSIONS.SUPPLIERS_DELETE)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
const { id } = await context.params
    // Check if supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: id },
      include: {
        _count: {
          select: {
            grns: true,
            batches: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    // Check if supplier has dependencies
    if (supplier._count.grns > 0 || supplier._count.batches > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete supplier with existing GRNs or batches. Consider suspending instead.",
        },
        { status: 400 },
      );
    }

    // Delete supplier (cascade will handle related records)
    await prisma.supplier.delete({
      where: { id: id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "delete",
        entityType: "Supplier",
        entityId: id,
        beforeValue: supplier,
      },
    });

    return NextResponse.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 },
    );
  }
}
