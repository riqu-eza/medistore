/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import type { AuditLogEntry } from "@/app/api/audit/route"

// ── Action colour map ──────────────────────────────────────────────────────
const ACTION_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  create:   { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  approve:  { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  update:   { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  delete:   { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
  reject:   { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
  dispatch: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  login:    { bg: "bg-gray-50",   text: "text-gray-600",   dot: "bg-gray-400"   },
}

function getActionStyle(action: string) {
  const key = action.toLowerCase().split("_")[0]
  return ACTION_STYLES[key] ?? { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

// ── Component ──────────────────────────────────────────────────────────────
export function RecentActivity() {
  const [logs, setLogs]       = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch5 = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/audit?recent=8")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLogs(json.data ?? [])
    } catch (err) {
      setError("Could not load activity")
      console.error("[RecentActivity]", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch5()
    const id = setInterval(fetch5, 60_000)
    return () => clearInterval(id)
  }, [fetch5])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Activity</h3>
        <Link
          href="/admin/auditor/viewall"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-6">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={fetch5}
            className="mt-2 text-xs text-gray-500 underline hover:text-gray-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && logs.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400">No activity yet</p>
        </div>
      )}

      {/* Log entries */}
      {!loading && !error && logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => {
            const style = getActionStyle(log.action)
            return (
              <div key={log.id} className="flex items-start gap-3 group">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {initials(log.user.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 leading-snug">
                    <span className="font-medium">{log.user.name}</span>
                    {" "}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {log.action.replace(/_/g, " ")}
                    </span>
                    {" "}
                    <span className="text-gray-500">{log.entityType}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {timeAgo(log.createdAt)}
                    {log.ipAddress && (
                      <span className="ml-2 text-gray-300">· {log.ipAddress}</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}