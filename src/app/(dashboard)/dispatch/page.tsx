/* eslint-disable react-hooks/set-state-in-effect */
"use client";
// app/(dashboard)/dispatch/page.tsx
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import DispatchModal from "@/components/orders/DispatchModal";
import DeliveryModal from "@/components/dispatch/DeliveryModal";
import type { DispatchFormData } from "@/components/orders/DispatchModal";
import OrderDispatchCard, { QueueOrder } from "@/components/dispatch/OrderdispatchCard";

interface HistoryNote {
  id: string;
  dispatchNumber: string;
  status: string;
  dispatchDate: string;
  deliveredAt?: string | null;
  receivedBy?: string | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
  driverPhone?: string | null;
  totalItems: number;
  temperatureAtDispatch?: number | null;
  packagingVerified?: boolean | null;
  labelsVerified?: boolean | null;
  documentationComplete?: boolean | null;
  order: {
    orderNumber: string;
    customerName: string;
    customerFacility?: string | null;
    priority: string;
    shippingAddress: Record<string, string>;
  };
  store: { name: string };
  items: { batchNumber: string; drugName: string; quantityDispatched: number }[];
}

type Tab = "queue" | "history";

const STATUS_CFG: Record<string, { bg: string; text: string; label: string }> = {
  dispatched: { bg: "bg-purple-100", text: "text-purple-700", label: "In Transit" },
  delivered:  { bg: "bg-emerald-100", text: "text-emerald-700", label: "Delivered" },
  prepared:   { bg: "bg-blue-100", text: "text-blue-700", label: "Prepared" },
};

