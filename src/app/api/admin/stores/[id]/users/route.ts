import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

// GET /api/admin/stores/[id]/users - Get all users for a store
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

    // Get store first to verify it exists
    const store = await prisma.store.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Get all users with storemanager role (roleId = 3)
    const users = await prisma.user.findMany({
      where: {
        roleId: 3, // Store Manager role
      },
      include: {
        role: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Separate users by assignment status
    const assignedUsers = users.filter(user => user.storeId === id)
    const availableUsers = users.filter(user => !user.storeId || user.storeId === null)

    return NextResponse.json({
      success: true,
      data: {
        assigned: assignedUsers,
        available: availableUsers,
        allStoreManagers: users,
      },
    })
  } catch (error) {
    console.error('Error fetching store users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store users' },
      { status: 500 }
    )
  }
}

// POST /api/admin/stores/[id]/users - Assign/remove users from store
export async function POST(
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

    const body = await request.json()
    const { userId, action } = body

    if (!userId || !['assign', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request. userId and action (assign/remove) required' },
        { status: 400 }
      )
    }

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Verify user exists and has store manager role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // if (user.roleId !== 3) {
    //   return NextResponse.json(
    //     { error: 'User must have Store Manager role' },
    //     { status: 400 }
    //   )
    // }

    let updatedUser
    let auditAction

    if (action === 'assign') {
      // Check if user is already assigned to another store
      if (user.storeId && user.storeId !== id) {
        // User is assigned to a different store - update the assignment
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            storeId: id,
          },
          include: {
            role: true,
          },
        })
        auditAction = 'reassigned'
      } else if (!user.storeId) {
        // User not assigned to any store
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            storeId: id,
          },
          include: {
            role: true,
          },
        })
        auditAction = 'assigned'
      } else {
        // User already assigned to this store
        return NextResponse.json(
          { error: 'User is already assigned to this store' },
          { status: 400 }
        )
      }
    } else {
      // Remove assignment
      if (user.storeId !== id) {
        return NextResponse.json(
          { error: 'User is not assigned to this store' },
          { status: 400 }
        )
      }

      // Check if user is the store manager
      if (store.managerId === userId) {
        // Remove them as store manager first
        await prisma.store.update({
          where: { id },
          data: { managerId: null },
        })
      }

      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          storeId: null,
        },
        include: {
          role: true,
        },
      })
      auditAction = 'removed'
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: auditAction,
        entityType: 'User',
        entityId: userId,
        afterValue: updatedUser,
        metadata: {
          storeId: id,
          storeName: store.name,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `User ${auditAction} successfully`,
    })
  } catch (error) {
    console.error('Error managing store users:', error)
    return NextResponse.json(
      { error: 'Failed to manage store users' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/stores/[id]/users/bulk - Bulk assign/remove users
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

    const body = await request.json()
    const { userIds, action } = body

    if (!Array.isArray(userIds) || !['assign', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request. userIds array and action required' },
        { status: 400 }
      )
    }

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Process in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updates = []

      for (const userId of userIds) {
        // Verify each user has store manager role
        const user = await tx.user.findUnique({
          where: { id: userId },
        })

        if (!user || user.roleId !== 3) continue

        if (action === 'assign') {
          updates.push(
            tx.user.update({
              where: { id: userId },
              data: { storeId: id },
            })
          )
        } else {
          // Remove assignment
          updates.push(
            tx.user.update({
              where: { id: userId },
              data: { storeId: null },
            })
          )

          // If user was store manager, remove that too
          if (store.managerId === userId) {
            await tx.store.update({
              where: { id },
              data: { managerId: null },
            })
          }
        }
      }

      return await Promise.all(updates)
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `bulk_${action}`,
        entityType: 'Store',
        entityId: id,
        afterValue: { userIds, count: result.length },
        metadata: {
          storeName: store.name,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk ${action} completed for ${result.length} users`,
    })
  } catch (error) {
    console.error('Error bulk managing store users:', error)
    return NextResponse.json(
      { error: 'Failed to bulk manage store users' },
      { status: 500 }
    )
  }
}