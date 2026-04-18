/* eslint-disable @typescript-eslint/no-unused-vars */
import { getCurrentUser, requirePermission } from '@/lib/auth/auth'
import { PERMISSIONS } from '@/lib/auth/permissions'
import UsersTable from './users-table/page'
import { 
  UserGroupIcon, 
  PlusIcon,
  
  ArrowPathIcon 
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default async function UsersPage() {
  const user = await getCurrentUser()
  requirePermission(PERMISSIONS.USERS_READ, )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl">
                  <UserGroupIcon className="w-8 h-8 text-blue-100" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                  <p className="text-blue-100 mt-1 max-w-2xl">
                    Manage system users, roles, and store assignments
                  </p>
                </div>
              </div>
              
              {/* Quick stats */}
             
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin/users/create"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <PlusIcon className="w-5 h-5" />
                Create New User
              </Link>
              
              <button
                className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all"
                title="Refresh data"
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
          <Link href="/admin" className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Users</span>
        </nav>

        {/* Users table with enhanced container */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <UsersTable />
        </div>

        {/* Help section */}
       

        {/* Quick tips */}
        
      </div>
    </div>
  )
}