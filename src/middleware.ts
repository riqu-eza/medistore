import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/auth.config'
import { NextResponse } from 'next/server'  // ✅ safe to import

const { auth } = NextAuth(authConfig)

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/error',
  `/api/auth',           
  '/api/auth/error',
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

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

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