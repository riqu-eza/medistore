// ============================================================================
// LOGOUT ROUTE - Proxy to NextAuth
// File: src/app/api/auth/logout/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'

/**
 * This endpoint is kept for backward compatibility
 * but logout is now handled by NextAuth at /api/auth/signout
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Please use NextAuth signout endpoint at /api/auth/signout',
      redirectTo: '/api/auth/signout'
    },
    { status: 400 }
  )
}