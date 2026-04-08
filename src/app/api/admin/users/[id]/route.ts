import { prisma } from '@/lib/prisma'
import { getCurrentUser, requirePermission } from '@/lib/auth/auth'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const {id} = await params

  const admin = await getCurrentUser()

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  requirePermission(PERMISSIONS.USERS_UPDATE, admin)

  const body = await req.json()

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      roleId: body.roleId ?? undefined,
      storeId: body.storeId ?? undefined,
      isActive: body.isActive ?? undefined,
      isLocked: body.isLocked ?? undefined,
      passwordChangedAt: body.forcePasswordReset
        ? null
        : undefined,
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: updatedUser.id,
      userId: admin.id,
      metadata: body,
    },
  })

  return NextResponse.json({ success: true })
}