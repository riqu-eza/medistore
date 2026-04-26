"use client";
// components/orders/DispatchModal.tsx
import { useState } from "react";

export interface DispatchFormData {
  driverName: string;
  vehicleNumber: string;
  driverPhone: string;
  temperatureAtDispatch: string;
  packagingVerified: boolean;
  labelsVerified: boolean;
  documentationComplete: boolean;
  notes: string;
}

interface Props {
  orderNumber?: string;
  customerName?: string;
  itemCount?: number;
  onClose: () => void;
  onConfirm: (data: DispatchFormData) => Promise<void>;
  loading: boolean;
}

const INITIAL: DispatchFormData = {
  driverName: "",
  vehicleNumber: "",
  driverPhone: "",
  temperatureAtDispatch: "",
  packagingVerified: false,
  labelsVerified: false,
  documentationComplete: false,
  notes: "",
};

export default function DispatchModal({
  orderNumber,
  customerName,
  itemCount,
  onClose,
  onConfirm,
  loading,
}: Props) {
  const [form, setForm] = useState<DispatchFormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof DispatchFormData, string>>>({});
  const [step, setStep] = useState<"qc" | "driver">("qc");

  const set = <K extends keyof DispatchFormData>(k: K, v: DispatchFormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const qcComplete = form.packagingVerified && form.labelsVerified;

  const validate = (): boolean => {
    const e: Partial<Record<keyof DispatchFormData, string>> = {};
    if (!form.packagingVerified) e.packagingVerified = "Required before dispatch";
    if (!form.labelsVerified) e.labelsVerified = "Required before dispatch";
    if (!form.driverName.trim()) e.driverName = "Driver name is required";
    if (!form.vehicleNumber.trim()) e.vehicleNumber = "Vehicle / plate number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      if (!form.packagingVerified || !form.labelsVerified) setStep("qc");
      return;
    }
    await onConfirm(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] rounded-t-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🚚</span>
              <h2 className="text-base font-bold text-slate-900">Confirm Dispatch</h2>
            </div>
            {orderNumber && (
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-slate-500">{orderNumber}</span>
                {customerName && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{customerName}</span>
                  </>
                )}
                {itemCount != null && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{itemCount} items</span>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-slate-100">
          {(["qc", "driver"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex-1 py-3 text-xs font-semibold transition ${
                step === s
                  ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50/50"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {s === "qc" ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      qcComplete ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {qcComplete ? "✓" : "1"}
                  </span>
                  Quality Check
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      form.driverName && form.vehicleNumber
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {form.driverName && form.vehicleNumber ? "✓" : "2"}
                  </span>
                  Driver Details
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── QC Tab ── */}
          {step === "qc" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete all mandatory checks before releasing this shipment.
                These are recorded in the dispatch note.
              </p>

              <div className="space-y-3">
                <CheckRow
                  id="packaging"
                  label="Packaging is intact and undamaged"
                  sublabel="Inspect all outer cartons, blister packs, and seals"
                  required
                  checked={form.packagingVerified}
                  onChange={(v) => set("packagingVerified", v)}
                  error={errors.packagingVerified}
                />
                <CheckRow
                  id="labels"
                  label="All labels are legible and correct"
                  sublabel="Verify drug name, batch, expiry, storage conditions"
                  required
                  checked={form.labelsVerified}
                  onChange={(v) => set("labelsVerified", v)}
                  error={errors.labelsVerified}
                />
                <CheckRow
                  id="docs"
                  label="Documentation is complete"
                  sublabel="Delivery note, invoice, waybill"
                  required={false}
                  checked={form.documentationComplete}
                  onChange={(v) => set("documentationComplete", v)}
                />
              </div>

              {/* Temperature */}
              <div className="mt-2 pt-4 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Temperature at Dispatch (°C)
                  <span className="font-normal text-slate-400 ml-1">— cold chain products only</span>
                </label>
                <input
                  type="number"
                  value={form.temperatureAtDispatch}
                  onChange={(e) => set("temperatureAtDispatch", e.target.value)}
                  placeholder="e.g. 4.5"
                  step="0.1"
                  className="w-40 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>

              {qcComplete && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <span className="text-emerald-500 text-lg">✓</span>
                  <p className="text-sm font-medium text-emerald-800">
                    Mandatory quality checks passed — proceed to driver details
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep("driver")}
                  disabled={!qcComplete}
                  className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next: Driver Details →
                </button>
              </div>
            </div>
          )}

          {/* ── Driver Tab ── */}
          {step === "driver" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter the driver and vehicle details. This is recorded on the
                dispatch note and ledger entry.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  label="Driver Name *"
                  error={errors.driverName}
                  input={
                    <input
                      type="text"
                      value={form.driverName}
                      onChange={(e) => set("driverName", e.target.value)}
                      placeholder="John Kamau"
                      autoFocus
                      className={inputCls(!!errors.driverName)}
                    />
                  }
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="Vehicle / Plate *"
                    error={errors.vehicleNumber}
                    input={
                      <input
                        type="text"
                        value={form.vehicleNumber}
                        onChange={(e) => set("vehicleNumber", e.target.value.toUpperCase())}
                        placeholder="KBZ 123A"
                        className={inputCls(!!errors.vehicleNumber)}
                      />
                    }
                  />
                  <FormField
                    label="Driver Phone"
                    input={
                      <input
                        type="tel"
                        value={form.driverPhone}
                        onChange={(e) => set("driverPhone", e.target.value)}
                        placeholder="+254 7XX XXX XXX"
                        className={inputCls(false)}
                      />
                    }
                  />
                </div>

                <FormField
                  label="Dispatch Notes"
                  input={
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      rows={3}
                      placeholder="Route instructions, special handling requirements…"
                      className={inputCls(false) + " resize-none"}
                    />
                  }
                />
              </div>

              {/* Summary preview */}
              {form.driverName && form.vehicleNumber && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Dispatch Summary
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-slate-400">Driver</span>
                    <span className="font-medium text-slate-800">{form.driverName}</span>
                    <span className="text-slate-400">Vehicle</span>
                    <span className="font-medium text-slate-800 font-mono">{form.vehicleNumber}</span>
                    {form.temperatureAtDispatch && (
                      <>
                        <span className="text-slate-400">Temp.</span>
                        <span className="font-medium text-slate-800">{form.temperatureAtDispatch}°C</span>
                      </>
                    )}
                    <span className="text-slate-400">QC</span>
                    <span className="text-emerald-600 font-medium">Passed ✓</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
          <button
            onClick={() => (step === "driver" ? setStep("qc") : onClose())}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-sm hover:bg-white transition"
          >
            {step === "driver" ? "← Back" : "Cancel"}
          </button>

          {step === "driver" && (
            <button
              onClick={handleSubmit}
              disabled={loading || !form.driverName || !form.vehicleNumber}
              className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-40 transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Dispatching…
                </>
              ) : (
                "Confirm Dispatch 🚚"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckRow({
  id,
  label,
  sublabel,
  required,
  checked,
  onChange,
  error,
}: {
  id: string;
  label: string;
  sublabel?: string;
  required: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
          checked
            ? "border-emerald-400 bg-emerald-50"
            : error
            ? "border-red-300 bg-red-50"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div className="relative mt-0.5 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              checked
                ? "bg-emerald-500 border-emerald-500"
                : "bg-white border-slate-300"
            }`}
          >
            {checked && (
              <svg viewBox="0 0 12 9" className="w-3 h-3 fill-none stroke-white stroke-2">
                <polyline points="1,5 4,8 11,1" />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${checked ? "text-emerald-800" : "text-slate-800"}`}>
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </p>
          {sublabel && (
            <p className={`text-xs mt-0.5 ${checked ? "text-emerald-600" : "text-slate-400"}`}>
              {sublabel}
            </p>
          )}
        </div>
      </label>
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  );
}

function FormField({
  label,
  input,
  error,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {input}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full border rounded-xl px-3 py-2.5 text-sm bg-white",
    "focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition",
    hasError ? "border-red-400 bg-red-50/30" : "border-slate-300",
  ].join(" ");
}