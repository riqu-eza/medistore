// ============================================================================
// LOGIN ROUTE - Now just a proxy to NextAuth
// File: src/app/api/auth/login/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'

/**
 * This endpoint is kept for backward compatibility
 * but login is now handled by NextAuth at /api/auth/signin
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Please use NextAuth signin endpoint at /api/auth/signin',
      redirectTo: '/api/auth/signin'
    },
    { status: 400 }
  )
}