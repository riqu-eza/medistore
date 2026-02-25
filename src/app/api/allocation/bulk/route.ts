/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// BULK ALLOCATION API ROUTES
// Path: /api/allocation/bulk and /api/allocation/auto
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as allocationService from '@/server/services/store-allocation.service'
import { z } from 'zod'
import { auth } from '@/lib/auth/auth'

const bulkAllocationSchema = z.object({
  grnId: z.string().uuid(),
  allocations: z.array(
    z.object({
      batchId: z.string().uuid(),
      targetStoreId: z.string().uuid(),
      quantity: z.number().positive()
    })
  ).min(1),
  notes: z.string().optional()
})

/**
 * POST /api/allocation/bulk
 * Bulk allocate batches from GRN
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
    const validated = bulkAllocationSchema.parse(body)
    
    const result = await allocationService.bulkAllocateFromGRN(
      validated,
      session
    )
    
    return NextResponse.json({
      success: true,
      message: `Successfully allocated ${result.totalAllocated} batches`,
      data: result
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Bulk allocation error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to allocate batches' },
      { status: 500 }
    )
  }
}