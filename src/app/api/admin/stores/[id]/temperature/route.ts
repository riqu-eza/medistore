/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// TEMPERATURE LOGS API - IoT Integration
// File: src/app/api/admin/stores/[id]/temperature/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

// ============================================================================
// GET TEMPERATURE LOGS FOR A STORE
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.STORES_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const alertsOnly = searchParams.get('alertsOnly') === 'true'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Build where clause
    const where: any = {
      storeId: params.id,
    }

    if (alertsOnly) {
      where.isAlert = true
    }

    if (from || to) {
      where.recordedAt = {}
      if (from) {
        where.recordedAt.gte = new Date(from)
      }
      if (to) {
        where.recordedAt.lte = new Date(to)
      }
    }

    // Get temperature logs
    const logs = await prisma.temperatureLog.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: limit,
    })

    // Get statistics
    const stats = await prisma.temperatureLog.aggregate({
      where: {
        storeId: params.id,
        recordedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      _avg: {
        temperature: true,
        humidity: true,
      },
      _max: {
        temperature: true,
        humidity: true,
      },
      _min: {
        temperature: true,
        humidity: true,
      },
    })

    // Count alerts in last 24 hours
    const alertCount = await prisma.temperatureLog.count({
      where: {
        storeId: params.id,
        isAlert: true,
        recordedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })

    return NextResponse.json({
      logs,
      stats: {
        avgTemperature: stats._avg.temperature,
        avgHumidity: stats._avg.humidity,
        maxTemperature: stats._max.temperature,
        minTemperature: stats._min.temperature,
        maxHumidity: stats._max.humidity,
        minHumidity: stats._min.humidity,
        alertsLast24h: alertCount,
      },
    })
  } catch (error) {
    console.error('Error fetching temperature logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch temperature logs' },
      { status: 500 }
    )
  }
}

// ============================================================================
// CREATE TEMPERATURE LOG (IoT Sensor Endpoint)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For IoT sensors, you might want API key authentication instead
    // For now, using session auth
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.temperature) {
      return NextResponse.json(
        { error: 'Temperature is required' },
        { status: 400 }
      )
    }

    // Get store to check temperature thresholds
    const store = await prisma.store.findUnique({
      where: { id: params.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const temperature = parseFloat(body.temperature)
    const humidity = body.humidity ? parseFloat(body.humidity) : null

    // Check if temperature/humidity is out of range
    let isAlert = false
    let alertReason = null

    if (store.temperatureMin && temperature < store.temperatureMin) {
      isAlert = true
      alertReason = `Temperature ${temperature}°C is below minimum threshold ${store.temperatureMin}°C`
    } else if (store.temperatureMax && temperature > store.temperatureMax) {
      isAlert = true
      alertReason = `Temperature ${temperature}°C is above maximum threshold ${store.temperatureMax}°C`
    }

    if (humidity) {
      if (store.humidityMin && humidity < store.humidityMin) {
        isAlert = true
        alertReason = alertReason
          ? `${alertReason}; Humidity ${humidity}% is below minimum threshold ${store.humidityMin}%`
          : `Humidity ${humidity}% is below minimum threshold ${store.humidityMin}%`
      } else if (store.humidityMax && humidity > store.humidityMax) {
        isAlert = true
        alertReason = alertReason
          ? `${alertReason}; Humidity ${humidity}% is above maximum threshold ${store.humidityMax}%`
          : `Humidity ${humidity}% is above maximum threshold ${store.humidityMax}%`
      }
    }

    // Create temperature log
    const log = await prisma.temperatureLog.create({
      data: {
        storeId: params.id,
        temperature,
        humidity,
        isAlert,
        alertReason,
        sensorId: body.sensorId || null,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
      },
    })

    // If alert, create notification for store manager and relevant users
    if (isAlert && store.managerId) {
      await prisma.notification.create({
        data: {
          userId: store.managerId,
          type: 'temperature_alert',
          priority: 'high',
          title: `Temperature/Humidity Alert - ${store.name}`,
          message: alertReason || 'Environmental conditions out of range',
          entityType: 'Store',
          entityId: store.id,
          actionUrl: `/admin/stores/${store.id}`,
          actionLabel: 'View Store',
        },
      })
    }

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating temperature log:', error)
    return NextResponse.json(
      { error: 'Failed to create temperature log' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPER FUNCTION
// ============================================================================

