"use client"

import { useState } from "react"

export default function PermissionManager({ role, refresh }: any) {
  const [newPermission, setNewPermission] = useState("")

  async function addPermission() {
    await fetch(`/api/admin/roles/${role.id}/permissions/add`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permissions: [newPermission],
      }),
    })
    setNewPermission("")
    refresh()
  }

  async function removePermission(permission: string) {
    await fetch(`/api/admin/roles/${role.id}/permissions/remove`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permissions: [permission],
      }),
    })
    refresh()
  }

  return (
    <div className="bg-white shadow rounded-xl p-6 space-y-4">
      <h2 className="font-semibold">Permissions</h2>

      <div className="flex space-x-2">
        <input
          value={newPermission}
          onChange={(e) => setNewPermission(e.target.value)}
          className="border p-2 rounded w-full"
          placeholder="Add permission"
        />
        <button
          onClick={addPermission}
          className="px-4 bg-green-600 text-white rounded"
        >
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {role.permissions.map((p: string) => (
          <li
            key={p}
            className="flex justify-between items-center border p-2 rounded"
          >
            {p}
            <button
              onClick={() => removePermission(p)}
              className="text-red-600 text-sm"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
