'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BuildingStorefrontIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  TruckIcon,
  BeakerIcon,
  MapPinIcon,
  ClockIcon,
  WifiIcon,
  DocumentTextIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

interface User {
  id: string
  name: string
  email: string
  role: {
    displayName: string
  }
}

interface Store {
  id: string
  name: string
  code: string
}

export default function CreateStorePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('basic')
  
  // Data for dropdowns
  const [parentStores, setParentStores] = useState<Store[]>([])
  const [potentialManagers, setPotentialManagers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)

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
    operatingHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '', close: '', closed: true },
      sunday: { open: '', close: '', closed: true },
    },
    temperatureSensorId: '',
    humiditySensorId: '',
    notes: '',
  })

  // Load initial data
  useEffect(() => {
    loadParentStores()
    loadPotentialManagers()
  }, [])

  async function loadParentStores() {
    try {
      const res = await fetch('/api/admin/stores?limit=100')
      const data = await res.json()
      setParentStores(data.stores || [])
    } catch (error) {
      console.error('Failed to load parent stores:', error)
    } finally {
      setLoadingData(false)
    }
  }

  async function loadPotentialManagers() {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      
      if (data.success && Array.isArray(data.data)) {
        setPotentialManagers(data.data)
      }
    } catch (error) {
      console.error('Failed to load potential managers:', error)
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
    } else if (name.startsWith('operatingHours.')) {
      const [_, day, field] = name.split('.')
      setFormData(prev => ({
        ...prev,
        operatingHours: {
          ...prev.operatingHours,
          [day]: {
            ...prev.operatingHours[day as keyof typeof prev.operatingHours],
            [field]: type === 'checkbox' ? checked : value,
          },
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Store name is required'
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Store code is required'
    }

    if (!/^[A-Za-z0-9-_]+$/.test(formData.code)) {
      newErrors.code = 'Store code can only contain letters, numbers, hyphens, and underscores'
    }

    if (formData.temperatureMin && formData.temperatureMax) {
      const min = parseFloat(formData.temperatureMin)
      const max = parseFloat(formData.temperatureMax)
      if (min > max) {
        newErrors.temperatureMin = 'Minimum temperature cannot be greater than maximum'
      }
    }

    if (formData.humidityMin && formData.humidityMax) {
      const min = parseFloat(formData.humidityMin)
      const max = parseFloat(formData.humidityMax)
      if (min > max) {
        newErrors.humidityMin = 'Minimum humidity cannot be greater than maximum'
      }
      if (min < 0 || max > 100) {
        newErrors.humidityMin = 'Humidity must be between 0 and 100'
      }
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    setErrors({})

    try {
      // Prepare data for API
      const submitData = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        storeType: formData.storeType,
        temperatureMin: formData.temperatureMin ? parseFloat(formData.temperatureMin) : null,
        temperatureMax: formData.temperatureMax ? parseFloat(formData.temperatureMax) : null,
        humidityMin: formData.humidityMin ? parseFloat(formData.humidityMin) : null,
        humidityMax: formData.humidityMax ? parseFloat(formData.humidityMax) : null,
        totalCapacity: formData.totalCapacity ? parseFloat(formData.totalCapacity) : null,
        currentUtilization: formData.currentUtilization ? parseFloat(formData.currentUtilization) : null,
        allowsControlled: formData.allowsControlled,
        allowsDispatch: formData.allowsDispatch,
        isReceivingZone: formData.isReceivingZone,
        isActive: formData.isActive,
        address: formData.address.street || formData.address.city ? formData.address : null,
        parentStoreId: formData.parentStoreId || null,
        managerId: formData.managerId || null,
        operatingHours: formData.operatingHours,
        temperatureSensorId: formData.temperatureSensorId || null,
        humiditySensorId: formData.humiditySensorId || null,
        notes: formData.notes || null,
      }

      const res = await fetch('/api/admin/stores', {
        method: 'POST',
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

      // Success - redirect to the new store
      router.push(`/admin/store/${data.id}`)
      router.refresh()
    } catch (error) {
      setErrors({ form: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const generateCode = () => {
    const name = formData.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 5)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setFormData(prev => ({ ...prev, code: `${name}${random}` }))
  }

  const tabs = [
    { id: 'basic', name: 'Basic Information', icon: BuildingStorefrontIcon },
    // { id: 'environmental', name: 'Environmental', icon: BeakerIcon },
    // { id: 'capabilities', name: 'Capabilities', icon: ShieldCheckIcon },
    { id: 'location', name: 'Location', icon: MapPinIcon },
    // { id: 'operations', name: 'Operations', icon: ClockIcon },
    // { id: 'iot', name: 'IoT Settings', icon: WifiIcon },
  ]

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading form data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/stores"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Store</h1>
                <p className="text-sm text-gray-500 mt-1">Add a new store location to the system</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/stores"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Create Store
                  </>
                )}
              </button>
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
                <tab.icon className={`
                  w-5 h-5 mr-2
                  ${activeTab === tab.id ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'}
                `} />
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
                    placeholder="e.g., Main Street Pharmacy"
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
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      required
                      placeholder="e.g., MAIN-001"
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        errors.code ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={generateCode}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300"
                    >
                      Generate
                    </button>
                  </div>
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
                    <option value="general">General Storage</option>
                    <option value="cold">Cold Storage</option>
                    <option value="controlled">Controlled Substances</option>
                    <option value="receiving">Receiving Zone</option>
                  </select>
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
                    <option value="">None (Top Level)</option>
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
                    min="0"
                    placeholder="e.g., 1000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
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
                    <span className="text-sm text-gray-700">Store is active (available for operations)</span>
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
                    placeholder="e.g., 2"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.temperatureMin ? 'border-red-500' : 'border-gray-300'
                    }`}
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
                    placeholder="e.g., 8"
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
                    placeholder="e.g., 30"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.humidityMin ? 'border-red-500' : 'border-gray-300'
                    }`}
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
                    placeholder="e.g., 60"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong className="font-medium">Note:</strong> Setting temperature and humidity ranges helps monitor 
                  storage conditions and trigger alerts when values fall outside acceptable ranges.
                </p>
              </div>
            </div>
          )}

          {/* Capabilities Tab */}
          {activeTab === 'capabilities' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Capabilities</h2>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                      Store can hold Schedule I-V controlled drugs. Requires special security measures and compliance.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                      Store can fulfill orders and dispatch items to customers and other facilities.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                      Store can receive goods from suppliers and process Goods Receipt Notes (GRNs).
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Address</h2>
              
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
                    placeholder="123 Main Street, Building A"
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
                      placeholder="Thika"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="NY"
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
                      placeholder="Kenya"
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
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operations Tab */}
          {activeTab === 'operations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h2>
              
              <div className="space-y-4">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-24 font-medium text-gray-700 capitalize">{day}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={`operatingHours.${day}.closed`}
                        checked={formData.operatingHours[day as keyof typeof formData.operatingHours].closed}
                        onChange={handleChange}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-600">Closed</span>
                    </label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        name={`operatingHours.${day}.open`}
                        value={formData.operatingHours[day as keyof typeof formData.operatingHours].open}
                        onChange={handleChange}
                        disabled={formData.operatingHours[day as keyof typeof formData.operatingHours].closed}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        name={`operatingHours.${day}.close`}
                        value={formData.operatingHours[day as keyof typeof formData.operatingHours].close}
                        onChange={handleChange}
                        disabled={formData.operatingHours[day as keyof typeof formData.operatingHours].closed}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IoT Tab */}
          {activeTab === 'iot' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">IoT Integration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <p className="mt-1 text-xs text-gray-500">ID of the temperature monitoring device</p>
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
                  <p className="mt-1 text-xs text-gray-500">ID of the humidity monitoring device</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  <strong className="font-medium">Note:</strong> IoT sensors enable real-time monitoring of 
                  environmental conditions. Sensors can be configured after store creation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Complete all required fields (*)</span>
          </div>
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-600">Store managers can be assigned after creation</span>
          </div>
        </div>
      </form>
    </div>
  )
}