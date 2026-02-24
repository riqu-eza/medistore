/* eslint-disable @typescript-eslint/no-explicit-any */
// SUPPLIERS API - GET ALL (with filtering, pagination, search)
// File: src/app/api/suppliers/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permission check
    if (!hasPermission(session.user.permissions, PERMISSIONS.SUPPLIERS_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const companyType = searchParams.get('companyType') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (companyType) {
      where.companyType = companyType
    }

    // Calculate skip
    const skip = (page - 1) * limit

    // Execute query with pagination
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          _count: {
            select: {
              supplierDrugs: true,
              grns: true,
              documents: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ])

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

// ============================================================================
// CREATE NEW SUPPLIER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
console.log('User session:', session) // Debugging line to check session contents
    // Permission check
    if (!hasPermission(session.user.permissions, PERMISSIONS.SUPPLIERS_CREATE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
console.log('User has permission to create suppliers') // Debugging line to confirm permission check passed
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'code', 'companyType', 'address']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Check if code already exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { code: body.code },
    })

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier code already exists' },
        { status: 400 }
      )
    }

    // Validate address structure
    if (typeof body.address !== 'object') {
      return NextResponse.json(
        { error: 'Address must be a valid object' },
        { status: 400 }
      )
    }

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        code: body.code,
        companyType: body.companyType,
        contactPerson: body.contactPerson || null,
        email: body.email || null,
        phone: body.phone || null,
        alternatePhone: body.alternatePhone || null,
        website: body.website || null,
        address: body.address,
        licenseNumber: body.licenseNumber || null,
        licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : null,
        taxId: body.taxId || null,
        bankDetails: body.bankDetails || null,
        notes: body.notes || null,
        status: 'pending',
        createdBy: session.user.id,
      },
      include: {
        _count: {
          select: {
            supplierDrugs: true,
            grns: true,
            documents: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entityType: 'Supplier',
        entityId: supplier.id,
        afterValue: supplier,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}


