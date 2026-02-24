'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BuildingStorefrontIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserGroupIcon,
  UsersIcon,
  PlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  BeakerIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'

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
  address: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  } | null
  parentStoreId: string | null
  managerId: string | null
  allowedDrugTypes: string[] | null
  operatingHours: any | null
  temperatureSensorId: string | null
  humiditySensorId: string | null
  notes: string | null
  manager?: {
    id: string
    name: string
    email: string
  } | null
  parentStore?: {
    id: string
    name: string
    code: string
  } | null
  users?: Array<{
    id: string
    name: string
    email: string
    role: {
      displayName: string
    }
  }>
}

interface User {
  id: string
  name: string
  email: string
  role: {
    name: string
    displayName: string
  }
  storeId: string | null
  isActive: boolean
}

export default function EditStorePage() {
  const params = useParams()
  const router = useRouter()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('basic')
  
  // User management state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [updatingUser, setUpdatingUser] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    storeType: 'general' as 'cold' | 'general' | 'controlled' | 'receiving',
    temperatureMin: '',
    temperatureMax: '',
    humidityMin: '',
    humidityMax: '',
    totalCapacity: '',
    currentUtilization: '',
    allowsControlled: false,
    allowsDispatch: true,
    isReceivingZone: false,
    isActive: true,
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    parentStoreId: '',
    managerId: '',
    temperatureSensorId: '',
    humiditySensorId: '',
    notes: '',
  })

  // Parent stores for dropdown
  const [parentStores, setParentStores] = useState<Array<{ id: string; name: string; code: string }>>([])
  
  // Available managers
  const [potentialManagers, setPotentialManagers] = useState<User[]>([])

  useEffect(() => {
    loadStore()
    loadParentStores()
    loadPotentialManagers()
  }, [params.id])

  async function loadStore() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stores/${params.id}`)
      const data = await res.json()
      setStore(data)
      
      // Populate form data
      setFormData({
        name: data.name || '',
        code: data.code || '',
        storeType: data.storeType || 'general',
        temperatureMin: data.temperatureMin?.toString() || '',
        temperatureMax: data.temperatureMax?.toString() || '',
        humidityMin: data.humidityMin?.toString() || '',
        humidityMax: data.humidityMax?.toString() || '',
        totalCapacity: data.totalCapacity?.toString() || '',
        currentUtilization: data.currentUtilization?.toString() || '',
        allowsControlled: data.allowsControlled || false,
        allowsDispatch: data.allowsDispatch !== false,
        isReceivingZone: data.isReceivingZone || false,
        isActive: data.isActive !== false,
        address: data.address || {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
        },
        parentStoreId: data.parentStoreId || '',
        managerId: data.managerId || '',
        temperatureSensorId: data.temperatureSensorId || '',
        humiditySensorId: data.humiditySensorId || '',
        notes: data.notes || '',
      })
    } catch (error) {
      console.error('Failed to load store:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadParentStores() {
    try {
      const res = await fetch('/api/admin/stores?limit=100')
      const data = await res.json()
      // Filter out current store and get all stores
      setParentStores(data.stores?.filter((s: Store) => s.id !== params.id) || [])
    } catch (error) {
      console.error('Failed to load parent stores:', error)
    }
  }

  async function loadPotentialManagers() {
    try {
      const res = await fetch('/api/admin/users?role=STORE_MANAGER,ADMIN&limit=100')
      const data = await res.json()
      setPotentialManagers(data.users || [])
    } catch (error) {
      console.error('Failed to load potential managers:', error)
    }
  }

  async function loadStoreUsers() {
    setUsersLoading(true)
    try {
      const res = await fetch(`/api/admin/stores/${params.id}/users`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  async function assignUserToStore(userId: string) {
    setUpdatingUser(true)
    try {
      const res = await fetch(`/api/admin/stores/${params.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'assign' }),
      })

      if (res.ok) {
        await loadStoreUsers()
      }
    } catch (error) {
      console.error('Failed to assign user:', error)
    } finally {
      setUpdatingUser(false)
    }
  }

  async function removeUserFromStore(userId: string) {
    setUpdatingUser(true)
    try {
      const res = await fetch(`/api/admin/stores/${params.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'remove' }),
      })

      if (res.ok) {
        await loadStoreUsers()
      }
    } catch (error) {
      console.error('Failed to remove user:', error)
    } finally {
      setUpdatingUser(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (name.startsWith('address.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }))
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    try {
      // Prepare data for API
      const submitData: any = {
        name: formData.name,
        code: formData.code,
        storeType: formData.storeType,
        temperatureMin: formData.temperatureMin ? parseFloat(formData.temperatureMin) : null,
        temperatureMax: formData.temperatureMax ? parseFloat(formData.temperatureMax) : null,
        humidityMin: formData.humidityMin ? parseFloat(formData.humidityMin) : null,
        humidityMax: formData.humidityMax ? parseFloat(formData.humidityMax) : null,
        totalCapacity: formData.totalCapacity ? parseFloat(formData.totalCapacity) : null,
        allowsControlled: formData.allowsControlled,
        allowsDispatch: formData.allowsDispatch,
        isReceivingZone: formData.isReceivingZone,
        isActive: formData.isActive,
        address: formData.address.street || formData.address.city ? formData.address : null,
        parentStoreId: formData.parentStoreId || null,
        managerId: formData.managerId || null,
        temperatureSensorId: formData.temperatureSensorId || null,
        humiditySensorId: formData.humiditySensorId || null,
        notes: formData.notes || null,
      }

      const res = await fetch(`/api/admin/stores/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error) {
          setErrors({ form: data.error })
        }
        return
      }

      // Success - redirect to store details
      router.push(`/admin/stores/${params.id}`)
      router.refresh()
    } catch (error) {
      setErrors({ form: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'basic', name: 'Basic Information', icon: BuildingStorefrontIcon },
    { id: 'environmental', name: 'Environmental',  },
    { id: 'capabilities', name: 'Capabilities', icon: ShieldCheckIcon },
    { id: 'address', name: 'Address', icon: TruckIcon },
    { id: 'users', name: 'User Assignment', icon: UserGroupIcon },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading store details...</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Store not found</p>
          <Link
            href="/admin/stores"
            className="mt-4 inline-flex items-center gap-2 text-purple-600 hover:text-purple-800"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Stores
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/stores/${params.id}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Store: {store.name}</h1>
              <p className="text-sm text-gray-500 mt-1">Code: {store.code}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {/* <tab.icon className={`
                  w-5 h-5 mr-2
                  ${activeTab === tab.id ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'}
                `} /> */}
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {errors.form && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Form Sections */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.code ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Type
                  </label>
                  <select
                    name="storeType"
                    value={formData.storeType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="cold">Cold Storage</option>
                    <option value="controlled">Controlled Substances</option>
                    <option value="receiving">Receiving Zone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Capacity (cubic meters)
                  </label>
                  <input
                    type="number"
                    name="totalCapacity"
                    value={formData.totalCapacity}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Store
                  </label>
                  <select
                    name="parentStoreId"
                    value={formData.parentStoreId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {parentStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} ({store.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Manager
                  </label>
                  <select
                    name="managerId"
                    value={formData.managerId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Not assigned</option>
                    {potentialManagers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Any additional information about this store..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Store is active</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Environmental Tab */}
          {activeTab === 'environmental' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Environmental Conditions</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature Min (°C)
                  </label>
                  <input
                    type="number"
                    name="temperatureMin"
                    value={formData.temperatureMin}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature Max (°C)
                  </label>
                  <input
                    type="number"
                    name="temperatureMax"
                    value={formData.temperatureMax}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Humidity Min (%)
                  </label>
                  <input
                    type="number"
                    name="humidityMin"
                    value={formData.humidityMin}
                    onChange={handleChange}
                    step="1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Humidity Max (%)
                  </label>
                  <input
                    type="number"
                    name="humidityMax"
                    value={formData.humidityMax}
                    onChange={handleChange}
                    step="1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature Sensor ID
                  </label>
                  <input
                    type="text"
                    name="temperatureSensorId"
                    value={formData.temperatureSensorId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., TMP-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Humidity Sensor ID
                  </label>
                  <input
                    type="text"
                    name="humiditySensorId"
                    value={formData.humiditySensorId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., HUM-001"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Capabilities Tab */}
          {activeTab === 'capabilities' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Capabilities</h2>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="allowsControlled"
                    checked={formData.allowsControlled}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Allow Controlled Substances</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Store can hold Schedule I-V controlled drugs. Requires special security measures.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="allowsDispatch"
                    checked={formData.allowsDispatch}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Allow Dispatch Operations</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Store can fulfill orders and dispatch items to customers.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="isReceivingZone"
                    checked={formData.isReceivingZone}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Receiving Zone</span>
                    <p className="text-sm text-gray-500 mt-1">
                      Store can receive goods from suppliers and process GRNs.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="address.postalCode"
                      value={formData.address.postalCode}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Assignment Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">User Assignment</h2>
                <button
                  type="button"
                  onClick={() => {
                    loadStoreUsers()
                    setShowUserModal(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <UsersIcon className="w-4 h-4" />
                  Manage Users
                </button>
              </div>

              {/* Current Users */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-medium text-gray-700">Assigned Users</h3>
                </div>
                <div className="divide-y">
                  {usersLoading ? (
                    <div className="p-8 text-center">
                      <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                    </div>
                  ) : users.filter(u => u.storeId === params.id).length > 0 ? (
                    users.filter(u => u.storeId === params.id).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                            {user.role.displayName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUserFromStore(user.id)}
                          disabled={updatingUser}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="Remove from store"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No users assigned to this store</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Assignment Help */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">About User Assignment</h4>
                <p className="text-sm text-blue-700">
                  Users assigned to this store will have access to this store's inventory and operations.
                  Click "Manage Users" to assign or remove users.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/admin/stores/${params.id}`}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* User Management Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Manage Store Users</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <XCircleIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-6">
                {/* Currently Assigned */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Currently Assigned</h4>
                  <div className="space-y-2">
                    {users.filter(u => u.storeId === params.id).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <button
                          onClick={() => removeUserFromStore(user.id)}
                          disabled={updatingUser}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {users.filter(u => u.storeId === params.id).length === 0 && (
                      <p className="text-center text-gray-500 py-4">No users assigned</p>
                    )}
                  </div>
                </div>

                {/* Available Users */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Available Users</h4>
                  <div className="space-y-2">
                    {users.filter(u => !u.storeId).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                            {user.role.displayName}
                          </span>
                        </div>
                        <button
                          onClick={() => assignUserToStore(user.id)}
                          disabled={updatingUser}
                          className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Assign
                        </button>
                      </div>
                    ))}
                    {users.filter(u => !u.storeId).length === 0 && (
                      <p className="text-center text-gray-500 py-4">No available users</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}