/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  mfaCode: z.string().optional(),
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig, // ← spreads pages, session, callbacks, debug

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          const validatedFields = loginSchema.safeParse(credentials);
          if (!validatedFields.success) return null;

          const { email, password, mfaCode } = validatedFields.data;

          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
              role: { select: { id: true, name: true, permissions: true } },
              store: { select: { id: true, name: true, code: true } },
            },
          });

          if (!user) {
            console.log("Login failed: User not found");
            return null;
          }

          if (!user.isActive) {
            console.log("Login failed: Account inactive");
            return null;
          }

          if (user.isLocked) {
            const lockDuration = parseInt(
              process.env.ACCOUNT_LOCK_DURATION_MINUTES || "30",
            );
            const lockExpiry = new Date(user.lockedAt || 0);
            lockExpiry.setMinutes(lockExpiry.getMinutes() + lockDuration);

            if (new Date() > lockExpiry) {
              await prisma.user.update({
                where: { id: user.id },
                data: { isLocked: false, failedAttempts: 0, lockedAt: null },
              });
              await prisma.auditLog.create({
                data: {
                  userId: user.id,
                  action: "account_auto_unlocked",
                  entityType: "User",
                  entityId: user.id,
                },
              });
            } else {
              console.log("Login failed: Account locked");
              return null;
            }
          }

          const isPasswordValid = await compare(password, user.passwordHash);
          if (!isPasswordValid) {
            const newFailedAttempts = user.failedAttempts + 1;
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5");
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedAttempts: newFailedAttempts,
                isLocked: newFailedAttempts >= maxAttempts,
                lockedAt: newFailedAttempts >= maxAttempts ? new Date() : null,
              },
            });
            if (newFailedAttempts >= maxAttempts) {
              console.log("Account locked due to failed attempts");
            }
            console.log("Login failed: Invalid password");
            return null;
          }

          // if (user.mfaEnabled) {
          //   if (!mfaCode) {
          //     return { id: user.id, email: user.email, requiresMfa: true } as any
          //   }
          //   const { verifyTOTP } = await import('@/lib/auth/mfa')
          //   const isValidMfa = verifyTOTP(user.mfaSecret!, mfaCode)
          //   if (!isValidMfa) {
          //     console.log('Login failed: Invalid MFA code')
          //     return null
          //   }
          // }

          const passwordMaxAge = parseInt(
            process.env.PASSWORD_MAX_AGE_DAYS || "90",
          );
          const passwordAge = user.passwordChangedAt
            ? Math.floor(
                (Date.now() - user.passwordChangedAt.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 999;
          const requiresPasswordChange = passwordAge > passwordMaxAge;

          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lastLogin: new Date() },
          });

          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "login",
              entityType: "User",
              entityId: user.id,
              ipAddress: (credentials as any).ip || "unknown",
              userAgent: (credentials as any).userAgent || "unknown",
            },
          });

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
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  events: {
    async signOut(params) {
      const token = "token" in params ? params.token : null;
      if (token?.id) {
        await prisma.auditLog
          .create({
            data: {
              userId: token.id as string,
              action: "logout",
              entityType: "User",
              entityId: token.id as string,
            },
          })
          .catch((err) => console.error("Audit log error:", err));
      }
    },
  },
});

// ── Helper functions ──────────────────────────────────────────────────────────

export async function getSession() {
  return await auth();
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function isAuthenticated() {
  const session = await auth();
  return !!session?.user;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return user.permissions.includes(permission);
}

export async function requirePermission(
  permission: string,

) {
  const allowed = await hasPermission(permission);
  if (!allowed) throw new Error(`Permission denied: ${permission}`);
}

export async function hasAnyPermission(
  permissions: string[],
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

export async function hasAllPermissions(
  permissions: string[],
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return permissions.every((p) => user.permissions.includes(p));
}

export async function hasRole(roleName: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.roleName === roleName;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.permissions.includes("*");
}

export async function isStoreUser(storeId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return user.storeId === storeId;
}

export async function getUserStoreId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.storeId) throw new Error("User is not assigned to a store");
  return user.storeId;
}

export async function getStoreFilter() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.permissions.includes("*")) return {};
  if (!user.storeId) throw new Error("User not assigned to a store");
  return { storeId: user.storeId };
}

export async function canAccessStore(storeId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return user.storeId === storeId;
}

export async function requireStoreAccess(storeId: string) {
  const hasAccess = await canAccessStore(storeId);
  if (!hasAccess) throw new Error("Access denied to this store");
}
