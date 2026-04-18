/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// REGISTRATION ROUTE - ADMIN ONLY
// File: src/app/api/auth/register/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthService } from '@/server/services/auth.service'
import { requireAuth, requirePermission } from '@/lib/auth/auth'
import { PERMISSIONS } from '@/lib/auth/permissions'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  roleId: z.number().int().positive('Invalid role ID'),
  storeId: z.string().uuid('Invalid store ID').optional(),
})

export async function POST(request: NextRequest) {
  try {
    // REQUIRE AUTHENTICATION & PERMISSION (Admin only)
    const admin = await requireAuth()
    await requirePermission(PERMISSIONS.USERS_CREATE)

    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Create user with admin as creator
    const user = await AuthService.register({
      ...validation.data,
      createdBy: admin.id, // Track who created this user
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
          store: user.storeId? user.storeId : null,
        },
        message: 'User created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (error.message.includes('Permission denied')) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can create users' },
        { status: 403 }
      )
    }

    if (error.message.includes('already registered')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      )
    }

    if (error.message.includes('validation failed')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}