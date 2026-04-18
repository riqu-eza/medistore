// ============================================================================
// RECEIVING WORKFLOW PAGE
// Example page showing complete workflow
// Path: app/(dashboard)/grn/[id]/page.tsx
// ============================================================================

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import ReceivingWorkflow from '@/components/workflow/receiving-workflow'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { auth } from '@/lib/auth/auth'

// async function getGRN(id: string) {
//   const grn = await prisma.goodsReceiptNote.findUnique({
//     where: { id },
//     select: {
//       id: true,
//       status: true
//     }
//   })

//   if (!grn) {
//     notFound()
//   }

//   return grn
// }

export default async function GRNWorkflowPage({
  params
}: {
  params:Promise < { id: string }>
}) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }
const{id} = await params
 
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<div>Loading workflow...</div>}>
        <ReceivingWorkflow 
          grnId={id}
        />
      </Suspense>
    </div>
  )
}