// ============================================================================
// AUTH SERVICE - Server-Side Business Logic (UPDATED)
// File: src/server/services/auth.service.ts
// ============================================================================

import { hash, compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/crypto'
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAccountLockedEmail,
  sendUserCreatedEmail,
} from '@/lib/email'
import type { User, Role } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export interface RegisterUserInput {
  email: string
  password: string
  name: string
  phone?: string
  roleId: number
  storeId?: string
  createdBy: string // Required - admin ID
}

export interface UserWithRole extends User {
  role: Role
}

export interface ChangePasswordInput {
  userId: string
  currentPassword: string
  newPassword: string
}

export interface ResetPasswordInput {
  token: string
  newPassword: string
}

// ============================================================================
// AUTH SERVICE
// ============================================================================

export class AuthService {
  /**
   * Register a new user (ADMIN ONLY)
   */
  static async register(input: RegisterUserInput): Promise<UserWithRole> {
    // 1. Validate email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    })

    if (existingUser) {
      throw new Error('Email already registered')
    }

    // 2. Validate password strength
    const passwordValidation = validatePassword(input.password)
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    // 3. Verify createdBy user exists and is admin
    const admin = await prisma.user.findUnique({
      where: { id: input.createdBy },
      include: { role: true },
    })

    if (!admin) {
      throw new Error('Admin user not found')
    }

    const isAdmin = (admin.role.permissions as string[]).includes('*')
    if (!isAdmin) {
      throw new Error('Only administrators can create users')
    }

    // 4. Hash password
    const passwordHash = await hash(input.password, 12)

    // 5. Create user
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        phone: input.phone,
        roleId: input.roleId,
        storeId: input.storeId,
        passwordChangedAt: new Date(),
        lastPasswordChange: new Date(),
        createdBy: input.createdBy,
      },
      include: {
        role: true,
        store: true,
      },
    })

    // 6. Create audit log
    await prisma.auditLog.create({
      data: {
        userId: input.createdBy,
        action: 'user_created',
        entityType: 'User',
        entityId: user.id,
        afterValue: {
          email: user.email,
          name: user.name,
          role: user.role.name,
          createdBy: input.createdBy,
        },
      },
    })

    // 7. Send welcome email to the new user (non-fatal)
    sendWelcomeEmail(user.email, user.name, user.id).catch((err) =>
      console.error('[AuthService] Welcome email failed:', err.message)
    )

    // 8. Notify the admin that created the user (non-fatal)
    sendUserCreatedEmail(admin.email, admin.name, {
      name: user.name,
      email: user.email,
      role: user.role.name,
    }).catch((err) =>
      console.error('[AuthService] Admin notification email failed:', err.message)
    )

    return user
  }

  /**
   * Change password
   */
  static async changePassword(input: ChangePasswordInput): Promise<void> {
    const { userId, currentPassword, newPassword } = input

    // 1. Get user
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    // 2. Verify current password
    const isValid = await compare(currentPassword, user.passwordHash)
    if (!isValid) throw new Error('Current password is incorrect')

    // 3. Validate new password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    // 4. Check new password differs from current
    const isSamePassword = await compare(newPassword, user.passwordHash)
    if (isSamePassword) {
      throw new Error('New password must be different from current password')
    }

    // 5. Check password history (prevent reuse of last 5)
    if (user.passwordHistory) {
      const history = user.passwordHistory as string[]
      for (const oldHash of history) {
        const isOldPassword = await compare(newPassword, oldHash)
        if (isOldPassword) throw new Error('Cannot reuse recent passwords')
      }
    }

    // 6. Hash new password
    const newPasswordHash = await hash(newPassword, 12)

    // 7. Update password history (keep last 5)
    const passwordHistory = ((user.passwordHistory as string[]) || [])
    passwordHistory.unshift(user.passwordHash)
    const limitedHistory = passwordHistory.slice(0, 5)

    // 8. Persist changes
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        lastPasswordChange: new Date(),
        passwordHistory: limitedHistory,
        failedAttempts: 0,
      },
    })

    // 9. Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'password_changed',
        entityType: 'User',
        entityId: userId,
      },
    })

    // 10. Notification email (non-fatal)
    sendPasswordChangedEmail(user.email, user.name).catch((err) =>
      console.error('[AuthService] Password-changed email failed:', err.message)
    )
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Don't reveal whether the user exists
    if (!user) return

    // Generate a secure token (1-hour expiry)
    const resetToken = (await import('crypto')).randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    })

    // Send via the typed helper (URL is built inside the helper)
    await sendPasswordResetEmail(user.email, user.name, resetToken)

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'password_reset_requested',
        entityType: 'User',
        entityId: user.id,
      },
    })
  }

  /**
   * Reset password with token
   */
  static async resetPassword(input: ResetPasswordInput): Promise<void> {
    const { token, newPassword } = input

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) throw new Error('Invalid or expired reset token')

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    const newPasswordHash = await hash(newPassword, 12)

    const passwordHistory = ((user.passwordHistory as string[]) || [])
    passwordHistory.unshift(user.passwordHash)
    const limitedHistory = passwordHistory.slice(0, 5)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        lastPasswordChange: new Date(),
        passwordHistory: limitedHistory,
        resetToken: null,
        resetTokenExpiry: null,
        failedAttempts: 0,
        isLocked: false,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'password_reset_completed',
        entityType: 'User',
        entityId: user.id,
      },
    })

    // Confirmation email (non-fatal)
    sendPasswordChangedEmail(user.email, user.name).catch((err) =>
      console.error('[AuthService] Password-changed email failed:', err.message)
    )
  }

  /**
   * Unlock user account (admin function)
   */
  static async unlockAccount(userId: string, unlockedBy: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isLocked: false, failedAttempts: 0, lockedAt: null },
    })

    await prisma.auditLog.create({
      data: {
        userId: unlockedBy,
        action: 'account_unlocked',
        entityType: 'User',
        entityId: userId,
      },
    })
  }

  /**
   * Lock account after too many failed attempts
   */
  static async lockAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return

    await prisma.user.update({
      where: { id: userId },
      data: { isLocked: true, lockedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'account_locked',
        entityType: 'User',
        entityId: userId,
      },
    })

    // Notify the user (non-fatal)
    sendAccountLockedEmail(user.email, user.name, user.failedAttempts ?? 5).catch((err) =>
      console.error('[AuthService] Account-locked email failed:', err.message)
    )
  }
}