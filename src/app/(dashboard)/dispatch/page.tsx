/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState, useCallback } from "react"
import { QuickActions, StatCard } from "../dashboard/page"
import { useAuth } from "@/hooks/use-auth"

// ── Types ──────────────────────────────────────────────────────────────────
interface DispatchStats {
  readyToDispatch: number      // orders status=allocated
  inTransit: number            // orders status=dispatched
  deliveredToday: number       // orders status=completed today
  pendingApproval: number      // orders status=pending_approval
  transfersInTransit: number   // transfers in_transit
  transfersPendingOut: number  // transfers pending outbound
}

interface StatCardData {
  label: string
  value: string
  trend: string
  color: string
  icon: string
}

function fmt(n: number) {
  return n >= 1000 ? n.toLocaleString() : String(n)
}

function mapToCards(s: DispatchStats): StatCardData[] {
  return [
    {
      label: "Ready to Dispatch",
      value: fmt(s.readyToDispatch),
      trend: s.readyToDispatch > 0 ? `+${s.readyToDispatch} allocated` : "None allocated",
      color: "blue",
      icon: "📦",
    },
    {
      label: "In Transit",
      value: fmt(s.inTransit),
      trend: s.transfersInTransit > 0
        ? `+${s.transfersInTransit} transfers`
        : "No transfers",
      color: "yellow",
      icon: "🚚",
    },
    {
      label: "Delivered Today",
      value: fmt(s.deliveredToday),
      trend: s.deliveredToday > 0 ? `+${s.deliveredToday} today` : "None yet",
      color: "green",
      icon: "✅",
    },
    {
      label: "Pending Approval",
      value: fmt(s.pendingApproval),
      trend: s.pendingApproval > 0
        ? `${s.pendingApproval} awaiting`
        : "All clear",
      color: s.pendingApproval > 0 ? "orange" : "green",
      icon: "⏳",
    },
  ]
}

const SKELETON: StatCardData[] = [
  { label: "Ready to Dispatch",  value: "—", trend: "Loading…", color: "blue",   icon: "📦" },
  { label: "In Transit",         value: "—", trend: "Loading…", color: "yellow", icon: "🚚" },
  { label: "Delivered Today",    value: "—", trend: "Loading…", color: "green",  icon: "✅" },
  { label: "Pending Approval",   value: "—", trend: "Loading…", color: "orange", icon: "⏳" },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function DispatchDashboard() {
  const { user } = useAuth()
  const [stats, setStats]       = useState<StatCardData[]>(SKELETON)
  const [raw, setRaw]           = useState<DispatchStats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
const storeId = user?.storeId ?? null
  const fetchStats = useCallback(async () => {
    try {
      setError(null)
      // Use operational level scoped to user's store
      const params = new URLSearchParams({ level: "operational" })
      if (storeId) params.set("storeId", storeId)

      const res = await fetch(`/api/admin/stats?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json = await res.json()
      const d = json.data

      // Map operational stats → dispatch-relevant shape
      const mapped: DispatchStats = {
        readyToDispatch:     d.orders?.allocatedAwaitingDispatch ?? d.orders?.pendingAllocation ?? 0,
        inTransit:           d.orders?.dispatchedToday           ?? 0,
        deliveredToday:      d.transfers?.inTransit              ?? 0,
        pendingApproval:     d.orders?.pendingAllocation         ?? 0,
        transfersInTransit:  d.transfers?.inTransit              ?? 0,
        transfersPendingOut: d.transfers?.pendingOutbound        ?? 0,
      }

      setRaw(mapped)
      setStats(mapToCards(mapped))
      setLastUpdated(new Date(json.meta.generatedAt).toLocaleTimeString())
    } catch (err) {
      console.error("[DispatchDashboard]", err)
      setError("Failed to load stats")
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 300_000) // refresh every 5 min (operational TTL)
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
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Summary strip — only when data is loaded */}
      {raw && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Transfers In Transit",  value: raw.transfersInTransit,  color: "text-yellow-600" },
            { label: "Outbound Pending",      value: raw.transfersPendingOut, color: "text-blue-600"   },
            { label: "Allocated (total)",     value: raw.readyToDispatch,     color: "text-purple-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`text-lg font-bold ${color}`}>{fmt(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <QuickActions
          title="Dispatch Operations"
          actions={[
            {
              label: `Create Dispatch Note`,
              href: "/dispatch/create",
              icon: "➕",
            },
            {
              label: `Allocated Orders${raw ? ` (${raw.readyToDispatch})` : ""}`,
              href: "/orders?status=allocated",
              icon: "📋",
              badge: raw?.readyToDispatch ?? undefined,
            },
            {
              label: "Track Deliveries",
              href: "/dispatch?status=in-transit",
              icon: "🗺️",
            },
          ]}
        />
        <QuickActions
          title="Today's Schedule"
          actions={[
            { label: "Morning Deliveries",  href: "/dispatch?shift=morning",   icon: "🌅" },
            { label: "Afternoon Deliveries", href: "/dispatch?shift=afternoon", icon: "☀️" },
            { label: "Delivery Reports",    href: "/reports/dispatch",         icon: "📊" },
          ]}
        />
      </div>
    </div>
  )
}