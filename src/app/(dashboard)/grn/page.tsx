// ============================================================================
// GRN LIST PAGE
// Example page showing how to use GRN list component
// Path: app/(dashboard)/grn/page.tsx
// ============================================================================

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import GRNListView from '@/components/grn/grn-list-view'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { auth } from '@/lib/auth/auth'

async function getSuppliers() {
  return prisma.supplier.findMany({
    where: { status: 'approved' },
    select: {
      id: true,
      name: true,
      code: true
    },
    orderBy: { name: 'asc' }
  })
}

export default async function GRNListPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  // Check permission
  if (!hasPermission(session.user.permissions, PERMISSIONS.GRN_READ)) {
    redirect('/unauthorized')
  }

  const suppliers = await getSuppliers()

  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<div>Loading...</div>}>
        <GRNListView suppliers={suppliers} />
      </Suspense>
    </div>
  )
}