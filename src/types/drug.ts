// ─────────────────────────────────────────────────────────────────────────────
// Drug Types — derived from Prisma schema
// ─────────────────────────────────────────────────────────────────────────────

export type DrugStatus = "active" | "inactive" | "discontinued";
export type RegulatoryClass = "OTC" | "prescription" | "controlled";
export type ControlledSchedule = "I" | "II" | "III" | "IV" | "V";
export type StorageConditionGroup = "cold" | "general" | "controlled";
export type CategoryType = "therapeutic" | "pharmacological" | "storage";

export interface ActiveIngredient {
  name: string;
  strength: string;
}

export interface StorageRequirements {
  temp_min?: number;
  temp_max?: number;
  light_sensitive?: boolean;
  humidity_controlled?: boolean;
  notes?: string;
}

// ─── Core Drug type (matches DB) ─────────────────────────────────────────────
export interface Drug {
  id: string;
  drugCode: string;
  genericName: string;
  brandName?: string | null;

  // Classification
  categoryId: number;
  category?: DrugCategory;

  // Physical
  dosageForm: string;
  strength: string;
  packSize: number;
  unitOfMeasure: string;

  // Storage
  storageRequirements?: StorageRequirements | null;
  storageConditionGroup?: StorageConditionGroup | null;

  // Regulatory
  regulatoryClass: RegulatoryClass;
  isControlled: boolean;
  controlledSchedule?: ControlledSchedule | null;

  // Product Info
  manufacturer?: string | null;
  activeIngredients?: ActiveIngredient[] | null;
  description?: string | null;
  imageUrl?: string | null;

  // Pricing
  unitCost?: number | null;
  sellingPrice?: number | null;

  // Reorder
  reorderPoint?: number | null;
  reorderQuantity?: number | null;

  // Status
  status: DrugStatus;
  discontinuedDate?: string | null;
  discontinuedReason?: string | null;
  replacementDrugId?: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface DrugCategory {
  id: number;
  name: string;
  description?: string | null;
  code?: string | null;
  parentId?: number | null;
  categoryType: CategoryType;
  isActive: boolean;
}

// ─── API Payload types ────────────────────────────────────────────────────────
export type CreateDrugPayload = Omit<Drug,
  "id" | "createdAt" | "updatedAt" | "category"
>;

export type UpdateDrugPayload = Partial<CreateDrugPayload>;

// ─── API Response types ───────────────────────────────────────────────────────
export interface PaginatedDrugs {
  data: Drug[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

// ─── Filter / Query types ─────────────────────────────────────────────────────
export interface DrugFilters {
  search?: string;
  status?: DrugStatus | "all";
  categoryId?: number | "all";
  regulatoryClass?: RegulatoryClass | "all";
  isControlled?: boolean | "all";
  storageConditionGroup?: StorageConditionGroup | "all";
  page?: number;
  pageSize?: number;
  sortBy?: keyof Drug;
  sortOrder?: "asc" | "desc";
}