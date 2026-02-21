// ============================================================================
// MIDDLEWARE FOR ROUTE PROTECTION (UPDATED FOR NEXTAUTH)
// File: src/middleware.ts
// ============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'

// ============================================================================
// ROUTE CONFIGURATIONS
// ============================================================================

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/error',
]

const PROTECTED_ROUTES = [
  '/dashboard',
  '/drugs',
  '/suppliers',
  '/stores',
  '/inventory',
  '/grn',
  '/orders',
  '/dispatch',
  '/reports',
  '/settings',
]

const PROTECTED_API_ROUTES = [
  '/api/drugs',
  '/api/suppliers',
  '/api/stores',
  '/api/inventory',
  '/api/grn',
  '/api/orders',
  '/api/dispatch',
  '/api/reports',
  '/api/users',
]

// ============================================================================
// MIDDLEWARE FUNCTION
// ============================================================================

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ============================================================================
  // 1. HANDLE PUBLIC ROUTES
  // ============================================================================
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // If user is already logged in, redirect to dashboard
    if (session?.user && pathname === '/auth/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // ============================================================================
  // 2. HANDLE PROTECTED ROUTES - CHECK AUTHENTICATION
  // ============================================================================
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isProtectedApiRoute = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute || isProtectedApiRoute) {
    // Not authenticated - redirect to login
    if (!session?.user) {
      if (isProtectedApiRoute) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }

      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // ============================================================================
    // 3. CHECK PASSWORD CHANGE REQUIREMENT
    // ============================================================================
    if (
      session.user.requiresPasswordChange &&
      pathname !== '/auth/change-password'
    ) {
      return NextResponse.redirect(
        new URL('/auth/change-password', req.url)
      )
    }

    // ============================================================================
    // 4. STORE-LEVEL ACCESS CONTROL
    // ============================================================================
    const storeIdMatch = pathname.match(/\/stores\/([a-f0-9-]+)/)
    if (storeIdMatch) {
      const storeId = storeIdMatch[1]

      // Admin can access all stores
      const isAdmin = session.user.permissions.includes('*')

      // Check if user is assigned to this store
      if (!isAdmin && session.user.storeId !== storeId) {
        if (isProtectedApiRoute) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Access to this store denied' },
            { status: 403 }
          )
        }
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  // ============================================================================
  // 5. SECURITY HEADERS
  // ============================================================================
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  return response
})

// ============================================================================
// MATCHER CONFIGURATION
// ============================================================================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}