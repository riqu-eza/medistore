// ============================================================================
// EMAIL SERVICE - Production (Gmail App Password)
// File: src/lib/email.ts
// ============================================================================

import nodemailer, { Transporter, SendMailOptions } from "nodemailer";

// ============================================================================
// HOW TO GET YOUR CREDENTIALS
//
//   GMAIL_USER        → your Gmail address e.g. vickymuthunga@gmail.com
//   GMAIL_APP_PASSWORD → 16-char App Password (NOT your Gmail login password)
//
//   Steps to create an App Password:
//     1. myaccount.google.com → Security
//     2. Turn on 2-Step Verification (mandatory)
//     3. Search "App passwords" in the search bar
//     4. Choose app: Mail, device: Other → give it a name → Generate
//     5. Copy the 16-char code into your .env (spaces are fine)
//
//   .env example:
//     GMAIL_USER=vickymuthunga@gmail.com
//     GMAIL_APP_PASSWORD=phao chdg beqx cgla
//     EMAIL_FROM=PharmaTrace <vickymuthunga@gmail.com>
//     NEXTAUTH_URL=https://yourdomain.com
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface SendEmailOptions {
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  headers?: Record<string, string>;
  bookingId?: string;
  inReplyTo?: string;
  attachments?: SendMailOptions["attachments"];
}

export interface SendResult {
  messageId: string;
}

// ============================================================================
// SINGLETON TRANSPORTER
// Created once, reused for every email — no new connection per send.
// ============================================================================

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "[Email] Missing credentials. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file."
    );
  }

  _transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: { user, pass },
  });

  // Verify once at startup — warns but doesn't crash the app
  _transporter.verify((err) => {
    if (err) console.error("[Email] Gmail connection error:", err.message);
    else console.log("[Email] Gmail transporter ready ✓");
  });

  return _transporter;
}

