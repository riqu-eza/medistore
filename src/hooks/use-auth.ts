// AUTH HOOKS - Client-Side React Hooks (UPDATED FOR NEXTAUTH)
// File: src/hooks/use-auth.ts

'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// TYPES

export interface AuthUser {
  id: string
  email: string
  name: string
  roleName: string
  permissions: string[]
  storeId: string | null
  storeName: string | null
  mfaEnabled: boolean
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  roleId: number
  storeId?: string
}

// MAIN HOOK

export function useAuth() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const user: AuthUser | null = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    roleName: session.user.roleName,
    permissions: session.user.permissions,
    storeId: session.user.storeId,
    storeName: session.user.storeName,
    mfaEnabled: session.user.mfaEnabled,
  } : null

  const isAuthenticated = status === 'authenticated'
  const isLoadingSession = status === 'loading'

  /**
   * Login function
   */
  const login = async (
    email: string,
    password: string,
    mfaCode?: string
  ): Promise<{ success: boolean; requiresMfa?: boolean; message?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        mfaCode,
        redirect: false,
      })

      setIsLoading(false)

      if (result?.error) {
        setError(result.error)
        return {
          success: false,
          message: result.error,
        }
      }

      if (result?.ok) {
        // Refresh session to get user data
        await update()
        return { success: true }
      }

      return {
        success: false,
        message: 'Login failed',
      }
    } catch (err: any) {
      setIsLoading(false)
      const errorMessage = err.message || 'Login failed'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * Logout function
   */
  const logout = async (): Promise<void> => {
    setIsLoading(true)
    try {
      await signOut({ redirect: false })
      router.push('/auth/login')
    } catch (err: any) {
      console.error('Logout error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Register function (admin creates user)
   */
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      setIsLoading(false)

      if (!result.success) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true }
    } catch (err: any) {
      setIsLoading(false)
      const errorMessage = err.message || 'Registration failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Change password function
   */
  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const result = await response.json()
      setIsLoading(false)

      if (!result.success) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true }
    } catch (err: any) {
      setIsLoading(false)
      const errorMessage = err.message || 'Password change failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Forgot password function
   */
  const forgotPassword = async (email: string): Promise<{ success: boolean }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      setIsLoading(false)

      return { success: result.success }
    } catch (err: any) {
      setIsLoading(false)
      setError(err.message)
      return { success: false }
    }
  }

  /**
   * Reset password function
   */
  const resetPassword = async (
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const result = await response.json()
      setIsLoading(false)

      if (!result.success) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true }
    } catch (err: any) {
      setIsLoading(false)
      const errorMessage = err.message || 'Password reset failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Permission checking functions
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.permissions.includes('*')) return true
    return user.permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false
    if (user.permissions.includes('*')) return true
    return permissions.some((p) => user.permissions.includes(p))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false
    if (user.permissions.includes('*')) return true
    return permissions.every((p) => user.permissions.includes(p))
  }

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || isLoadingSession,
    error,
    login,
    logout,
    register,
    changePassword,
    forgotPassword,
    resetPassword,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}

// PERMISSION HOOKS

export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

export function useAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission } = useAuth()
  return hasAnyPermission(permissions)
}

export function useAllPermissions(permissions: string[]): boolean {
  const { hasAllPermissions } = useAuth()
  return hasAllPermissions(permissions)
}



export function useSessionCheck() {
  
  return
}