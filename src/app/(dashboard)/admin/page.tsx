/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState } from "react"
import { QuickActions, StatCard } from "../dashboard/page"
import { RecentActivity } from "@/components/audit/Recentactivity"

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardApiResponse {
  data: {
    inventory: {
      totalItems: number
      lowStockCount: number
      nearExpiryCount: number
      expiredCount: number
    }
    orders: {
      pending: number
      pendingApproval: number
      dispatched: number
      completedToday: number
    }
    alerts: {
      criticalAlerts: number
      lockedAccounts: number
    }
    grn: {
      pendingApproval: number
    }
  }
  meta: {
    level: string
    generatedAt: string
  }
}

interface StatCardData {
  label: string
  value: string
  trend: string
  color: string
  icon: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return n.toLocaleString()
  return String(n)
}

function mapApiToCards(data: DashboardApiResponse["data"]): StatCardData[] {
  return [
    {
      label: "Total Inventory Items",
      value: fmt(data.inventory.totalItems),
      trend: data.inventory.lowStockCount > 0
        ? `${data.inventory.lowStockCount} low stock`
        : "Stock OK",
      color: "blue",
      icon: "📦",
    },
    {
      label: "Orders Pending Approval",
      value: fmt(data.orders.pendingApproval),
      trend: data.orders.completedToday > 0
        ? `${data.orders.completedToday} completed today`
        : "None completed today",
      color: "purple",
      icon: "📋",
    },
    {
      label: "Near Expiry",
      value: fmt(data.inventory.nearExpiryCount),
      trend: data.inventory.expiredCount > 0
        ? `${data.inventory.expiredCount} already expired`
        : "None expired",
      color: data.inventory.nearExpiryCount > 0 ? "orange" : "green",
      icon: "⏳",
    },
    {
      label: "Critical Alerts",
      value: fmt(data.alerts.criticalAlerts),
      trend: data.alerts.lockedAccounts > 0
        ? `${data.alerts.lockedAccounts} locked accounts`
        : "No locked accounts",
      color: data.alerts.criticalAlerts > 0 ? "red" : "green",
      icon: "🚨",
    },
    {
      label: "GRN Pending Approval",
      value: fmt(data.grn.pendingApproval),
      trend: data.orders.dispatched > 0
        ? `${data.orders.dispatched} dispatched today`
        : "None dispatched today",
      color: "cyan",
      icon: "🚚",
    },
  ]
}

// ── Default skeleton while loading ────────────────────────────────────────
const SKELETON_STATS: StatCardData[] = [
  { label: "Total Inventory Items", value: "—", trend: "Loading...", color: "blue", icon: "📦" },
  { label: "Orders Pending Approval", value: "—", trend: "Loading...", color: "purple", icon: "📋" },
  { label: "Near Expiry", value: "—", trend: "Loading...", color: "orange", icon: "⏳" },
  { label: "Critical Alerts", value: "—", trend: "Loading...", color: "red", icon: "🚨" },
  { label: "GRN Pending Approval", value: "—", trend: "Loading...", color: "cyan", icon: "🚚" },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCardData[]>(SKELETON_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setError(null)
      // ✅ Correct: fetch dashboard level stats
      const res = await fetch("/api/admin/stats?level=dashboard")

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }

      // ✅ Correct: response shape is { data: {...}, meta: {...} }
      const json: DashboardApiResponse = await res.json()

      setStats(mapApiToCards(json.data))
      setLastUpdated(new Date(json.meta.generatedAt).toLocaleTimeString())
    } catch (err) {
      console.error("[AdminDashboard] fetchStats error:", err)
      setError(err instanceof Error ? err.message : "Failed to load stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    const interval = setInterval(fetchStats, 60_000)
    return () => clearInterval(interval)
  }, []) // ✅ Empty array — runs once on mount, cleans up on unmount

  return (
    <div className="space-y-6">

      {/* Header row with refresh info */}
      <div className="flex items-center justify-between">
        <div>
          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              ⚠️ {error}
              <button
                onClick={fetchStats}
                className="ml-2 underline text-red-600 hover:text-red-800"
              >
                Retry
              </button>
            </p>
          )}
          {lastUpdated && !error && (
            <p className="text-xs text-gray-400">Last updated: {lastUpdated}</p>
          )}
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-40"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <QuickActions
          title="Management"
          actions={[
            { label: "Manage Users", href: "/admin/users", icon: "👥" },
            { label: "System Settings", href: "/admin/settings", icon: "⚙️" },
            { label: "View Audit Logs", href: "/admin/auditor/viewall", icon: "🛡️" },
          ]}
        />
        <QuickActions
          title="Operations"
          actions={[
            { label: "All Orders", href: "/orders", icon: "📋" },
            { label: "Inventory Overview", href: "/inventory", icon: "📦" },
            { label: "View Reports", href: "/reports", icon: "📊" },
          ]}
        />
        <RecentActivity />
      </div>
    </div>
  )
}