// ============================================================================
// STATS SERVICE - Production Scale
// File: src/server/services/stats.service.ts
//
// THREE LEVELS:
//   Level 1 — getDashboardStats()     → lightweight, cached, for top-bar KPIs
//   Level 2 — getOperationalStats()   → mid-depth, per-store/role dashboards
//   Level 3 — getAnalyticsStats()     → deep aggregations, reports & charts
//
// Design principles:
//   • All queries run in parallel (Promise.all / $transaction)
//   • Raw SQL only where Prisma aggregation is insufficient
//   • Every result is typed — no `any`
//   • Designed to be called from API routes or React Server Components
// ============================================================================

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ============================================================================
// SHARED HELPERS
// ============================================================================

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function startOfDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfYear(date = new Date()): Date {
  return new Date(date.getFullYear(), 0, 1)
}

// ============================================================================
// LEVEL 1 — DASHBOARD STATS
// Target latency: < 200 ms
// Use case: top navigation bar KPIs, role-aware quick metrics
// Cache TTL suggestion: 60 seconds
// ============================================================================

export interface DashboardStats {
  inventory: {
    totalItems: number           // distinct drug+batch+store records
    lowStockCount: number
    nearExpiryCount: number      // expiring within 90 days
    expiredCount: number
  }
  orders: {
    pending: number              // awaiting approval
    pendingApproval: number
    dispatched: number           // in transit today
    completedToday: number
  }
  alerts: {
    criticalAlerts: number       // unread high/critical notifications
    lockedAccounts: number       // admin-only
  }
  grn: {
    pendingApproval: number
  }
}

export async function getDashboardStats(opts?: {
  storeId?: string   // scope to a specific store
  isAdmin?: boolean  // include admin-only fields
}): Promise<DashboardStats> {
  const storeFilter = opts?.storeId ? { storeId: opts.storeId } : {}
  const now = new Date()

  const [
    totalItems,
    lowStockCount,
    nearExpiryCount,
    expiredCount,
    ordersPending,
    ordersPendingApproval,
    ordersDispatchedToday,
    ordersCompletedToday,
    criticalAlerts,
    lockedAccounts,
    grnPendingApproval,
  ] = await Promise.all([
    // Inventory counts
    prisma.inventory.count({ where: { ...storeFilter, availableQuantity: { gt: 0 } } }),
    prisma.inventory.count({ where: { ...storeFilter, isLowStock: true, isExpired: false } }),
    prisma.inventory.count({
      where: {
        ...storeFilter,
        isExpired: false,
        expiryDate: { lte: daysFromNow(90), gte: now },
      },
    }),
    prisma.inventory.count({ where: { ...storeFilter, isExpired: true } }),

    // Orders
    prisma.order.count({ where: { status: 'pending_approval' } }),
    prisma.order.count({ where: { status: 'pending_approval' } }),
    prisma.order.count({
      where: {
        status: 'dispatched',
        dispatchedAt: { gte: startOfDay() },
      },
    }),
    prisma.order.count({
      where: {
        status: 'completed',
        completedAt: { gte: startOfDay() },
      },
    }),

    // Alerts (unread critical/high)
    prisma.notification.count({
      where: {
        isRead: false,
        priority: { in: ['critical', 'high'] },
      },
    }),

    // Admin-only: locked users
    opts?.isAdmin
      ? prisma.user.count({ where: { isLocked: true, isActive: true } })
      : Promise.resolve(0),

    // GRN pending approval
    prisma.goodsReceiptNote.count({ where: { status: 'pending' } }),
  ])

  return {
    inventory: { totalItems, lowStockCount, nearExpiryCount, expiredCount },
    orders: {
      pending: ordersPending,
      pendingApproval: ordersPendingApproval,
      dispatched: ordersDispatchedToday,
      completedToday: ordersCompletedToday,
    },
    alerts: { criticalAlerts, lockedAccounts },
    grn: { pendingApproval: grnPendingApproval },
  }
}

// ============================================================================
// LEVEL 2 — OPERATIONAL STATS
// Target latency: < 500 ms
// Use case: store dashboards, role-specific views, shift reports
// Cache TTL suggestion: 5 minutes
// ============================================================================

