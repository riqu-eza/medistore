import { prisma } from '@/lib/prisma'
import { getCurrentUser, requirePermission } from '@/lib/auth/auth'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const admin = await getCurrentUser()
  requirePermission(PERMISSIONS.USERS_READ,)

  const { searchParams } = new URL(req.url)

  const search = searchParams.get('search') || ''
  const roleId = searchParams.get('roleId')
  const storeId = searchParams.get('storeId')
  const isActive = searchParams.get('isActive')

  const users = await prisma.user.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        roleId ? { roleId: parseInt(roleId) } : {},
        storeId ? { storeId } : {},
        isActive ? { isActive: isActive === 'true' } : {},
      ],
    },
    include: {
      role: true,
      store: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: users })
}