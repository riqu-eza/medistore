// ============================================================================
// MAIN AUTH FILE
// File: src/lib/auth/auth.ts
// ============================================================================

import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current session on server components
 */
export async function getSession() {
  return await auth()
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await auth()
  return !!session?.user
}

/**
 * Require authentication or throw error
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session.user
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  // Admin has all permissions
  if (user.permissions.includes('*')) return true
  
  // Check specific permission
  return user.permissions.includes(permission)
}

/**
 * Require specific permission or throw error
 */
export async function requirePermission(permission: string) {
  const allowed = await hasPermission(permission)
  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(permissions: string[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  // Admin has all permissions
  if (user.permissions.includes('*')) return true
  
  // Check if user has any of the permissions
  return permissions.some(permission => user.permissions.includes(permission))
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(permissions: string[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  // Admin has all permissions
  if (user.permissions.includes('*')) return true
  
  // Check if user has all permissions
  return permissions.every(permission => user.permissions.includes(permission))
}

/**
 * Check if user has specific role
 */
export async function hasRole(roleName: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  return user.roleName === roleName
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  return user.permissions.includes('*')
}

/**
 * Check if user is assigned to specific store
 */
export async function isStoreUser(storeId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  // Admin can access all stores
  if (user.permissions.includes('*')) return true
  
  return user.storeId === storeId
}

/**
 * Get user's store ID or throw error
 */
export async function getUserStoreId(): Promise<string> {
  const user = await getCurrentUser()
  if (!user?.storeId) {
    throw new Error('User is not assigned to a store')
  }
  return user.storeId
}

/**
 * Get Prisma where clause for store filtering
 */
export async function getStoreFilter() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  // Admin sees everything
  if (user.permissions.includes('*')) {
    return {}
  }
  
  // User sees only their store
  if (!user.storeId) {
    throw new Error('User not assigned to a store')
  }
  
  return { storeId: user.storeId }
}

/**
 * Check if user can access specific store
 */
export async function canAccessStore(storeId: string): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) return false
  
  // Admin can access all
  if (user.permissions.includes('*')) return true
  
  // Check if user's store
  return user.storeId === storeId
}

/**
 * Require access to specific store or throw
 */
export async function requireStoreAccess(storeId: string) {
  const hasAccess = await canAccessStore(storeId)
  if (!hasAccess) {
    throw new Error('Access denied to this store')
  }
}