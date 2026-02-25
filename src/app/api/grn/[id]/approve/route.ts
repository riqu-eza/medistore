/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// GRN APPROVAL API ROUTES
// Path: /api/grn/[id]/approve and /api/grn/[id]/reject
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as grnService from '@/server/services/grn.service'
import { z } from 'zod'
import { auth } from '@/lib/auth/auth'

const rejectSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters')
})

/**
 * POST /api/grn/[id]/approve
 * Approve GRN
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  
      const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const grn = await grnService.approveGRN(params.id, session)
    
    return NextResponse.json({
      success: true,
      message: 'GRN approved successfully',
      data: grn
    })
    
  } catch (error: any) {
    console.error('Approve GRN error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to approve GRN' },
      { status: 500 }
    )
  }
}