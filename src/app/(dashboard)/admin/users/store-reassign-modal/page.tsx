'use client'

import { useState, useEffect } from 'react'

export default function StoreReassignModal({ user, onClose, onSuccess }: any) {
  const [stores, setStores] = useState<any[]>([])
  const [selectedStore, setSelectedStore] = useState(user.storeId || '')

  useEffect(() => {
    async function loadStores() {
      const res = await fetch('/api/stores')
      const data = await res.json()
      setStores(data.data)
    }
    loadStores()
  }, [])

  async function handleSave() {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: selectedStore || null }),
    })

    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96 space-y-4">
        <h2 className="text-lg font-semibold">Reassign Store</h2>

        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Global (No Store)</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}