import { DrugFormValues, DrugQueryParams, UpdateDrugFormValues } from "../validators/drug";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Drug {
  id: string;
  drugCode: string;
  genericName: string;
  brandName?: string | null;
  categoryId: number;
  category?: { id: number; name: string };
  dosageForm: string;
  strength: string;
  packSize: number;
  unitOfMeasure: string;
  storageRequirements?: Record<string, unknown> | null;
  storageConditionGroup?: string | null;
  regulatoryClass: string;
  isControlled: boolean;
  controlledSchedule?: string | null;
  manufacturer?: string | null;
  activeIngredients?: Array<{ name: string; strength: string }> | null;
  description?: string | null;
  imageUrl?: string | null;
  unitCost?: string | null;
  sellingPrice?: string | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  status: string;
  discontinuedDate?: string | null;
  discontinuedReason?: string | null;
  replacementDrugId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface PaginatedDrugs {
  data: Drug[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL = "/api/admin/drug";

// ─── Helper ───────────────────────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errBody: ApiError = { message: "An unexpected error occurred" };
    try {
      errBody = await res.json();
    } catch {}
    const err = new Error(errBody.message) as Error & {
      errors?: Record<string, string[]>;
      status: number;
    };
    err.status = res.status;
    if (errBody.errors) err.errors = errBody.errors;
    throw err;
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

function buildQueryString(params: Partial<DrugQueryParams>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      qs.append(k, String(v));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

// ─── API Service ─────────────────────────────────────────────────────────────
export const DrugService = {
  /**
   * Fetch a paginated & filtered list of drugs
   */
  async list(query: Partial<DrugQueryParams> = {}): Promise<PaginatedDrugs> {
    const res = await fetch(`${BASE_URL}${buildQueryString(query)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<PaginatedDrugs>(res);
  },

  /**
   * Fetch a single drug by ID
   */
  async getById(id: string): Promise<Drug> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<Drug>(res);
  },

  /**
   * Fetch a drug by drug code
   */
  async getByCode(code: string): Promise<Drug> {
    const res = await fetch(`${BASE_URL}/code/${encodeURIComponent(code)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<Drug>(res);
  },

  /**
   * Create a new drug
   */
  async create(data: DrugFormValues): Promise<Drug> {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Drug>(res);
  },

  /**
   * Update an existing drug (partial update)
   */
  async update(id: string, data: UpdateDrugFormValues): Promise<Drug> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Drug>(res);
  },

  /**
   * Full replace (PUT) of a drug
   */
  async replace(id: string, data: DrugFormValues): Promise<Drug> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Drug>(res);
  },

  /**
   * Delete a drug by ID
   */
  async delete(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<void>(res);
  },

  /**
   * Change drug status (activate, deactivate, discontinue)
   */
  async updateStatus(
    id: string,
    status: "active" | "inactive" | "discontinued",
    reason?: string,
  ): Promise<Drug> {
    const res = await fetch(`${BASE_URL}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, discontinuedReason: reason }),
    });
    return handleResponse<Drug>(res);
  },

  /**
   * Check if a drug code is already taken (useful for real-time validation)
   */
  async checkCodeAvailability(
    code: string,
    excludeId?: string,
  ): Promise<{ available: boolean }> {
    const qs = excludeId ? `?excludeId=${excludeId}` : "";
    const res = await fetch(
      `${BASE_URL}/check-code/${encodeURIComponent(code)}${qs}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    return handleResponse<{ available: boolean }>(res);
  },
};
