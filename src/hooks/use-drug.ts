"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { DrugFilters, Drug, PaginatedDrugs } from "@/types/drug";
import { DrugFormValues } from "@/lib/validators/drug";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const drugKeys = {
  all: ["drugs"] as const,
  lists: () => [...drugKeys.all, "list"] as const,
  list: (filters: DrugFilters) => [...drugKeys.lists(), filters] as const,
  details: () => [...drugKeys.all, "detail"] as const,
  detail: (id: string) => [...drugKeys.details(), id] as const,
};

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || "API error") as Error & {
      details?: Record<string, string[]>;
      status: number;
    };
    error.details = data.details;
    error.status = res.status;
    throw error;
  }

  return data as T;
}

function filtersToParams(filters: DrugFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.set(key, String(val));
    }
  });
  return params.toString();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** List drugs with filters, search, pagination */
export function useDrugs(filters: DrugFilters) {
  return useQuery<PaginatedDrugs>({
    queryKey: drugKeys.list(filters),
    queryFn: () =>
      apiFetch<PaginatedDrugs>(`/api/admin/drugs?${filtersToParams(filters)}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** Get single drug by id */
export function useDrug(id: string | null) {
  return useQuery<Drug>({
    queryKey: drugKeys.detail(id!),
    queryFn: () => apiFetch<Drug>(`/api/admin/drugs/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}
export function useDrugById(id: string | null) {
  return useQuery({
    queryKey: ["drug", id],
    enabled: !!id,
    queryFn: () =>
      fetch(`/api/admin/drugs/${id}`).then(res => res.json()),
  });
}
/** Create a new drug */
export function useCreateDrug() {
  const qc = useQueryClient();

  return useMutation<Drug, Error & { details?: Record<string, string[]> }, DrugFormValues>({
    mutationFn: (payload) =>
      apiFetch<Drug>("/api/admin/drugs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: drugKeys.lists() });
    },
  });
}

/** Update a drug */
export function useUpdateDrug() {
  const qc = useQueryClient();

  return useMutation<
    Drug,
    Error & { details?: Record<string, string[]> },
    { id: string; data: Partial<DrugFormValues> }
  >({
    mutationFn: ({ id, data }) =>
      apiFetch<Drug>(`/api/admin/drugs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (drug) => {
      qc.invalidateQueries({ queryKey: drugKeys.lists() });
      qc.setQueryData(drugKeys.detail(drug.id), drug);
    },
  });
}

/** Hard delete a drug */
export function useDeleteDrug() {
  const qc = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (id) =>
      apiFetch<{ message: string }>(`/api/admin/drugs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: drugKeys.lists() });
    },
  });
}

/** Soft delete — discontinue a drug */
export function useDiscontinueDrug() {
  const qc = useQueryClient();

  return useMutation<
    Drug,
    Error,
    { id: string; reason: string; replacementDrugId?: string }
  >({
    mutationFn: ({ id, reason, replacementDrugId }) =>
      apiFetch<Drug>(`/api/admin/drugs/${id}?soft=true`, {
        method: "DELETE",
        body: JSON.stringify({ reason, replacementDrugId }),
      }),
    onSuccess: (drug) => {
      qc.invalidateQueries({ queryKey: drugKeys.lists() });
      qc.setQueryData(drugKeys.detail(drug.id), drug);
    },
  });
}