// app/dashboard/orders/[id]/page.tsx - REPLACE with this
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface OrderDetail {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: string;
  priority: string;
  totalValue: number;
  createdAt: string;
  deliveryDate: string;
  sourceStoreId?: string;
  items: Array<{
    id: string;
    drug: { genericName: string; brandName: string };
    requestedQuantity: number;
    allocatedQuantity: number;
    dispatchedQuantity: number;
    backorderQuantity: number;
    unitPrice: number;
    status: string;
  }>;
  allocations: Array<{
    id: string;
    batch: { batchNumber: string };
    allocatedQuantity: number;
    status: string;
    store?: { name: string };
  }>;
}

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState("");

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      setOrder(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const canAllocate = session?.user?.permissions?.includes("orders:allocate");
  const canCancel = session?.user?.permissions?.includes("orders:cancel");
  
  const isAllocatable = ["pending_approval", "approved", "partially_allocated"].includes(order?.status || "");
  const showAllocateButton = canAllocate && isAllocatable;
  const showReleaseButton = canCancel && order?.status === "allocated";

  const handleAllocate = async () => {
    const actionType = order?.status === "partially_allocated" ? "re-allocate" : "allocate";
    // if (!confirm(`Are you sure you want to ${actionType} stock for this order? This will reserve inventory based on FEFO.`)) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/allocate`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: "FEFO" })
      });
      const data = await res.json();
      
      if (res.ok) {
        const summary = data.data?.summary;
        alert(`Allocation ${actionType}d successfully!\n\n${summary?.totalAllocated || 0} items allocated\n${summary?.partialCount || 0} items partially allocated`);
        fetchOrder();
      } else {
        alert(data.error || "Allocation failed");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseReason) {
      alert("Please provide a reason for release");
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/allocate/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: releaseReason }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert("Allocation released successfully");
        setShowReleaseModal(false);
        setReleaseReason("");
        fetchOrder();
      } else {
        alert(data.error || "Release failed");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading order...</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  const hasBackorder = order.items.some(item => item.backorderQuantity > 0);
  const totalAllocated = order.items.reduce((sum, item) => sum + item.allocatedQuantity, 0);
  const totalRequested = order.items.reduce((sum, item) => sum + item.requestedQuantity, 0);
  const allocationPercentage = totalRequested > 0 ? (totalAllocated / totalRequested) * 100 : 0;

  return (
    <div className="p-6 text-gray-700 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-gray-500">Customer: {order.customerName}</p>
          {order.sourceStoreId && (
            <p className="text-sm text-gray-400">Source Store ID: {order.sourceStoreId}</p>
          )}
        </div>
        <div className="flex gap-2">
          {showAllocateButton && (
            <button
              onClick={handleAllocate}
              disabled={actionLoading}
              className={`px-4 py-2 text-white rounded-lg ${
                order.status === "partially_allocated" 
                  ? "bg-orange-600 hover:bg-orange-700" 
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {actionLoading 
                ? "Processing..." 
                : order.status === "partially_allocated" 
                  ? "Re-allocate Stock" 
                  : "Allocate Stock"}
            </button>
          )}
          {showReleaseButton && (
            <button
              onClick={() => setShowReleaseModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Release Allocation
            </button>
          )}
          <button onClick={() => router.back()} className="px-4 py-2 border rounded-lg">
            Back
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-semibold capitalize">{order.status.replace(/_/g, " ")}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Priority</p>
          <p className="font-semibold capitalize">{order.priority}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="font-semibold">KES {order.totalValue?.toFixed(2) || "0.00"}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Allocation Progress</p>
          <div className="mt-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${allocationPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalAllocated} / {totalRequested} units
            </p>
          </div>
        </div>
        {hasBackorder && (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-600">⚠️ Partial Allocation</p>
            <p className="text-xs text-orange-500">Some items are backordered</p>
          </div>
        )}
      </div>

      {/* Order Items Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b font-semibold">Order Items</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Drug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Requested</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Allocated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Dispatched</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Backorder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">{item.drug.genericName} {item.drug.brandName ? `(${item.drug.brandName})` : ""}</td>
                  <td className="px-6 py-4">{item.requestedQuantity}</td>
                  <td className="px-6 py-4 font-medium text-indigo-600">{item.allocatedQuantity}</td>
                  <td className="px-6 py-4">{item.dispatchedQuantity}</td>
                  <td className="px-6 py-4">
                    {item.backorderQuantity > 0 ? (
                      <span className="text-orange-600 font-semibold">{item.backorderQuantity}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      item.status === "allocated" ? "bg-green-100 text-green-800" :
                      item.status === "partially_allocated" ? "bg-orange-100 text-orange-800" :
                      item.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">Ksh {item.unitPrice?.toFixed(2) || "0.00"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocations Table */}
      {order.allocations?.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b font-semibold">
            Allocations (Reserved Batches) - {order.allocations.length} allocations
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Batch Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Allocated Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.allocations.map((alloc) => (
                  <tr key={alloc.id}>
                    <td className="px-6 py-4 font-mono">{alloc.batch.batchNumber}</td>
                    <td className="px-6 py-4">{alloc.store?.name || "N/A"}</td>
                    <td className="px-6 py-4">{alloc.allocatedQuantity}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        alloc.status === "reserved" ? "bg-blue-100 text-blue-800" :
                        alloc.status === "dispatched" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {alloc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Release Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Release Allocation</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to release all allocations for this order? This will make the stock available again.
            </p>
            <textarea
              className="w-full p-2 border rounded-md mb-4"
              placeholder="Reason for release..."
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReleaseModal(false);
                  setReleaseReason("");
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRelease}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {actionLoading ? "Processing..." : "Confirm Release"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}