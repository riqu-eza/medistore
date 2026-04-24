"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import type { AuditLogEntry, AuditLogResponse } from "@/app/api/audit/route"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  "All", "Order", "GRN", "Batch", "Inventory",
  "Transfer", "Adjustment", "User", "Store", "Supplier",
]

const ACTIONS = [
  "All", "create", "update", "delete", "approve",
  "reject", "dispatch", "login", "logout", "allocate",
]

const PAGE_SIZE = 20

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function initials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function avatarColor(name: string): string {
  const colors = [
    "from-blue-500 to-blue-700",
    "from-violet-500 to-purple-700",
    "from-emerald-500 to-teal-700",
    "from-rose-500 to-pink-700",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-sky-700",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

interface ActionBadgeProps { action: string }
function ActionBadge({ action }: ActionBadgeProps) {
  const map: Record<string, string> = {
    create:   "bg-emerald-50 text-emerald-700 ring-emerald-200",
    approve:  "bg-blue-50 text-blue-700 ring-blue-200",
    update:   "bg-amber-50 text-amber-700 ring-amber-200",
    delete:   "bg-red-50 text-red-700 ring-red-200",
    reject:   "bg-red-50 text-red-700 ring-red-200",
    dispatch: "bg-violet-50 text-violet-700 ring-violet-200",
    login:    "bg-gray-50 text-gray-600 ring-gray-200",
    logout:   "bg-gray-50 text-gray-600 ring-gray-200",
    allocate: "bg-sky-50 text-sky-700 ring-sky-200",
  }
  const key = action.toLowerCase().split("_")[0]
  const cls = map[key] ?? "bg-gray-50 text-gray-600 ring-gray-200"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  )
}

interface EntityBadgeProps { type: string }
function EntityBadge({ type }: EntityBadgeProps) {
  const map: Record<string, string> = {
    Order:      "bg-purple-50 text-purple-700",
    GRN:        "bg-teal-50 text-teal-700",
    Batch:      "bg-orange-50 text-orange-700",
    Inventory:  "bg-blue-50 text-blue-700",
    Transfer:   "bg-indigo-50 text-indigo-700",
    Adjustment: "bg-yellow-50 text-yellow-700",
    User:       "bg-pink-50 text-pink-700",
    Store:      "bg-cyan-50 text-cyan-700",
    Supplier:   "bg-lime-50 text-lime-700",
  }
  const cls = map[type] ?? "bg-gray-50 text-gray-600"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${cls}`}>
      {type}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail drawer
// ─────────────────────────────────────────────────────────────────────────────

interface DrawerProps {
  log: AuditLogEntry | null
  onClose: () => void
}

function AuditDetailDrawer({ log, onClose }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  if (!log) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={ref}
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
        style={{ animation: "slideIn 0.22s cubic-bezier(0.4,0,0.2,1)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ActionBadge action={log.action} />
              <EntityBadge type={log.entityType} />
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">{log.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Who + When */}
          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Who & When</h4>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(log.user.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                {initials(log.user.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{log.user.name}</p>
                <p className="text-xs text-gray-400">{log.user.email}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Timestamp</p>
                <p className="text-xs font-medium text-gray-700">{formatDateTime(log.createdAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Time ago</p>
                <p className="text-xs font-medium text-gray-700">{timeAgo(log.createdAt)}</p>
              </div>
            </div>
          </section>

          {/* Context */}
          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Context</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Entity ID",  value: log.entityId },
                { label: "Request ID", value: log.requestId ?? "—" },
                { label: "IP Address", value: log.ipAddress ?? "—" },
                { label: "User Agent", value: log.userAgent ? log.userAgent.slice(0, 40) + "…" : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-xs font-medium text-gray-700 font-mono break-all">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Before / After */}
          {(log.beforeValue || log.afterValue) && (
            <section>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Changes</h4>
              <div className="space-y-3">
                {log.beforeValue && (
                  <div>
                    <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Before
                    </p>
                    <pre className="bg-red-50 text-red-800 text-[11px] rounded-xl p-4 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(log.beforeValue, null, 2)}
                    </pre>
                  </div>
                )}
                {log.afterValue && (
                  <div>
                    <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> After
                    </p>
                    <pre className="bg-emerald-50 text-emerald-800 text-[11px] rounded-xl p-4 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(log.afterValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Metadata */}
          {log.metadata && (
            <section>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Metadata</h4>
              <pre className="bg-gray-50 text-gray-700 text-[11px] rounded-xl p-4 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </div>

      <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

interface Filters {
  search: string
  action: string
  entityType: string
  from: string
  to: string
}

export default function AuditLogPage() {
  const [logs, setLogs]         = useState<AuditLogEntry[]>([])
  const [meta, setMeta]         = useState<AuditLogResponse["meta"] | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)
  const [filters, setFilters]   = useState<Filters>({
    search: "", action: "All", entityType: "All", from: "", to: "",
  })

  const buildUrl = useCallback((p: number, f: Filters) => {
    const params = new URLSearchParams()
    params.set("page", String(p))
    params.set("pageSize", String(PAGE_SIZE))
    if (f.search)                        params.set("search",     f.search)
    if (f.action     !== "All")          params.set("action",     f.action)
    if (f.entityType !== "All")          params.set("entityType", f.entityType)
    if (f.from)                          params.set("from",       f.from)
    if (f.to)                            params.set("to",         f.to)
    return `/api/audit?${params.toString()}`
  }, [])

  const load = useCallback(async (p: number, f: Filters) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(buildUrl(p, f))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: AuditLogResponse = await res.json()
      setLogs(json.data)
      setMeta(json.meta)
    } catch (err) {
      setError("Failed to load audit logs")
      console.error("[AuditLog page]", err)
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  // Initial load
  useEffect(() => { load(1, filters) }, []) // eslint-disable-line

  // Re-fetch when page changes (filter changes reset page via applyFilters)
  useEffect(() => { load(page, filters) }, [page]) // eslint-disable-line

  function applyFilters(next: Filters) {
    setFilters(next)
    setPage(1)
    load(1, next)
  }

  function clearFilters() {
    const reset: Filters = { search: "", action: "All", entityType: "All", from: "", to: "" }
    setFilters(reset)
    setPage(1)
    load(1, reset)
  }

  const hasActiveFilters =
    filters.search !== "" ||
    filters.action !== "All" ||
    filters.entityType !== "All" ||
    filters.from !== "" ||
    filters.to !== ""

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Admin
              </Link>
              <span className="text-gray-300 text-xs">/</span>
              <span className="text-xs text-gray-600 font-medium">Audit Logs</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Logs</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Complete trail of all system actions and changes
            </p>
          </div>
          {meta && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{meta.total.toLocaleString()}</p>
              <p className="text-xs text-gray-400">total records</p>
            </div>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search actions or entity types…"
                value={filters.search}
                onChange={e => applyFilters({ ...filters, search: e.target.value })}
                className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50 placeholder:text-gray-300"
              />
            </div>

            {/* Action filter */}
            <select
              value={filters.action}
              onChange={e => applyFilters({ ...filters, action: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-600"
            >
              {ACTIONS.map(a => <option key={a}>{a}</option>)}
            </select>

            {/* Entity type filter */}
            <select
              value={filters.entityType}
              onChange={e => applyFilters({ ...filters, entityType: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-600"
            >
              {ENTITY_TYPES.map(e => <option key={e}>{e}</option>)}
            </select>

            {/* Date range */}
            <input
              type="date"
              value={filters.from}
              onChange={e => applyFilters({ ...filters, from: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-500"
            />
            <input
              type="date"
              value={filters.to}
              onChange={e => applyFilters({ ...filters, to: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-500"
            />

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.search     && <Pill label={`Search: "${filters.search}"`}     onRemove={() => applyFilters({ ...filters, search: "" })} />}
              {filters.action !== "All"     && <Pill label={`Action: ${filters.action}`}         onRemove={() => applyFilters({ ...filters, action: "All" })} />}
              {filters.entityType !== "All" && <Pill label={`Entity: ${filters.entityType}`}     onRemove={() => applyFilters({ ...filters, entityType: "All" })} />}
              {filters.from       && <Pill label={`From: ${filters.from}`}           onRemove={() => applyFilters({ ...filters, from: "" })} />}
              {filters.to         && <Pill label={`To: ${filters.to}`}               onRemove={() => applyFilters({ ...filters, to: "" })} />}
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Loading overlay */}
          {loading && (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="h-5 w-16 bg-gray-100 rounded-md" />
                  <div className="h-5 w-16 bg-gray-100 rounded-md" />
                  <div className="h-2.5 w-20 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-xl">⚠️</div>
              <p className="text-sm text-red-500 font-medium">{error}</p>
              <button
                onClick={() => load(page, filters)}
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl">🛡️</div>
              <p className="text-sm text-gray-500 font-medium">No audit logs found</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-blue-500 hover:text-blue-700 underline">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Rows */}
          {!loading && !error && logs.length > 0 && (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/70">
                <div className="w-9" />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">User</p>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Action</p>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Entity</p>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:block">IP</p>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">When</p>
              </div>

              <div className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className="w-full grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors text-left group"
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(log.user.name)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                      {initials(log.user.name)}
                    </div>

                    {/* User */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{log.user.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{log.user.email}</p>
                    </div>

                    {/* Action */}
                    <ActionBadge action={log.action} />

                    {/* Entity */}
                    <EntityBadge type={log.entityType} />

                    {/* IP */}
                    <p className="text-[11px] text-gray-400 font-mono hidden md:block">
                      {log.ipAddress ?? "—"}
                    </p>

                    {/* Time */}
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">{timeAgo(log.createdAt)}</p>
                      <p className="text-[10px] text-gray-300 group-hover:text-gray-400 transition-colors">
                        View details →
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Pagination ── */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-600">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, meta.total)}
              </span>{" "}
              of <span className="font-medium text-gray-600">{meta.total.toLocaleString()}</span>
            </p>

            <div className="flex items-center gap-1">
              <PageBtn
                label="← Prev"
                disabled={!meta.hasPrev}
                onClick={() => setPage(p => p - 1)}
              />

              {/* Page numbers */}
              {Array.from({ length: Math.min(7, meta.totalPages) }, (_, i) => {
                let p: number
                if (meta.totalPages <= 7) {
                  p = i + 1
                } else if (page <= 4) {
                  p = i + 1
                } else if (page >= meta.totalPages - 3) {
                  p = meta.totalPages - 6 + i
                } else {
                  p = page - 3 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                      p === page
                        ? "bg-blue-600 text-white font-semibold"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                )
              })}

              <PageBtn
                label="Next →"
                disabled={!meta.hasNext}
                onClick={() => setPage(p => p + 1)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Detail drawer ── */}
      <AuditDetailDrawer log={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900 ml-0.5">✕</button>
    </span>
  )
}

function PageBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 h-8 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  )
}