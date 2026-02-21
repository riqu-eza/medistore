// ============================================================================
// AUTH SERVICE - Server-Side Business Logic (UPDATED)
// File: src/server/services/auth.service.ts
// ============================================================================

import { hash, compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/crypto'
import { sendEmail, sendPasswordChangedEmail } from '@/lib/email'
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
  createdBy: string  // Required - admin ID
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
      include: { role: true }
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
        userId: input.createdBy, // Admin who created the user
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

    return user
  }

  /**
   * Change password
   */
  static async changePassword(input: ChangePasswordInput): Promise<void> {
    const { userId, currentPassword, newPassword } = input

    // 1. Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // 2. Verify current password
    const isValid = await compare(currentPassword, user.passwordHash)
    if (!isValid) {
      throw new Error('Current password is incorrect')
    }

    // 3. Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    // 4. Check if new password is same as current
    const isSamePassword = await compare(newPassword, user.passwordHash)
    if (isSamePassword) {
      throw new Error('New password must be different from current password')
    }

    // 5. Check password history (prevent reuse)
    if (user.passwordHistory) {
      const history = user.passwordHistory as string[]
      for (const oldHash of history) {
        const isOldPassword = await compare(newPassword, oldHash)
        if (isOldPassword) {
          throw new Error('Cannot reuse recent passwords')
        }
      }
    }

    // 6. Hash new password
    const newPasswordHash = await hash(newPassword, 12)

    // 7. Update password history
    const passwordHistory = (user.passwordHistory as string[]) || []
    passwordHistory.unshift(user.passwordHash)
    const limitedHistory = passwordHistory.slice(0, 5) // Keep last 5

    // 8. Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        lastPasswordChange: new Date(),
        passwordHistory: limitedHistory,
        failedAttempts: 0, // Reset on successful change
      },
    })

    // 9. Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'password_changed',
        entityType: 'User',
        entityId: userId,
      },
    })

    // 10. Send notification email
    await this.sendPasswordChangedEmail(userId)
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Don't reveal if user exists
    if (!user) {
      return
    }

    // Generate reset token
    const crypto = await import('crypto')
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date()
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1) // 1 hour

    // Save token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password - PharmaTrace',
      html: `
        <h1>Reset Your Password</h1>
        <p>Hi ${user.name},</p>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    })

    // Create audit log
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

    // Find user by token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token not expired
        },
      },
    })

    if (!user) {
      throw new Error('Invalid or expired reset token')
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`)
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, 12)

    // Update password history
    const passwordHistory = (user.passwordHistory as string[]) || []
    passwordHistory.unshift(user.passwordHash)
    const limitedHistory = passwordHistory.slice(0, 5)

    // Update user
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
        isLocked: false, // Unlock if locked
      },
    })
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'password_reset_completed',
        entityType: 'User',
        entityId: user.id,
      },
    })

    // Send confirmation email
    await this.sendPasswordChangedEmail(user.id)
  }

  /**
   * Unlock user account (admin function)
   */
  static async unlockAccount(userId: string, unlockedBy: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: false,
        failedAttempts: 0,
        lockedAt: null,
      },
    })

    // Create audit log
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
   * Send password changed email
   */
  private static async sendPasswordChangedEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) return

    await sendPasswordChangedEmail(user.email, user.name)
  }
}