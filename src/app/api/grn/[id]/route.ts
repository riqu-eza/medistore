/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// GRN DETAIL API ROUTES
// Path: /api/grn/[id]/*
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as grnService from '@/server/services/grn.service'
import { z } from 'zod'
import { auth } from '@/lib/auth/auth'

const updateGRNSchema = z.object({
  notes: z.string().optional()
})

/**
 * GET /api/grn/[id]
 * Get GRN by ID
 */
export async function GET(
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
    const grn = await grnService.getGRNById(params.id, session)
    
    return NextResponse.json({
      success: true,
      data: grn
    })
    
  } catch (error: any) {
    console.error('Get GRN error:', error)
    
    if (error.message === 'GRN not found') {
      return NextResponse.json(
        { error: 'GRN not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to get GRN' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/grn/[id]
 * Update GRN
 */
export async function PATCH(
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
    const validated = updateGRNSchema.parse(body)
    
    const grn = await grnService.updateGRN(params.id, validated, session)
    
    return NextResponse.json({
      success: true,
      data: grn
    })
    
  } catch (error: any) {
    console.error('Update GRN error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update GRN' },
      { status: 500 }
    )
  }
}