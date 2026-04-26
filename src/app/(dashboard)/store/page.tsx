/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState, useCallback } from "react"
import { QuickActions, StatCard } from "../dashboard/page"
import { useAuth } from "@/hooks/use-auth"

// ── Types ──────────────────────────────────────────────────────────────────
interface StoreStats {
  totalStockLines: number       // inventory totalLines
  totalUnits: number            // inventory totalUnits
  transfersInTransit: number    // transfers in_transit (in or out)
  pendingOutbound: number       // transfers pending outbound
  pendingInbound: number        // transfers pending inbound
  adjustmentsNeeded: number     // low stock count (items needing adjustment attention)
  lowStock: number
  nearExpiry: number
  expired: number
  utilizationPercent: number | null
}

interface StatCardData {
  label: string
  value: string
  trend: string
  color: string
  icon: string
}

interface Alert {
  type: "error" | "warning" | "info"
  message: string
  href?: string
}

function fmt(n: number) {
  return n >= 1000 ? n.toLocaleString() : String(n)
}

function mapToCards(s: StoreStats): StatCardData[] {
  return [
    {
      label: "Stock Lines",
      value: fmt(s.totalStockLines),
      trend: s.utilizationPercent != null
        ? `${s.utilizationPercent.toFixed(0)}% capacity`
        : `${fmt(s.totalUnits)} units`,
      color: "blue",
      icon: "📦",
    },
    {
      label: "Transfers Today",
      value: fmt(s.transfersInTransit),
      trend: s.pendingOutbound > 0
        ? `${s.pendingOutbound} outbound pending`
        : s.pendingInbound > 0
        ? `${s.pendingInbound} inbound pending`
        : "No pending transfers",
      color: s.transfersInTransit > 0 ? "green" : "blue",
      icon: "🔄",
    },
    {
      label: "Low Stock Items",
      value: fmt(s.lowStock),
      trend: s.expired > 0 ? `${s.expired} expired` : "None expired",
      color: s.lowStock > 0 ? "yellow" : "green",
      icon: "📝",
    },
    {
      label: "Alerts",
      value: fmt(s.nearExpiry + s.lowStock + s.expired),
      trend: s.nearExpiry > 0 ? `${s.nearExpiry} near expiry` : "All good",
      color: (s.nearExpiry + s.lowStock + s.expired) > 0 ? "red" : "green",
      icon: "⚠️",
    },
  ]
}

const SKELETON: StatCardData[] = [
  { label: "Stock Lines",     value: "—", trend: "Loading…", color: "blue",   icon: "📦" },
  { label: "Transfers Today", value: "—", trend: "Loading…", color: "green",  icon: "🔄" },
  { label: "Low Stock Items", value: "—", trend: "Loading…", color: "yellow", icon: "📝" },
  { label: "Alerts",          value: "—", trend: "Loading…", color: "red",    icon: "⚠️" },
]

function buildAlerts(s: StoreStats): Alert[] {
  const alerts: Alert[] = []
  if (s.expired > 0) {
    alerts.push({
      type: "error",
      message: `${fmt(s.expired)} expired batch${s.expired > 1 ? "es" : ""} need removal`,
      href: "/inventory?filter=expired",
    })
  }
  if (s.lowStock > 0) {
    alerts.push({
      type: "warning",
      message: `${fmt(s.lowStock)} item${s.lowStock > 1 ? "s" : ""} below reorder point`,
      href: "/inventory?filter=low-stock",
    })
  }
  if (s.nearExpiry > 0) {
    alerts.push({
      type: "warning",
      message: `${fmt(s.nearExpiry)} item${s.nearExpiry > 1 ? "s" : ""} expiring within 90 days`,
      href: "/inventory?filter=near-expiry",
    })
  }
  if (s.pendingInbound > 0) {
    alerts.push({
      type: "info",
      message: `${fmt(s.pendingInbound)} inbound transfer${s.pendingInbound > 1 ? "s" : ""} awaiting receipt`,
      href: "/inventory/transfers?status=approved",
    })
  }
  if (alerts.length === 0) {
    alerts.push({ type: "info", message: "All store operations are normal" })
  }
  return alerts
}

