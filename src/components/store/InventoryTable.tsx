/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { Inventory, Drug, Batch, Store } from "@prisma/client";

type InventoryWithDetails = Inventory & {
  drug: Drug;
  batch: Batch;
  store?: Store; // not always included
};

interface InventoryTableProps {
  inventory: InventoryWithDetails[];
  stores?: Store[]; // optional list of destination stores for transfer
  onRefresh?: () => void; // callback to refresh data after action
}

export function InventoryTable({ inventory, stores = [], onRefresh }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [sortBy, setSortBy] = useState<"expiry" | "drug" | "stock">("expiry");
  // Modal states
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; inventory: InventoryWithDetails | null }>({ open: false, inventory: null });
  const [transferModal, setTransferModal] = useState<{ open: boolean; inventory: InventoryWithDetails | null }>({ open: false, inventory: null });
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [transferQty, setTransferQty] = useState(0);
  const [transferStoreId, setTransferStoreId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper: days until expiry
  const getDaysToExpiry = (expiryDate: Date) => {
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (expiryDate: Date) => {
    const days = getDaysToExpiry(expiryDate);
    if (days < 0) return "expired";
    if (days <= 90) return "near";
    return "good";
  };

  // Filtered & sorted data
  const filteredInventory = useMemo(() => {
    let filtered = inventory.filter((item) => {
      const matchesSearch =
        item.drug.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.drug.brandName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLowStock = showOnlyLowStock ? Number(item.availableQuantity) <= (Number(item.drug.reorderPoint) || 10) : true;
      return matchesSearch && matchesLowStock;
    });

    filtered.sort((a, b) => {
      if (sortBy === "expiry") return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      if (sortBy === "drug") return a.drug.genericName.localeCompare(b.drug.genericName);
      if (sortBy === "stock") return Number(a.availableQuantity) - Number(b.availableQuantity);
      return 0;
    });
    return filtered;
  }, [inventory, searchTerm, showOnlyLowStock, sortBy]);

  const lowStockCount = inventory.filter((i) => Number(i.availableQuantity) <= (Number(i.drug.reorderPoint) || 10)).length;

  // API calls
  const handleAdjust = async () => {
    if (!adjustModal.inventory) return;
    if (adjustQty === 0) return alert("Quantity change cannot be zero");
    if (!adjustReason) return alert("Please select a reason");

    setLoading(true);
    try {
      const res = await fetch("/api/store/inventory/adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: adjustModal.inventory.id,
          quantityChange: adjustQty,
          reason: adjustReason,
          notes: adjustNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Adjustment successful");
      setAdjustModal({ open: false, inventory: null });
      onRefresh?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferModal.inventory) return;
    if (transferQty <= 0) return alert("Quantity must be positive");
    if (!transferStoreId) return alert("Select destination store");
    setLoading(true);
    try {
      const res = await fetch("/api/store/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromInventoryId: transferModal.inventory.id,
          toStoreId: transferStoreId,
          quantity: transferQty,
          reason: transferReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Transfer completed");
      setTransferModal({ open: false, inventory: null });
      onRefresh?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters & Toolbar */}
      <div className="flex flex-wrap items-center text-gray-600 justify-between gap-3">
        <div className="relative flex-1 min-w-50">
          <input
            type="text"
            placeholder="Search by drug or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-9 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${showOnlyLowStock ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Low Stock {lowStockCount > 0 && `(${lowStockCount})`}
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"
          >
            <option value="expiry">Sort by Expiry (FEFO)</option>
            <option value="drug">Sort by Drug Name</option>
            <option value="stock">Sort by Stock Level</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No matching inventory found</td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const expiryStatus = getExpiryStatus(item.expiryDate);
                  const isLowStock = Number(item.availableQuantity) <= (Number(item.drug.reorderPoint) || 10);
                  const expiryBg = expiryStatus === "expired" ? "bg-red-50 border-red-200" : expiryStatus === "near" ? "bg-yellow-500 border-yellow-200" : "bg-green-400 border-green-200";

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.drug.genericName}</p>
                          <p className="text-xs text-gray-400">{item.drug.brandName || "—"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 font-mono">{item.batch.batchNumber}</p>
                        <p className="text-xs text-gray-400">MFG: {new Date(item.batch.manufacturingDate).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expiryBg}`}>
                          {new Date(item.expiryDate).toLocaleDateString()}
                          {expiryStatus === "near" && <span className="ml-1">⚠️ {getDaysToExpiry(item.expiryDate)}d</span>}
                          {expiryStatus === "expired" && <span className="ml-1">❌ Expired</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isLowStock ? "text-red-600" : "text-gray-800"}`}>
                            {Number(item.availableQuantity).toLocaleString()}
                          </span>
                          {isLowStock && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full animate-pulse">Low stock</span>}
                        </div>
                        <p className="text-xs text-gray-400">Reserved: {Number(item.reservedQuantity).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${item.isExpired ? "bg-red-100 text-red-700" : item.isNearExpiry ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                          {item.isExpired ? "Expired" : item.isNearExpiry ? "Near Expiry" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAdjustModal({ open: true, inventory: item });
                              setAdjustQty(0);
                              setAdjustReason("");
                              setAdjustNotes("");
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => {
                              setTransferModal({ open: true, inventory: item });
                              setTransferQty(Number(item.availableQuantity));
                              setTransferStoreId("");
                              setTransferReason("");
                            }}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            Transfer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      {adjustModal.open && adjustModal.inventory && (
        <div className="fixed inset-0 not-last: mt-34 text-gray-700 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Adjust Stock</h3>
            <p className="text-sm text-gray-600 mb-2">
              {adjustModal.inventory.drug.genericName} (Batch: {adjustModal.inventory.batch.batchNumber})
            </p>
            <p className="text-sm mb-4">Current available: {Number(adjustModal.inventory.availableQuantity).toLocaleString()}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity Change (+ increase, - decrease)</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">Select reason</option>
                  <option value="damage">Damage</option>
                  <option value="expiry">Expiry</option>
                  <option value="theft">Theft</option>
                  <option value="correction">Correction</option>
                  <option value="physical_count">Physical Count</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setAdjustModal({ open: false, inventory: null })} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleAdjust} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {loading ? "Processing..." : "Apply Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal.open && transferModal.inventory && (
        <div className="fixed inset-0.5 text-gray-700 bg-black/50 flex items-center mt-32 justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Transfer Stock</h3>
            <p className="text-sm text-gray-600 mb-2">
              {transferModal.inventory.drug.genericName} (Batch: {transferModal.inventory.batch.batchNumber})
            </p>
            <p className="text-sm mb-4">Available: {Number(transferModal.inventory.availableQuantity).toLocaleString()}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity to transfer</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  max={Number(transferModal.inventory.availableQuantity)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Destination Store</label>
                <select value={transferStoreId} onChange={(e) => setTransferStoreId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <input type="text" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setTransferModal({ open: false, inventory: null })} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleTransfer} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                {loading ? "Processing..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}