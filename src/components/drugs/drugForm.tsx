"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Drug, DrugCategory } from "@/types/drug";
import { DrugFormValues, DrugSchema } from "@/lib/validators/drug";

interface DrugFormProps {
  defaultValues?: Partial<Drug>;
  categories: DrugCategory[];
  onSubmit: (data: DrugFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  serverErrors?: Record<string, string[]>;
  mode: "create" | "edit";
}

const DOSAGE_FORMS = [
  "tablet", "capsule", "syrup", "injection", "cream", "ointment",
  "drops", "inhaler", "patch", "suppository", "powder", "solution",
  "suspension", "gel", "spray", "lozenge", "other",
];

const UNITS = ["tablet", "capsule", "ml", "mg", "vial", "sachet", "patch", "unit", "g"];

function Field({
  label, error, required, children, hint,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const { error, className, ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 transition-all
        ${error
          ? "border-rose-400 focus:ring-rose-200"
          : "border-slate-200 focus:ring-teal-200 focus:border-teal-400"
        } ${className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  const { error, className, children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 transition-all appearance-none
        ${error
          ? "border-rose-400 focus:ring-rose-200"
          : "border-slate-200 focus:ring-teal-200 focus:border-teal-400"
        } ${className ?? ""}`}
    >
      {children}
    </select>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  const { error, className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 transition-all resize-none
        ${error
          ? "border-rose-400 focus:ring-rose-200"
          : "border-slate-200 focus:ring-teal-200 focus:border-teal-400"
        } ${className ?? ""}`}
    />
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="pb-3 border-b border-slate-100 mb-4">
      <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
      {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
    </div>
  );
}

export default function DrugForm({
  defaultValues,
  categories,
  onSubmit,
  onCancel,
  isLoading,
  serverErrors,
  mode,
}: DrugFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DrugFormValues>({
    resolver: zodResolver(DrugSchema),
    defaultValues: {
      drugCode: defaultValues?.drugCode ?? "",
      genericName: defaultValues?.genericName ?? "",
      brandName: defaultValues?.brandName ?? "",
      categoryId: defaultValues?.categoryId ?? undefined,
      dosageForm: (defaultValues?.dosageForm as DrugFormValues["dosageForm"]) ?? "tablet",
      strength: defaultValues?.strength ?? "",
      packSize: defaultValues?.packSize ?? undefined,
      unitOfMeasure: defaultValues?.unitOfMeasure ?? "tablet",
      regulatoryClass: (defaultValues?.regulatoryClass as DrugFormValues["regulatoryClass"]) ?? "OTC",
      isControlled: defaultValues?.isControlled ?? false,
      controlledSchedule: (defaultValues?.controlledSchedule as DrugFormValues["controlledSchedule"]) ?? null,
      storageConditionGroup: (defaultValues?.storageConditionGroup as DrugFormValues["storageConditionGroup"]) ?? null,
      manufacturer: defaultValues?.manufacturer ?? "",
      description: defaultValues?.description ?? "",
      unitCost: defaultValues?.unitCost ?? undefined,
      sellingPrice: defaultValues?.sellingPrice ?? undefined,
      reorderPoint: defaultValues?.reorderPoint ?? undefined,
      reorderQuantity: defaultValues?.reorderQuantity ?? undefined,
      status: (defaultValues?.status as DrugFormValues["status"]) ?? "active",
      discontinuedReason: defaultValues?.discontinuedReason ?? "",
      activeIngredients: (defaultValues?.activeIngredients as DrugFormValues["activeIngredients"]) ?? [],
    },
  });

  const { fields: ingredientFields, append: addIngredient, remove: removeIngredient } =
    useFieldArray({ control, name: "activeIngredients" as never });

  const watchIsControlled = watch("isControlled");
  const watchStatus = watch("status");
  const watchRegulatoryClass = watch("regulatoryClass");

  // Sync server errors into form
  useEffect(() => {
    if (!serverErrors) return;
    (Object.entries(serverErrors) as [keyof DrugFormValues, string[]][]).forEach(
      ([field, messages]) => {
        setError(field, { type: "server", message: messages[0] });
      }
    );
  }, [serverErrors, setError]);

  // Auto-check isControlled when regulatory class is controlled
  const isControlledForced = watchRegulatoryClass === "controlled";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-0" noValidate>
      <div className="overflow-y-auto max-h-[65vh] px-6 py-5 flex flex-col gap-6">

        {/* ── Section 1: Identification ── */}
        <div>
          <SectionHeader title="Identification" description="Core drug identifiers and names" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Drug Code" required error={errors.drugCode?.message}>
              <Input
                {...register("drugCode")}
                placeholder="e.g. AMX-500"
                error={!!errors.drugCode}
                style={{ textTransform: "uppercase" }}
              />
            </Field>
            <Field label="Category" required error={errors.categoryId?.message}>
              <Select
                {...register("categoryId", { valueAsNumber: true })}
                error={!!errors.categoryId}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Generic Name" required error={errors.genericName?.message}>
              <Input
                {...register("genericName")}
                placeholder="e.g. Amoxicillin"
                error={!!errors.genericName}
              />
            </Field>
            <Field label="Brand Name" error={errors.brandName?.message}>
              <Input
                {...register("brandName")}
                placeholder="e.g. Amoxil"
                error={!!errors.brandName}
              />
            </Field>
          </div>
        </div>

        {/* ── Section 2: Physical Properties ── */}
        <div>
          <SectionHeader title="Physical Properties" description="Dosage form, strength and packaging" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Dosage Form" required error={errors.dosageForm?.message}>
              <Select {...register("dosageForm")} error={!!errors.dosageForm}>
                {DOSAGE_FORMS.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Strength" required error={errors.strength?.message} hint='e.g. "500mg" or "10ml/2mg"'>
              <Input
                {...register("strength")}
                placeholder="500mg"
                error={!!errors.strength}
              />
            </Field>
            <Field label="Pack Size" required error={errors.packSize?.message} hint="Number of units per pack">
              <Input
                {...register("packSize", { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="30"
                error={!!errors.packSize}
              />
            </Field>
            <Field label="Unit of Measure" required error={errors.unitOfMeasure?.message}>
              <Select {...register("unitOfMeasure")} error={!!errors.unitOfMeasure}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </Select>
            </Field>
            <Field label="Manufacturer" error={errors.manufacturer?.message}>
              <Input
                {...register("manufacturer")}
                placeholder="e.g. GlaxoSmithKline"
                error={!!errors.manufacturer}
              />
            </Field>
          </div>
        </div>

        {/* ── Section 3: Active Ingredients ── */}
        <div>
          <SectionHeader title="Active Ingredients" description="List all active compounds" />
          <div className="flex flex-col gap-2">
            {(ingredientFields as { id: string }[]).map((field, idx) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    {...register(`activeIngredients.${idx}.name` as const)}
                    placeholder="Ingredient name"
                    error={!!errors.activeIngredients?.[idx]?.name}
                  />
                  {errors.activeIngredients?.[idx]?.name && (
                    <p className="text-xs text-rose-500 mt-0.5">
                      {errors.activeIngredients[idx].name?.message}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    {...register(`activeIngredients.${idx}.strength` as const)}
                    placeholder="Strength (e.g. 500mg)"
                    error={!!errors.activeIngredients?.[idx]?.strength}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  className="mt-2 text-rose-400 hover:text-rose-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addIngredient({ name: "", strength: "" })}
              className="self-start text-xs font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-2"
            >
              + Add ingredient
            </button>
          </div>
        </div>

        {/* ── Section 4: Regulatory ── */}
        <div>
          <SectionHeader title="Regulatory Classification" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Regulatory Class" required error={errors.regulatoryClass?.message}>
              <Select {...register("regulatoryClass")} error={!!errors.regulatoryClass}>
                <option value="OTC">OTC (Over the Counter)</option>
                <option value="prescription">Prescription Only</option>
                <option value="controlled">Controlled Substance</option>
              </Select>
            </Field>
            <Field label="Controlled Schedule" error={errors.controlledSchedule?.message}>
              <Select
                {...register("controlledSchedule")}
                disabled={!watchIsControlled && !isControlledForced}
                error={!!errors.controlledSchedule}
              >
                <option value="">None</option>
                {["I", "II", "III", "IV", "V"].map((s) => (
                  <option key={s} value={s}>Schedule {s}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register("isControlled")}
                  disabled={isControlledForced}
                  className="w-4 h-4 rounded border-slate-300 accent-teal-600"
                />
                <span className="text-sm font-medium text-slate-700">
                  Is Controlled Substance
                  {isControlledForced && (
                    <span className="ml-2 text-xs text-slate-400">(auto-set for controlled class)</span>
                  )}
                </span>
              </label>
              {errors.isControlled && (
                <p className="text-xs text-rose-500 mt-1">{errors.isControlled.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 5: Storage ── */}
        <div>
          <SectionHeader title="Storage & Handling" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Storage Condition Group" error={errors.storageConditionGroup?.message}>
              <Select {...register("storageConditionGroup")} error={!!errors.storageConditionGroup}>
                <option value="">Not specified</option>
                <option value="general">General (Room Temp)</option>
                <option value="cold">Cold Chain (Refrigerated)</option>
                <option value="controlled">Controlled Environment</option>
              </Select>
            </Field>
            <Field label="Min Temperature (°C)" error={errors.storageRequirements?.temp_min?.message}>
              <Input
                {...register("storageRequirements.temp_min", { valueAsNumber: true })}
                type="number"
                placeholder="e.g. 2"
              />
            </Field>
            <Field label="Max Temperature (°C)" error={errors.storageRequirements?.temp_max?.message}>
              <Input
                {...register("storageRequirements.temp_max", { valueAsNumber: true })}
                type="number"
                placeholder="e.g. 8"
              />
            </Field>
            <div className="sm:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                <input
                  type="checkbox"
                  {...register("storageRequirements.light_sensitive")}
                  className="w-4 h-4 rounded accent-teal-600"
                />
                Light Sensitive
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                <input
                  type="checkbox"
                  {...register("storageRequirements.humidity_controlled")}
                  className="w-4 h-4 rounded accent-teal-600"
                />
                Humidity Controlled
              </label>
            </div>
          </div>
        </div>

        {/* ── Section 6: Pricing & Reorder ── */}
        <div>
          <SectionHeader title="Pricing & Reorder" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Unit Cost (KES)" error={errors.unitCost?.message}>
              <Input
                {...register("unitCost", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                error={!!errors.unitCost}
              />
            </Field>
            <Field label="Selling Price (KES)" error={errors.sellingPrice?.message}>
              <Input
                {...register("sellingPrice", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                error={!!errors.sellingPrice}
              />
            </Field>
            <Field label="Reorder Point" error={errors.reorderPoint?.message} hint="Min stock level">
              <Input
                {...register("reorderPoint", { valueAsNumber: true })}
                type="number"
                min={0}
                placeholder="50"
                error={!!errors.reorderPoint}
              />
            </Field>
            <Field label="Reorder Quantity" error={errors.reorderQuantity?.message} hint="Qty to order">
              <Input
                {...register("reorderQuantity", { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="200"
                error={!!errors.reorderQuantity}
              />
            </Field>
          </div>
        </div>

        {/* ── Section 7: Status ── */}
        <div>
          <SectionHeader title="Status" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Drug Status" required error={errors.status?.message}>
              <Select {...register("status")} error={!!errors.status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </Select>
            </Field>
            {watchStatus === "discontinued" && (
              <>
                <Field label="Discontinued Date" error={errors.discontinuedDate?.message}>
                  <Input {...register("discontinuedDate")} type="date" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Discontinuation Reason" required error={errors.discontinuedReason?.message}>
                    <Textarea
                      {...register("discontinuedReason")}
                      rows={2}
                      placeholder="Reason for discontinuing…"
                      error={!!errors.discontinuedReason}
                    />
                  </Field>
                </div>
                <Field label="Replacement Drug ID" error={errors.replacementDrugId?.message} hint="UUID of the replacement drug">
                  <Input
                    {...register("replacementDrugId")}
                    placeholder="UUID of replacement"
                    error={!!errors.replacementDrugId}
                  />
                </Field>
              </>
            )}
          </div>
        </div>

        {/* ── Section 8: Description ── */}
        <div>
          <SectionHeader title="Additional Information" />
          <Field label="Description" error={errors.description?.message}>
            <Textarea
              {...register("description")}
              rows={3}
              placeholder="Drug description, usage notes, warnings…"
              error={!!errors.description}
            />
          </Field>
        </div>
      </div>

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="px-6 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {(isLoading || isSubmitting) && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {mode === "create" ? "Create Drug" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}