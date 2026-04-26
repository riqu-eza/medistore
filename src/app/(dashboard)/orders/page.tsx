"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import DispatchModal from "@/components/orders/DispatchModal";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  priority: string;
  totalValue: number;
  createdAt: string;
  deliveryDate: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // track which order is processing
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const { hasPermission } = useAuth();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const canApprove = hasPermission("order:approve"); // adjust permission name as needed
  const canAllocate = hasPermission("order:allocate");
  const canDispatch = hasPermission("order:dispatch");

  const handleApprove = async (orderId: string) => {
    if (!confirm("Approve this order?")) return;
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Order approved");
        await fetchOrders();
      } else {
        alert(data.error || "Approval failed");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAllocate = async (orderId: string) => {
    if (!confirm("Allocate stock for this order? This will reserve inventory (FEFO).")) return;
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/allocate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Allocation successful");
        await fetchOrders();
      } else {
        alert(data.error || "Allocation failed");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatchConfirm = async (dispatchData: any) => {
    if (!dispatchOrderId) return;
    setActionLoading(dispatchOrderId);
    try {
      const res = await fetch(`/api/orders/${dispatchOrderId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatchData),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Order dispatched");
        await fetchOrders();
      } else {
        alert(data.error || "Dispatch failed");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setActionLoading(null);
      setDispatchOrderId(null);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    allocated: "bg-indigo-100 text-indigo-800",
    partially_allocated: "bg-orange-100 text-orange-800",
    dispatched: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  // Determine which actions are allowed based on status
  const getActions = (order: Order) => {
    const actions = [];
    if (order.status === "pending_approval" && canApprove) {
      actions.push({ label: "Approve", action: () => handleApprove(order.id), color: "bg-green-600" });
    }
    if ((order.status === "approved" || order.status === "pending_approval") && canAllocate) {
      actions.push({ label: "Allocate", action: () => handleAllocate(order.id), color: "bg-indigo-600" });
    }
    if (order.status === "allocated" && canDispatch) {
      actions.push({ label: "Dispatch", action: () => setDispatchOrderId(order.id), color: "bg-purple-600" });
    }
    return actions;
  };

  if (loading) return <div className="p-8 text-center">Loading orders...</div>;

  return (
    <div className="p-6 text-gray-700 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Link
          href="/orders/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Order
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => {
                const actions = getActions(order);
                const isLoading = actionLoading === order.id;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{order.orderNumber}</td>
                    <td className="px-6 py-4">{order.customerName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || "bg-gray-100"}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize">{order.priority}</td>
                    <td className="px-6 py-4">${order.totalValue?.toFixed(2) || "0.00"}</td>
                    <td className="px-6 py-4 text-sm">{format(new Date(order.createdAt), "dd MMM yyyy")}</td>
                    <td className="px-6 py-4 text-sm">{format(new Date(order.deliveryDate), "dd MMM yyyy")}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline text-sm">
                          View
                        </Link>
                        {actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={action.action}
                            disabled={isLoading}
                            className={`px-2 py-1 text-xs text-white rounded ${action.color} hover:opacity-80 disabled:opacity-50`}
                          >
                            {isLoading ? "..." : action.label}
                          </button>
                        ))}
                      </div>
                     </td>
                   </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {dispatchOrderId && (
        <DispatchModal
          onClose={() => setDispatchOrderId(null)}
          onConfirm={handleDispatchConfirm}
          loading={actionLoading === dispatchOrderId}
        />
      )}
    </div>
  );
}