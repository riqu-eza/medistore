/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// STORE ALLOCATION API ROUTES
// Path: /api/allocation/*
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as allocationService from '@/server/services/store-allocation.service'
import { z } from 'zod'
import { auth } from '@/lib/auth/auth'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const allocateBatchSchema = z.object({
  batchId: z.string().uuid(),
  targetStoreId: z.string().uuid(),
  quantity: z.number().positive(),
  reason: z.string().optional(),
  notes: z.string().optional()
})

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

const validateStoreSchema = z.object({
  storeId: z.string().uuid(),
  drugId: z.string().uuid()
})

const suggestStoreSchema = z.object({
  drugId: z.string().uuid()
})

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/allocation/batch
 * Allocate single batch to store
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
    const validated = allocateBatchSchema.parse(body)
    
    const result = await allocationService.allocateBatchToStore(
      validated,
      session
    )
    
    return NextResponse.json({
      success: true,
      message: 'Batch allocated successfully',
      data: result
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Allocate batch error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to allocate batch' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/allocation/pending
 * Get batches pending allocation
 */
export async function GET(request: NextRequest) {
  try {
   
    const session = await auth()
        
        if (!session?.user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
    
    const pending = await allocationService.getPendingAllocations(session)
    
    return NextResponse.json({
      success: true,
      data: pending,
      total: pending.length
    })
    
  } catch (error: any) {
    console.error('Get pending allocations error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to get pending allocations' },
      { status: 500 }
    )
  }
}