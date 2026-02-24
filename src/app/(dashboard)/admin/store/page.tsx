import { getCurrentUser, requirePermission } from '@/lib/auth/auth'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { Suspense } from 'react'
import { 
  BuildingStorefrontIcon, 
  PlusIcon,
  ServerStackIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import StoresClient from './stores-client/page'

export default async function StoresPage() {
  const user = await getCurrentUser()
  requirePermission(PERMISSIONS.STORES_READ, user)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl">
                  <BuildingStorefrontIcon className="w-8 h-8 text-purple-100" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Store Management</h1>
                  <p className="text-purple-100 mt-1 max-w-2xl">
                    Manage physical and virtual stores, inventory locations, and environmental monitoring
                  </p>
                </div>
              </div>
              
              {/* Quick stats will be loaded client-side */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <ServerStackIcon className="w-5 h-5 text-purple-200" />
                  <span className="text-sm font-medium">Total Stores</span>
                </div>
               
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <ShieldCheckIcon className="w-5 h-5 text-purple-200" />
                  <span className="text-sm font-medium">Controlled Substances</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin/store/create"
                className="inline-flex items-center gap-2 bg-white text-purple-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-50 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <PlusIcon className="w-5 h-5" />
                Add New Store
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
          <Link href="/admin" className="hover:text-purple-600 transition-colors">
            Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Stores</span>
        </nav>

        {/* Stores table with suspense for loading */}
        <Suspense fallback={<StoresLoading />}>
          <StoresClient />
        </Suspense>
      </div>
    </div>
  )
}

function StoresLoading() {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}