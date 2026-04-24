

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { resolveStatsRequest } from '@/server/services/stat.service'

// Cache TTL per level (seconds)
const CACHE_TTL: Record<string, number> = {
  dashboard:   60,        // 1 minute
  operational: 300,       // 5 minutes
  analytics:   1800,      // 30 minutes
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.REPORTS_VIEW)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const level   = searchParams.get('level') ?? 'dashboard'
    const storeId = searchParams.get('storeId') ?? undefined
    const fromDate = searchParams.get('fromDate') ?? undefined
    const toDate   = searchParams.get('toDate') ?? undefined

    // Validate level
    if (!['dashboard', 'operational', 'analytics'].includes(level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be: dashboard | operational | analytics' },
        { status: 400 }
      )
    }

    // Analytics requires REPORTS_EXPORT permission
    if (level === 'analytics' && !hasPermission(session.user.permissions, PERMISSIONS.REPORTS_EXPORT)) {
      return NextResponse.json({ error: 'Forbidden — analytics requires export permission' }, { status: 403 })
    }

    const isAdmin = (session.user.permissions as string[]).includes('*')

    const data = await resolveStatsRequest({
      level,
      storeId,
      isAdmin,
      fromDate,
      toDate,
    })

    const ttl = CACHE_TTL[level] ?? 60

    return NextResponse.json(
      { data, meta: { level, generatedAt: new Date().toISOString() } },
      {
        headers: {
          // Stale-while-revalidate: serve stale for up to 2× TTL while refreshing
          'Cache-Control': `private, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`,
        },
      }
    )
  } catch (error: unknown) {
    // const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Stats API]', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}