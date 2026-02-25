/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// GRN REJECTION API ROUTE
// Path: /api/grn/[id]/reject
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as grnService from '@/server/services/grn.service'
import { z } from 'zod'
import { auth } from '@/lib/auth/auth'

const rejectSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters')
})

/**
 * POST /api/grn/[id]/reject
 * Reject GRN
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
    
    const body = await request.json()
    const validated = rejectSchema.parse(body)
    
    const grn = await grnService.rejectGRN(
      params.id,
      validated.rejectionReason,
      session
    )
    
    return NextResponse.json({
      success: true,
      message: 'GRN rejected successfully',
      data: grn
    })
    
  } catch (error: any) {
    console.error('Reject GRN error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to reject GRN' },
      { status: 500 }
    )
  }
}