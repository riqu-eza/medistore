/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// GRN (Goods Receipt Note) Service
// Handles: Supplier Delivery → Receiving Process
// ============================================================================

import { prisma } from '@/lib/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { Session } from 'next-auth'
import { Prisma } from '@prisma/client'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateGRNInput {
  supplierId: string
  purchaseOrderRef?: string
  deliveryNoteRef?: string
  invoiceRef?: string
  receivedDate: Date
  vehicleNumber?: string
  driverName?: string
  driverPhone?: string
  deliveryTemperature?: number
  temperatureCompliant?: boolean
  packagingIntact?: boolean
  labelsLegible?: boolean
  documentsComplete?: boolean
  notes?: string
  photoUrls?: string[]
  documentUrls?: string[]
  items: CreateGRNItemInput[]
}

export interface CreateGRNItemInput {
  drugId: string
  batchNumber: string
  manufacturingDate: Date
  expiryDate: Date
  orderedQuantity?: number
  receivedQuantity: number
  rejectedQuantity?: number
  unitType: 'bulk' | 'pieces'
  packSize?: number
  unitCost?: number
  inspectionNotes?: string
  hasDamage?: boolean
  damageDescription?: string
}

export interface UpdateGRNInput {
  status?: string
  approvedBy?: string
  rejectionReason?: string
  notes?: string
}

export interface GRNFilters {
  supplierId?: string
  status?: string
  receivedBy?: string
  dateFrom?: Date
  dateTo?: Date
  grnNumber?: string
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate expiry date threshold
 * Default: Reject if expiry < 6 months from receipt
 */
export async function validateExpiryThreshold(
  expiryDate: Date,
  receivedDate: Date = new Date()
): Promise<{ isValid: boolean; daysToExpiry: number; message?: string }> {
  const config = await prisma.systemConfiguration.findUnique({
    where: { key: 'minimum_expiry_threshold_days' }
  })
  
  const minDays = (config?.value as any)?.days || 180 // Default 6 months
  
  const daysToExpiry = Math.floor(
    (expiryDate.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysToExpiry < minDays) {
    return {
      isValid: false,
      daysToExpiry,
      message: `Expiry date too soon. Minimum ${minDays} days required, got ${daysToExpiry} days`
    }
  }
  
  return { isValid: true, daysToExpiry }
}

/**
 * Check batch uniqueness
 * Same batch number + drug + supplier should not exist
 */
export async function validateBatchUniqueness(
  batchNumber: string,
  drugId: string,
  supplierId: string
): Promise<{ isUnique: boolean; existingBatch?: any }> {
  const existingBatch = await prisma.batch.findFirst({
    where: {
      batchNumber,
      drugId,
      supplierId
    },
    include: {
      drug: true,
      supplier: true
    }
  })
  
  if (existingBatch) {
    return {
      isUnique: false,
      existingBatch
    }
  }
  
  return { isUnique: true }
}

/**
 * Calculate total pieces from bulk quantity
 */
export function calculateTotalPieces(
  receivedQuantity: number,
  unitType: 'bulk' | 'pieces',
  packSize?: number
): number {
  if (unitType === 'pieces') {
    return receivedQuantity
  }
  
  if (unitType === 'bulk' && packSize) {
    return receivedQuantity * packSize
  }
  
  return receivedQuantity
}

/**
 * Generate unique GRN number
 * Format: GRN-YYYYMMDD-XXXX
 */
export async function generateGRNNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
  
  // Get count of GRNs created today
  const count = await prisma.goodsReceiptNote.count({
    where: {
      createdAt: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lt: new Date(today.setHours(23, 59, 59, 999))
      }
    }
  })
  
