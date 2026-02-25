/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// STORE VALIDATION & SUGGESTION API ROUTES
// Path: /api/allocation/validate and /api/allocation/suggest
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as allocationService from '@/server/services/store-allocation.service'
import { auth } from '@/lib/auth/auth'

/**
 * GET /api/allocation/validate?storeId=xxx&drugId=yyy
 * Validate if a store can accept a drug
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
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const drugId = searchParams.get('drugId')
    
    if (!storeId || !drugId) {
      return NextResponse.json(
        { error: 'storeId and drugId are required' },
        { status: 400 }
      )
    }
    
    const validation = await allocationService.validateStoreForDrug(
      storeId,
      drugId
    )
    
    return NextResponse.json({
      success: true,
      data: validation
    })
    
  } catch (error: any) {
    console.error('Validate store error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to validate store' },
      { status: 500 }
    )
  }
}