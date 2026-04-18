import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  providers: [], // ← empty, providers live in auth.ts

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800'),
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.roleId = user.roleId
        token.roleName = user.roleName
        token.permissions = user.permissions
        token.storeId = user.storeId
        token.storeName = user.storeName
        token.requiresPasswordChange = user.requiresPasswordChange ?? false
        token.mfaEnabled = user.mfaEnabled ?? false
        token.requiresMfa = user.requiresMfa ?? false
      }
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
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },

  debug: process.env.NODE_ENV === 'development',
}

// ── Type extensions ───────────────────────────────────────────────────────────

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

declare module '@auth/core/jwt' {
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