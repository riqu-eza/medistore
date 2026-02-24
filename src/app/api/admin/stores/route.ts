/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// STORES API - Main Route (GET all, POST create)
// File: src/app/api/admin/stores/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check
    if (!hasPermission(session.user.permissions, PERMISSIONS.STORES_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const storeType = searchParams.get('storeType') || ''
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (storeType) {
      where.storeType = storeType
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // Calculate skip
    const skip = (page - 1) * limit

    // Execute query with pagination
    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
       include: {
    _count: {
      select: {
        users: true,
        inventory: true,
        batches: true,
      },
    },
  },
      }),
      prisma.store.count({ where }),
    ])

    // Transform data to include manager properly
    const transformedStores = await Promise.all(
      stores.map(async (store) => {
        const manager = store.managerId
          ? await prisma.user.findUnique({
              where: { id: store.managerId },
              select: {
                id: true,
                name: true,
                email: true,
              },
            })
          : null

        const parentStore = store.parentStoreId
          ? await prisma.store.findUnique({
              where: { id: store.parentStoreId },
              select: {
                id: true,
                name: true,
                code: true,
              },
            })
          : null

        return {
          ...store,
          manager,
          parentStore,
          users: undefined, // Remove the users array from response
        }
      })
    )

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      stores: transformedStores,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    })
  } catch (error) {
    console.error('Error fetching stores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}

// ============================================================================
// CREATE NEW STORE
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check
    if (!hasPermission(session.user.permissions, PERMISSIONS.STORES_CREATE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'code', 'storeType']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate store type
    const validStoreTypes = ['cold', 'general', 'controlled', 'receiving']
    if (!validStoreTypes.includes(body.storeType)) {
      return NextResponse.json(
        { error: `Invalid store type. Must be one of: ${validStoreTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if code already exists
    const existingStore = await prisma.store.findUnique({
      where: { code: body.code },
    })

    if (existingStore) {
      return NextResponse.json(
        { error: 'Store code already exists' },
        { status: 400 }
      )
    }

    // Validate temperature ranges
    if (body.temperatureMin && body.temperatureMax) {
      if (parseFloat(body.temperatureMin) > parseFloat(body.temperatureMax)) {
        return NextResponse.json(
          { error: 'Minimum temperature cannot be greater than maximum temperature' },
          { status: 400 }
        )
      }
    }

    // Validate humidity ranges
    if (body.humidityMin && body.humidityMax) {
      if (parseFloat(body.humidityMin) > parseFloat(body.humidityMax)) {
        return NextResponse.json(
          { error: 'Minimum humidity cannot be greater than maximum humidity' },
          { status: 400 }
        )
      }
    }

    // Validate parent store exists
    if (body.parentStoreId) {
      const parentStore = await prisma.store.findUnique({
        where: { id: body.parentStoreId },
      })

      if (!parentStore) {
        return NextResponse.json(
          { error: 'Parent store not found' },
          { status: 404 }
        )
      }
    }

    // Validate manager exists
    if (body.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: body.managerId },
      })

      if (!manager) {
        return NextResponse.json(
          { error: 'Manager not found' },
          { status: 404 }
        )
      }
    }

    // Create store
    const store = await prisma.store.create({
      data: {
        name: body.name,
        code: body.code,
        storeType: body.storeType,
        temperatureMin: body.temperatureMin ? parseFloat(body.temperatureMin) : null,
        temperatureMax: body.temperatureMax ? parseFloat(body.temperatureMax) : null,
        humidityMin: body.humidityMin ? parseFloat(body.humidityMin) : null,
        humidityMax: body.humidityMax ? parseFloat(body.humidityMax) : null,
        totalCapacity: body.totalCapacity ? parseFloat(body.totalCapacity) : null,
        currentUtilization: body.currentUtilization ? parseFloat(body.currentUtilization) : null,
        allowedDrugTypes: body.allowedDrugTypes || null,
        allowsControlled: body.allowsControlled || false,
        allowsDispatch: body.allowsDispatch !== undefined ? body.allowsDispatch : true,
        isReceivingZone: body.isReceivingZone || false,
        address: body.address || null,
        parentStoreId: body.parentStoreId || null,
        managerId: body.managerId || null,
        operatingHours: body.operatingHours || null,
        temperatureSensorId: body.temperatureSensorId || null,
        humiditySensorId: body.humiditySensorId || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        notes: body.notes || null,
        createdBy: session.user.id,
      },
      include: {
        _count: {
          select: {
            users: true,
            inventory: true,
            batches: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'Store',
        entityId: store.id,
        afterValue: store,
      },
    })

    return NextResponse.json(store, { status: 201 })
  } catch (error) {
    console.error('Error creating store:', error)
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPER FUNCTION
// ============================================================================

