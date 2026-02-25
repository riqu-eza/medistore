// ============================================================================
// RECEIVING WORKFLOW PAGE
// Example page showing complete workflow
// Path: app/(dashboard)/grn/[id]/page.tsx
// ============================================================================

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ReceivingWorkflow from '@/components/workflow/receiving-workflow'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth/auth'

async function getGRN(id: string) {
  const grn = await prisma.goodsReceiptNote.findUnique({
    where: { id },
    select: {
      id: true,
      status: true
    }
  })

  if (!grn) {
    notFound()
  }

  return grn
}

export default async function GRNWorkflowPage({
  params
}: {
  params: { id: string }
}) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  // Check permission
  if (!hasPermission(session.user.permissions, PERMISSIONS.GRN_READ)) {
    redirect('/unauthorized')
  }

  const grn = await getGRN(params.id)

  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<div>Loading workflow...</div>}>
        <ReceivingWorkflow 
          grnId={grn.id}
          initialStatus={grn.status}
        />
      </Suspense>
    </div>
  )
}