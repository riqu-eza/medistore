/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// AUTH CONFIGURATION - NextAuth.js v5
// File: src/lib/auth/auth.config.ts
// ============================================================================

import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
})

// ============================================================================
// AUTH CONFIGURATION
// ============================================================================

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        try {
          // 1. Validate input
          const validatedFields = loginSchema.safeParse(credentials)
          if (!validatedFields.success) {
            return null
          }

          const { email, password, mfaCode } = validatedFields.data

          // 2. Find user
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  permissions: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          })

          if (!user) {
            // Don't reveal if user exists
            console.log('Login failed: User not found')
            return null
          }

          // 3. Check if account is active
          if (!user.isActive) {
            console.log('Login failed: Account inactive')
            return null
          }

          // 4. Check if account is locked
          if (user.isLocked) {
            // Check if lock duration has passed (auto-unlock)
            const lockDuration = parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '30')
            const lockExpiry = new Date(user.lockedAt || 0)
            lockExpiry.setMinutes(lockExpiry.getMinutes() + lockDuration)
            
            if (new Date() > lockExpiry) {
              // Auto-unlock
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  isLocked: false,
                  failedAttempts: 0,
                  lockedAt: null
                }
              })
              
              await prisma.auditLog.create({
                data: {
                  userId: user.id,
                  action: 'account_auto_unlocked',
                  entityType: 'User',
                  entityId: user.id,
                }
              })
            } else {
              console.log('Login failed: Account locked')
              return null
            }
          }

          // 5. Verify password
          const isPasswordValid = await compare(password, user.passwordHash)
          
          if (!isPasswordValid) {
            // Increment failed attempts
            const newFailedAttempts = user.failedAttempts + 1
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5')
            
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedAttempts: newFailedAttempts,
                isLocked: newFailedAttempts >= maxAttempts,
                lockedAt: newFailedAttempts >= maxAttempts ? new Date() : null,
              },
            })

            if (newFailedAttempts >= maxAttempts) {
              // Send email notification
              console.log('Account locked due to failed attempts')
              // TODO: Send email
            }

            console.log('Login failed: Invalid password')
            return null
          }

          // 6. Check MFA if enabled
          if (user.mfaEnabled) {
            if (!mfaCode) {
              // Return special indicator that MFA is required
              return {
                id: user.id,
                email: user.email,
                requiresMfa: true,
              } as any
            }

            // Verify MFA code
            const { verifyTOTP } = await import('@/lib/auth/mfa')
            const isValidMfa = verifyTOTP(user.mfaSecret!, mfaCode)
            
            if (!isValidMfa) {
              console.log('Login failed: Invalid MFA code')
              return null
            }
          }

          // 7. Check password expiry
          const passwordMaxAge = parseInt(process.env.PASSWORD_MAX_AGE_DAYS || '90')
          const passwordAge = user.passwordChangedAt
            ? Math.floor((Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999
          
          const requiresPasswordChange = passwordAge > passwordMaxAge

          // 8. Reset failed attempts and update last login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedAttempts: 0,
              lastLogin: new Date(),
            },
          })

          // 9. Create audit log
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'login',
              entityType: 'User',
              entityId: user.id,
              ipAddress: (credentials as any).ip as string || 'unknown',
              userAgent: (credentials as any).userAgent as string || 'unknown',
            },
          })

          // 10. Return user data for session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
            roleName: user.role.name,
            permissions: user.role.permissions as string[],
            storeId: user.storeId,
            storeName: user.store?.name || null,
            requiresPasswordChange,
            mfaEnabled: user.mfaEnabled,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800'), // 7 days
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.roleId = user.roleId
        token.roleName = user.roleName
        token.permissions = user.permissions
        token.storeId = user.storeId
        token.storeName = user.storeName
        token.requiresPasswordChange = user.requiresPasswordChange
        token.mfaEnabled = user.mfaEnabled
        token.requiresMfa = user.requiresMfa
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        token = { ...token, ...session }
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.roleId = token.roleId as number
        session.user.roleName = token.roleName as string
        session.user.permissions = token.permissions as string[]
        session.user.storeId = token.storeId as string | null
        session.user.storeName = token.storeName as string | null
        session.user.requiresPasswordChange = token.requiresPasswordChange as boolean
        session.user.mfaEnabled = token.mfaEnabled as boolean
      }

      return session
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },

  events: {
    async signOut({ token }) {
      // Create audit log for sign out
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId: token.id as string,
            action: 'logout',
            entityType: 'User',
            entityId: token.id as string,
          },
        }).catch(err => console.error('Audit log error:', err))
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
}

// ============================================================================
// TYPE EXTENSIONS
// ============================================================================

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    roleId: number
    roleName: string
    permissions: string[]
    storeId: string | null
    storeName: string | null
    requiresPasswordChange?: boolean
    mfaEnabled?: boolean
    requiresMfa?: boolean
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      roleId: number
      roleName: string
      permissions: string[]
      storeId: string | null
      storeName: string | null
      requiresPasswordChange: boolean
      mfaEnabled: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string
    roleId: number
    roleName: string
    permissions: string[]
    storeId: string | null
    storeName: string | null
    requiresPasswordChange: boolean
    mfaEnabled: boolean
    requiresMfa?: boolean
  }
}