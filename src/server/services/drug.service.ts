import { DrugFormValues, DrugQueryParams } from "@/lib/validators/drug";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helper: build where clause from filters ──────────────────────────────────
function buildWhereClause(params: DrugQueryParams): Prisma.DrugWhereInput {
  const where: Prisma.DrugWhereInput = {};

  if (params.search) {
    where.OR = [
      { genericName: { contains: params.search, mode: "insensitive" } },
      { brandName: { contains: params.search, mode: "insensitive" } },
      { drugCode: { contains: params.search, mode: "insensitive" } },
      { manufacturer: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.status && params.status !== "all") {
    where.status = params.status;
  }

  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params.regulatoryClass && params.regulatoryClass !== "all") {
    where.regulatoryClass = params.regulatoryClass;
  }

  if (params.isControlled !== "all") {
    where.isControlled = params.isControlled === "true";
  }

  if (params.storageConditionGroup && params.storageConditionGroup !== "all") {
    where.storageConditionGroup = params.storageConditionGroup;
  }

  return where;
}

// ─── Helper: build orderBy from params ───────────────────────────────────────
function buildOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc"
): Prisma.DrugOrderByWithRelationInput {
  const allowedFields = [
    "drugCode", "genericName", "brandName", "status",
    "regulatoryClass", "dosageForm", "createdAt", "updatedAt",
    "sellingPrice", "unitCost",
  ];
  const field = allowedFields.includes(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder };
}

// ─── READ: paginated list ─────────────────────────────────────────────────────
export async function getDrugs(params: DrugQueryParams) {
  const where = buildWhereClause(params);
  const orderBy = buildOrderBy(params.sortBy, params.sortOrder);
  const skip = (params.page - 1) * params.pageSize;

  const [data, total] = await Promise.all([
    prisma.drug.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      include: {
        category: {
          select: { id: true, name: true, categoryType: true, code: true },
        },
      },
    }),
    prisma.drug.count({ where }),
  ]);

  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

// ─── READ: single drug by id ──────────────────────────────────────────────────
export async function getDrugById(id: string) {
  return prisma.drug.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });
}

// ─── READ: single drug by code ────────────────────────────────────────────────
export async function getDrugByCode(code: string, excludeId?: string) {
  return prisma.drug.findFirst({
    where: {
      drugCode: { equals: code, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

// ─── CREATE ───────────────────────────────────────────────────────────────────
export async function createDrug(data: DrugFormValues) {
  return prisma.drug.create({
    data: {
      drugCode: data.drugCode,
      genericName: data.genericName,
      brandName: data.brandName || null,
      categoryId: data.categoryId,
      dosageForm: data.dosageForm,
      strength: data.strength,
      packSize: data.packSize,
      unitOfMeasure: data.unitOfMeasure,
      storageRequirements: data.storageRequirements ?? Prisma.JsonNull,
      storageConditionGroup: data.storageConditionGroup ?? null,
      regulatoryClass: data.regulatoryClass,
      isControlled: data.isControlled,
      controlledSchedule: data.controlledSchedule ?? null,
      manufacturer: data.manufacturer || null,
      activeIngredients: data.activeIngredients ?? Prisma.JsonNull,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      unitCost: data.unitCost ?? null,
      sellingPrice: data.sellingPrice ?? null,
      reorderPoint: data.reorderPoint ?? null,
      reorderQuantity: data.reorderQuantity ?? null,
      status: data.status,
      discontinuedDate: data.discontinuedDate ? new Date(data.discontinuedDate) : null,
      discontinuedReason: data.discontinuedReason ?? null,
      replacementDrugId: data.replacementDrugId ?? null,
      createdBy: data.createdBy ?? null,
    },
    include: { category: true },
  });
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export async function updateDrug(id: string, data: Partial<DrugFormValues>) {
  const updateData: Prisma.DrugUpdateInput = {};

  if (data.drugCode !== undefined) updateData.drugCode = data.drugCode;
  if (data.genericName !== undefined) updateData.genericName = data.genericName;
  if (data.brandName !== undefined) updateData.brandName = data.brandName || null;
  if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
  if (data.dosageForm !== undefined) updateData.dosageForm = data.dosageForm;
  if (data.strength !== undefined) updateData.strength = data.strength;
  if (data.packSize !== undefined) updateData.packSize = data.packSize;
  if (data.unitOfMeasure !== undefined) updateData.unitOfMeasure = data.unitOfMeasure;
  if (data.storageRequirements !== undefined) updateData.storageRequirements = data.storageRequirements ?? Prisma.JsonNull;
  if (data.storageConditionGroup !== undefined) updateData.storageConditionGroup = data.storageConditionGroup ?? null;
  if (data.regulatoryClass !== undefined) updateData.regulatoryClass = data.regulatoryClass;
  if (data.isControlled !== undefined) updateData.isControlled = data.isControlled;
  if (data.controlledSchedule !== undefined) updateData.controlledSchedule = data.controlledSchedule ?? null;
  if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer || null;
  if (data.activeIngredients !== undefined) updateData.activeIngredients = data.activeIngredients ?? Prisma.JsonNull;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
  if (data.unitCost !== undefined) updateData.unitCost = data.unitCost ?? null;
  if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice ?? null;
  if (data.reorderPoint !== undefined) updateData.reorderPoint = data.reorderPoint ?? null;
  if (data.reorderQuantity !== undefined) updateData.reorderQuantity = data.reorderQuantity ?? null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.discontinuedDate !== undefined) updateData.discontinuedDate = data.discontinuedDate ? new Date(data.discontinuedDate) : null;
  if (data.discontinuedReason !== undefined) updateData.discontinuedReason = data.discontinuedReason ?? null;
  if (data.replacementDrugId !== undefined) updateData.replacementDrugId = data.replacementDrugId ?? null;

  return prisma.drug.update({
    where: { id },
    data: updateData,
    include: { category: true },
  });
}

// ─── DELETE (hard delete) ─────────────────────────────────────────────────────
export async function deleteDrug(id: string) {
  return prisma.drug.delete({ where: { id } });
}

// ─── SOFT DELETE: mark as discontinued ───────────────────────────────────────
export async function discontinueDrug(
  id: string,
  reason: string,
  replacementDrugId?: string
) {
  return prisma.drug.update({
    where: { id },
    data: {
      status: "discontinued",
      discontinuedDate: new Date(),
      discontinuedReason: reason,
      replacementDrugId: replacementDrugId ?? null,
    },
  });
}

// ─── Bulk status update ───────────────────────────────────────────────────────
export async function bulkUpdateStatus(
  ids: string[],
  status: "active" | "inactive"
) {
  return prisma.drug.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
}

// ─── Stats for dashboard ──────────────────────────────────────────────────────
export async function getDrugStats() {
  const [total, active, controlled, lowStock] = await Promise.all([
    prisma.drug.count(),
    prisma.drug.count({ where: { status: "active" } }),
    prisma.drug.count({ where: { isControlled: true } }),
    prisma.drug.count({
      where: {
        status: "active",
        reorderPoint: { not: null },
      },
    }),
  ]);

  return { total, active, controlled, lowStock };
}