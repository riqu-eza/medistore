/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BuildingStorefrontIcon,
  ArrowLeftIcon,
  PencilIcon,
  UserGroupIcon,
  CubeIcon,
  ClockIcon,
  BeakerIcon,
  ShieldCheckIcon,
  TruckIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

interface Store {
  id: string;
  name: string;
  code: string;
  storeType: "cold" | "general" | "controlled" | "receiving";
  temperatureMin: number | null;
  temperatureMax: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  totalCapacity: number | null;
  currentUtilization: number | null;
  allowsControlled: boolean;
  allowsDispatch: boolean;
  isReceivingZone: boolean;
  isActive: boolean;
  address: any | null;
  manager: {
    id: string;
    name: string;
    email: string;
  } | null;
  parentStore: {
    id: string;
    name: string;
    code: string;
  } | null;
  childStores: Array<{
    id: string;
    name: string;
    code: string;
    storeType: string;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: {
      name: string;
      displayName: string;
    };
    isActive: boolean;
  }>;
  inventory: Array<{
    id: string;
    drug: {
      drugCode: string;
      genericName: string;
    };
    batch: {
      batchNumber: string;
      expiryDate: string;
    };
    availableQuantity: number;
    reservedQuantity: number;
    totalQuantity: number;
    isExpired: boolean;
    isNearExpiry: boolean;
  }>;
  recentTemperatures: Array<{
    id: string;
    temperature: number;
    humidity: number | null;
    recordedAt: string;
    isAlert: boolean;
  }>;
  _count: {
    users: number;
    inventory: number;
    batches: number;
    ledgerEntries: number;
    ordersFrom: number;
    transfersFrom: number;
    transfersTo: number;
    adjustments: number;
    temperatureLogs: number;
  };
}

