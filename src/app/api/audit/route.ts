import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── Types ──────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  beforeValue: Record<string, unknown> | null
  afterValue: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ── GET /api/audit ─────────────────────────────────────────────────────────
// Query params:
//   page        number  default 1
//   pageSize    number  default 20, max 100
//   action      string  filter by action (create, update, delete, approve…)
//   entityType  string  filter by entity (Order, GRN, Batch…)
//   userId      string  filter by user UUID
//   from        string  ISO date — createdAt >=
//   to          string  ISO date — createdAt <=
//   search      string  fuzzy match on action / entityType
//   recent      number  shorthand: return last N records (used by dashboard widget)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins / users with REPORTS_VIEW can see audit logs
    if (!hasPermission(session.user.permissions, PERMISSIONS.REPORTS_VIEW)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)

    // Shorthand for dashboard widget — just return last N
    const recentParam = searchParams.get('recent')
    if (recentParam) {
      const limit = Math.min(Number(recentParam) || 10, 50)
      const rows = await prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      })
      return NextResponse.json({ data: rows.map(serialize) })
    }

    // Paginated full query
    const page     = Math.max(1, Number(searchParams.get('page') ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)))
    const skip     = (page - 1) * pageSize

    const action     = searchParams.get('action')     ?? undefined
    const entityType = searchParams.get('entityType') ?? undefined
    const userId     = searchParams.get('userId')     ?? undefined
    const from       = searchParams.get('from')       ?? undefined
    const to         = searchParams.get('to')         ?? undefined
    const search     = searchParams.get('search')     ?? undefined

    const where: Parameters<typeof prisma.auditLog.findMany>[0]['where'] = {
      ...(action     && { action:     { equals: action,     mode: 'insensitive' } }),
      ...(entityType && { entityType: { equals: entityType, mode: 'insensitive' } }),
      ...(userId     && { userId }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to   && { lte: new Date(to)   }),
        },
      }),
      ...(search && {
        OR: [
          { action:     { contains: search, mode: 'insensitive' } },
          { entityType: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      data: rows.map(serialize),
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    } satisfies AuditLogResponse)

  } catch (error) {
    console.error('[Audit API]', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

// ── Serializer — converts Prisma row to plain JSON-safe object ─────────────
function serialize(row: {
  id: string
  action: string
  entityType: string
  entityId: string
  beforeValue: unknown
  afterValue: unknown
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  metadata: unknown
  createdAt: Date
  user: { id: string; name: string; email: string }
}): AuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    beforeValue: (row.beforeValue as Record<string, unknown> | null) ?? null,
    afterValue:  (row.afterValue  as Record<string, unknown> | null) ?? null,
    ipAddress:   row.ipAddress,
    userAgent:   row.userAgent,
    requestId:   row.requestId,
    metadata:    (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt:   row.createdAt.toISOString(),
    user:        row.user,
  }
}