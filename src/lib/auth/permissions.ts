
// lib/auth/permissions.ts - UPDATE THIS FILE
/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// AUTHORIZATION MIDDLEWARE & UTILITIES
// File: src/lib/auth/permissions.ts
// ============================================================================

import { Session } from "next-auth";

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const PERMISSIONS = {
  // User Management
  USERS_CREATE: "users:create",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_MANAGE_ROLES: "users:manage_roles",

  // Drug Management
  DRUGS_CREATE: "drugs:create",
  DRUGS_READ: "drugs:read",
  DRUGS_UPDATE: "drugs:update",
  DRUGS_DELETE: "drugs:delete",

  // Supplier Management
  SUPPLIERS_CREATE: "suppliers:create",
  SUPPLIERS_READ: "suppliers:read",
  SUPPLIERS_UPDATE: "suppliers:update",
  SUPPLIERS_DELETE: "suppliers:delete",
  SUPPLIERS_APPROVE: "suppliers:approve",

  // Store Management
  STORES_CREATE: "stores:create",
  STORES_READ: "stores:read",
  STORES_UPDATE: "stores:update",
  STORES_DELETE: "stores:delete",

  // Inventory Management
  INVENTORY_READ: "inventory:read",
  INVENTORY_WRITE: "inventory:write",
  INVENTORY_TRANSFER: "inventory:transfer",
  INVENTORY_ADJUST: "inventory:adjust",
  INVENTORY_APPROVE_ADJUSTMENT: "inventory:approve_adjustment",

  // GRN (Goods Receipt)
  GRN_CREATE: "grn:create",
  GRN_READ: "grn:read",
  GRN_UPDATE: "grn:update",
  GRN_APPROVE: "grn:approve",
  GRN_REJECT: "grn:reject",

  // Batch Management
  BATCHES_CREATE: "batches:create",
  BATCHES_READ: "batches:read",
  BATCHES_UPDATE: "batches:update",
  BATCHES_QUARANTINE: "batches:quarantine",
  BATCHES_RECALL: "batches:recall",

  // Order Management
  ORDERS_CREATE: "orders:create",
  ORDERS_READ: "orders:read",
  ORDERS_UPDATE: "orders:update",
  ORDERS_DELETE: "orders:delete",
  ORDERS_APPROVE: "orders:approve",
  ORDERS_ALLOCATE: "orders:allocate",
  ORDERS_CANCEL: "orders:cancel",
  ORDERS_DISPATCH:"orders:dispatch",  
  ORDERS_REALLOCATE: "orders:reallocate", // NEW: For partial allocation retry

  // Dispatch Management
  DISPATCH_CREATE: "dispatch:create",
  DISPATCH_READ: "dispatch:read",
  DISPATCH_UPDATE: "dispatch:update",
  DISPATCH_CONFIRM: "dispatch:confirm",

  // Reports & Analytics
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",
  REPORTS_CUSTOM: "reports:custom",
  ANALYTICS_VIEW: "analytics:view",

  // Audit & Compliance
  AUDIT_VIEW: "audit:view",
  AUDIT_EXPORT: "audit:export",

  // System Configuration
  SYSTEM_CONFIG: "system:config",
  SYSTEM_MAINTENANCE: "system:maintenance",

  // All permissions (Admin)
  ALL: "*",
} as const;

// ============================================================================
// ROLE-BASED PERMISSION SETS
// ============================================================================

