import { TOTP } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

// ============================================================================
const MFA_ISSUER = process.env.MFA_ISSUER || "PharmaTrace";
const MFA_WINDOW = 1; // steps before and after

// ============================================================================
const totp = new TOTP();  // <-- instantiate a TOTP instance

totp.options = {
  step: 30,          // 30 seconds per token
  window: MFA_WINDOW, // allow 1 step before/after
};

// ============================================================================
export async function generateMfaSecret(userId: string, userEmail: string) {
  const secret = totp.generateSecret(); // works on instance now

  // otpauth URL
  const otpauth = totp.keyuri(userEmail, MFA_ISSUER, secret);

  // QR code
  const qrCode = await QRCode.toDataURL(otpauth);

  return { secret, qrCode, otpauth };
}

export async function enableMfa(userId: string, secret: string, verificationCode: string) {
  const isValid = totp.check(verificationCode, secret); // verify code

  if (!isValid) throw new Error("Invalid verification code");

  const encryptedSecret = encrypt(secret);

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true, mfaSecret: encryptedSecret },
  });

  await prisma.auditLog.create({
    data: { userId, action: "mfa_enabled", entityType: "User", entityId: userId },
  });

  return true;
}

export async function disableMfa(userId: string, verificationCode: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaEnabled || !user.mfaSecret) throw new Error("MFA is not enabled");

  const secret = decrypt(user.mfaSecret);
  const isValid = totp.check(verificationCode, secret);
  if (!isValid) throw new Error("Invalid verification code");

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  await prisma.auditLog.create({
    data: { userId, action: "mfa_disabled", entityType: "User", entityId: userId },
  });

  return true;
}

export function verifyTOTP(encryptedSecret: string, token: string): boolean {
  try {
    const secret = decrypt(encryptedSecret);
    return totp.check(token, secret);
  } catch (err) {
    console.error("MFA verification error:", err);
    return false;
  }
}