// ── Dynamic Alerts Panel ──────────────────────────────────────────────────
function DynamicAlertsPanel({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  const colors = {
    error:   "border-red-300 bg-red-50 text-red-700",
    warning: "border-amber-300 bg-amber-50 text-amber-700",
    info:    "border-blue-200 bg-blue-50 text-blue-700",
  }
  const icons = { error: "🔴", warning: "🟡", info: "🔵" }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Store Alerts</h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`border-l-4 px-4 py-3 rounded-r-lg flex items-start gap-2 ${colors[alert.type]}`}
            >
              <span className="text-sm mt-0.5">{icons[alert.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.message}</p>
              </div>
              {alert.href && (
                <a
                  href={alert.href}
                  className="text-xs underline opacity-70 hover:opacity-100 whitespace-nowrap shrink-0"
                >
                  View →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Store capacity bar ─────────────────────────────────────────────────────
function CapacityBar({ percent }: { percent: number | null }) {
  if (percent === null) return null
  const clamped = Math.min(100, Math.max(0, percent))
  const color =
    clamped >= 90 ? "bg-red-500" :
    clamped >= 70 ? "bg-amber-500" :
    "bg-emerald-500"

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">Storage Utilization</p>
        <p className={`text-sm font-bold ${
          clamped >= 90 ? "text-red-600" : clamped >= 70 ? "text-amber-600" : "text-emerald-600"
        }`}>{clamped.toFixed(1)}%</p>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        {clamped >= 90
          ? "⚠️ Near capacity — consider transfers out"
          : clamped >= 70
          ? "Moderate — monitor closely"
          : "Healthy capacity level"}
      </p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function StoreKeeperDashboard() {
  const { user } = useAuth()
  const [stats, setStats]     = useState<StatCardData[]>(SKELETON)
  const [raw, setRaw]         = useState<StoreStats | null>(null)
  const [alerts, setAlerts]   = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
const storeId = user?.storeId ?? null
  const fetchStats = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams({ level: "operational" })
      if (storeId) params.set("storeId", storeId)

      const res = await fetch(`/api/admin/stats?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json = await res.json()
      const d = json.data

      const mapped: StoreStats = {
        totalStockLines:    d.inventory?.totalLines         ?? 0,
        totalUnits:         d.inventory?.totalUnits         ?? 0,
        transfersInTransit: d.transfers?.inTransit          ?? 0,
        pendingOutbound:    d.transfers?.pendingOutbound    ?? 0,
        pendingInbound:     d.transfers?.pendingInbound     ?? 0,
        adjustmentsNeeded:  d.inventory?.lowStock           ?? 0,
        lowStock:           d.inventory?.lowStock           ?? 0,
        nearExpiry:         d.inventory?.nearExpiry         ?? 0,
        expired:            d.inventory?.expired            ?? 0,
        utilizationPercent: d.inventory?.utilizationPercent ?? null,
      }

      setRaw(mapped)
      setStats(mapToCards(mapped))
      setAlerts(buildAlerts(mapped))
      setLastUpdated(new Date(json.meta.generatedAt).toLocaleTimeString())
    } catch (err) {
      console.error("[StoreKeeperDashboard]", err)
      setError("Failed to load stats")
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 300_000)
    return () => clearInterval(id)
  }, [fetchStats])

  return (
    <div className="space-y-6">

      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div>
          {error && (
            <p className="text-sm text-red-500">
              ⚠️ {error}{" "}
              <button onClick={fetchStats} className="underline ml-1">Retry</button>
            </p>
          )}
          {lastUpdated && !error && (
            <p className="text-xs text-gray-400">Updated: {lastUpdated}</p>
          )}
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      {/* Capacity bar (only when data has utilization) */}
      {raw?.utilizationPercent != null && (
        <CapacityBar percent={raw.utilizationPercent} />
      )}

      {/* Transfer summary strip */}
      {raw && (raw.pendingInbound > 0 || raw.pendingOutbound > 0 || raw.transfersInTransit > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-1">In Transit</p>
            <p className="text-2xl font-bold text-yellow-600">{fmt(raw.transfersInTransit)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Inbound Pending</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(raw.pendingInbound)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Outbound Pending</p>
            <p className="text-2xl font-bold text-purple-600">{fmt(raw.pendingOutbound)}</p>
          </div>
        </div>
      )}

      {/* Quick actions + Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <QuickActions
          title="Store Operations"
          actions={[
            { label: "Create Transfer",  href: "/inventory/transfers/create",   icon: "➕" },
            {
              label: `Stock Adjustment${raw?.lowStock ? ` (${raw.lowStock} low)` : ""}`,
              href: "/inventory/adjustments/create",
              icon: "📝",
              badge: raw?.lowStock || undefined,
            },
            { label: "View Inventory", href: "/store/inventory", icon: "📦" },
          ]}
        />
        <DynamicAlertsPanel alerts={alerts} loading={loading} />
      </div>
    </div>
  )
}