export const ROLE_PERMISSIONS = {
  admin: [PERMISSIONS.ALL],

  store_manager: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.DRUGS_READ,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.STORES_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.GRN_READ,
    PERMISSIONS.GRN_APPROVE,
    PERMISSIONS.BATCHES_READ,
    PERMISSIONS.BATCHES_QUARANTINE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_APPROVE,
    PERMISSIONS.ORDERS_ALLOCATE,
    PERMISSIONS.ORDERS_DISPATCH,
    PERMISSIONS.DISPATCH_READ,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],

  receiving_officer: [
    PERMISSIONS.DRUGS_READ,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.STORES_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.GRN_CREATE,
    PERMISSIONS.GRN_READ,
    PERMISSIONS.GRN_UPDATE,
    PERMISSIONS.GRN_APPROVE,
    PERMISSIONS.BATCHES_READ,
    PERMISSIONS.BATCHES_CREATE,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],

  dispatch_officer: [
    PERMISSIONS.DRUGS_READ,
    PERMISSIONS.STORES_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.DISPATCH_CREATE,
    PERMISSIONS.DISPATCH_READ,
    PERMISSIONS.DISPATCH_UPDATE,
    PERMISSIONS.DISPATCH_CONFIRM,
    PERMISSIONS.BATCHES_READ,
        PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.ORDERS_DISPATCH,
  ],

  inventory_officer: [
    PERMISSIONS.DRUGS_READ,
    PERMISSIONS.STORES_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.BATCHES_READ,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_APPROVE,
    PERMISSIONS.ORDERS_ALLOCATE,
    PERMISSIONS.ORDERS_REALLOCATE, // ADD THIS
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.DISPATCH_READ,
  ],

  auditor: [
    PERMISSIONS.DRUGS_READ,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.STORES_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.GRN_READ,
    PERMISSIONS.BATCHES_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.DISPATCH_READ,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
  ],

  viewer: [
    PERMISSIONS.DRUGS_READ,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.STORES_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.REPORTS_VIEW,
  ],
} as const;

// Rest of the file remains the same...
// (Keep all utility functions like hasPermission, hasAnyPermission, etc.)

// ============================================================================
// PERMISSION CHECK UTILITIES
// ============================================================================

/**
 * Check if user has permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  // Admin has all permissions
  if (userPermissions.includes(PERMISSIONS.ALL)) {
    return true;
  }

  // Check specific permission
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  // Admin has all permissions
  if (userPermissions.includes(PERMISSIONS.ALL)) {
    return true;
  }

  // Check if user has any permission
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission),
  );
}

/**
 * Check if user has all permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  // Admin has all permissions
  if (userPermissions.includes(PERMISSIONS.ALL)) {
    return true;
  }

  // Check if user has all permissions
  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission),
  );
}

/**
 * Get permissions for a role
 */

export function getRolePermissions(roleName: string): string[] {
  return [
    ...(ROLE_PERMISSIONS[roleName as keyof typeof ROLE_PERMISSIONS] || []),
  ];
}
/**
 * Validate if permissions are valid
 */
