"use client";

import { useState, useCallback, useTransition } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import type { Drug, DrugFilters, DrugCategory } from "@/types/drug";
import { useDrug, useDrugs } from "@/hooks/use-drug";
import DrugModal from "@/components/drugs/drugModal";
import DeleteDialog from "@/components/drugs/DeleteDialog";

// ─── Mock categories until categories API is wired ────────────────────────────
const MOCK_CATEGORIES: DrugCategory[] = [
  { id: 1, name: "Antibiotics", categoryType: "therapeutic", isActive: true },
  { id: 2, name: "Analgesics", categoryType: "therapeutic", isActive: true },
  { id: 3, name: "Antivirals", categoryType: "therapeutic", isActive: true },
  { id: 4, name: "Vitamins & Supplements", categoryType: "pharmacological", isActive: true },
  { id: 5, name: "Cardiovascular", categoryType: "therapeutic", isActive: true },
];

// ─── Badge helpers ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Drug["status"] }) {
  const map: Record<Drug["status"], string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    discontinued: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RegulatoryBadge({ rc, isControlled }: { rc: Drug["regulatoryClass"]; isControlled: boolean }) {
  const map: Record<string, string> = {
    OTC: "bg-sky-100 text-sky-700",
    prescription: "bg-violet-100 text-violet-700",
    controlled: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[rc]}`}>
      {isControlled && <span>⚠</span>}
      {rc.toUpperCase()}
    </span>
  );
}

// ─── Column definition ────────────────────────────────────────────────────────
const col = createColumnHelper<Drug>();

const columns = [
  col.accessor("drugCode", {
    header: "Code",
    cell: (i) => (
      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
        {i.getValue()}
      </span>
    ),
  }),
  col.accessor("genericName", {
    header: "Generic Name",
    cell: (i) => (
      <div>
        <p className="font-semibold text-slate-900 text-sm">{i.getValue()}</p>
        {i.row.original.brandName && (
          <p className="text-xs text-slate-400">{i.row.original.brandName}</p>
        )}
      </div>
    ),
  }),
  col.accessor("category", {
    header: "Category",
    cell: (i) => (
      <span className="text-xs text-slate-600">{i.getValue()?.name ?? "—"}</span>
    ),
    enableSorting: false,
  }),
  col.accessor("dosageForm", {
    header: "Form",
    cell: (i) => (
      <span className="text-xs capitalize text-slate-600">{i.getValue()}</span>
    ),
  }),
  col.accessor("strength", {
    header: "Strength",
    cell: (i) => <span className="text-xs text-slate-700 font-medium">{i.getValue()}</span>,
  }),
  col.accessor("regulatoryClass", {
    header: "Regulatory",
    cell: (i) => (
      <RegulatoryBadge rc={i.getValue()} isControlled={i.row.original.isControlled} />
    ),
  }),
  col.accessor("sellingPrice", {
    header: "Price (KES)",
    cell: (i) => {
      const v = i.getValue();
      return v != null ? (
        <span className="text-sm font-semibold text-slate-800">
          {Number(v).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
        </span>
      ) : <span className="text-slate-300">—</span>;
    },
  }),
  col.accessor("status", {
    header: "Status",
    cell: (i) => <StatusBadge status={i.getValue()} />,
  }),
];

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({
  filters,
  onChange,
  categories,
}: {
  filters: DrugFilters;
  onChange: (f: Partial<DrugFilters>) => void;
  categories: DrugCategory[];
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          placeholder="Search drugs…"
          className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 w-56 transition-all"
        />
      </div>

      {/* Status */}
      <select
        value={filters.status ?? "all"}
        onChange={(e) => onChange({ status: e.target.value as DrugFilters["status"], page: 1 })}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white"
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="discontinued">Discontinued</option>
      </select>

      {/* Regulatory */}
      <select
        value={filters.regulatoryClass ?? "all"}
        onChange={(e) => onChange({ regulatoryClass: e.target.value as DrugFilters["regulatoryClass"], page: 1 })}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white"
      >
        <option value="all">All Classes</option>
        <option value="OTC">OTC</option>
        <option value="prescription">Prescription</option>
        <option value="controlled">Controlled</option>
      </select>

      {/* Category */}
      <select
        value={filters.categoryId ?? "all"}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ categoryId: v === "all" ? undefined : Number(v), page: 1 });
        }}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white"
      >
        <option value="all">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Storage */}
      <select
        value={filters.storageConditionGroup ?? "all"}
        onChange={(e) => onChange({ storageConditionGroup: e.target.value as DrugFilters["storageConditionGroup"], page: 1 })}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white"
      >
        <option value="all">All Storage</option>
        <option value="general">General</option>
        <option value="cold">Cold Chain</option>
        <option value="controlled">Controlled</option>
      </select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DrugsPage() {
  const categories = MOCK_CATEGORIES;

  const [filters, setFilters] = useState<DrugFilters>({
    page: 1,
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    status: "all",
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [, startTransition] = useTransition();

  const [modal, setModal] = useState<{
    type: "create" | "edit" | "delete" | null;
    drug?: Drug;
  }>({ type: null });

  const { data, isLoading, isFetching, isError } = useDrugs(filters);

  const updateFilters = useCallback((patch: Partial<DrugFilters>) => {
    startTransition(() => setFilters((f) => ({ ...f, ...patch })));
  }, []);

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      if (next[0]) {
        updateFilters({ sortBy: next[0].id as keyof Drug, sortOrder: next[0].desc ? "desc" : "asc" });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Drug Inventory</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {data?.total != null ? `${data.total.toLocaleString()} drugs` : "Loading…"}
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Drug
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 flex flex-col gap-4">
        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <FilterBar filters={filters} onChange={updateFilters} categories={categories} />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-semibold text-slate-700">Failed to load drugs</p>
              <p className="text-xs text-slate-400">Check your connection or try again</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b border-slate-100 bg-slate-50/80">
                        {hg.headers.map((header) => (
                          <th
                            key={header.id}
                            className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap select-none
                              ${header.column.getCanSort() ? "cursor-pointer hover:text-teal-600" : ""}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <span className="text-slate-300">
                                  {header.column.getIsSorted() === "asc" ? "↑"
                                    : header.column.getIsSorted() === "desc" ? "↓"
                                    : "↕"}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest text-slate-500">
                          Actions
                        </th>
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50 animate-pulse">
                          {columns.map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 bg-slate-100 rounded w-3/4" />
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <div className="h-4 bg-slate-100 rounded w-16 ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="text-center py-20">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl">💊</span>
                            <p className="text-sm font-semibold text-slate-600">No drugs found</p>
                            <p className="text-xs text-slate-400">
                              {filters.search ? "Try adjusting your search" : "Add your first drug to get started"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-50 hover:bg-teal-50/40 transition-colors
                            ${isFetching ? "opacity-60" : ""}`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setModal({ type: "edit", drug: row.original })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                title="Edit"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setModal({ type: "delete", drug: row.original })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500">
                    Showing {((filters.page! - 1) * filters.pageSize!) + 1}–
                    {Math.min(filters.page! * filters.pageSize!, data.total)} of {data.total}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateFilters({ page: 1 })}
                      disabled={filters.page === 1}
                      className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                    >
                      «
                    </button>
                    <button
                      onClick={() => updateFilters({ page: (filters.page ?? 1) - 1 })}
                      disabled={filters.page === 1}
                      className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                    >
                      ‹
                    </button>
                    {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(
                        data.totalPages - 4,
                        (filters.page ?? 1) - 2
                      )) + i;
                      return (
                        <button
                          key={page}
                          onClick={() => updateFilters({ page })}
                          className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors
                            ${page === filters.page
                              ? "bg-teal-600 text-white border-teal-600"
                              : "border-slate-200 hover:bg-slate-100"
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => updateFilters({ page: (filters.page ?? 1) + 1 })}
                      disabled={filters.page === data.totalPages}
                      className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => updateFilters({ page: data.totalPages })}
                      disabled={filters.page === data.totalPages}
                      className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                    >
                      »
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Per page</label>
                    <select
                      value={filters.pageSize}
                      onChange={(e) => updateFilters({ pageSize: Number(e.target.value), page: 1 })}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none"
                    >
                      {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal.type === "create" && (
        <DrugModal
          mode="create"
          categories={categories}
          onClose={() => setModal({ type: null })}
        />
      )}
      {modal.type === "edit" && modal.drug && (
        <DrugModal
          mode="edit"
          drugId={modal.drug.id}
          categories={categories}
          onClose={() => setModal({ type: null })}
        />
      )}
      {modal.type === "delete" && modal.drug && (
        <DeleteDialog
          drug={modal.drug}
          onClose={() => setModal({ type: null })}
        />
      )}
    </div>
  );
}