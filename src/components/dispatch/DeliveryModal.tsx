"use client";
// components/dispatch/DeliveryModal.tsx
import { useState } from "react";

interface Props {
  dispatchNumber: string;
  customerName: string;
  onClose: () => void;
  onConfirm: (data: {
    receiverName: string;
    proofOfDeliveryUrl?: string;
    deliveryNotes?: string;
  }) => Promise<void>;
  loading: boolean;
}

export default function DeliveryModal({
  dispatchNumber,
  customerName,
  onClose,
  onConfirm,
  loading,
}: Props) {
  const [receiverName, setReceiverName] = useState("");
  const [podUrl, setPodUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!receiverName.trim()) {
      setError("Receiver name is required to confirm delivery");
      return;
    }
    setError("");
    await onConfirm({
      receiverName: receiverName.trim(),
      proofOfDeliveryUrl: podUrl.trim() || undefined,
      deliveryNotes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl">
              ✅
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Confirm Delivery</h2>
              <p className="text-xs text-slate-500">
                {dispatchNumber} · {customerName}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Record who received the goods at the destination. This completes the
            order and writes the final ledger entry.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Received By <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => {
                setReceiverName(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Nurse Jane Odhiambo — Stores"
              autoFocus
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition ${
                error ? "border-red-400 bg-red-50/30" : "border-slate-300"
              }`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Proof of Delivery URL
              <span className="font-normal text-slate-400 ml-1">— optional</span>
            </label>
            <input
              type="url"
              value={podUrl}
              onChange={(e) => setPodUrl(e.target.value)}
              placeholder="https://storage.example.com/pod-1234.jpg"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Delivery Notes
              <span className="font-normal text-slate-400 ml-1">— optional</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any discrepancies, partial delivery notes…"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-sm hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !receiverName.trim()}
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Confirming…
              </>
            ) : (
              "Mark as Delivered ✓"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}