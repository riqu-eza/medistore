// ============================================================================
// INVENTORY BUSINESS LOGIC HELPERS
// Shared utilities for inventory operations
// ============================================================================

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// ============================================================================
// QUANTITY CALCULATIONS
// ============================================================================

/**
 * Calculate days to expiry
 */
export function calculateDaysToExpiry(expiryDate: Date): number {
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Check if batch is expired
 */
export function isExpired(expiryDate: Date): boolean {
  return expiryDate < new Date()
}

/**
 * Check if batch is near expiry (default 90 days)
 */
export function isNearExpiry(expiryDate: Date, thresholdDays: number = 90): boolean {
  const daysToExpiry = calculateDaysToExpiry(expiryDate)
  return daysToExpiry > 0 && daysToExpiry <= thresholdDays
}

/**
 * Convert Decimal to number safely
 */
export function decimalToNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  return value.toNumber()
}

/**
 * Add decimals safely
 */
export function addQuantities(a: Decimal | number, b: Decimal | number): number {
  return decimalToNumber(a) + decimalToNumber(b)
}

/**
 * Subtract decimals safely
 */
export function subtractQuantities(a: Decimal | number, b: Decimal | number): number {
  return decimalToNumber(a) - decimalToNumber(b)
}

// ============================================================================
// FEFO (First Expiry First Out) LOGIC
// ============================================================================

/**
 * Get available batches sorted by expiry (FEFO)
 */
export async function getAvailableBatchesFEFO(
  drugId: string,
  storeId: string,
  requiredQuantity: number
) {
  const inventory = await prisma.inventory.findMany({
    where: {
      drugId,
      storeId,
      availableQuantity: { gt: 0 },
      isExpired: false
    },
    include: {
      batch: true
    },
    orderBy: {
      expiryDate: 'asc' // FEFO: First to expire first
    }
  })
  
  return inventory
}

/**
 * Allocate quantity across batches using FEFO
 */
export function allocateQuantityFEFO(
  inventory: Array<{
    id: string
    batchId: string
    availableQuantity: Decimal
    expiryDate: Date
  }>,
  requiredQuantity: number
): Array<{
  inventoryId: string
  batchId: string
  quantity: number
}> {
  const allocations: Array<{
    inventoryId: string
    batchId: string
    quantity: number
  }> = []
  
  let remaining = requiredQuantity
  
  for (const inv of inventory) {
    if (remaining <= 0) break
    
    const available = decimalToNumber(inv.availableQuantity)
    const toAllocate = Math.min(available, remaining)
    
    allocations.push({
      inventoryId: inv.id,
      batchId: inv.batchId,
      quantity: toAllocate
    })
    
    remaining -= toAllocate
  }
  
  return allocations
}

// ============================================================================
// INVENTORY CHECKS
// ============================================================================

/**
 * Check if sufficient quantity is available
 */
export async function checkAvailability(
  drugId: string,
  storeId: string,
  requiredQuantity: number
): Promise<{
  available: boolean
  totalAvailable: number
  shortfall?: number
}> {
  const result = await prisma.inventory.aggregate({
    where: {
      drugId,
      storeId,
      availableQuantity: { gt: 0 },
      isExpired: false
    },
    _sum: {
      availableQuantity: true
    }
  })
  
  const totalAvailable = decimalToNumber(result._sum.availableQuantity)
  
  if (totalAvailable >= requiredQuantity) {
    return {
      available: true,
      totalAvailable
    }
  }
  
  return {
    available: false,
    totalAvailable,
    shortfall: requiredQuantity - totalAvailable
  }
}

/**
 * Get low stock items
 */
export async function getLowStockItems(storeId?: string) {
  const where: any = {
    availableQuantity: { gt: 0 }
  }
  
  if (storeId) {
    where.storeId = storeId
  }
  
  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      drug: {
        select: {
          id: true,
          genericName: true,
          brandName: true,
          reorderPoint: true,
          reorderQuantity: true
        }
      },
      store: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    }
  })
  
  // Filter items below reorder point
  return inventory.filter(inv => {
    if (!inv.drug.reorderPoint) return false
    return decimalToNumber(inv.availableQuantity) <= inv.drug.reorderPoint
  })
}

/**
 * Get expiring items
 */
export async function getExpiringItems(
  daysThreshold: number = 90,
  storeId?: string
) {
  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)
  
  const where: any = {
    expiryDate: {
      lte: thresholdDate,
      gt: new Date() // Not already expired
    },
    availableQuantity: { gt: 0 }
  }
  
  if (storeId) {
    where.storeId = storeId
  }
  
  return prisma.inventory.findMany({
    where,
    include: {
      drug: {
        select: {
          id: true,
          genericName: true,
          brandName: true,
          drugCode: true
        }
      },
      batch: {
        select: {
          id: true,
          batchNumber: true,
          expiryDate: true
        }
      },
      store: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    },
    orderBy: {
      expiryDate: 'asc'
    }
  })
}

