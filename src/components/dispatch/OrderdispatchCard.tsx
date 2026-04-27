"use client";
// components/dispatch/OrderDispatchCard.tsx
import { format, differenceInDays } from "date-fns";

export interface QueueOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerFacility?: string | null;
  customerPhone?: string | null;
  priority: string;
  status: string;
  deliveryDate: string | Date;
  totalValue: number;
  totalItems: number;
  sourceStore?: { name: string } | null;
  shippingAddress?: Record<string, string> | null;
  allocatedItemCount: number;
  totalAllocatedQty: number;
  items: {
    id: string;
    drugName: string;
    requestedQuantity: number;
    allocatedQuantity: number;
    dispatchedQuantity: number;
  }[];
  batches: {
    batchNumber: string;
    expiryDate: string | Date;
    storeName: string;
    qty: number;
  }[];
}

interface Props {
  order: QueueOrder;
  onDispatch: (order: QueueOrder) => void;
  dispatching: boolean;
}

const PRIORITY_CONFIG = {
  urgent: { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-200", dot: "bg-red-500", label: "URGENT" },
  high:   { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200", dot: "bg-orange-500", label: "HIGH" },
  normal: { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200", dot: "bg-blue-400", label: "NORMAL" },
  low:    { bg: "bg-gray-100", text: "text-gray-600", ring: "ring-gray-200", dot: "bg-gray-400", label: "LOW" },
};

export default function OrderDispatchCard({ order, onDispatch, dispatching }: Props) {
  const pc = PRIORITY_CONFIG[order.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normal;

  const deliveryDate = new Date(order.deliveryDate);
  const daysUntil = differenceInDays(deliveryDate, new Date());
  const isOverdue = daysUntil < 0;
  const isUrgentDate = daysUntil <= 1 && daysUntil >= 0;

  const address =
    order.shippingAddress?.raw ||
    [order.shippingAddress?.street, order.shippingAddress?.city]
      .filter(Boolean)
      .join(", ") ||
    "—";

  return (
    <div
      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-md ${
        order.priority === "urgent"
          ? "border-red-200"
          : order.priority === "high"
          ? "border-orange-200"
          : "border-slate-200"
      }`}
    >
      {/* Top bar */}
      <div
        className={`px-4 py-2 flex items-center justify-between ${
          order.priority === "urgent"
            ? "bg-red-50"
            : order.priority === "high"
            ? "bg-orange-50"
            : "bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${pc.dot} animate-pulse`} />
          <span className={`text-xs font-bold tracking-wider ${pc.text}`}>{pc.label}</span>
        </div>
        <span className="font-mono text-xs text-slate-500">{order.orderNumber}</span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Customer */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight truncate">
              {order.customerName}
            </p>
            {order.customerFacility && (
              <p className="text-xs text-slate-500 truncate">{order.customerFacility}</p>
            )}
            {order.customerPhone && (
              <p className="text-xs text-slate-400 mt-0.5">{order.customerPhone}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-sm font-bold text-slate-800">
              Ksh {order.totalValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Delivery date + address */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`rounded-xl px-3 py-2 ${
              isOverdue
                ? "bg-red-50 border border-red-200"
                : isUrgentDate
                ? "bg-amber-50 border border-amber-200"
                : "bg-slate-50 border border-slate-200"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">
              Delivery Date
            </p>
            <p
              className={`text-sm font-bold mt-0.5 ${
                isOverdue ? "text-red-600" : isUrgentDate ? "text-amber-700" : "text-slate-800"
              }`}
            >
              {format(deliveryDate, "dd MMM")}
            </p>
            <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
              {isOverdue
                ? `${Math.abs(daysUntil)}d overdue`
                : daysUntil === 0
                ? "Today"
                : `${daysUntil}d remaining`}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">
              Deliver To
            </p>
            <p className="text-xs text-slate-700 mt-0.5 line-clamp-2 leading-tight">{address}</p>
          </div>
        </div>

        {/* Items summary */}
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide mb-2">
            Items ({order.allocatedItemCount} batches · {order.totalAllocatedQty} units)
          </p>
          <div className="space-y-1.5">
            {order.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 truncate">{item.drugName}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-mono text-indigo-600 font-semibold">
                    {item.allocatedQuantity}
                  </span>
                  <span className="text-xs text-slate-300">/</span>
                  <span className="text-xs font-mono text-slate-400">
                    {item.requestedQuantity}
                  </span>
                </div>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-xs text-slate-400 italic">
                +{order.items.length - 3} more items
              </p>
            )}
          </div>
        </div>

        {/* Batch chips */}
        {order.batches.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide mb-1.5">
              Reserved Batches
            </p>
            <div className="flex flex-wrap gap-1.5">
              {order.batches.slice(0, 4).map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-mono px-2 py-0.5 rounded-lg"
                >
                  {b.batchNumber}
                  <span className="text-indigo-400">×{b.qty}</span>
                </span>
              ))}
              {order.batches.length > 4 && (
                <span className="text-xs text-slate-400">+{order.batches.length - 4}</span>
              )}
            </div>
          </div>
        )}

        {/* Source store */}
        {order.sourceStore && (
          <p className="text-[11px] text-slate-400">
            Store: <span className="font-medium text-slate-600">{order.sourceStore.name}</span>
          </p>
        )}
      </div>

      {/* Action footer */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onDispatch(order)}
          disabled={dispatching}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
            order.priority === "urgent"
              ? "bg-red-600 hover:bg-red-700 text-white"
              : order.priority === "high"
              ? "bg-orange-600 hover:bg-orange-700 text-white"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {dispatching ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            <>🚚 Dispatch Order</>
          )}
        </button>
      </div>
    </div>
  );
}