  const sequence = (count + 1).toString().padStart(4, '0')
  return `GRN-${dateStr}-${sequence}`
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create GRN with items and initial validation
 */
export async function createGRN(
  input: CreateGRNInput,
  session: Session
) {
  console.log('Creating GRN with input:', input, 'Session:', session)
  // Permission check
  if (!session.user.permissions.includes(PERMISSIONS.GRN_CREATE)) {
    throw new Error('Insufficient permissions to create GRN')
  }
  
  // Validate supplier exists and is approved
  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId }
  })
  
  if (!supplier) {
    throw new Error('Supplier not found')
  }
  
  if (supplier.status !== 'approved') {
    throw new Error('Cannot receive from non-approved supplier')
  }
  
  // Validate all items
  const validationResults = await Promise.all(
    input.items.map(async (item) => {
      // Check expiry threshold
      const expiryCheck = await validateExpiryThreshold(
        item.expiryDate,
        input.receivedDate
      )
      
      // Check batch uniqueness
      const batchCheck = await validateBatchUniqueness(
        item.batchNumber,
        item.drugId,
        input.supplierId
      )
      
      return {
        item,
        expiryCheck,
        batchCheck
      }
    })
  )
  
  // Check for validation failures
  const expiryFailures = validationResults.filter(r => !r.expiryCheck.isValid)
  const batchDuplicates = validationResults.filter(r => !r.batchCheck.isUnique)
  
  if (expiryFailures.length > 0) {
    throw new Error(
      `Expiry validation failed for ${expiryFailures.length} item(s): ${
        expiryFailures.map(f => f.expiryCheck.message).join('; ')
      }`
    )
  }
  
  if (batchDuplicates.length > 0) {
    throw new Error(
      `Batch number already exists for ${batchDuplicates.length} item(s)`
    )
  }
  
  // Get receiving zone store
  const receivingZone = await prisma.store.findFirst({
    where: {
      isReceivingZone: true,
      isActive: true
    }
  })
  
  if (!receivingZone) {
    throw new Error('No active receiving zone found')
  }
  
  // Generate GRN number
  const grnNumber = await generateGRNNumber()
  
  // Create GRN with items in transaction
  const grn = await prisma.$transaction(async (tx) => {
    // Create GRN
    const newGRN = await tx.goodsReceiptNote.create({
      data: {
        grnNumber,
        supplierId: input.supplierId,
        purchaseOrderRef: input.purchaseOrderRef,
        deliveryNoteRef: input.deliveryNoteRef,
        invoiceRef: input.invoiceRef,
        receivedDate: input.receivedDate,
        receivedBy: session.user.id,
        vehicleNumber: input.vehicleNumber,
        driverName: input.driverName,
        driverPhone: input.driverPhone,
        deliveryTemperature: input.deliveryTemperature,
        temperatureCompliant: input.temperatureCompliant,
        packagingIntact: input.packagingIntact,
        labelsLegible: input.labelsLegible,
        documentsComplete: input.documentsComplete,
        photoUrls: input.photoUrls,
        documentUrls: input.documentUrls,
        notes: input.notes,
        totalItems: input.items.length,
        status: 'pending'
      }
    },{timeout: 10000})
    
    // Create GRN items
    const grnItems = await Promise.all(
      input.items.map(async (item) => {
        const acceptedQuantity = item.receivedQuantity - (item.rejectedQuantity || 0)
        const totalCost = item.unitCost 
          ? item.unitCost * acceptedQuantity 
          : undefined
        
        return tx.gRNItem.create({
          data: {
            grnId: newGRN.id,
            drugId: item.drugId,
            batchNumber: item.batchNumber,
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate,
            orderedQuantity: item.orderedQuantity,
            receivedQuantity: item.receivedQuantity,
            rejectedQuantity: item.rejectedQuantity || 0,
            acceptedQuantity,
            unitType: item.unitType,
            packSize: item.packSize,
            unitCost: item.unitCost,
            totalCost,
            inspectionNotes: item.inspectionNotes,
            hasDamage: item.hasDamage || false,
            damageDescription: item.damageDescription,
            inspectionStatus: 'pending'
          }
        })
      })
    )
    
    // Create batches for each item
    const batches = await Promise.all(
      input.items.map(async (item, index) => {
        const grnItem = grnItems[index]
        const totalPieces = calculateTotalPieces(
          grnItem.acceptedQuantity.toNumber(),
          item.unitType,
          item.packSize
        )
        
        return tx.batch.create({
          data: {
            batchNumber: item.batchNumber,
            drugId: item.drugId,
            supplierId: input.supplierId,
            grnId: newGRN.id,
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate,
            receivedDate: input.receivedDate,
            receivedQuantity: grnItem.acceptedQuantity,
            unitType: item.unitType,
            packSize: item.packSize,
            totalPieces,
            currentStoreId: receivingZone.id,
            qualityStatus: 'pending',
            status: 'active'
          }
        })
      })
    )
    
    // Create initial inventory records in receiving zone
    await Promise.all(
      batches.map(async (batch) => {
        // Create inventory record
        await tx.inventory.create({
          data: {
            storeId: receivingZone.id,
            drugId: batch.drugId,
            batchId: batch.id,
            availableQuantity: batch.receivedQuantity,
            reservedQuantity: 0,
            totalQuantity: batch.receivedQuantity,
            expiryDate: batch.expiryDate,
            isExpired: false,
            isNearExpiry: false,
            isLowStock: false,
            lastMovementDate: new Date(),
            lastMovementType: 'RECEIVE'
          }
        })
        
        // Create ledger entry
        await tx.inventoryLedger.create({
          data: {
            drugId: batch.drugId,
            batchId: batch.id,
            storeId: receivingZone.id,
            quantityIn: batch.receivedQuantity,
            quantityOut: 0,
            balanceAfter: batch.receivedQuantity,
            actionType: 'RECEIVE',
            performedBy: session.user.id,
            referenceType: 'GRN',
            referenceId: newGRN.id,
            notes: `Initial receipt via GRN ${grnNumber}`
          }
        })
      })
    )
    
    // Calculate total value
    const totalValue = grnItems.reduce(
      (sum, item) => sum + (item.totalCost?.toNumber() || 0),
      0
    )
    
    // Update GRN with total value
    await tx.goodsReceiptNote.update({
      where: { id: newGRN.id },
      data: { totalValue }
    })
    
    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'GoodsReceiptNote',
        entityId: newGRN.id,
        afterValue: {
          grnNumber,
          supplierId: input.supplierId,
          totalItems: input.items.length,
          totalValue
        }
       
      }
    })
    
    return newGRN
  })
  
  return getGRNById(grn.id, session)
}

