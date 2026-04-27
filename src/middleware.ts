import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/change-password',
  '/auth/error',
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
  '/api/admin',
]

// ✅ All real app routes that exist in your project.
// Add new routes here as you build them.
const KNOWN_ROUTES = [
  '/',
  '/dashboard',
  '/admin',
  '/admin/users',
  '/admin/roles',
  '/admin/stores',
  '/drugs',
  '/suppliers',
  '/inventory',
  '/grn',
  '/orders',
  '/dispatch',
  '/reports',
  '/profile',
  '/stores',
  '/store',
  '/auditor',
  '/orders',
  '/auth/login',
]

function isKnownRoute(pathname: string): boolean {
  // Always allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return true

  // Always allow API routes (auth + protected)
  if (pathname.startsWith('/api/')) return true

  // Check against known app routes
  return KNOWN_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ✅ Always allow NextAuth internal routes first
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // ✅ If the route is not known → show Coming Soon (not-found page)
  if (!isKnownRoute(pathname)) {
    return NextResponse.rewrite(new URL('/not-found', req.url))
  }

  // Already logged in → skip login page
  if (pathname === '/auth/login' && session?.user) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Public routes — always allow
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const isProtectedApi = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // Not authenticated
  if (!session?.user) {
    if (isProtectedApi) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Force password change
  if (
    session.user.requiresPasswordChange &&
    pathname !== '/auth/change-password'
  ) {
    return NextResponse.redirect(new URL('/auth/change-password', req.url))
  }

  // Store-level access control
  const storeIdMatch = pathname.match(/\/stores\/([a-f0-9-]+)/)
  if (storeIdMatch) {
    const storeId = storeIdMatch[1]
    const isAdmin = session.user.permissions.includes('*')
    if (!isAdmin && session.user.storeId !== storeId) {
      if (isProtectedApi) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Access to this store denied' },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}