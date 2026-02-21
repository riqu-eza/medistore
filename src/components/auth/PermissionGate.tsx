
'use client'

import { usePermission, useAnyPermission, useAllPermissions } from '@/hooks/use-auth'

interface PermissionGateProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
}

export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const hasSinglePermission = usePermission(permission || '')
  const hasAny = useAnyPermission(permissions || [])
  const hasAll = useAllPermissions(permissions || [])

  // Check single permission
  if (permission && !hasSinglePermission) {
    return <>{fallback}</>
  }

  // Check multiple permissions
  if (permissions) {
    const hasAccess = requireAll ? hasAll : hasAny
    if (!hasAccess) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}