/**
 * Get GRN by ID with full details
 */
export async function getGRNById(id: string, session: Session) {
  // Permission check
 
  if(!hasPermission(session.user.permissions, PERMISSIONS.GRN_READ)) {
    throw new Error('Insufficient permissions to approve GRN')
  }
  const grn = await prisma.goodsReceiptNote.findUnique({
    where: { id },
    include: {
      supplier: true,
      receivingOfficer: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      approver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      items: {
        include: {
          drug: {
            include: {
              category: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      },
      batches: {
        include: {
          drug: true,
          currentStore: true
        }
      }
    }
  })
  
  if (!grn) {
    throw new Error('GRN not found')
  }
  
  return grn
}

/**
 * List GRNs with filters and pagination
 */
export async function listGRNs(
  filters: GRNFilters = {},
  page: number = 1,
  limit: number = 20,
  session: Session
) {
  // Permission check
  
  console.log('Listing GRNs with filters:',  'Session:', session)
   if(!hasPermission(session.user.permissions, PERMISSIONS.GRN_READ)) {
    throw new Error('Insufficient permissions to approve GRN')
  }
  const where: Prisma.GoodsReceiptNoteWhereInput = {}
  
  if (filters.supplierId) {
    where.supplierId = filters.supplierId
  }
  
  if (filters.status) {
    where.status = filters.status
  }
  
  if (filters.receivedBy) {
    where.receivedBy = filters.receivedBy
  }
  
  if (filters.grnNumber) {
    where.grnNumber = {
      contains: filters.grnNumber,
      mode: 'insensitive'
    }
  }
  
  if (filters.dateFrom || filters.dateTo) {
    where.receivedDate = {}
    if (filters.dateFrom) {
      where.receivedDate.gte = filters.dateFrom
    }
    if (filters.dateTo) {
      where.receivedDate.lte = filters.dateTo
    }
  }
  
  const [grns, total] = await Promise.all([
    prisma.goodsReceiptNote.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        receivingOfficer: {
          select: {
            id: true,
            name: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        receivedDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.goodsReceiptNote.count({ where })
  ])
  
  return {
    data: grns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Approve GRN
 */
export async function approveGRN(
  id: string,
  session: Session
) {
  // Permission check
  
  if(!hasPermission(session.user.permissions, PERMISSIONS.GRN_APPROVE)) {
    throw new Error('Insufficient permissions to approve GRN')
  }
  
  const grn = await prisma.goodsReceiptNote.findUnique({
    where: { id },
    include: {
      items: true,
      batches: true
    }
  })
  
  if (!grn) {
    throw new Error('GRN not found')
  }
  
  if (grn.status !== 'pending') {
    throw new Error(`Cannot approve GRN with status: ${grn.status}`)
  }
  
  // Update GRN and batches in transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Update GRN status
    const updatedGRN = await tx.goodsReceiptNote.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date()
      }
    })
    
    // Update all batches to approved quality status
    await tx.batch.updateMany({
      where: { grnId: id },
      data: {
        qualityStatus: 'passed',
        inspectionDate: new Date(),
        inspectedBy: session.user.id
      }
    })
    
    // Update GRN items inspection status
    await tx.gRNItem.updateMany({
      where: { grnId: id },
      data: {
        inspectionStatus: 'approved'
      }
    })
    
    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'APPROVE',
        entityType: 'GoodsReceiptNote',
        entityId: id,
        beforeValue: { status: 'pending' },
        afterValue: { status: 'approved' },
      }
    })
    
    return updatedGRN
  })
  
  return getGRNById(id, session)
}