export default function DispatchPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const [queue, setQueue] = useState<QueueOrder[]>([]);
  const [history, setHistory] = useState<HistoryNote[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  // Modal state
  const [dispatchTarget, setDispatchTarget] = useState<QueueOrder | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [deliveryTarget, setDeliveryTarget] = useState<HistoryNote | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const res = await fetch("/api/dispatch/queue");
      const data = await res.json();
      if (res.ok) setQueue(data.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (historyFilter !== "all") params.set("status", historyFilter);
      const res = await fetch(`/api/dispatch/history?${params}`);
      const data = await res.json();
      if (res.ok) setHistory(data.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyFilter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);
  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const handleDispatchConfirm = async (formData: DispatchFormData) => {
    if (!dispatchTarget) return;
    setDispatchLoading(true);
    try {
      const res = await fetch(`/api/orders/${dispatchTarget.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          temperatureAtDispatch: formData.temperatureAtDispatch
            ? Number(formData.temperatureAtDispatch)
            : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ ${data.data.dispatchNote.dispatchNumber} — dispatched successfully`);
        setDispatchTarget(null);
        await fetchQueue();
        if (tab === "history") await fetchHistory();
      } else {
        showToast(data.error || "Dispatch failed", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setDispatchLoading(false);
    }
  };

  // ── Delivery ──────────────────────────────────────────────────────────────
  const handleDeliveryConfirm = async (input: {
    receiverName: string;
    proofOfDeliveryUrl?: string;
    deliveryNotes?: string;
  }) => {
    if (!deliveryTarget) return;
    setDeliveryLoading(true);
    try {
      const res = await fetch(`/api/dispatch/${deliveryTarget.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ Delivery confirmed for ${deliveryTarget.dispatchNumber}`);
        setDeliveryTarget(null);
        await fetchHistory();
      } else {
        showToast(data.error || "Confirmation failed", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setDeliveryLoading(false);
    }
  };

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredQueue =
    priorityFilter === "all"
      ? queue
      : queue.filter((o) => o.priority === priorityFilter);

  const filteredHistory =
    historyFilter === "all"
      ? history
      : history.filter((n) => n.status === historyFilter);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const urgentCount = queue.filter((o) => o.priority === "urgent").length;
  const highCount   = queue.filter((o) => o.priority === "high").length;
  const inTransit   = history.filter((n) => n.status === "dispatched").length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Dispatch Centre
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {queue.length} order{queue.length !== 1 ? "s" : ""} ready to dispatch
              {urgentCount > 0 && (
                <span className="ml-2 text-red-600 font-semibold">
                  · {urgentCount} URGENT
                </span>
              )}
            </p>
          </div>

          {/* Summary pills */}
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <Pill color="red" label="Urgent" count={urgentCount} />
            )}
            {highCount > 0 && (
              <Pill color="orange" label="High" count={highCount} />
            )}
            <Pill color="purple" label="In Transit" count={inTransit} />
          </div>
        </div>
      </div>

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-6">
          {(["queue", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3.5 text-sm font-semibold border-b-2 transition ${
                tab === t
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "queue" ? `Dispatch Queue (${queue.length})` : "Dispatch History"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ── QUEUE TAB ─────────────────────────────────────────────────────── */}
        {tab === "queue" && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Priority:
              </span>
              {["all", "urgent", "high", "normal", "low"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition capitalize ${
                    priorityFilter === p
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {p === "all" ? "All" : p}
                  {p !== "all" && (
                    <span className="ml-1 opacity-60">
                      ({queue.filter((o) => o.priority === p).length})
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={fetchQueue}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Queue grid */}
            {loadingQueue ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200 h-80 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredQueue.length === 0 ? (
              <EmptyState
                icon="📦"
                title="No orders in queue"
                desc={
                  priorityFilter !== "all"
                    ? `No ${priorityFilter} priority orders ready to dispatch`
                    : "All allocated orders have been dispatched"
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredQueue.map((order) => (
                  <OrderDispatchCard
                    key={order.id}
                    order={order}
                    onDispatch={setDispatchTarget}
                    dispatching={dispatchLoading && dispatchTarget?.id === order.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ───────────────────────────────────────────────────── */}
        {tab === "history" && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status:
              </span>
              {["all", "dispatched", "delivered"].map((s) => (
                <button
                  key={s}
                  onClick={() => setHistoryFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition capitalize ${
                    historyFilter === s
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {s === "all" ? "All" : s === "dispatched" ? "In Transit" : "Delivered"}
                  {s !== "all" && (
                    <span className="ml-1 opacity-60">
                      ({history.filter((n) => n.status === s).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* History list */}
            {loadingHistory ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 h-24 animate-pulse" />
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <EmptyState icon="🚛" title="No dispatch records" desc="Dispatch notes will appear here" />
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((note) => {
                  const sc = STATUS_CFG[note.status] ?? STATUS_CFG.prepared;
                  const address =
                    note.order.shippingAddress?.raw ||
                    note.order.shippingAddress?.city ||
                    "—";

                  return (
                    <div
                      key={note.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition"
                    >
                      <div className="flex flex-wrap items-start gap-4 p-4">
                        {/* Status badge */}
                        <div className="shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${sc.bg} ${sc.text}`}
                          >
                            {sc.label}
                          </span>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {note.dispatchNumber}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-sm text-slate-600">
                              {note.order.orderNumber}
                            </span>
                            <span
                              className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${
                                note.order.priority === "urgent"
                                  ? "bg-red-100 text-red-600"
                                  : note.order.priority === "high"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {note.order.priority}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">
                            {note.order.customerName}
                            {note.order.customerFacility && (
                              <span className="font-normal text-slate-400 ml-1">
                                — {note.order.customerFacility}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{address}</p>
                        </div>

                        {/* Date + driver */}
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-slate-500">
                            {format(new Date(note.dispatchDate), "dd MMM yyyy · HH:mm")}
                          </p>
                          {note.driverName && (
                            <p className="text-xs font-medium text-slate-700 mt-0.5">
                              {note.driverName}
                            </p>
                          )}
                          {note.vehicleNumber && (
                            <p className="text-xs font-mono text-slate-500">{note.vehicleNumber}</p>
                          )}
                          {note.deliveredAt && (
                            <p className="text-xs text-emerald-600 mt-1">
                              Delivered {format(new Date(note.deliveredAt), "dd MMM HH:mm")}
                            </p>
                          )}
                          {note.receivedBy && (
                            <p className="text-xs text-slate-400">by {note.receivedBy}</p>
                          )}
                        </div>

                        {/* QC chips */}
                        <div className="w-full flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                          <QCChip ok={!!note.packagingVerified} label="Packaging" />
                          <QCChip ok={!!note.labelsVerified} label="Labels" />
                          <QCChip ok={!!note.documentationComplete} label="Docs" />
                          {note.temperatureAtDispatch != null && (
                            <span className="text-xs bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                              {note.temperatureAtDispatch}°C
                            </span>
                          )}
                          <span className="ml-auto text-xs text-slate-400">
                            {note.totalItems} batch{note.totalItems !== 1 ? "es" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Confirm delivery button */}
                      {note.status === "dispatched" && (
                        <div className="px-4 pb-4">
                          <button
                            onClick={() => setDeliveryTarget(note)}
                            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                          >
                            ✓ Confirm Delivery
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {dispatchTarget && (
        <DispatchModal
          orderNumber={dispatchTarget.orderNumber}
          customerName={dispatchTarget.customerName}
          itemCount={dispatchTarget.allocatedItemCount}
          onClose={() => !dispatchLoading && setDispatchTarget(null)}
          onConfirm={handleDispatchConfirm}
          loading={dispatchLoading}
        />
      )}

      {deliveryTarget && (
        <DeliveryModal
          dispatchNumber={deliveryTarget.dispatchNumber}
          customerName={deliveryTarget.order.customerName}
          onClose={() => !deliveryLoading && setDeliveryTarget(null)}
          onConfirm={handleDeliveryConfirm}
          loading={deliveryLoading}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white flex items-center gap-2 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function Pill({ color, label, count }: { color: string; label: string; count: number }) {
  const colors: Record<string, string> = {
    red:    "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${colors[color] ?? colors.purple}`}>
      {count} {label}
    </span>
  );
}

function QCChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
        ok ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-slate-50 border border-slate-200 text-slate-400"
      }`}
    >
      {ok ? "✓" : "—"} {label}
    </span>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{desc}</p>
    </div>
  );
}