/**
 * Get expired items
 */
export async function getExpiredItems(storeId?: string) {
  const where: any = {
    expiryDate: {
      lt: new Date()
    },
    totalQuantity: { gt: 0 }
  }
  
  if (storeId) {
    where.storeId = storeId
  }
  
  return prisma.inventory.findMany({
    where,
    include: {
      drug: {
        select: {
          id: true,
          genericName: true,
          brandName: true,
          drugCode: true
        }
      },
      batch: {
        select: {
          id: true,
          batchNumber: true,
          expiryDate: true,
          status: true
        }
      },
      store: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    },
    orderBy: {
      expiryDate: 'asc'
    }
  })
}

// ============================================================================
// INVENTORY RECONCILIATION
// ============================================================================

/**
 * Calculate inventory balance from ledger
 * Use this to verify inventory accuracy
 */
export async function calculateInventoryBalance(
  drugId: string,
  batchId: string,
  storeId: string
): Promise<number> {
  const ledgerEntries = await prisma.inventoryLedger.findMany({
    where: {
      drugId,
      batchId,
      storeId
    },
    orderBy: {
      timestamp: 'asc'
    }
  })
  
  let balance = 0
  
  for (const entry of ledgerEntries) {
    balance += decimalToNumber(entry.quantityIn)
    balance -= decimalToNumber(entry.quantityOut)
  }
  
  return balance
}

/**
 * Verify inventory matches ledger
 */
export async function verifyInventoryIntegrity(
  inventoryId: string
): Promise<{
  isValid: boolean
  inventoryQuantity: number
  ledgerQuantity: number
  difference?: number
}> {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId }
  })
  
  if (!inventory) {
    throw new Error('Inventory not found')
  }
  
  const ledgerQuantity = await calculateInventoryBalance(
    inventory.drugId,
    inventory.batchId,
    inventory.storeId
  )
  
  const inventoryQuantity = decimalToNumber(inventory.totalQuantity)
  const difference = inventoryQuantity - ledgerQuantity
  
  return {
    isValid: Math.abs(difference) < 0.01, // Allow small floating point differences
    inventoryQuantity,
    ledgerQuantity,
    ...(Math.abs(difference) >= 0.01 && { difference })
  }
}

// ============================================================================
// BATCH QUERIES
// ============================================================================

/**
 * Get batch details with current locations
 */
export async function getBatchLocations(batchId: string) {
  const inventory = await prisma.inventory.findMany({
    where: {
      batchId,
      totalQuantity: { gt: 0 }
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          code: true,
          storeType: true
        }
      },
      drug: {
        select: {
          id: true,
          genericName: true,
          brandName: true,
          drugCode: true
        }
      }
    }
  })
  
  return inventory.map(inv => ({
    storeId: inv.storeId,
    storeName: inv.store.name,
    storeCode: inv.store.code,
    storeType: inv.store.storeType,
    availableQuantity: decimalToNumber(inv.availableQuantity),
    reservedQuantity: decimalToNumber(inv.reservedQuantity),
    totalQuantity: decimalToNumber(inv.totalQuantity)
  }))
}

/**
 * Get batch movement history
 */
export async function getBatchHistory(batchId: string) {
  return prisma.inventoryLedger.findMany({
    where: { batchId },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    }
  })
}

// ============================================================================
// REPORTING HELPERS
// ============================================================================

/**
 * Get inventory summary by store
 */
export async function getInventorySummaryByStore(storeId: string) {
  const [
    totalItems,
    totalValue,
    lowStockCount,
    expiringCount,
    expiredCount
  ] = await Promise.all([
    prisma.inventory.count({
      where: {
        storeId,
        availableQuantity: { gt: 0 }
      }
    }),
    prisma.inventory.aggregate({
      where: {
        storeId,
        availableQuantity: { gt: 0 }
      },
      _sum: {
        availableQuantity: true
      }
    }),
    prisma.inventory.count({
      where: {
        storeId,
        isLowStock: true
      }
    }),
    prisma.inventory.count({
      where: {
        storeId,
        isNearExpiry: true
      }
    }),
    prisma.inventory.count({
      where: {
        storeId,
        isExpired: true
      }
    })
  ])
  
  return {
    totalItems,
    totalQuantity: decimalToNumber(totalValue._sum.availableQuantity),
    lowStockCount,
    expiringCount,
    expiredCount
  }
}

/**
 * Get inventory value by store
 */
export async function getInventoryValue(storeId?: string) {
  const where: any = {
    availableQuantity: { gt: 0 }
  }
  
  if (storeId) {
    where.storeId = storeId
  }
  
  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      drug: {
        select: {
          unitCost: true
        }
      }
    }
  })
  
  let totalValue = 0
  
  for (const inv of inventory) {
    const quantity = decimalToNumber(inv.availableQuantity)
    const cost = decimalToNumber(inv.drug.unitCost)
    totalValue += quantity * cost
  }
  
  return totalValue
}