"use client";

import { useState, useEffect, useRef } from "react";
import type { Drug } from "@/types/drug";
import { toast } from "sonner";
import { useDeleteDrug, useDiscontinueDrug } from "@/hooks/use-drug";

interface DeleteDialogProps {
  drug: Drug;
  onClose: () => void;
}

export default function DeleteDialog({ drug, onClose }: DeleteDialogProps) {
  const [mode, setMode] = useState<"choose" | "discontinue" | "hard">("choose");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const deleteMutation = useDeleteDrug();
  const discontinueMutation = useDiscontinueDrug();

  const isLoading = deleteMutation.isPending || discontinueMutation.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleHardDelete() {
    try {
      await deleteMutation.mutateAsync(drug.id);
      toast.success(`"${drug.genericName}" permanently deleted`);
      onClose();
    } catch {
      toast.error("Failed to delete drug");
    }
  }

  async function handleDiscontinue() {
    if (!reason.trim()) {
      setReasonError("Please provide a reason for discontinuation");
      return;
    }
    try {
      await discontinueMutation.mutateAsync({ id: drug.id, reason });
      toast.success(`"${drug.genericName}" marked as discontinued`);
      onClose();
    } catch {
      toast.error("Failed to discontinue drug");
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-black backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Remove Drug</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {drug.genericName} · <span className="font-mono">{drug.drugCode}</span>
          </p>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {mode === "choose" && (
            <>
              <p className="text-sm text-slate-600">
                How would you like to remove this drug from the system?
              </p>

              <button
                onClick={() => setMode("discontinue")}
                className="w-full flex flex-col gap-1 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-bold text-amber-800 group-hover:text-amber-900">
                    Discontinue (Recommended)
                  </span>
                </div>
                <p className="text-xs text-amber-700 pl-7">
                  Marks the drug as discontinued. Preserves all history, batches, and records. Reversible.
                </p>
              </button>

              <button
                onClick={() => setMode("hard")}
                className="w-full flex flex-col gap-1 p-4 rounded-xl border-2 border-rose-200 bg-rose-50 hover:border-rose-400 text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗑️</span>
                  <span className="text-sm font-bold text-rose-800 group-hover:text-rose-900">
                    Permanently Delete
                  </span>
                </div>
                <p className="text-xs text-rose-700 pl-7">
                  Removes the drug permanently. Cannot be undone. Will fail if related records exist.
                </p>
              </button>
            </>
          )}

          {mode === "discontinue" && (
            <>
              <p className="text-sm text-slate-600">
                Provide a reason for discontinuing{" "}
                <strong>{drug.genericName}</strong>. This will be recorded in the audit trail.
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
                  rows={3}
                  placeholder="e.g. Replaced by updated formulation, regulatory withdrawal…"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none transition-all
                    ${reasonError ? "border-rose-400 focus:ring-rose-200" : "border-slate-200 focus:ring-amber-200 focus:border-amber-400"}`}
                />
                {reasonError && <p className="text-xs text-rose-500">{reasonError}</p>}
              </div>
            </>
          )}

          {mode === "hard" && (
            <div className="flex flex-col gap-3">
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                <p className="text-sm font-bold text-rose-800">⚠️ This action cannot be undone</p>
                <p className="text-xs text-rose-700 mt-1">
                  Permanently deleting <strong>{drug.genericName}</strong> will remove all its data.
                  This will fail if there are related batches, inventory records, or orders.
                </p>
              </div>
              <p className="text-sm text-slate-600">Are you absolutely sure?</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <button
            onClick={() => mode === "choose" ? onClose() : setMode("choose")}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {mode === "choose" ? "Cancel" : "← Back"}
          </button>

          {mode === "discontinue" && (
            <button
              onClick={handleDiscontinue}
              disabled={isLoading}
              className="px-5 py-2 text-sm font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {isLoading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
              Discontinue Drug
            </button>
          )}

          {mode === "hard" && (
            <button
              onClick={handleHardDelete}
              disabled={isLoading}
              className="px-5 py-2 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {isLoading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
              Yes, Delete Permanently
            </button>
          )}
        </div>
      </div>
    </div>
  );
}