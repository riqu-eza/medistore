// app/api/orders/available-drugs/route.ts
import { getOrderableDrugsWithStores } from '@/server/services/drug.service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get('search') || undefined

  try {
    const drugsWithStores = await getOrderableDrugsWithStores(search)
    
    // Log properly - drugsWithStores is an array, not a number
    console.log(`[available-drugs] Found ${drugsWithStores.length} drugs matching search: "${search || 'all'}"`)
    
    // Transform to a simpler format if needed by frontend
    // Option A: Return full data with stores
    return NextResponse.json({ 
      success: true, 
      data: drugsWithStores,
      meta: {
        total: drugsWithStores.length,
        hasStores: true
      }
    })
    
    // Option B: Transform to simple array for backward compatibility
    // const simpleDrugs = drugsWithStores.map(item => item.drug)
    // return NextResponse.json({ success: true, data: simpleDrugs })
    
  } catch (error) {
    console.error('[available-drugs]', error)
    return NextResponse.json(
      { error: 'Failed to fetch orderable drugs' },
      { status: 500 }
    )
  }
}