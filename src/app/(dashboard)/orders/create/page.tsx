/* eslint-disable @typescript-eslint/no-explicit-any */
// app/orders/create/page.tsx - Update the drug fetching part
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DrugWithStores {
  drug: {
    id: string;
    genericName: string;
    brandName: string;
    sellingPrice: number | null;
    drugCode: string;
    dosageForm: string;
    strength: string;
  };
  availableStores: Array<{
    storeId: string;
    storeName: string;
    storeCode: string;
    storeType: string;
    availableQuantity: number;
  }>;
  totalAvailableQuantity: number;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [drugsWithStores, setDrugsWithStores] = useState<DrugWithStores[]>([]);
  const [stores, setStores] = useState<availableStores[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    { drugId: string; quantity: number; unitPrice: number; preferredStoreId?: string }[]
  >([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [priority, setPriority] = useState("normal");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [sourceStoreId, setSourceStoreId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch available drugs with store information
    fetch("/api/orders/available-drugs")
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          setDrugsWithStores(response.data);
          console.log(`Loaded ${response.data.length} drugs with store info`);
        }
      })
      .catch(console.error);

    // Fetch stores for source store selection
    fetch("/api/admin/stores")
      .then((res) => res.json())
      .then((data) => setStores(data.data ?? []))
      .catch(console.error);
  }, []);

  const addItem = () => {
    setSelectedItems([...selectedItems, { 
      drugId: "", 
      quantity: 1, 
      unitPrice: 0,
      preferredStoreId: undefined 
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];

    if (field === "drugId") {
      // Auto-populate unit price and show available stores
      const drugItem = drugsWithStores.find((d) => d.drug.id === value);
      newItems[index] = {
        ...newItems[index],
        drugId: value,
        unitPrice: drugItem?.drug.sellingPrice ?? newItems[index].unitPrice,
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }

    setSelectedItems(newItems);
  };

  // Helper to check if a drug is available in the selected store
  const isDrugAvailableInStore = (drugId: string, storeId: string): boolean => {
    const drug = drugsWithStores.find(d => d.drug.id === drugId);
    if (!drug) return false;
    return drug.availableStores.some(store => store.storeId === storeId);
  };

  // Get available stores for a specific drug
  const getAvailableStoresForDrug = (drugId: string) => {
    const drug = drugsWithStores.find(d => d.drug.id === drugId);
    return drug?.availableStores || [];
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const totalOrderValue = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!customerName.trim()) newErrors.customerName = "Customer name is required";
    if (selectedItems.length === 0) newErrors.items = "At least one item is required";
    
    selectedItems.forEach((item, idx) => {
      if (!item.drugId) newErrors[`item_${idx}_drug`] = "Select a drug";
      if (item.quantity < 1) newErrors[`item_${idx}_qty`] = "Quantity must be at least 1";
      
      // Check if the selected store has enough quantity
      if (sourceStoreId && item.drugId) {
        const drug = drugsWithStores.find(d => d.drug.id === item.drugId);
        const storeStock = drug?.availableStores.find(s => s.storeId === sourceStoreId);
        if (storeStock && item.quantity > storeStock.availableQuantity) {
          newErrors[`item_${idx}_stock`] = `Only ${storeStock.availableQuantity} units available in selected store`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          sourceStoreId: sourceStoreId || undefined,
          items: selectedItems.map((item) => ({
            drugId: item.drugId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          priority,
          deliveryDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/orders/${data.data.id}`);
      } else {
        alert(data.error || "Failed to create order");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Get flattened list of drugs for dropdown (with store availability info)
  const getDrugDisplayName = (drugItem: DrugWithStores) => {
    const storeCount = drugItem.availableStores.length;
    const totalQty = drugItem.totalAvailableQuantity;
    return `${drugItem.drug.genericName}${drugItem.drug.brandName ? ` (${drugItem.drug.brandName})` : ''} - ${totalQty} units available in ${storeCount} store(s)`;
  };

  return (
    <div className="max-w-4xl text-gray-600 mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Information */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500/20 ${
                  errors.customerName ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.customerName && (
                <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requested Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            {/* Source Store Selection */}
            {stores.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fulfilling Store (Optional)
                </label>
                <select
                  value={sourceStoreId}
                  onChange={(e) => setSourceStoreId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                >
                  <option value="">— Auto-detect or leave for assignment —</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  If you select a store, we&#39;ll only show drugs available there
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Order Items */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-800">Order Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100"
            >
              + Add Item
            </button>
          </div>

          {errors.items && <p className="text-red-500 text-sm">{errors.items}</p>}

          <div className="space-y-3">
            {selectedItems.map((item, idx) => (
              <div key={idx} className="flex flex-wrap gap-3 items-end p-3 bg-gray-50 rounded-lg border">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Drug
                  </label>
                  <select
                    value={item.drugId}
                    onChange={(e) => updateItem(idx, "drugId", e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                      errors[`item_${idx}_drug`] ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select a drug</option>
                    {drugsWithStores
                      .filter(drug => {
                        // If source store selected, only show drugs available there
                        if (sourceStoreId) {
                          return drug.availableStores.some(s => s.storeId === sourceStoreId);
                        }
                        return true;
                      })
                      .map((drugItem) => (
                        <option key={drugItem.drug.id} value={drugItem.drug.id}>
                          {getDrugDisplayName(drugItem)}
                        </option>
                      ))}
                  </select>
                  {errors[`item_${idx}_drug`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item_${idx}_drug`]}</p>
                  )}
                </div>

                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                    min="1"
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                      errors[`item_${idx}_qty`] ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors[`item_${idx}_stock`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item_${idx}_stock`]}</p>
                  )}
                </div>

                <div className="w-36">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Unit Price (KES)
                  </label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {item.drugId && sourceStoreId && (
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Available Stock
                    </label>
                    <p className="text-sm font-semibold text-green-600">
                      {drugsWithStores
                        .find(d => d.drug.id === item.drugId)
                        ?.availableStores.find(s => s.storeId === sourceStoreId)
                        ?.availableQuantity || 0} units
                    </p>
                  </div>
                )}

                <div className="w-28 text-right">
                  <p className="text-xs text-gray-500 mb-1">Line Total</p>
                  <p className="text-sm font-semibold text-gray-700">
                    KES {(item.quantity * item.unitPrice).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-red-500 hover:text-red-700 px-2 py-1 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {selectedItems.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              No items added. Click &#34;Add Item&#34; to start.
            </p>
          )}

          {selectedItems.length > 0 && (
            <div className="flex justify-end pt-2 border-t">
              <div className="text-right">
                <p className="text-sm text-gray-500">Order Total</p>
                <p className="text-xl font-bold text-gray-800">
                  KES {totalOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}