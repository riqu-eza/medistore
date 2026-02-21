"use client"

import { useEffect, useState } from "react"
import RoleTable from "@/components/roles/RoleTable"
import RoleForm from "@/components/roles/RoleForm"
import RoleTree from "@/components/roles/RoleTree"

export default function RolesPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function fetchRoles() {
    setLoading(true)
    const res = await fetch("/api/admin/roles")
    const data = await res.json()
    setRoles(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Role Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Role
        </button>
      </div>

      {showForm && (
        <RoleForm
          onSuccess={() => {
            fetchRoles()
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <RoleTable roles={roles} refresh={fetchRoles} />
          <RoleTree />
        </>
      )}
    </div>
  )
}
