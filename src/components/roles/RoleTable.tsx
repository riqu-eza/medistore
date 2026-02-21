"use client"

import Link from "next/link"

export default function RoleTable({ roles, refresh }: any) {
  async function deleteRole(id: number) {
    if (!confirm("Delete this role?")) return

    await fetch(`/api/admin/roles/${id}`, {
      method: "DELETE",
    })

    refresh()
  }

  return (
    <div className="bg-white shadow rounded-xl overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-4">Name</th>
            <th className="p-4">Display</th>
            <th className="p-4">Users</th>
            <th className="p-4">Active</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role: any) => (
            <tr key={role.id} className="border-t">
              <td className="p-4 font-medium">{role.name}</td>
              <td className="p-4">{role.displayName}</td>
              <td className="p-4">{role._count?.users ?? 0}</td>
              <td className="p-4">
                {role.isActive ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-500">Inactive</span>
                )}
              </td>
              <td className="p-4 text-right space-x-2">
                <Link
                  href={`/admin/roles/${role.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteRole(role.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
