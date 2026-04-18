import { z } from "zod";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const ActiveIngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  strength: z.string().min(1, "Strength is required"),
});

export const StorageRequirementsSchema = z.object({
  temp_min: z.number().optional(),
  temp_max: z.number().optional(),
  light_sensitive: z.boolean().optional(),
  humidity_controlled: z.boolean().optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.temp_min !== undefined && data.temp_max !== undefined) {
      return data.temp_min <= data.temp_max;
    }
    return true;
  },
  { message: "Minimum temperature must be ≤ maximum temperature", path: ["temp_min"] }
);

// ─── Core Drug Schema ─────────────────────────────────────────────────────────

export const DrugBaseSchema = z.object({
  // Identification
  drugCode: z
    .string()
    .min(2, "Drug code must be at least 2 characters")
    .max(50, "Drug code must be at most 50 characters")
    .regex(/^[A-Z0-9\-_]+$/i, "Only letters, numbers, hyphens, underscores allowed"),

  genericName: z
    .string()
    .min(2, "Generic name must be at least 2 characters")
    .max(255, "Generic name too long"),

  brandName: z
    .string()
    .max(255, "Brand name too long")
    .optional()
    .or(z.literal("")),

  // Classification
  categoryId: z
    .number({ error: "Category is required" })
    .int()
    .positive("Please select a valid category"),

  // Physical Properties
  dosageForm: z.enum(
    [
      "tablet", "capsule", "syrup", "injection", "cream", "ointment",
      "drops", "inhaler", "patch", "suppository", "powder", "solution",
      "suspension", "gel", "spray", "lozenge", "other",
    ],
    { error: "Please select a valid dosage form" }
  ),

  strength: z
    .string()
    .min(1, "Strength is required")
    .max(100, "Strength description too long"),

  packSize: z
    .number({ error: "Pack size is required" })
    .int()
    .positive("Pack size must be a positive number")
    .max(10000, "Pack size seems too large"),

  unitOfMeasure: z
    .string()
    .min(1, "Unit of measure is required")
    .max(50, "Unit of measure too long"),

  // Storage
  storageRequirements: StorageRequirementsSchema.optional().nullable(),

  storageConditionGroup: z
    .enum(["cold", "general", "controlled"])
    .optional()
    .nullable(),

  // Regulatory
  regulatoryClass: z.enum(
    ["OTC", "prescription", "controlled"],
    { error: "Please select a regulatory class" }
  ),

  isControlled: z.boolean().default(false),

  controlledSchedule: z
    .enum(["I", "II", "III", "IV", "V"])
    .optional()
    .nullable(),

  // Product Info
  manufacturer: z
    .string()
    .max(255, "Manufacturer name too long")
    .optional()
    .or(z.literal(""))
    .nullable(),

  activeIngredients: z
    .array(ActiveIngredientSchema)
    .max(20, "Too many active ingredients listed")
    .optional()
    .nullable(),

  description: z
    .string()
    .max(5000, "Description too long")
    .optional()
    .or(z.literal(""))
    .nullable(),

  imageUrl: z
    .string()
    .url("Must be a valid URL")
    .max(500)
    .optional()
    .or(z.literal(""))
    .nullable(),

  // Pricing
  unitCost: z
    .number()
    .nonnegative("Unit cost cannot be negative")
    .max(999999.99, "Unit cost too large")
    .optional()
    .nullable(),

  sellingPrice: z
    .number()
    .nonnegative("Selling price cannot be negative")
    .max(999999.99, "Selling price too large")
    .optional()
    .nullable(),

  // Reorder
  reorderPoint: z
    .number()
    .int()
    .nonnegative("Reorder point cannot be negative")
    .optional()
    .nullable(),

  reorderQuantity: z
    .number()
    .int()
    .positive("Reorder quantity must be positive")
    .optional()
    .nullable(),

  // Status
  status: z
    .enum(["active", "inactive", "discontinued"])
    .default("active"),

  discontinuedDate: z.string().datetime().optional().nullable(),
  discontinuedReason: z.string().max(1000).optional().nullable(),
  replacementDrugId: z.string().uuid().optional().nullable(),

  createdBy: z.string().uuid().optional().nullable(),
});

// ─── Cross-field refinements ──────────────────────────────────────────────────

type AnyDrugShape = Partial<z.infer<typeof DrugBaseSchema>>;

function addDrugRefinements<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .superRefine((data, ctx) => {
      const d = data as AnyDrugShape  // ✅ cast once per refinement
      if (d.regulatoryClass === "controlled" && d.isControlled !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Controlled substances must have 'Is Controlled' checked",
          path: ["isControlled"],
        });
      }
    })
    .superRefine((data, ctx) => {
      const d = data as AnyDrugShape
      if (d.isControlled && !d.controlledSchedule) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Controlled drugs must have a schedule (I–V)",
          path: ["controlledSchedule"],
        });
      }
    })
    .superRefine((data, ctx) => {
      const d = data as AnyDrugShape
      if (d.status === "discontinued" && !d.discontinuedReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please provide a reason for discontinuing this drug",
          path: ["discontinuedReason"],
        });
      }
    })
    .superRefine((data, ctx) => {
      const d = data as AnyDrugShape
      if (
        d.sellingPrice != null &&
        d.unitCost != null &&
        d.sellingPrice < d.unitCost
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selling price should not be less than unit cost",
          path: ["sellingPrice"],
        });
      }
    });
}

// ─── Exported schemas ─────────────────────────────────────────────────────────

export const DrugSchema = addDrugRefinements(DrugBaseSchema);

export const UpdateDrugSchema = addDrugRefinements(DrugBaseSchema.partial());

// ─── Query Params Schema ──────────────────────────────────────────────────────

export const DrugQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "discontinued", "all"]).default("all"),
  categoryId: z.coerce.number().optional(),
  regulatoryClass: z.enum(["OTC", "prescription", "controlled", "all"]).default("all"),
  isControlled: z.enum(["true", "false", "all"]).default("all"),
  storageConditionGroup: z.enum(["cold", "general", "controlled", "all"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type DrugFormValues = z.infer<typeof DrugSchema>;
export type UpdateDrugFormValues = z.infer<typeof UpdateDrugSchema>;
export type DrugQueryParams = z.infer<typeof DrugQuerySchema>;