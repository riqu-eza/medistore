"use client"

import { useState } from "react"

export default function RoleForm({ onSuccess, onCancel }: any) {
  const [form, setForm] = useState({
    name: "",
    displayName: "",
    description: "",
    permissions: "",
  })

  async function submit(e: any) {
    e.preventDefault()

    await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        permissions: form.permissions.split(",").map((p) => p.trim()),
      }),
    })

    onSuccess()
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white shadow rounded-xl p-6 space-y-4"
    >
      <input
        placeholder="Role Name"
        className="w-full border p-2 rounded"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        placeholder="Display Name"
        className="w-full border p-2 rounded"
        value={form.displayName}
        onChange={(e) => setForm({ ...form, displayName: e.target.value })}
      />
      <textarea
        placeholder="Description"
        className="w-full border p-2 rounded"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <input
        placeholder="Permissions (comma separated)"
        className="w-full border p-2 rounded"
        value={form.permissions}
        onChange={(e) => setForm({ ...form, permissions: e.target.value })}
      />

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Save
        </button>
      </div>
    </form>
  )
}