export default function StoreDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showUserModal, setShowUserModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);
  const [timeRange, setTimeRange] = useState("24h");
  console.log("StoreDetailsPage params:", params);
  useEffect(() => {
    loadStore();
  }, [params.id]);

  async function loadStore() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${params.id}`);
      const data = await res.json();
      const normalizedStore: Store = {
        ...data,

        // unify temperatures → always available
        recentTemperatures:
          data.recentTemperatures ?? data.temperatureLogs ?? [],

        // ensure numbers (Prisma decimals come as strings)
        temperatureMin: data.temperatureMin
          ? Number(data.temperatureMin)
          : null,
        temperatureMax: data.temperatureMax
          ? Number(data.temperatureMax)
          : null,
        humidityMin: data.humidityMin ? Number(data.humidityMin) : null,
        humidityMax: data.humidityMax ? Number(data.humidityMax) : null,
      };

      setStore(normalizedStore);
      console.log("Loaded store:", data);
    } catch (error) {
      console.error("Failed to load store:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableUsers() {
    try {
      const res = await fetch(`/api/admin/stores/${params.id}/users`);
      const data = await res.json();
      setAvailableUsers(data.users);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  }

  async function assignUser(userId: string) {
    setUpdating(true);
    try {
      await fetch(`/api/admin/stores/${params.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "assign" }),
      });
      await loadStore();
      await loadAvailableUsers();
    } catch (error) {
      console.error("Failed to assign user:", error);
    } finally {
      setUpdating(false);
    }
  }

  async function removeUser(userId: string) {
    setUpdating(true);
    try {
      await fetch(`/api/admin/stores/${params.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "remove" }),
      });
      await loadStore();
      await loadAvailableUsers();
    } catch (error) {
      console.error("Failed to remove user:", error);
    } finally {
      setUpdating(false);
    }
  }

  const openUserModal = async () => {
    await loadAvailableUsers();
    setShowUserModal(true);
  };

  const getStoreTypeIcon = (type: string) => {
    switch (type) {
      case "cold":
        return "❄️";
      case "general":
        return "🏢";
      case "controlled":
        return "🔒";
      case "receiving":
        return "📦";
      default:
        return "🏪";
    }
  };

  const getStoreTypeColor = (type: string) => {
    switch (type) {
      case "cold":
        return "bg-cyan-100 text-cyan-800";
      case "general":
        return "bg-gray-100 text-gray-800";
      case "controlled":
        return "bg-red-100 text-red-800";
      case "receiving":
        return "bg-green-100 text-green-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  const getTemperatureStatus = (temp: number) => {
    if (!store) return "normal";
    if (store.temperatureMin && temp < store.temperatureMin) return "low";
    if (store.temperatureMax && temp > store.temperatureMax) return "high";
    return "normal";
  };

  const getTemperatureColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-green-600 bg-green-50";
      case "high":
        return "text-red-600 bg-red-50";
      case "low":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading store details...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Store not found</p>
          <Link
            href="/admin/stores"
            className="mt-4 inline-flex items-center gap-2 text-purple-600 hover:text-purple-800"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Stores
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", name: "Overview", icon: BuildingStorefrontIcon },
    { id: "inventory", name: "Inventory", icon: CubeIcon },
    { id: "users", name: "Users", icon: UserGroupIcon },
    // { id: "environmental", name: "Environmental", icon: BeakerIcon },
    { id: "transfers", name: "Transfers", icon: TruckIcon },
    { id: "audit", name: "Audit Log", icon: DocumentTextIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/store"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {store.name}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStoreTypeColor(store.storeType)}`}
                  >
                    {getStoreTypeIcon(store.storeType)}{" "}
                    {store.storeType.charAt(0).toUpperCase() +
                      store.storeType.slice(1)}
                  </span>
                  {store.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleSolid className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <XCircleIcon className="w-3 h-3 mr-1" />
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">Code: {store.code}</p>
              </div>
            </div>
            <Link
              href={`/admin/store/${store.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              Edit Store
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <tab.icon
                  className={`
                  w-5 h-5 mr-2
                  ${activeTab === tab.id ? "text-purple-500" : "text-gray-400 group-hover:text-gray-500"}
                `}
                />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <UserGroupIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {store._count.users}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <CubeIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Inventory Items</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {store._count.inventory}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TruckIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Transfers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {store._count.transfersFrom + store._count.transfersTo}
                    </p>
                  </div>
                </div>
              </div>

              {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Temperature Logs</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {store._count.temperatureLogs}
                    </p>
                  </div>
                </div>
              </div> */}
            </div>

            {/* Store Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Store Details
                </h2>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Store Name</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {store.name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Store Code</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {store.code}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Store Type</dt>
                    <dd className="text-sm font-medium text-gray-900 capitalize">
                      {store.storeType}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Manager</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {store.manager ? store.manager.name : "Not assigned"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Parent Store</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {store.parentStore ? store.parentStore.name : "None"}
                    </dd>
                  </div>
                  {/* <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Child Stores</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {store.childStores.length}
                    </dd>
                  </div> */}
                </dl>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Capabilities
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {store.allowsControlled ? (
                      <CheckCircleSolid className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm text-gray-700">
                      Controlled Substances
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {store.allowsDispatch ? (
                      <CheckCircleSolid className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm text-gray-700">
                      Dispatch Operations
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {store.isReceivingZone ? (
                      <CheckCircleSolid className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm text-gray-700">
                      Receiving Zone
                    </span>
                  </div>
                  {store.address && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Address
                      </h3>
                      <p className="text-sm text-gray-600">
                        {store.address.street}
                        <br />
                        {store.address.city}, {store.address.state}{" "}
                        {store.address.postalCode}
                        <br />
                        {store.address.country}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Temperature Chart */}
              {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Temperature Readings
                  </h2>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
                <div className="h-48 flex items-end gap-2">
                  {store.recentTemperatures.slice(0, 24).map((log, index) => {
                    const status = getTemperatureStatus(log.temperature);
                    const maxTemp = store.temperatureMax || 25;
                    const minTemp = store.temperatureMin || 2;
                    const range = maxTemp - minTemp;
                    const normalizedTemp =
                      ((log.temperature - minTemp) / range) * 100;
                    const height = Math.min(100, Math.max(20, normalizedTemp));

                    return (
                      <div
                        key={log.id}
                        className="flex-1 flex flex-col items-center group relative"
                      >
                        <div className="relative w-full">
                          <div
                            className={`
                              w-full rounded-t-lg transition-all group-hover:opacity-80 cursor-pointer
                              ${status === "normal" ? "bg-green-500" : ""}
                              ${status === "high" ? "bg-red-500" : ""}
                              ${status === "low" ? "bg-blue-500" : ""}
                            `}
                            style={{ height: `${height}%` }}
                          />
                          {log.isAlert && (
                            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 absolute -top-2 -right-2" />
                          )}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                              <div>
                                {new Date(log.recordedAt).toLocaleString()}
                              </div>
                              <div>
                                {log.temperature}°C{" "}
                                {log.humidity ? `/${log.humidity}%` : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">
                          {new Date(log.recordedAt).getHours()}:00
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-gray-600">Normal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-gray-600">High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-gray-600">Low</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Range: {store.temperatureMin}°C - {store.temperatureMax}°C
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Inventory
              </h2>
              <Link
                href={`/admin/stores/${store.id}/inventory/add`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
              >
                <PlusIcon className="w-4 h-4" />
                Add Inventory
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Drug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expiry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Available
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reserved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {store.inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.drug.genericName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.drug.drugCode}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.batch.batchNumber}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm ${
                            item.isExpired
                              ? "text-red-600"
                              : item.isNearExpiry
                                ? "text-yellow-600"
                                : "text-gray-600"
                          }`}
                        >
                          {new Date(item.batch.expiryDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.availableQuantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.reservedQuantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.totalQuantity}
                      </td>
                      <td className="px-6 py-4">
                        {item.isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Expired
                          </span>
                        ) : item.isNearExpiry ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Near Expiry
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Good
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Store Users
              </h2>
              <button
                onClick={openUserModal}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
              >
                <UsersIcon className="w-4 h-4" />
                Manage Users
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {store.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                          {user.role.displayName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => removeUser(user.id)}
                          disabled={updating}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Environmental Tab */}
        {activeTab === "environmental" && (
          <div className="space-y-6">
            {/* Current Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Temperature Monitoring
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">
                        Current Temperature
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {store.recentTemperatures[0]?.temperature || "--"}°C
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getTemperatureColor(
                        getTemperatureStatus(
                          store.recentTemperatures[0]?.temperature || 0,
                        ),
                      )}`}
                    >
                      {getTemperatureStatus(
                        store.recentTemperatures[0]?.temperature || 0,
                      ).toUpperCase()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Minimum Allowed</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {store.temperatureMin || "--"}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Maximum Allowed</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {store.temperatureMax || "--"}°C
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Humidity Monitoring
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Current Humidity</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {store.recentTemperatures[0]?.humidity || "--"}%
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Minimum Allowed</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {store.humidityMin || "--"}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Maximum Allowed</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {store.humidityMax || "--"}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sensor Information */}
            
            {/* Temperature Logs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Temperature History
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Temperature
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Humidity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {store.recentTemperatures.map((log) => {
                      const status = getTemperatureStatus(log.temperature);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(log.recordedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-sm font-medium ${
                                status === "normal"
                                  ? "text-green-600"
                                  : status === "high"
                                    ? "text-red-600"
                                    : "text-blue-600"
                              }`}
                            >
                              {log.temperature}°C
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {log.humidity ? `${log.humidity}%` : "--"}
                          </td>
                          <td className="px-6 py-4">
                            {log.isAlert ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                Alert
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Transfers Tab */}
        {activeTab === "transfers" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transfer History
            </h2>
            <div className="text-center py-12 text-gray-500">
              <TruckIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Transfer history will be displayed here</p>
              <p className="text-sm mt-2">
                Incoming: {store._count.transfersTo} | Outgoing:{" "}
                {store._count.transfersFrom}
              </p>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Audit Log
            </h2>
            <div className="text-center py-12 text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Audit log will be displayed here</p>
              <p className="text-sm mt-2">
                Total entries: {store._count.ledgerEntries}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Management Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Store Users
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <XCircleIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Available Users</h4>
                {availableUsers
                  .filter((u) => !u.storeId)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => assignUser(user.id)}
                        disabled={updating}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                {availableUsers.filter((u) => !u.storeId).length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No available users
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
