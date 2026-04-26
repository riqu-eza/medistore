// hooks/usePermissions.ts
import { useSession } from "next-auth/react";

export function usePermissions() {
  const { data: session } = useSession();
  
  const hasPermission = (permission: string): boolean => {
    if (!session?.user) return false;
    if (session.user.permissions?.includes("*")) return true;
    return session.user.permissions?.includes(permission) || false;
  };
  
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!session?.user) return false;
    if (session.user.permissions?.includes("*")) return true;
    return permissions.some(p => session.user.permissions?.includes(p));
  };
  
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!session?.user) return false;
    if (session.user.permissions?.includes("*")) return true;
    return permissions.every(p => session.user.permissions?.includes(p));
  };
  
  const hasRole = (roleName: string): boolean => {
    if (!session?.user) return false;
    return session.user.roleName === roleName;
  };
  
  const isAdmin = (): boolean => {
    if (!session?.user) return false;
    return session.user.permissions?.includes("*") || session.user.roleName === "admin";
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
    permissions: session?.user?.permissions || [],
    role: session?.user?.roleName,
  };
}