// ============================================================================
// EMAIL SERVICE - Complete Implementation
// File: src/lib/email.ts
// ============================================================================

import sgMail from '@sendgrid/mail'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

// Initialize SendGrid
if (process.env.EMAIL_PROVIDER === 'sendgrid') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')
}

// ============================================================================
// TYPES
// ============================================================================

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  cc?: string[]
  bcc?: string[]
  attachments?: Array<{
    content: string
    filename: string
    type?: string
  }>
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export const EmailTemplates = {
  welcome: (name: string, verifyUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to PharmaTrace</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>Welcome to PharmaTrace - Your Pharmaceutical Traceability System.</p>
          <p>To get started, please verify your email address:</p>
          <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link:</p>
          <p style="word-break: break-all; color: #2563eb;">${verifyUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} PharmaTrace. All rights reserved.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  passwordReset: (name: string, resetUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>You requested to reset your password for your PharmaTrace account.</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link:</p>
          <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>Never share this link with anyone</li>
              <li>PharmaTrace will never ask for your password</li>
            </ul>
          </div>
          <p>If you didn't request this, please ignore this email or contact support if you're concerned.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} PharmaTrace. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  passwordChanged: (name: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Password Changed Successfully</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your password has been changed successfully.</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <div class="warning">
            <strong>⚠️ Didn't change your password?</strong>
            <p>If you didn't make this change, please contact support immediately at support@pharmatrace.com</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} PharmaTrace. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  accountLocked: (name: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .alert { background: #fef2f2; border: 2px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Account Locked</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <div class="alert">
            <strong>⚠️ Your account has been locked</strong>
            <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
          </div>
          <h3>What happened?</h3>
          <p>We detected 5 or more failed login attempts on your account. As a security measure, we've temporarily locked your account.</p>
          <h3>What should you do?</h3>
          <ul>
            <li>Wait 30 minutes for automatic unlock</li>
            <li>Or contact your administrator to unlock immediately</li>
            <li>If you didn't attempt to login, report this immediately</li>
          </ul>
          <p><strong>Need help?</strong> Contact: support@pharmatrace.com</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} PharmaTrace. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  mfaEnabled: (name: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .success { background: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Two-Factor Authentication Enabled</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <div class="success">
            <strong>✓ Success!</strong>
            <p>Two-factor authentication has been enabled on your account.</p>
          </div>
          <p>Your account is now more secure. You'll need both your password and a verification code to sign in.</p>
          <h3>Important:</h3>
          <ul>
            <li>Keep your backup codes in a safe place</li>
            <li>Don't share your authentication codes</li>
            <li>Contact support if you lose access to your authenticator</li>
          </ul>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} PharmaTrace. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
}

// ============================================================================
// SEND EMAIL FUNCTION
// ============================================================================

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const provider = process.env.EMAIL_PROVIDER || 'sendgrid'

    if (provider === 'sendgrid') {
      return await sendViaSendGrid(options)
    } else if (provider === 'ses') {
      return await sendViaSES(options)
    } else if (provider === 'smtp') {
      return await sendViaSMTP(options)
    }

    throw new Error(`Unsupported email provider: ${provider}`)
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
}

// ============================================================================
// SENDGRID IMPLEMENTATION
// ============================================================================

async function sendViaSendGrid(options: EmailOptions): Promise<boolean> {
  const msg = {
    to: options.to,
    from: options.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@pharmatrace.com',
    subject: options.subject,
    html: options.html,
    text: options.text,
    cc: options.cc,
    bcc: options.bcc,
    attachments: options.attachments,
  }

  await sgMail.send(msg)
  return true
}

// ============================================================================
// AWS SES IMPLEMENTATION
// ============================================================================

async function sendViaSES(options: EmailOptions): Promise<boolean> {
  // Implementation for AWS SES
  // npm install @aws-sdk/client-ses

  const client = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })

  const command = new SendEmailCommand({
    Source: options.from || process.env.AWS_SES_FROM_EMAIL,
    Destination: {
      ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
      CcAddresses: options.cc,
      BccAddresses: options.bcc,
    },
    Message: {
      Subject: {
        Data: options.subject,
      },
      Body: {
        Html: {
          Data: options.html,
        },
        Text: options.text ? {
          Data: options.text,
        } : undefined,
      },
    },
  })

  await client.send(command)
  return true
}

// ============================================================================
// SMTP IMPLEMENTATION
// ============================================================================

async function sendViaSMTP(options: EmailOptions): Promise<boolean> {
  // Implementation for generic SMTP
  // npm install nodemailer

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  await transporter.sendMail({
    from: options.from || process.env.SMTP_FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    cc: options.cc,
    bcc: options.bcc,
    attachments: options.attachments,
  })

  return true
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function sendWelcomeEmail(userId: string, email: string, name: string) {
  const verifyToken = crypto.randomBytes(32).toString('hex')
  const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verifyToken}`

  await sendEmail({
    to: email,
    subject: 'Welcome to PharmaTrace',
    html: EmailTemplates.welcome(name, verifyUrl),
  })
}

export async function sendPasswordResetEmail(email: string, name: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - PharmaTrace',
    html: EmailTemplates.passwordReset(name, resetUrl),
  })
}

export async function sendPasswordChangedEmail(email: string, name: string) {
  await sendEmail({
    to: email,
    subject: 'Password Changed - PharmaTrace',
    html: EmailTemplates.passwordChanged(name),
  })
}

export async function sendAccountLockedEmail(email: string, name: string) {
  await sendEmail({
    to: email,
    subject: 'Account Locked - PharmaTrace',
    html: EmailTemplates.accountLocked(name),
  })
}

export async function sendMfaEnabledEmail(email: string, name: string) {
  await sendEmail({
    to: email,
    subject: 'Two-Factor Authentication Enabled - PharmaTrace',
    html: EmailTemplates.mfaEnabled(name),
  })
}