export interface StoreOperationalStats {
  storeId: string
  storeName: string
  storeType: string
  inventory: {
    totalLines: number            // unique drug+batch combinations
    totalUnits: number            // sum of all available quantities
    lowStock: number
    nearExpiry: number
    expired: number
    utilizationPercent: number | null
  }
  batches: {
    active: number
    quarantined: number
    expiringSoon: number          // within 30 days
  }
  orders: {
    pendingAllocation: number
    allocatedAwaitingDispatch: number
    dispatchedToday: number
  }
  transfers: {
    pendingOutbound: number
    pendingInbound: number
    inTransit: number
  }
  grn: {
    pendingApproval: number
    receivedThisMonth: number
  }
  recentActivity: Array<{
    action: string
    entityType: string
    entityId: string
    createdAt: Date
  }>
}

export async function getStoreOperationalStats(storeId: string): Promise<StoreOperationalStats> {
  const now = new Date()
  const monthStart = startOfMonth()

  const [
    store,
    invTotals,
    lowStock,
    nearExpiry,
    expired,
    activeBatches,
    quarantinedBatches,
    expiringSoonBatches,
    ordersPendingAlloc,
    ordersAwaitingDispatch,
    ordersDispatchedToday,
    transfersPendingOut,
    transfersPendingIn,
    transfersInTransit,
    grnPending,
    grnThisMonth,
    recentActivity,
  ] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, storeType: true, totalCapacity: true, currentUtilization: true },
    }),

    // Sum of available + reserved quantities
    prisma.inventory.aggregate({
      where: { storeId, isExpired: false },
      _count: { id: true },
      _sum: { availableQuantity: true },
    }),

    prisma.inventory.count({ where: { storeId, isLowStock: true, isExpired: false } }),

    prisma.inventory.count({
      where: { storeId, isExpired: false, expiryDate: { lte: daysFromNow(90), gte: now } },
    }),

    prisma.inventory.count({ where: { storeId, isExpired: true } }),

    prisma.batch.count({ where: { currentStoreId: storeId, status: 'active' } }),
    prisma.batch.count({ where: { currentStoreId: storeId, qualityStatus: 'quarantined' } }),
    prisma.batch.count({
      where: {
        currentStoreId: storeId,
        status: 'active',
        expiryDate: { lte: daysFromNow(30), gte: now },
      },
    }),

    // Orders
    prisma.order.count({ where: { sourceStoreId: storeId, status: 'approved' } }),
    prisma.order.count({ where: { sourceStoreId: storeId, status: 'allocated' } }),
    prisma.order.count({
      where: { sourceStoreId: storeId, status: 'dispatched', dispatchedAt: { gte: startOfDay() } },
    }),

    // Transfers
    prisma.inventoryTransfer.count({ where: { fromStoreId: storeId, status: 'pending' } }),
    prisma.inventoryTransfer.count({ where: { toStoreId: storeId, status: 'approved' } }),
    prisma.inventoryTransfer.count({
      where: {
        OR: [{ fromStoreId: storeId }, { toStoreId: storeId }],
        status: 'in_transit',
      },
    }),

    // GRN
    prisma.goodsReceiptNote.count({ where: { status: 'pending' } }),
    prisma.goodsReceiptNote.count({ where: { receivedDate: { gte: monthStart } } }),

    // Recent audit activity for this store (last 10)
    prisma.auditLog.findMany({
      where: { entityType: { in: ['Inventory', 'Batch', 'Order', 'GRN', 'Transfer'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { action: true, entityType: true, entityId: true, createdAt: true },
    }),
  ])

  if (!store) throw new Error(`Store ${storeId} not found`)

  return {
    storeId,
    storeName: store.name,
    storeType: store.storeType,
    inventory: {
      totalLines: invTotals._count.id,
      totalUnits: Number(invTotals._sum.availableQuantity ?? 0),
      lowStock,
      nearExpiry,
      expired,
      utilizationPercent: store.currentUtilization ? Number(store.currentUtilization) : null,
    },
    batches: {
      active: activeBatches,
      quarantined: quarantinedBatches,
      expiringSoon: expiringSoonBatches,
    },
    orders: {
      pendingAllocation: ordersPendingAlloc,
      allocatedAwaitingDispatch: ordersAwaitingDispatch,
      dispatchedToday: ordersDispatchedToday,
    },
    transfers: {
      pendingOutbound: transfersPendingOut,
      pendingInbound: transfersPendingIn,
      inTransit: transfersInTransit,
    },
    grn: {
      pendingApproval: grnPending,
      receivedThisMonth: grnThisMonth,
    },
    recentActivity,
  }
}

