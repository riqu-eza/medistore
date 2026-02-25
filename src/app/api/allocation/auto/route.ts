/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// AUTO-ALLOCATION API ROUTE
// Path: /api/allocation/auto
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as allocationService from '@/server/services/store-allocation.service'
import { z } from 'zod'
import { auth } from '@/lib/auth/auth'

const autoAllocationSchema = z.object({
  grnId: z.string().uuid()
})

/**
 * POST /api/allocation/auto
 * Auto-allocate batches based on system recommendations
 */
export async function POST(request: NextRequest) {
  try {
 
    const session = await auth()
        
        if (!session?.user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
    
    const body = await request.json()
    const validated = autoAllocationSchema.parse(body)
    
    const result = await allocationService.autoAllocateBatches(
      validated.grnId,
      session
    )
    
    return NextResponse.json({
      success: true,
      message: `Auto-allocated ${result.totalAllocated} batches based on store rules`,
      data: result
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Auto-allocation error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to auto-allocate batches' },
      { status: 500 }
    )
  }
}