/* eslint-disable @typescript-eslint/no-explicit-any */
// STORES API - Individual Store Operations
// File: src/app/api/admin/stores/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.STORES_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true,
                displayName: true,
              },
            },
          },
        },
        inventory: {
          take: 10,
          orderBy: { lastUpdated: 'desc' },
          include: {
            drug: {
              select: {
                id: true,
                drugCode: true,
                genericName: true,
                brandName: true,
              },
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
              },
            },
          },
        },
        batches: {
          take: 10,
          orderBy: { receivedDate: 'desc' },
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            status: true,
            drug: {
              select: {
                genericName: true,
                brandName: true,
              },
            },
          },
        },
        temperatureLogs: {
          take: 20,
          orderBy: { recordedAt: 'desc' },
          select: {
            id: true,
            temperature: true,
            humidity: true,
            isAlert: true,
            alertReason: true,
            recordedAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            inventory: true,
            batches: true,
            temperatureLogs: true,
          },
        },
      },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Get manager separately
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

    // Get parent store separately
    const parentStore = store.parentStoreId
      ? await prisma.store.findUnique({
          where: { id: store.parentStoreId },
          select: {
            id: true,
            name: true,
            code: true,
            storeType: true,
          },
        })
      : null

    return NextResponse.json({
      ...store,
      manager,
      parentStore,
    })
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    )
  }
}