// ── System-wide operational summary (all stores) ───────────────────────────

export interface SystemOperationalStats {
  stores: {
    total: number
    active: number
    byType: Record<string, number>
  }
  users: {
    total: number
    active: number
    locked: number
    byRole: Array<{ role: string; count: number }>
  }
  inventory: {
    totalLines: number
    totalValue: number | null
    lowStockLines: number
    expiredLines: number
    nearExpiryLines: number
  }
  orders: {
    totalThisMonth: number
    completedThisMonth: number
    cancelledThisMonth: number
    fulfillmentRate: number       // 0–100
  }
  suppliers: {
    total: number
    approved: number
    pendingApproval: number
  }
  batches: {
    active: number
    quarantined: number
    recalled: number
  }
}

export async function getSystemOperationalStats(): Promise<SystemOperationalStats> {
  const monthStart = startOfMonth()

  const [
    storeTotal,
    storeActive,
    storesByType,
    userTotal,
    userActive,
    userLocked,
    usersByRole,
    invLines,
    invLowStock,
    invExpired,
    invNearExpiry,
    ordersThisMonth,
    ordersCompleted,
    ordersCancelled,
    supplierTotal,
    supplierApproved,
    supplierPending,
    batchActive,
    batchQuarantined,
    batchRecalled,
  ] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { isActive: true } }),
    prisma.store.groupBy({ by: ['storeType'], _count: { id: true } }),

    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isLocked: true } }),

    prisma.user.groupBy({
      by: ['roleId'],
      _count: { id: true },
    }),

    prisma.inventory.count({ where: { availableQuantity: { gt: 0 } } }),
    prisma.inventory.count({ where: { isLowStock: true, isExpired: false } }),
    prisma.inventory.count({ where: { isExpired: true } }),
    prisma.inventory.count({
      where: { isNearExpiry: true, isExpired: false },
    }),

    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.order.count({ where: { status: 'completed', completedAt: { gte: monthStart } } }),
    prisma.order.count({ where: { status: 'cancelled', cancelledAt: { gte: monthStart } } }),

    prisma.supplier.count(),
    prisma.supplier.count({ where: { status: 'approved' } }),
    prisma.supplier.count({ where: { status: 'pending' } }),

    prisma.batch.count({ where: { status: 'active' } }),
    prisma.batch.count({ where: { qualityStatus: 'quarantined' } }),
    prisma.batch.count({ where: { isRecalled: true } }),
  ])

  // Resolve role names for user-by-role
  const roleIds = usersByRole.map((r) => r.roleId)
  const roles = await prisma.role.findMany({
    where: { id: { in: roleIds } },
    select: { id: true, displayName: true },
  })
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.displayName]))

  const fulfillmentRate =
    ordersThisMonth > 0
      ? Math.round((ordersCompleted / ordersThisMonth) * 100)
      : 0

  return {
    stores: {
      total: storeTotal,
      active: storeActive,
      byType: Object.fromEntries(storesByType.map((s) => [s.storeType, s._count.id])),
    },
    users: {
      total: userTotal,
      active: userActive,
      locked: userLocked,
      byRole: usersByRole.map((r) => ({
        role: roleMap[r.roleId] ?? String(r.roleId),
        count: r._count.id,
      })),
    },
    inventory: {
      totalLines: invLines,
      totalValue: null, // computed in Level 3 — too heavy for Level 2
      lowStockLines: invLowStock,
      expiredLines: invExpired,
      nearExpiryLines: invNearExpiry,
    },
    orders: {
      totalThisMonth: ordersThisMonth,
      completedThisMonth: ordersCompleted,
      cancelledThisMonth: ordersCancelled,
      fulfillmentRate,
    },
    suppliers: {
      total: supplierTotal,
      approved: supplierApproved,
      pendingApproval: supplierPending,
    },
    batches: {
      active: batchActive,
      quarantined: batchQuarantined,
      recalled: batchRecalled,
    },
  }
}