/**
 * Reject GRN
 */
export async function rejectGRN(
  id: string,
  rejectionReason: string,
  session: Session
) {
  // Permission check
  
  if(!hasPermission(session.user.permissions, PERMISSIONS.GRN_APPROVE)) {
    throw new Error('Insufficient permissions to approve GRN')
  }
  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new Error('Rejection reason is required')
  }
  
  const grn = await prisma.goodsReceiptNote.findUnique({
    where: { id }
  })
  
  if (!grn) {
    throw new Error('GRN not found')
  }
  
  if (grn.status !== 'pending') {
    throw new Error(`Cannot reject GRN with status: ${grn.status}`)
  }
  
  // Update GRN and related records in transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Update GRN status
    const updatedGRN = await tx.goodsReceiptNote.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectionReason
      }
    })
    
    // Update batches to failed quality status
    await tx.batch.updateMany({
      where: { grnId: id },
      data: {
        qualityStatus: 'failed',
        status: 'quarantined',
        statusReason: `GRN rejected: ${rejectionReason}`
      }
    })
    
    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REJECT',
        entityType: 'GoodsReceiptNote',
        entityId: id,
        beforeValue: { status: 'pending' },
        afterValue: { status: 'rejected', rejectionReason },
      }
    })
    
    return updatedGRN
  })
  
  return getGRNById(id, session)
}

/**
 * Update GRN (limited fields)
 */
export async function updateGRN(
  id: string,
  input: UpdateGRNInput,
  session: Session
) {
  // Permission check
 
  if(!hasPermission(session.user.permissions, PERMISSIONS.GRN_APPROVE)) {
    throw new Error('Insufficient permissions to approve GRN')
  }
  const grn = await prisma.goodsReceiptNote.findUnique({
    where: { id }
  })
  
  if (!grn) {
    throw new Error('GRN not found')
  }
  
  if (grn.status !== 'pending') {
    throw new Error('Cannot update GRN after approval/rejection')
  }
  
  const updated = await prisma.$transaction(async (tx) => {
    const updatedGRN = await tx.goodsReceiptNote.update({
      where: { id },
      data: {
        notes: input.notes,
        updatedAt: new Date()
      }
    })
    
    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'GoodsReceiptNote',
        entityId: id,
        beforeValue: { notes: grn.notes },
        afterValue: { notes: input.notes },
      }
    })
    
    return updatedGRN
  })
  
  return getGRNById(id, session)
}

/**
 * Get GRN statistics
 */
export async function getGRNStatistics(
  dateFrom?: Date,
  dateTo?: Date,
  session?: Session
) {
  const where: Prisma.GoodsReceiptNoteWhereInput = {}
  
  if (dateFrom || dateTo) {
    where.receivedDate = {}
    if (dateFrom) where.receivedDate.gte = dateFrom
    if (dateTo) where.receivedDate.lte = dateTo
  }
  
  const [
    totalGRNs,
    pendingGRNs,
    approvedGRNs,
    rejectedGRNs,
    totalValue
  ] = await Promise.all([
    prisma.goodsReceiptNote.count({ where }),
    prisma.goodsReceiptNote.count({ where: { ...where, status: 'pending' } }),
    prisma.goodsReceiptNote.count({ where: { ...where, status: 'approved' } }),
    prisma.goodsReceiptNote.count({ where: { ...where, status: 'rejected' } }),
    prisma.goodsReceiptNote.aggregate({
      where: { ...where, status: 'approved' },
      _sum: { totalValue: true }
    })
  ])
  
  return {
    totalGRNs,
    pendingGRNs,
    approvedGRNs,
    rejectedGRNs,
    totalValue: totalValue._sum.totalValue || 0
  }
}