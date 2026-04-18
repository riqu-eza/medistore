"use client";

import { useEffect, useRef } from "react";
import type { DrugCategory } from "@/types/drug";
import { toast } from "sonner";
import DrugForm from "./drugForm";
import { DrugFormValues } from "@/lib/validators/drug";
import { useDrug,useCreateDrug, useUpdateDrug, useDrugById } from "@/hooks/use-drug";

interface DrugModalProps {
  mode: "create" | "edit";
  drugId?: string | null;
  categories: DrugCategory[];
  onClose: () => void;
}

export default function DrugModal({ mode, drugId, categories, onClose }: DrugModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // const { data: drug, isLoading: drugLoading } = useDrug(drugId ?? null);
  const createMutation = useCreateDrug();
  const updateMutation = useUpdateDrug();
const { data: drug, isLoading: drugLoading } = useDrugById(drugId ?? null);
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const serverErrors =
    (createMutation.error as { details?: Record<string, string[]> } | null)?.details ??
    (updateMutation.error as { details?: Record<string, string[]> } | null)?.details;

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleSubmit(data: DrugFormValues) {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(data);
        toast.success("Drug created successfully");
      } else if (drugId) {
        await updateMutation.mutateAsync({ id: drugId, data });
        toast.success("Drug updated successfully");
      }
      onClose();
    } catch (err) {
      const error = err as Error & { details?: Record<string, string[]> };
      if (!error.details) {
        toast.error(error.message || "Something went wrong");
      }
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {mode === "create" ? "Add New Drug" : "Edit Drug"}
            </h2>
            {mode === "edit" && drug && (
              <p className="text-xs text-slate-400 mt-0.5">{drug.genericName} · {drug.drugCode}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {mode === "edit" && drugLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-6 h-6 text-teal-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="ml-3 text-sm text-slate-500">Loading drug data…</span>
          </div>
        ) : (
          <DrugForm
            mode={mode}
            defaultValues={drug}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={isLoading}
            serverErrors={serverErrors}
          />
        )}
      </div>
    </div>
  );
}