// ============================================================================
// UPDATE STORE
// ============================================================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise <{ id: string }> }
) {
  try {
    const {id} = await context.params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.STORES_UPDATE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get existing store
    const existingStore = await prisma.store.findUnique({
      where: { id },
    })

    if (!existingStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await request.json()

    // If code is being changed, check uniqueness
    if (body.code && body.code !== existingStore.code) {
      const codeExists = await prisma.store.findUnique({
        where: { code: body.code },
      })

      if (codeExists) {
        return NextResponse.json(
          { error: 'Store code already exists' },
          { status: 400 }
        )
      }
    }

    // Validate store type if provided
    if (body.storeType) {
      const validStoreTypes = ['cold', 'general', 'controlled', 'receiving']
      if (!validStoreTypes.includes(body.storeType)) {
        return NextResponse.json(
          { error: `Invalid store type. Must be one of: ${validStoreTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate temperature ranges
    const tempMin = body.temperatureMin !== undefined ? parseFloat(body.temperatureMin) : existingStore.temperatureMin
    const tempMax = body.temperatureMax !== undefined ? parseFloat(body.temperatureMax) : existingStore.temperatureMax
    
    if (tempMin && tempMax && tempMin > tempMax) {
      return NextResponse.json(
        { error: 'Minimum temperature cannot be greater than maximum temperature' },
        { status: 400 }
      )
    }

    // Validate humidity ranges
    const humMin = body.humidityMin !== undefined ? parseFloat(body.humidityMin) : existingStore.humidityMin
    const humMax = body.humidityMax !== undefined ? parseFloat(body.humidityMax) : existingStore.humidityMax
    
    if (humMin && humMax && humMin > humMax) {
      return NextResponse.json(
        { error: 'Minimum humidity cannot be greater than maximum humidity' },
        { status: 400 }
      )
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

      // Prevent circular reference
      if (body.parentStoreId === id) {
        return NextResponse.json(
          { error: 'Store cannot be its own parent' },
          { status: 400 }
        )
      }
    }

     if (body.managerId !== undefined && body.managerId !== existingStore.managerId) {
      
      // Case 1: Removing manager (setting to null or empty string)
      if (!body.managerId || body.managerId === '') {
        // Remove storeId from current manager if exists
        if (existingStore.managerId) {
          await prisma.user.update({
            where: { id: existingStore.managerId },
            data: { storeId: null }
          })
        }
      } 
      // Case 2: Assigning new manager
      else {
        // Validate new manager exists and has store manager role
        const newManager = await prisma.user.findUnique({
          where: { id: body.managerId },
          include: { role: true }
        })

        if (!newManager) {
          return NextResponse.json(
            { error: 'Manager not found' },
            { status: 404 }
          )
        }

        // Verify the user has store manager role (roleId = 3)
        if (newManager.roleId !== 3) {
          return NextResponse.json(
            { error: 'Selected user does not have the Store Manager role' },
            { status: 400 }
          )
        }

        // If there was a previous manager, remove their store assignment
        if (existingStore.managerId) {
          await prisma.user.update({
            where: { id: existingStore.managerId },
            data: { storeId: null }
          })
        }

        // If new manager was assigned to another store, remove that assignment first
        if (newManager.storeId && newManager.storeId !== id) {
          await prisma.user.update({
            where: { id: body.managerId },
            data: { storeId: null }
          })
        }

        // Assign new manager to this store
        await prisma.user.update({
          where: { id: body.managerId },
          data: { storeId: id }
        })
      }
    }
   
    // Build update data
    const updateData: any = {}

    // String fields
    const stringFields = [
      'name',
      'code',
      'storeType',
      'temperatureSensorId',
      'humiditySensorId',
      'notes',
    ]

    stringFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null
      }
    })

    // Numeric fields
    const numericFields = [
      'temperatureMin',
      'temperatureMax',
      'humidityMin',
      'humidityMax',
      'totalCapacity',
      'currentUtilization',
    ]

    numericFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] ? parseFloat(body[field]) : null
      }
    })

    // Boolean fields
    const booleanFields = [
      'allowsControlled',
      'allowsDispatch',
      'isReceivingZone',
      'isActive',
    ]

    booleanFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // JSON fields
    if (body.address !== undefined) {
      updateData.address = body.address
    }

    if (body.allowedDrugTypes !== undefined) {
      updateData.allowedDrugTypes = body.allowedDrugTypes
    }

    if (body.operatingHours !== undefined) {
      updateData.operatingHours = body.operatingHours
    }

    // ID fields
    if (body.parentStoreId !== undefined) {
      updateData.parentStoreId = body.parentStoreId || null
    }

    if (body.managerId !== undefined) {
      updateData.managerId = body.managerId || null
    }

    // Update store
    const store = await prisma.store.update({
      where: { id },
      data: updateData,
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
        action: 'update',
        entityType: 'Store',
        entityId: store.id,
        beforeValue: existingStore,
        afterValue: store,
      },
    })

    return NextResponse.json(store)
  } catch (error) {
    console.error('Error updating store:', error)
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE STORE
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.STORES_DELETE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            inventory: true,
            batches: true,
            users: true,
          },
        },
      },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Check if store has dependencies
    if (store._count.inventory > 0 || store._count.batches > 0) {
      // Instead of hard delete, deactivate the store
      const deactivatedStore = await prisma.store.update({
        where: { id: params.id },
        data: {
          isActive: false,
          notes: store.notes
            ? `${store.notes}\n\n[${new Date().toISOString()}] Store deactivated by ${session.user.name} - Cannot delete store with existing inventory or batches`
            : `[${new Date().toISOString()}] Store deactivated by ${session.user.name} - Cannot delete store with existing inventory or batches`,
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'deactivate',
          entityType: 'Store',
          entityId: params.id,
          beforeValue: store,
          afterValue: deactivatedStore,
        },
      })

      return NextResponse.json({
        message: 'Store has been deactivated instead of deleted due to existing inventory or batches',
        deactivated: true,
        store: deactivatedStore,
      })
    }

    // If store has users assigned, reassign them or prevent deletion
    if (store._count.users > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete store with assigned users. Please reassign users first.',
        },
        { status: 400 }
      )
    }

    // Delete store
    await prisma.store.delete({
      where: { id: params.id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'Store',
        entityId: params.id,
        beforeValue: store,
      },
    })

    return NextResponse.json({ 
      message: 'Store deleted successfully',
      deleted: true,
    })
  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json(
      { error: 'Failed to delete store' },
      { status: 500 }
    )
  }
}