// ============================================================================
// LEVEL 3 — ANALYTICS STATS
// Target latency: < 3 s (run async / background job / cached heavily)
// Use case: management reports, compliance, trend charts
// Cache TTL suggestion: 30 minutes – 1 hour
// ============================================================================

export interface AnalyticsStats {
  inventory: {
    totalValue: number                         // sum(availableQuantity * drug.unitCost)
    valueByStore: Array<{ storeId: string; storeName: string; value: number }>
    valueByCategory: Array<{ category: string; value: number }>
    turnoverRate: number | null                // dispatched / avg_inventory (30 days)
    topLowStockDrugs: Array<{
      drugId: string
      drugCode: string
      genericName: string
      totalAvailable: number
      reorderPoint: number | null
    }>
    expiryTimeline: Array<{                    // monthly buckets for next 12 months
      month: string
      batchCount: number
      estimatedUnits: number
    }>
  }
  orders: {
    volumeByMonth: Array<{ month: string; count: number; value: number }>
    averageFullfillmentDays: number | null
    topCustomers: Array<{ customerName: string; orderCount: number; totalValue: number }>
    statusBreakdown: Array<{ status: string; count: number }>
    priorityBreakdown: Array<{ priority: string; count: number }>
  }
  grn: {
    volumeByMonth: Array<{ month: string; count: number; value: number }>
    topSuppliers: Array<{ supplierId: string; supplierName: string; grnCount: number; totalValue: number }>
    rejectionRate: number                      // 0–100
    averageItemsPerGrn: number
  }
  batches: {
    expiryRisk: {
      expired: number
      within30Days: number
      within90Days: number
      within180Days: number
      safe: number
    }
    qualityBreakdown: Array<{ status: string; count: number }>
    recallHistory: Array<{
      batchId: string
      batchNumber: string
      drugName: string
      recallDate: Date | null
      recallLevel: string | null
    }>
  }
  transfers: {
    volumeByMonth: Array<{ month: string; count: number }>
    topRoutes: Array<{ from: string; to: string; count: number }>
    avgTransitDays: number | null
  }
  users: {
    loginActivity: Array<{ date: string; activeUsers: number }>  // last 30 days
    newUsersThisMonth: number
    passwordChangesThisMonth: number
  }
  compliance: {
    grnComplianceRate: number       // % with all quality checks passed
    temperatureAlerts30Days: number
    auditLogCount30Days: number
    adjustmentsByType: Array<{ type: string; count: number; totalVariance: number }>
  }
}

