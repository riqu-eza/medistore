/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState, useCallback } from "react"
import { QuickActions, StatCard } from "../../dashboard/page"
import { useAuth } from "@/hooks/use-auth"

// ── Types ──────────────────────────────────────────────────────────────────
interface ReceivingStats {
  pendingGRNs: number          // GRNs pending approval
  receivedThisMonth: number    // GRNs received this month
  quarantinedBatches: number   // batches in quarantine (quality issues)
  activeBatches: number        // active batches in store
  nearExpiry: number           // inventory near expiry
  lowStock: number             // low stock lines
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

function mapToCards(s: ReceivingStats): StatCardData[] {
  return [
    {
      label: "Pending GRNs",
      value: fmt(s.pendingGRNs),
      trend: s.pendingGRNs > 0 ? `${s.pendingGRNs} need review` : "All clear",
      color: s.pendingGRNs > 0 ? "yellow" : "green",
      icon: "📋",
    },
    {
      label: "Received This Month",
      value: fmt(s.receivedThisMonth),
      trend: s.receivedThisMonth > 0 ? `+${s.receivedThisMonth} this month` : "None yet",
      color: "green",
      icon: "✅",
    },
    {
      label: "Quality Issues",
      value: fmt(s.quarantinedBatches),
      trend: s.quarantinedBatches > 0
        ? `${s.quarantinedBatches} quarantined`
        : "No issues",
      color: s.quarantinedBatches > 0 ? "red" : "green",
      icon: "⚠️",
    },
    {
      label: "Active Batches",
      value: fmt(s.activeBatches),
      trend: s.nearExpiry > 0
        ? `${s.nearExpiry} near expiry`
        : "All good",
      color: s.nearExpiry > 0 ? "orange" : "blue",
      icon: "📦",
    },
  ]
}

const SKELETON: StatCardData[] = [
  { label: "Pending GRNs",        value: "—", trend: "Loading…", color: "yellow", icon: "📋" },
  { label: "Received This Month", value: "—", trend: "Loading…", color: "green",  icon: "✅" },
  { label: "Quality Issues",      value: "—", trend: "Loading…", color: "red",    icon: "⚠️" },
  { label: "Active Batches",      value: "—", trend: "Loading…", color: "blue",   icon: "📦" },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function ReceivingDashboard() {
  const { user } = useAuth()
  const [stats, setStats]     = useState<StatCardData[]>(SKELETON)
  const [raw, setRaw]         = useState<ReceivingStats | null>(null)
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

      const mapped: ReceivingStats = {
        pendingGRNs:         d.grn?.pendingApproval      ?? 0,
        receivedThisMonth:   d.grn?.receivedThisMonth    ?? 0,
        quarantinedBatches:  d.batches?.quarantined      ?? 0,
        activeBatches:       d.batches?.active           ?? 0,
        nearExpiry:          d.inventory?.nearExpiry     ?? 0,
        lowStock:            d.inventory?.lowStock       ?? 0,
      }

      setRaw(mapped)
      setStats(mapToCards(mapped))
      setLastUpdated(new Date(json.meta.generatedAt).toLocaleTimeString())
    } catch (err) {
      console.error("[ReceivingDashboard]", err)
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

      {/* Alert strip for critical conditions */}
      {raw && (raw.quarantinedBatches > 0 || raw.nearExpiry > 0 || raw.lowStock > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {raw.quarantinedBatches > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <span className="text-red-500 text-lg">🔴</span>
              <div>
                <p className="text-xs font-semibold text-red-700">Quarantined Batches</p>
                <p className="text-lg font-bold text-red-800">{fmt(raw.quarantinedBatches)}</p>
              </div>
            </div>
          )}
          {raw.nearExpiry > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg">🟡</span>
              <div>
                <p className="text-xs font-semibold text-amber-700">Near Expiry Items</p>
                <p className="text-lg font-bold text-amber-800">{fmt(raw.nearExpiry)}</p>
              </div>
            </div>
          )}
          {raw.lowStock > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <span className="text-blue-500 text-lg">🔵</span>
              <div>
                <p className="text-xs font-semibold text-blue-700">Low Stock Lines</p>
                <p className="text-lg font-bold text-blue-800">{fmt(raw.lowStock)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <QuickActions
          title="Receiving Tasks"
          actions={[
            { label: "Create GRN", href: "/grn/create", icon: "➕" },
            {
              label: `Pending Approvals${raw ? ` (${raw.pendingGRNs})` : ""}`,
              href: "/grn?status=pending",
              icon: "⏳",
              badge: raw?.pendingGRNs ?? undefined,
            },
            { label: "View All GRNs", href: "/grn", icon: "📋" },
          ]}
        />
        <QuickActions
          title="Quality Control"
          actions={[
            {
              label: `Quality Checks${raw?.quarantinedBatches ? ` (${raw.quarantinedBatches})` : ""}`,
              href: "/grn?filter=quality",
              icon: "🔍",
              badge: raw?.quarantinedBatches || undefined,
            },
            { label: "Batch Management", href: "/batches",          icon: "📦" },
            { label: "Supplier List",    href: "/admin/suppliers",  icon: "🚚" },
          ]}
        />
      </div>
    </div>
  )
}