"use client"

import { useEffect, useState } from "react"
import PermissionManager from "@/components/roles/PermissionManager"

export default function RoleDetails({ params }: any) {
  const [role, setRole] = useState<any>(null)

  async function fetchRole() {
    const res = await fetch(`/api/admin/roles/${params.id}`)
    const data = await res.json()
    setRole(data)
  }

  useEffect(() => {
    fetchRole()
  }, [])

  if (!role) return <p className="p-8">Loading...</p>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-xl font-bold">{role.displayName}</h1>

      <PermissionManager role={role} refresh={fetchRole} />
    </div>
  )
}