export async function getAnalyticsStats(opts?: {
  storeId?: string
  fromDate?: Date
  toDate?: Date
}): Promise<AnalyticsStats> {
  const from = opts?.fromDate ?? startOfYear()
  const to = opts?.toDate ?? new Date()
  const now = new Date()
  const storeFilter = opts?.storeId ? { storeId: opts.storeId } : {}
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ── Run all heavy queries in parallel ─────────────────────────────────────
  const [
    // Inventory value (raw SQL — Prisma can't join across models in aggregate)
    inventoryValueRows,
    valueByStoreRows,
    valueByCategoryRows,

    // Low stock drugs
    lowStockDrugs,

    // Expiry timeline (next 12 months, bucketed by month)
    expiryTimelineRows,

    // Orders
    ordersByMonth,
    orderStatusBreakdown,
    orderPriorityBreakdown,
    topCustomers,
    avgFulfillmentRaw,

    // GRN
    grnByMonth,
    topSuppliers,
    grnRejectionStats,

    // Batches
    batchExpiryRisk,
    batchQualityBreakdown,
    recalledBatches,

    // Transfers
    transfersByMonth,
    transferTopRoutes,
    transferAvgTransit,

    // Users
    newUsers,
    passwordChanges,

    // Compliance
    grnCompliance,
    temperatureAlerts,
    auditCount30Days,
    adjustmentsByType,
  ] = await Promise.all([

    // ── Inventory total value ──────────────────────────────────────────────
    prisma.$queryRaw<Array<{ total_value: string }>>`
      SELECT COALESCE(SUM(i.available_quantity * d.unit_cost), 0)::text AS total_value
      FROM inventory i
      JOIN drugs d ON d.id = i.drug_id
      WHERE i.is_expired = false
        AND d.unit_cost IS NOT NULL
        ${opts?.storeId ? Prisma.sql`AND i.store_id = ${opts.storeId}::uuid` : Prisma.sql``}
    `,

    // ── Value by store ─────────────────────────────────────────────────────
    prisma.$queryRaw<Array<{ store_id: string; store_name: string; value: string }>>`
      SELECT s.id AS store_id, s.name AS store_name,
             COALESCE(SUM(i.available_quantity * d.unit_cost), 0)::text AS value
      FROM inventory i
      JOIN stores s ON s.id = i.store_id
      JOIN drugs d ON d.id = i.drug_id
      WHERE i.is_expired = false AND d.unit_cost IS NOT NULL
      GROUP BY s.id, s.name
      ORDER BY value DESC
      LIMIT 10
    `,

    // ── Value by drug category ─────────────────────────────────────────────
    prisma.$queryRaw<Array<{ category: string; value: string }>>`
      SELECT dc.name AS category,
             COALESCE(SUM(i.available_quantity * d.unit_cost), 0)::text AS value
      FROM inventory i
      JOIN drugs d ON d.id = i.drug_id
      JOIN drug_categories dc ON dc.id = d.category_id
      WHERE i.is_expired = false AND d.unit_cost IS NOT NULL
      GROUP BY dc.name
      ORDER BY value DESC
      LIMIT 10
    `,

    // ── Low stock drugs ────────────────────────────────────────────────────
    prisma.$queryRaw<Array<{
      drug_id: string; drug_code: string; generic_name: string;
      total_available: string; reorder_point: number | null
    }>>`
      SELECT d.id AS drug_id, d.drug_code, d.generic_name,
             SUM(i.available_quantity)::text AS total_available,
             d.reorder_point
      FROM inventory i
      JOIN drugs d ON d.id = i.drug_id
      WHERE i.is_low_stock = true AND i.is_expired = false
        ${opts?.storeId ? Prisma.sql`AND i.store_id = ${opts.storeId}::uuid` : Prisma.sql``}
      GROUP BY d.id, d.drug_code, d.generic_name, d.reorder_point
      ORDER BY total_available ASC
      LIMIT 20
    `,

    // ── Expiry timeline — next 12 months bucketed ──────────────────────────
    prisma.$queryRaw<Array<{ month: string; batch_count: string; estimated_units: string }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', b.expiry_date), 'YYYY-MM') AS month,
             COUNT(b.id)::text AS batch_count,
             COALESCE(SUM(i.available_quantity), 0)::text AS estimated_units
      FROM batches b
      LEFT JOIN inventory i ON i.batch_id = b.id
      WHERE b.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '12 months'
        AND b.status = 'active'
      GROUP BY DATE_TRUNC('month', b.expiry_date)
      ORDER BY month ASC
    `,

    // ── Orders by month ────────────────────────────────────────────────────
    prisma.$queryRaw<Array<{ month: string; count: string; value: string }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
             COUNT(id)::text AS count,
             COALESCE(SUM(total_value), 0)::text AS value
      FROM orders
      WHERE created_at BETWEEN ${from} AND ${to}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `,

    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.order.groupBy({ by: ['priority'], _count: { id: true } }),

    // ── Top customers by order count ───────────────────────────────────────
    prisma.$queryRaw<Array<{ customer_name: string; order_count: string; total_value: string }>>`
      SELECT customer_name,
             COUNT(id)::text AS order_count,
             COALESCE(SUM(total_value), 0)::text AS total_value
      FROM orders
      WHERE created_at BETWEEN ${from} AND ${to}
      GROUP BY customer_name
      ORDER BY order_count DESC
      LIMIT 10
    `,

    // ── Average fulfillment time (approved → dispatched) ───────────────────
    prisma.$queryRaw<Array<{ avg_days: string | null }>>`
      SELECT AVG(
        EXTRACT(EPOCH FROM (dispatched_at - approved_at)) / 86400
      )::text AS avg_days
      FROM orders
      WHERE status IN ('dispatched', 'completed')
        AND dispatched_at IS NOT NULL AND approved_at IS NOT NULL
        AND created_at BETWEEN ${from} AND ${to}
    `,

    // ── GRN by month ───────────────────────────────────────────────────────
    prisma.$queryRaw<Array<{ month: string; count: string; value: string }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', received_date), 'YYYY-MM') AS month,
             COUNT(id)::text AS count,
             COALESCE(SUM(total_value), 0)::text AS value
      FROM goods_receipt_notes
      WHERE received_date BETWEEN ${from} AND ${to}
      GROUP BY DATE_TRUNC('month', received_date)
      ORDER BY month ASC
    `,

    // ── Top suppliers by GRN volume ────────────────────────────────────────
    prisma.$queryRaw<Array<{
      supplier_id: string; supplier_name: string; grn_count: string; total_value: string
    }>>`
      SELECT s.id AS supplier_id, s.name AS supplier_name,
             COUNT(g.id)::text AS grn_count,
             COALESCE(SUM(g.total_value), 0)::text AS total_value
      FROM goods_receipt_notes g
      JOIN suppliers s ON s.id = g.supplier_id
      WHERE g.received_date BETWEEN ${from} AND ${to}
      GROUP BY s.id, s.name
      ORDER BY grn_count DESC
      LIMIT 10
    `,

    // ── GRN rejection rate ─────────────────────────────────────────────────
    prisma.$queryRaw<Array<{ total: string; rejected: string }>>`
      SELECT COUNT(id)::text AS total,
             COUNT(id) FILTER (WHERE status = 'rejected')::text AS rejected
      FROM goods_receipt_notes
      WHERE received_date BETWEEN ${from} AND ${to}
    `,

    // ── Batch expiry risk buckets ──────────────────────────────────────────
    prisma.$queryRaw<Array<{ bucket: string; count: string }>>`
      SELECT
        CASE
          WHEN expiry_date < NOW()                           THEN 'expired'
          WHEN expiry_date < NOW() + INTERVAL '30 days'     THEN 'within_30'
          WHEN expiry_date < NOW() + INTERVAL '90 days'     THEN 'within_90'
          WHEN expiry_date < NOW() + INTERVAL '180 days'    THEN 'within_180'
          ELSE 'safe'
        END AS bucket,
        COUNT(id)::text AS count
      FROM batches
      WHERE status != 'depleted'
      GROUP BY bucket
    `,

    prisma.batch.groupBy({ by: ['qualityStatus'], _count: { id: true } }),

    // ── Recalled batches ───────────────────────────────────────────────────
    prisma.batch.findMany({
      where: { isRecalled: true },
      select: {
        id: true, batchNumber: true, recallDate: true, recallLevel: true,
        drug: { select: { genericName: true } },
      },
      orderBy: { recallDate: 'desc' },
      take: 20,
    }),

    // ── Transfers by month ─────────────────────────────────────────────────
    prisma.$queryRaw<Array<{ month: string; count: string }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', transfer_date), 'YYYY-MM') AS month,
             COUNT(id)::text AS count
      FROM inventory_transfers
      WHERE transfer_date BETWEEN ${from} AND ${to}
      GROUP BY DATE_TRUNC('month', transfer_date)
      ORDER BY month ASC
    `,

    // ── Top transfer routes ────────────────────────────────────────────────
    prisma.$queryRaw<Array<{ from_store: string; to_store: string; count: string }>>`
      SELECT fs.name AS from_store, ts.name AS to_store, COUNT(t.id)::text AS count
      FROM inventory_transfers t
      JOIN stores fs ON fs.id = t.from_store_id
      JOIN stores ts ON ts.id = t.to_store_id
      WHERE t.transfer_date BETWEEN ${from} AND ${to}
      GROUP BY fs.name, ts.name
      ORDER BY count DESC
      LIMIT 10
    `,

    // ── Avg transit time (approved → received) ─────────────────────────────
    prisma.$queryRaw<Array<{ avg_days: string | null }>>`
      SELECT AVG(
        EXTRACT(EPOCH FROM (received_at - approved_at)) / 86400
      )::text AS avg_days
      FROM inventory_transfers
      WHERE status = 'received'
        AND received_at IS NOT NULL AND approved_at IS NOT NULL
        AND transfer_date BETWEEN ${from} AND ${to}
    `,

    // ── New users this month ───────────────────────────────────────────────
    prisma.user.count({ where: { createdAt: { gte: startOfMonth() } } }),

    // ── Password changes this month ────────────────────────────────────────
    prisma.user.count({ where: { passwordChangedAt: { gte: startOfMonth() } } }),

    // ── GRN compliance (all quality checks passed) ─────────────────────────
    prisma.$queryRaw<Array<{ total: string; compliant: string }>>`
      SELECT COUNT(id)::text AS total,
             COUNT(id) FILTER (
               WHERE packaging_intact = true
                 AND labels_legible = true
                 AND documents_complete = true
                 AND temperature_compliant = true
             )::text AS compliant
      FROM goods_receipt_notes
      WHERE received_date >= ${thirtyDaysAgo}
    `,

    // ── Temperature alerts last 30 days ────────────────────────────────────
    prisma.temperatureLog.count({
      where: { isAlert: true, recordedAt: { gte: thirtyDaysAgo } },
    }),

    // ── Audit log count last 30 days ───────────────────────────────────────
    prisma.auditLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

    // ── Adjustments by type ────────────────────────────────────────────────
    prisma.$queryRaw<Array<{ type: string; count: string; total_variance: string }>>`
      SELECT adjustment_type AS type,
             COUNT(id)::text AS count,
             COALESCE(ABS(SUM(total_variance)), 0)::text AS total_variance
      FROM inventory_adjustments
      WHERE adjustment_date BETWEEN ${from} AND ${to}
      GROUP BY adjustment_type
      ORDER BY count DESC
    `,
  ])

  // ── Shape raw SQL rows into typed output ───────────────────────────────────

  const bucketMap = Object.fromEntries(
    (batchExpiryRisk as Array<{ bucket: string; count: string }>).map((r) => [r.bucket, Number(r.count)])
  )

  const grnRej = grnRejectionStats[0] ?? { total: '0', rejected: '0' }
  const grnComp = grnCompliance[0] ?? { total: '0', compliant: '0' }
  const rejectionRate = Number(grnRej.total) > 0
    ? Math.round((Number(grnRej.rejected) / Number(grnRej.total)) * 100)
    : 0
  const complianceRate = Number(grnComp.total) > 0
    ? Math.round((Number(grnComp.compliant) / Number(grnComp.total)) * 100)
    : 100

  return {
    inventory: {
      totalValue: Number(inventoryValueRows[0]?.total_value ?? 0),
      valueByStore: valueByStoreRows.map((r) => ({
        storeId: r.store_id,
        storeName: r.store_name,
        value: Number(r.value),
      })),
      valueByCategory: valueByCategoryRows.map((r) => ({
        category: r.category,
        value: Number(r.value),
      })),
      turnoverRate: null, // requires ledger aggregation — set up as a scheduled job
      topLowStockDrugs: lowStockDrugs.map((r) => ({
        drugId: r.drug_id,
        drugCode: r.drug_code,
        genericName: r.generic_name,
        totalAvailable: Number(r.total_available),
        reorderPoint: r.reorder_point,
      })),
      expiryTimeline: expiryTimelineRows.map((r) => ({
        month: r.month,
        batchCount: Number(r.batch_count),
        estimatedUnits: Number(r.estimated_units),
      })),
    },
    orders: {
      volumeByMonth: ordersByMonth.map((r) => ({
        month: r.month,
        count: Number(r.count),
        value: Number(r.value),
      })),
      averageFullfillmentDays: avgFulfillmentRaw[0]?.avg_days
        ? Math.round(Number(avgFulfillmentRaw[0].avg_days) * 10) / 10
        : null,
      topCustomers: topCustomers.map((r) => ({
        customerName: r.customer_name,
        orderCount: Number(r.order_count),
        totalValue: Number(r.total_value),
      })),
      statusBreakdown: orderStatusBreakdown.map((r) => ({
        status: r.status,
        count: r._count.id,
      })),
      priorityBreakdown: orderPriorityBreakdown.map((r) => ({
        priority: r.priority,
        count: r._count.id,
      })),
    },
    grn: {
      volumeByMonth: grnByMonth.map((r) => ({
        month: r.month,
        count: Number(r.count),
        value: Number(r.value),
      })),
      topSuppliers: topSuppliers.map((r) => ({
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        grnCount: Number(r.grn_count),
        totalValue: Number(r.total_value),
      })),
      rejectionRate,
      averageItemsPerGrn: 0, // extend as needed
    },
    batches: {
      expiryRisk: {
        expired: bucketMap['expired'] ?? 0,
        within30Days: bucketMap['within_30'] ?? 0,
        within90Days: bucketMap['within_90'] ?? 0,
        within180Days: bucketMap['within_180'] ?? 0,
        safe: bucketMap['safe'] ?? 0,
      },
      qualityBreakdown: batchQualityBreakdown.map((r) => ({
        status: r.qualityStatus,
        count: r._count.id,
      })),
      recallHistory: recalledBatches.map((b) => ({
        batchId: b.id,
        batchNumber: b.batchNumber,
        drugName: b.drug.genericName,
        recallDate: b.recallDate,
        recallLevel: b.recallLevel,
      })),
    },
    transfers: {
      volumeByMonth: transfersByMonth.map((r) => ({
        month: r.month,
        count: Number(r.count),
      })),
      topRoutes: transferTopRoutes.map((r) => ({
        from: r.from_store,
        to: r.to_store,
        count: Number(r.count),
      })),
      avgTransitDays: transferAvgTransit[0]?.avg_days
        ? Math.round(Number(transferAvgTransit[0].avg_days) * 10) / 10
        : null,
    },
    users: {
      loginActivity: [], // pull from sessions table if needed
      newUsersThisMonth: newUsers,
      passwordChangesThisMonth: passwordChanges,
    },
    compliance: {
      grnComplianceRate: complianceRate,
      temperatureAlerts30Days: temperatureAlerts,
      auditLogCount30Days: auditCount30Days,
      adjustmentsByType: adjustmentsByType.map((r) => ({
        type: r.type,
        count: Number(r.count),
        totalVariance: Number(r.total_variance),
      })),
    },
  }
}

// ============================================================================
// CONVENIENCE — API ROUTE WRAPPERS
// Drop these directly into your Next.js route handlers
// ============================================================================

/**
 * GET /api/stats?level=dashboard|operational|analytics&storeId=...
 */
export async function resolveStatsRequest(params: {
  level?: string
  storeId?: string
  isAdmin?: boolean
  fromDate?: string
  toDate?: string
}) {
  const level = params.level ?? 'dashboard'

  if (level === 'dashboard') {
    return getDashboardStats({ storeId: params.storeId, isAdmin: params.isAdmin })
  }

  if (level === 'operational') {
    if (params.storeId) {
      return getStoreOperationalStats(params.storeId)
    }
    return getSystemOperationalStats()
  }

  if (level === 'analytics') {
    return getAnalyticsStats({
      storeId: params.storeId,
      fromDate: params.fromDate ? new Date(params.fromDate) : undefined,
      toDate: params.toDate ? new Date(params.toDate) : undefined,
    })
  }

  throw new Error(`Unknown stats level: ${level}`)
}