/* eslint-disable @typescript-eslint/no-explicit-any */
// STORES API - Individual Store Operations
// File: src/app/api/admin/stores/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

// =======================================================================

const STORE_TYPE_ALLOWED_ROLES: Record<string, string[]> = {
  general:    ['store_manager'],
  cold:       ['store_manager'],
  controlled: ['store_manager'],
  receiving:  ['receiving_officer'],
}

function getAllowedRolesForStoreType(storeType: string): string[] {
  return STORE_TYPE_ALLOWED_ROLES[storeType] ?? ['store_manager']
}

// ============================================================================
// GET STORE
// ============================================================================

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
              select: { name: true, displayName: true },
            },
          },
        },
        inventory: {
          take: 10,
          orderBy: { lastUpdated: 'desc' },
          include: {
            drug: {
              select: { id: true, drugCode: true, genericName: true, brandName: true },
            },
            batch: {
              select: { id: true, batchNumber: true, expiryDate: true },
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
              select: { genericName: true, brandName: true },
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
          select: { users: true, inventory: true, batches: true, temperatureLogs: true },
        },
      },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const manager = store.managerId
      ? await prisma.user.findUnique({
          where: { id: store.managerId },
          select: { id: true, name: true, email: true },
        })
      : null

    const parentStore = store.parentStoreId
      ? await prisma.store.findUnique({
          where: { id: store.parentStoreId },
          select: { id: true, name: true, code: true, storeType: true },
        })
      : null

    // Return allowed role names so frontend knows who to show in the manager dropdown
    const allowedRoles = getAllowedRolesForStoreType(store.storeType)

    return NextResponse.json({ ...store, manager, parentStore, allowedRoles })
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
  }
}

