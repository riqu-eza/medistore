/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// GRN API ROUTES
// Path: /api/grn/*
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import * as grnService from '@/server/services/grn.service'
import { z } from 'zod'
import { auth } from '@/lib/auth/auth'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createGRNSchema = z.object({
  supplierId: z.string().uuid(),
  purchaseOrderRef: z.string().optional(),
  deliveryNoteRef: z.string().optional(),
  invoiceRef: z.string().optional(),
  receivedDate: z.string().datetime(),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  deliveryTemperature: z.number().optional(),
  temperatureCompliant: z.boolean().optional(),
  packagingIntact: z.boolean().optional(),
  labelsLegible: z.boolean().optional(),
  documentsComplete: z.boolean().optional(),
  notes: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  documentUrls: z.array(z.string()).optional(),
  items: z.array(
    z.object({
      drugId: z.string().uuid(),
      batchNumber: z.string().min(1),
      manufacturingDate: z.string().datetime(),
      expiryDate: z.string().datetime(),
      orderedQuantity: z.number().positive().optional(),
      receivedQuantity: z.number().positive(),
      rejectedQuantity: z.number().nonnegative().optional(),
      unitType: z.enum(['bulk', 'pieces']),
      packSize: z.number().int().positive().optional(),
      unitCost: z.number().nonnegative().optional(),
      inspectionNotes: z.string().optional(),
      hasDamage: z.boolean().optional(),
      damageDescription: z.string().optional()
    })
  ).min(1)
})

const updateGRNSchema = z.object({
  notes: z.string().optional()
})

const approvalSchema = z.object({
  rejectionReason: z.string().optional()
})

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/grn
 * Create new GRN
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
    const validated = createGRNSchema.parse(body)
    
    // Convert string dates to Date objects
    const input = {
      ...validated,
      receivedDate: new Date(validated.receivedDate),
      items: validated.items.map(item => ({
        ...item,
        manufacturingDate: new Date(item.manufacturingDate),
        expiryDate: new Date(item.expiryDate)
      }))
    }
    
    const grn = await grnService.createGRN(input, session)
    
    return NextResponse.json({
      success: true,
      data: grn
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Create GRN error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create GRN' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/grn
 * List GRNs with filters
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
    
    const filters: any = {}
    
    if (searchParams.get('supplierId')) {
      filters.supplierId = searchParams.get('supplierId')
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')
    }
    if (searchParams.get('receivedBy')) {
      filters.receivedBy = searchParams.get('receivedBy')
    }
    if (searchParams.get('grnNumber')) {
      filters.grnNumber = searchParams.get('grnNumber')
    }
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!)
    }
    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!)
    }
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const result = await grnService.listGRNs(filters, page, limit, session)
    
    return NextResponse.json({
      success: true,
      ...result
    })
    
  } catch (error: any) {
    console.error('List GRNs error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to list GRNs' },
      { status: 500 }
    )
  }
}