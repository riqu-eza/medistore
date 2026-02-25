/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// STORE SUGGESTION API ROUTE
// Path: /api/allocation/suggest
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as allocationService from '@/server/services/store-allocation.service'
import { auth } from '@/lib/auth/auth'

/**
 * GET /api/allocation/suggest?drugId=xxx
 * Get suggested stores for a drug
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
    const drugId = searchParams.get('drugId')
    
    if (!drugId) {
      return NextResponse.json(
        { error: 'drugId is required' },
        { status: 400 }
      )
    }
    
    const suggestions = await allocationService.suggestStoreForDrug(drugId)
    
    return NextResponse.json({
      success: true,
      data: suggestions,
      total: suggestions.length
    })
    
  } catch (error: any) {
    console.error('Suggest store error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to suggest stores' },
      { status: 500 }
    )
  }
}