// ============================================================================
// UPDATE STORE
// ============================================================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.STORES_UPDATE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingStore = await prisma.store.findUnique({ where: { id } })

    if (!existingStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await request.json()

    // ── Code uniqueness check ──────────────────────────────────────────────
    if (body.code && body.code !== existingStore.code) {
      const codeExists = await prisma.store.findUnique({ where: { code: body.code } })
      if (codeExists) {
        return NextResponse.json({ error: 'Store code already exists' }, { status: 400 })
      }
    }

    // ── Store type validation ──────────────────────────────────────────────
    const validStoreTypes = ['cold', 'general', 'controlled', 'receiving']
    if (body.storeType && !validStoreTypes.includes(body.storeType)) {
      return NextResponse.json(
        { error: `Invalid store type. Must be one of: ${validStoreTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // ── Temperature range validation ───────────────────────────────────────
    const tempMin = body.temperatureMin !== undefined
      ? parseFloat(body.temperatureMin)
      : existingStore.temperatureMin
    const tempMax = body.temperatureMax !== undefined
      ? parseFloat(body.temperatureMax)
      : existingStore.temperatureMax

    if (tempMin && tempMax && tempMin > tempMax) {
      return NextResponse.json(
        { error: 'Minimum temperature cannot be greater than maximum temperature' },
        { status: 400 }
      )
    }

    // ── Humidity range validation ──────────────────────────────────────────
    const humMin = body.humidityMin !== undefined
      ? parseFloat(body.humidityMin)
      : existingStore.humidityMin
    const humMax = body.humidityMax !== undefined
      ? parseFloat(body.humidityMax)
      : existingStore.humidityMax

    if (humMin && humMax && humMin > humMax) {
      return NextResponse.json(
        { error: 'Minimum humidity cannot be greater than maximum humidity' },
        { status: 400 }
      )
    }

    // ── Parent store validation ────────────────────────────────────────────
    if (body.parentStoreId) {
      if (body.parentStoreId === id) {
        return NextResponse.json({ error: 'Store cannot be its own parent' }, { status: 400 })
      }
      const parentStore = await prisma.store.findUnique({ where: { id: body.parentStoreId } })
      if (!parentStore) {
        return NextResponse.json({ error: 'Parent store not found' }, { status: 404 })
      }
    }

    // ── Manager assignment — role validated against store type ─────────────
    if (body.managerId !== undefined && body.managerId !== existingStore.managerId) {

      // The store type we'll end up with after save (body may be changing it)
      const effectiveStoreType = body.storeType ?? existingStore.storeType
      const allowedRoleNames = getAllowedRolesForStoreType(effectiveStoreType)

      if (!body.managerId || body.managerId === '') {
        // Removing the manager — unlink the current one if any
        if (existingStore.managerId) {
          await prisma.user.update({
            where: { id: existingStore.managerId },
            data: { storeId: null },
          })
        }
      } else {
        // Assigning a new manager
        const newManager = await prisma.user.findUnique({
          where: { id: body.managerId },
          include: { role: true },
        })

        if (!newManager) {
          return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
        }

        // ✅ Dynamic role check — respects store type
        if (!allowedRoleNames.includes(newManager.role.name)) {
          const friendly = allowedRoleNames.map((r) => `"${r}"`).join(' or ')
          return NextResponse.json(
            {
              error:
                `A ${effectiveStoreType} store requires a manager with the role ${friendly}. ` +
                `"${newManager.name}" has role "${newManager.role.displayName}".`,
            },
            { status: 400 }
          )
        }

        // Unlink the previous manager from this store
        if (existingStore.managerId) {
          await prisma.user.update({
            where: { id: existingStore.managerId },
            data: { storeId: null },
          })
        }

        // Unlink the new manager from any OTHER store they were managing
        if (newManager.storeId && newManager.storeId !== id) {
          await prisma.user.update({
            where: { id: body.managerId },
            data: { storeId: null },
          })
        }

        // Assign them to this store
        await prisma.user.update({
          where: { id: body.managerId },
          data: { storeId: id },
        })
      }
    }

    // ── Build update payload ───────────────────────────────────────────────
    const updateData: any = {}

    const stringFields = ['name', 'code', 'storeType', 'temperatureSensorId', 'humiditySensorId', 'notes']
    stringFields.forEach((field) => {
      if (body[field] !== undefined) updateData[field] = body[field] || null
    })

    const numericFields = ['temperatureMin', 'temperatureMax', 'humidityMin', 'humidityMax', 'totalCapacity', 'currentUtilization']
    numericFields.forEach((field) => {
      if (body[field] !== undefined) updateData[field] = body[field] ? parseFloat(body[field]) : null
    })

    const booleanFields = ['allowsControlled', 'allowsDispatch', 'isReceivingZone', 'isActive']
    booleanFields.forEach((field) => {
      if (body[field] !== undefined) updateData[field] = body[field]
    })

    if (body.address !== undefined)          updateData.address = body.address
    if (body.allowedDrugTypes !== undefined) updateData.allowedDrugTypes = body.allowedDrugTypes
    if (body.operatingHours !== undefined)   updateData.operatingHours = body.operatingHours
    if (body.parentStoreId !== undefined)    updateData.parentStoreId = body.parentStoreId || null
    if (body.managerId !== undefined)        updateData.managerId = body.managerId || null

    // ── Persist ───────────────────────────────────────────────────────────
    const store = await prisma.store.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { users: true, inventory: true, batches: true } },
      },
    })

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
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
  }
}

// ============================================================================
// DELETE STORE
// ============================================================================

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params   // ← fixed: was missing await
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.permissions, PERMISSIONS.STORES_DELETE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: { select: { inventory: true, batches: true, users: true } },
      },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    if (store._count.inventory > 0 || store._count.batches > 0) {
      const deactivatedStore = await prisma.store.update({
        where: { id },
        data: {
          isActive: false,
          notes: store.notes
            ? `${store.notes}\n\n[${new Date().toISOString()}] Deactivated by ${session.user.name} — cannot delete store with existing inventory or batches`
            : `[${new Date().toISOString()}] Deactivated by ${session.user.name} — cannot delete store with existing inventory or batches`,
        },
      })

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'deactivate',
          entityType: 'Store',
          entityId: id,
          beforeValue: store,
          afterValue: deactivatedStore,
        },
      })

      return NextResponse.json({
        message: 'Store deactivated instead of deleted — existing inventory or batches found.',
        deactivated: true,
        store: deactivatedStore,
      })
    }

    if (store._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete store with assigned users. Reassign users first.' },
        { status: 400 }
      )
    }

    await prisma.store.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entityType: 'Store',
        entityId: id,
        beforeValue: store,
      },
    })

    return NextResponse.json({ message: 'Store deleted successfully', deleted: true })
  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 })
  }
}