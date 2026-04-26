"use client";
import { useState } from "react";

interface DispatchModalProps {
  onClose: () => void;
  onConfirm: (data: { driverName: string; vehicleNumber: string; driverPhone?: string; notes?: string }) => void;
  loading: boolean;
}

export default function DispatchModal({ onClose, onConfirm, loading }: DispatchModalProps) {
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!driverName.trim()) newErrors.driverName = "Driver name is required";
    if (!vehicleNumber.trim()) newErrors.vehicleNumber = "Vehicle number is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onConfirm({ driverName, vehicleNumber, driverPhone, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Dispatch</h2>
          <p className="text-sm text-gray-500 mb-4">
            Please provide delivery details below.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-1">
                Driver Name <span className="text-red-500">*</span>
              </label>
              <input
                id="driverName"
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500/20 ${
                  errors.driverName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., John Kariuki"
              />
              {errors.driverName && <p className="text-red-500 text-xs mt-1">{errors.driverName}</p>}
            </div>

            <div>
              <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <input
                id="vehicleNumber"
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500/20 ${
                  errors.vehicleNumber ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., KBD 123A"
              />
              {errors.vehicleNumber && <p className="text-red-500 text-xs mt-1">{errors.vehicleNumber}</p>}
            </div>

            <div>
              <label htmlFor="driverPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Driver Phone
              </label>
              <input
                id="driverPhone"
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500/20"
                placeholder="e.g., +254 712 345 678"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Special instructions or remarks..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? "Processing..." : "Confirm Dispatch"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}