// ============================================================================
// RETRY WRAPPER  (3 attempts, 1s / 2s / 3s back-off)
// ============================================================================

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = attempt * 1000;
        console.warn(`[Email] Attempt ${attempt} failed — retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ============================================================================
// PLAIN-TEXT FALLBACK
// ============================================================================

function toPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ============================================================================
// CORE SEND FUNCTION
// ============================================================================

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  options: SendEmailOptions = {}
): Promise<SendResult> {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.GMAIL_USER!;

  const mailOptions: SendMailOptions = {
    from,
    to,
    subject,
    html,
    text: toPlainText(html),
    replyTo: options.replyTo || from,
    cc: options.cc,
    bcc: options.bcc,
    attachments: options.attachments,
    headers: {
      ...(options.headers || {}),
      ...(options.bookingId ? { "X-Booking-ID": options.bookingId } : {}),
      ...(options.inReplyTo
        ? { "In-Reply-To": options.inReplyTo, References: options.inReplyTo }
        : {}),
    },
  };

  try {
    const info = await withRetry(() => transporter.sendMail(mailOptions));
    const dest = Array.isArray(to) ? to.join(", ") : to;
    console.log(`[Email] ✓ Sent to ${dest} | messageId: ${info.messageId}`);
    return { messageId: info.messageId };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Email] ✗ Delivery failed:", msg);
    throw new Error(`Email delivery failed: ${msg}`);
  }
}

// ============================================================================
// EMAIL TEMPLATES (inline — no extra file needed)
// ============================================================================

const year = new Date().getFullYear();

const base = (accentColor: string, headerText: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;color:#1a1a2e}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.09)}
  .hd{background:${accentColor};padding:28px 36px;text-align:center;color:#fff}
  .hd small{display:block;font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.75;margin-bottom:6px}
  .hd h1{margin:0;font-size:20px;font-weight:700}
  .bd{padding:36px}
  .bd h2{margin:0 0 12px;font-size:18px}
  .bd p{color:#4a5568;font-size:14px;line-height:1.7;margin:0 0 14px}
  .btn{display:inline-block;padding:13px 30px;background:${accentColor};color:#fff;text-decoration:none;border-radius:7px;font-weight:600;font-size:14px;margin:4px 0 20px}
  .url{background:#f7f9fc;border:1px solid #e2e8f0;border-radius:5px;padding:10px 14px;font-size:12px;color:#718096;word-break:break-all;margin-bottom:20px}
  .info{background:#f7f9fc;border-left:4px solid ${accentColor};border-radius:0 6px 6px 0;padding:14px 18px;margin:16px 0;font-size:13px;color:#2d3748}
  .warn{background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 6px 6px 0;padding:14px 18px;margin:16px 0;font-size:13px;color:#991b1b}
  .warn a{color:#dc2626}
  ul{padding-left:20px;color:#4a5568;font-size:14px;line-height:2}
  hr{border:none;border-top:1px solid #e8ecf0;margin:24px 0}
  .ft{background:#f7f9fc;padding:20px 36px;text-align:center;font-size:11px;color:#a0aec0;line-height:1.8}
  .ft a{color:#718096;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd"><small>PharmaTrace</small><h1>${headerText}</h1></div>
  <div class="bd">${body}</div>
  <div class="ft">
    © ${year} PharmaTrace · Pharmaceutical Traceability System<br/>
    <a href="mailto:support@pharmatrace.com">support@pharmatrace.com</a>
  </div>
</div>
</body>
</html>`;

export const EmailTemplates = {
  welcome: (name: string, verifyUrl: string) =>
    base("#2563eb", "Welcome aboard 🎉", `
      <h2>Hello, ${name}!</h2>
      <p>Your PharmaTrace account is ready. Please verify your email to activate it.</p>
      <p style="text-align:center"><a href="${verifyUrl}" class="btn">Verify Email Address</a></p>
      <p style="font-size:13px;color:#718096;margin-bottom:6px">Or paste this link in your browser:</p>
      <div class="url">${verifyUrl}</div>
      <div class="info">⏱ This link expires in <strong>24 hours</strong>.</div>
    `),

  passwordReset: (name: string, resetUrl: string) =>
    base("#dc2626", "Password Reset", `
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your password. Click below to choose a new one.</p>
      <p style="text-align:center"><a href="${resetUrl}" class="btn">Reset My Password</a></p>
      <p style="font-size:13px;color:#718096;margin-bottom:6px">Or paste this link in your browser:</p>
      <div class="url">${resetUrl}</div>
      <div class="warn">
        <strong>⚠️ Security reminders</strong>
        <ul>
          <li>Link expires in <strong>1 hour</strong></li>
          <li>Never share this link with anyone</li>
          <li>We will never ask for your password</li>
        </ul>
      </div>
      <p>Didn't request this? You can safely ignore this email.</p>
    `),

  passwordChanged: (name: string) =>
    base("#059669", "✓ Password Updated", `
      <h2>Hi ${name},</h2>
      <p>Your password was changed successfully.</p>
      <div class="info">🕐 <strong>When:</strong> ${new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</div>
      <div class="warn">
        <strong>⚠️ Didn't make this change?</strong>
        <p style="margin-top:8px">Contact us immediately at <a href="mailto:support@pharmatrace.com">support@pharmatrace.com</a></p>
      </div>
    `),

  accountLocked: (name: string, failedAttempts = 5) =>
    base("#7c3aed", "🔒 Account Locked", `
      <h2>Hi ${name},</h2>
      <div class="info">Your account was locked after <strong>${failedAttempts} failed login attempts</strong>.</div>
      <p>As a security measure, access has been temporarily restricted.</p>
      <hr/>
      <p><strong>What you can do:</strong></p>
      <ul>
        <li>Wait <strong>30 minutes</strong> — it unlocks automatically</li>
        <li>Ask your administrator to unlock it immediately</li>
        <li>Use password reset if you've forgotten your credentials</li>
      </ul>
      <hr/>
      <p style="font-size:13px;color:#718096">Didn't attempt to log in? Report this at <a href="mailto:support@pharmatrace.com" style="color:#7c3aed">support@pharmatrace.com</a></p>
    `),

  mfaEnabled: (name: string) =>
    base("#0891b2", "🔐 2FA Enabled", `
      <h2>Hi ${name},</h2>
      <div class="info">✓ Two-factor authentication is now active on your account.</div>
      <p>You'll need your password <em>and</em> a code from your authenticator app each time you sign in.</p>
      <hr/>
      <ul>
        <li>Store your backup codes somewhere safe and offline</li>
        <li>Never share one-time codes with anyone</li>
        <li>Lost your authenticator? Contact support before you're locked out</li>
      </ul>
    `),

  userCreated: (adminName: string, newUser: { name: string; email: string; role: string }) =>
    base("#2563eb", "New User Created", `
      <h2>Hi ${adminName},</h2>
      <p>A new user account has been created successfully.</p>
      <div class="info">
        👤 <strong>Name:</strong> ${newUser.name}<br/>
        📧 <strong>Email:</strong> ${newUser.email}<br/>
        🏷 <strong>Role:</strong> ${newUser.role}
      </div>
      <p style="font-size:13px;color:#718096">They'll receive a welcome email with instructions to verify their address.</p>
    `),
};

// ============================================================================
// NAMED HELPERS  (call these from services — never call sendEmail() directly)
// ============================================================================

export async function sendWelcomeEmail(
  email: string,
  name: string,
  verifyToken: string
): Promise<SendResult> {
  const url = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verifyToken}`;
  return sendEmail(email, "Welcome to PharmaTrace — Verify Your Email", EmailTemplates.welcome(name, url));
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<SendResult> {
  const url = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
  return sendEmail(email, "Reset Your Password — PharmaTrace", EmailTemplates.passwordReset(name, url));
}

export async function sendPasswordChangedEmail(
  email: string,
  name: string
): Promise<SendResult> {
  return sendEmail(email, "Your Password Was Changed — PharmaTrace", EmailTemplates.passwordChanged(name));
}

export async function sendAccountLockedEmail(
  email: string,
  name: string,
  failedAttempts = 5
): Promise<SendResult> {
  return sendEmail(email, "Account Locked — PharmaTrace", EmailTemplates.accountLocked(name, failedAttempts));
}

export async function sendMfaEnabledEmail(email: string, name: string): Promise<SendResult> {
  return sendEmail(email, "Two-Factor Authentication Enabled — PharmaTrace", EmailTemplates.mfaEnabled(name));
}

export async function sendUserCreatedEmail(
  adminEmail: string,
  adminName: string,
  newUser: { name: string; email: string; role: string }
): Promise<SendResult> {
  return sendEmail(
    adminEmail,
    `New User Created: ${newUser.name} — PharmaTrace`,
    EmailTemplates.userCreated(adminName, newUser)
  );
}