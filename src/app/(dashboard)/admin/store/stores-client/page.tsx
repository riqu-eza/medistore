/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  CubeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'

interface Store {
  id: string
  name: string
  code: string
  storeType: 'cold' | 'general' | 'controlled' | 'receiving'
  temperatureMin: number | null
  temperatureMax: number | null
  humidityMin: number | null
  humidityMax: number | null
  totalCapacity: number | null
  currentUtilization: number | null
  allowsControlled: boolean
  allowsDispatch: boolean
  isReceivingZone: boolean
  isActive: boolean
  manager: {
    id: string
    name: string
    email: string
  } | null
  parentStore: {
    id: string
    name: string
    code: string
  } | null
  _count: {
    users: number
    inventory: number
    batches: number
  }
}

export default function StoresClient() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Fixed useEffect dependency array - now depends on pagination.page, filters, and search
  useEffect(() => {
    loadStores()
  }, [pagination.page, pagination.limit, searchTerm, typeFilter, statusFilter])

  async function loadStores() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter !== 'all' && { storeType: typeFilter }),
        ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' ? 'true' : 'false' }),
      })

      const res = await fetch(`/api/admin/stores?${params}`)
      const data = await res.json()
      setStores(data.stores || [])
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false
      })
    } catch (error) {
      console.error('Failed to load stores:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteStore(id: string) {
    try {
      const res = await fetch(`/api/admin/stores/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      
      if (data.deactivated) {
        // You could add a toast notification here
        console.log('Store deactivated instead of deleted')
      }
      
      setShowDeleteConfirm(null)
      loadStores()
    } catch (error) {
      console.error('Failed to delete store:', error)
    }
  }

  async function toggleStoreStatus(id: string, currentStatus: boolean) {
    try {
      await fetch(`/api/admin/stores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      loadStores()
    } catch (error) {
      console.error('Failed to toggle store status:', error)
    }
  }

  const handleSort = (key: string) => {
    const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    setSortConfig({ key, direction: newDirection })
    
    // Sort locally
    const sorted = [...stores].sort((a, b) => {
      const multiplier = newDirection === 'asc' ? 1 : -1
      
      switch (key) {
        case 'name':
          return a.name.localeCompare(b.name) * multiplier
        case 'code':
          return a.code.localeCompare(b.code) * multiplier
        case 'storeType':
          return a.storeType.localeCompare(b.storeType) * multiplier
        case 'users':
          return (a._count.users - b._count.users) * multiplier
        case 'inventory':
          return (a._count.inventory - b._count.inventory) * multiplier
        default:
          return 0
      }
    })
    
    setStores(sorted)
  }

  const getStoreTypeIcon = (type: string) => {
    switch (type) {
      case 'cold':
        return '❄️'
      case 'general':
        return '🏢'
      case 'controlled':
        return '🔒'
      case 'receiving':
        return '📦'
      default:
        return '🏪'
    }
  }

  const getStoreTypeColor = (type: string) => {
    switch (type) {
      case 'cold':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200'
      case 'general':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'controlled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'receiving':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200'
    }
  }

  const getTemperatureStatus = (store: Store) => {
    if (!store.temperatureMin && !store.temperatureMax) return null
    
    return (
      <div className="flex items-center text-xs text-gray-500">
        {/* <ThermometerIcon className="w-3 h-3 mr-1" /> */}
        {store.temperatureMin && store.temperatureMax 
          ? `${store.temperatureMin}°C - ${store.temperatureMax}°C`
          : store.temperatureMin 
          ? `Min: ${store.temperatureMin}°C`
          : `Max: ${store.temperatureMax}°C`
        }
      </div>
    )
  }

  const getCapacityBar = (store: Store) => {
    if (!store.totalCapacity || !store.currentUtilization) return null
    
    const percentage = store.currentUtilization
    const color = percentage > 90 ? 'bg-red-500' : percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
        <div 
          className={`${color} h-1.5 rounded-full`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }

  if (loading && stores.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading stores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search stores by name or code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-700"
          >
            <FunnelIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Filters</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={loadStores}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="Refresh"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                >
                  <option value="all">All Types</option>
                  <option value="cold">Cold Storage</option>
                  <option value="general">General</option>
                  <option value="controlled">Controlled Substances</option>
                  <option value="receiving">Receiving Zone</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setTypeFilter('all')
                    setStatusFilter('all')
                    setSearchTerm('')
                    setPagination(prev => ({ ...prev, page: 1 }))
                    loadStores()
                  }}
                  className="px-4 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stores Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center gap-1">
                    Code
                    {sortConfig.key === 'code' && (
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Store
                    {sortConfig.key === 'name' && (
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('storeType')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortConfig.key === 'storeType' && (
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conditions
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('users')}
                >
                  <div className="flex items-center gap-1">
                    Users
                    {sortConfig.key === 'users' && (
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('inventory')}
                >
                  <div className="flex items-center gap-1">
                    Inventory
                    {sortConfig.key === 'inventory' && (
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {store.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                        {getStoreTypeIcon(store.storeType)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{store.name}</div>
                        {store.manager && (
                          <div className="text-xs text-gray-500">
                            Manager: {store.manager.name}
                          </div>
                        )}
                        {store.parentStore && (
                          <div className="text-xs text-gray-400">
                            Parent: {store.parentStore.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full border ${getStoreTypeColor(store.storeType)}`}>
                      {store.storeType.charAt(0).toUpperCase() + store.storeType.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {getTemperatureStatus(store)}
                      {store.allowsControlled && (
                        <div className="flex items-center text-xs text-red-600">
                          <ShieldCheckIcon className="w-3 h-3 mr-1" />
                          Controlled Allowed
                        </div>
                      )}
                      {store.isReceivingZone && (
                        <div className="flex items-center text-xs text-green-600">
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Receiving Zone
                        </div>
                      )}
                      {getCapacityBar(store)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <UserGroupIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{store._count.users}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <CubeIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{store._count.inventory}</span>
                      {store._count.batches > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({store._count.batches} batches)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {store.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleSolid className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <XCircleIcon className="w-3 h-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/store/${store.id}`}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                        title="View details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/store/${store.id}/edit`}
                        className="p-2 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-all"
                        title="Edit store"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => toggleStoreStatus(store.id, store.isActive)}
                        className={`p-2 rounded-lg transition-all ${
                          store.isActive
                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                        title={store.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {store.isActive ? (
                          <XCircleIcon className="w-4 h-4" />
                        ) : (
                          <CheckCircleIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(store.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                        title="Delete store"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm === store.id && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md">
                          <div className="flex items-center gap-3 text-red-600 mb-4">
                            <ExclamationTriangleIcon className="w-8 h-8" />
                            <h3 className="text-lg font-semibold">Confirm Deletion</h3>
                          </div>
                          <p className="text-gray-600 mb-4">
                            Are you sure you want to delete {store.name}? 
                            {store._count.inventory > 0 && (
                              <span className="block mt-2 text-sm text-orange-600">
                                Note: This store has inventory and will be deactivated instead of deleted.
                              </span>
                            )}
                          </p>
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteStore(store.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View - Mobile */}
      <div className="md:hidden space-y-4">
        {stores.map((store) => (
          <div key={store.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
                    {getStoreTypeIcon(store.storeType)}
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-semibold text-gray-900">{store.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {store.code}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStoreTypeColor(store.storeType)}`}>
                        {store.storeType}
                      </span>
                    </div>
                  </div>
                </div>
                {store.isActive ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm bg-gray-50 p-3 rounded-lg">
                <div>
                  <span className="text-gray-500 block text-xs">Manager</span>
                  <span className="font-medium text-gray-900">
                    {store.manager?.name || 'Not assigned'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Users</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    <UserGroupIcon className="w-4 h-4 text-gray-500" />
                    {store._count.users}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Inventory</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    <CubeIcon className="w-4 h-4 text-gray-500" />
                    {store._count.inventory} items
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Temperature</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    {/* <ThermometerIcon className="w-4 h-4 text-gray-500" /> */}
                    {store.temperatureMin && store.temperatureMax 
                      ? `${store.temperatureMin}°-${store.temperatureMax}°C`
                      : 'Not set'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <Link
                  href={`/admin/store/${store.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                >
                  <EyeIcon className="w-4 h-4" />
                  View
                </Link>
                <Link
                  href={`/admin/store/${store.id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </Link>
                <button
                  onClick={() => toggleStoreStatus(store.id, store.isActive)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                    store.isActive
                      ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                      : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                  }`}
                >
                  {store.isActive ? (
                    <>
                      <XCircleIcon className="w-4 h-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Activate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.hasPreviousPage}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.hasNextPage}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                  disabled={!pagination.hasPreviousPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPreviousPage}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                  const pageNum = pagination.page + i - 2
                  if (pageNum < 1 || pageNum > pagination.totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pagination.page === pageNum
                          ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stores.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
            <BuildingStorefrontIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No stores found</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No stores match your current filters. Try adjusting your search criteria.'
              : 'Get started by creating your first store.'}
          </p>
          {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setTypeFilter('all')
                setStatusFilter('all')
                setSearchTerm('')
                setPagination(prev => ({ ...prev, page: 1 }))
                loadStores()
              }}
              className="mt-4 px-4 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              <XCircleIcon className="w-4 h-4" />
              Clear all filters
            </button>
          )}
          {!searchTerm && typeFilter === 'all' && statusFilter === 'all' && (
            <Link
              href="/admin/store/create"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add New Store
            </Link>
          )}
        </div>
      )}
    </div>
  )
}