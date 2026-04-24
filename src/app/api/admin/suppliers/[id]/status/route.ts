/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export async function PATCH(
  request: NextRequest,
  context: { params :Promise <{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can change supplier status
    if (!hasPermission(session.user.permissions, PERMISSIONS.SUPPLIERS_APPROVE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
const {id} = await context.params
    const params = { id }
    const body = await request.json()
    const { status, reason } = body
console.log(`Received request to change status of supplier ${params.id} to ${status} with reason: ${reason}`)
    // Validate status
    const validStatuses = ['pending', 'approved', 'suspended', 'blacklisted']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Get existing supplier
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: params.id },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      status,
    }

    // If approving, set approval details
    if (status === 'approved') {
      updateData.approvedBy = session.user.id
      updateData.approvedAt = new Date()
    }

    // If suspending or blacklisting, require reason
    if ((status === 'suspended' || status === 'blacklisted') && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for suspension or blacklisting' },
        { status: 400 }
      )
    }

    // Add reason to notes if provided
    if (reason) {
      const timestamp = new Date().toISOString()
      const statusNote = `[${timestamp}] Status changed to ${status} by ${session.user.name}: ${reason}`
      updateData.notes = existingSupplier.notes
        ? `${existingSupplier.notes}\n\n${statusNote}`
        : statusNote
    }

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: updateData,
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'status_change',
        entityType: 'Supplier',
        entityId: supplier.id,
        beforeValue: { status: existingSupplier.status },
        afterValue: { status, reason },
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error updating supplier status:', error)
    return NextResponse.json(
      { error: 'Failed to update supplier status' },
      { status: 500 }
    )
  }
}