export function validatePermissions(permissions: string[]): boolean {
  const validPermissions = Object.values(PERMISSIONS);
  return permissions.every((permission) =>
    validPermissions.includes(permission as any),
  );
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Create permission checker for session
 */
export function createPermissionChecker(session: Session | null) {
  return {
    hasPermission: (permission: string) => {
      if (!session?.user) return false;
      return hasPermission(session.user.permissions, permission);
    },
    hasAnyPermission: (permissions: string[]) => {
      if (!session?.user) return false;
      return hasAnyPermission(session.user.permissions, permissions);
    },
    hasAllPermissions: (permissions: string[]) => {
      if (!session?.user) return false;
      return hasAllPermissions(session.user.permissions, permissions);
    },
    hasRole: (roleName: string) => {
      if (!session?.user) return false;
      return session.user.roleName === roleName;
    },
    isAdmin: () => {
      if (!session?.user) return false;
      return session.user.permissions.includes(PERMISSIONS.ALL);
    },
    isStoreUser: (storeId: string) => {
      if (!session?.user) return false;
      if (session.user.permissions.includes(PERMISSIONS.ALL)) return true;
      return session.user.storeId === storeId;
    },
  };
}

// ============================================================================
// RESOURCE-LEVEL AUTHORIZATION
// ============================================================================

/**
 * Check if user can access resource based on store ownership
 */
export function canAccessStore(
  session: Session | null,
  storeId: string,
): boolean {
  if (!session?.user) return false;

  // Admin can access all stores
  if (session.user.permissions.includes(PERMISSIONS.ALL)) {
    return true;
  }

  // Check if user is assigned to this store
  return session.user.storeId === storeId;
}

/**
 * Filter query by user's store access
 */
export function getStoreFilter(session: Session | null) {
  if (!session?.user) {
    return { id: "never-match" }; // No access
  }

  // Admin can access all stores
  if (session.user.permissions.includes(PERMISSIONS.ALL)) {
    return {}; // No filter
  }

  // Filter by user's store
  if (session.user.storeId) {
    return { storeId: session.user.storeId };
  }

  return { id: "never-match" }; // No store assigned
}

// ============================================================================
// PERMISSION DESCRIPTIONS (for UI)
// ============================================================================

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.ALL]: "Full system access (Administrator)",

  [PERMISSIONS.USERS_CREATE]: "Create new users",
  [PERMISSIONS.USERS_READ]: "View user information",
  [PERMISSIONS.USERS_UPDATE]: "Update user information",
  [PERMISSIONS.USERS_DELETE]: "Delete users",
  [PERMISSIONS.USERS_MANAGE_ROLES]: "Assign roles to users",

  [PERMISSIONS.DRUGS_CREATE]: "Add new drugs to system",
  [PERMISSIONS.DRUGS_READ]: "View drug information",
  [PERMISSIONS.DRUGS_UPDATE]: "Update drug information",
  [PERMISSIONS.DRUGS_DELETE]: "Remove drugs from system",

  [PERMISSIONS.INVENTORY_READ]: "View inventory levels",
  [PERMISSIONS.INVENTORY_WRITE]: "Modify inventory",
  [PERMISSIONS.INVENTORY_TRANSFER]: "Transfer inventory between stores",
  [PERMISSIONS.INVENTORY_ADJUST]: "Create inventory adjustments",
  [PERMISSIONS.INVENTORY_APPROVE_ADJUSTMENT]: "Approve inventory adjustments",

  [PERMISSIONS.GRN_CREATE]: "Create goods receipt notes",
  [PERMISSIONS.GRN_READ]: "View goods receipt notes",
  [PERMISSIONS.GRN_UPDATE]: "Update goods receipt notes",
  [PERMISSIONS.GRN_APPROVE]: "Approve goods receipt notes",
  [PERMISSIONS.GRN_REJECT]: "Reject goods receipt notes",

  [PERMISSIONS.ORDERS_CREATE]: "Create new orders",
  [PERMISSIONS.ORDERS_READ]: "View orders",
  [PERMISSIONS.ORDERS_UPDATE]: "Update orders",
  [PERMISSIONS.ORDERS_DELETE]: "Delete orders",
  [PERMISSIONS.ORDERS_APPROVE]: "Approve orders",
  [PERMISSIONS.ORDERS_ALLOCATE]: "Allocate inventory to orders",
  [PERMISSIONS.ORDERS_CANCEL]: "Cancel orders",

  [PERMISSIONS.DISPATCH_CREATE]: "Create dispatch notes",
  [PERMISSIONS.DISPATCH_READ]: "View dispatch notes",
  [PERMISSIONS.DISPATCH_UPDATE]: "Update dispatch notes",
  [PERMISSIONS.DISPATCH_CONFIRM]: "Confirm dispatch completion",

  [PERMISSIONS.REPORTS_VIEW]: "View standard reports",
  [PERMISSIONS.REPORTS_EXPORT]: "Export reports",
  [PERMISSIONS.REPORTS_CUSTOM]: "Create custom reports",
  [PERMISSIONS.ANALYTICS_VIEW]: "View analytics dashboards",

  [PERMISSIONS.AUDIT_VIEW]: "View audit logs",
  [PERMISSIONS.AUDIT_EXPORT]: "Export audit logs",

  [PERMISSIONS.SYSTEM_CONFIG]: "Configure system settings",
  [PERMISSIONS.SYSTEM_MAINTENANCE]: "Perform system maintenance",
};
