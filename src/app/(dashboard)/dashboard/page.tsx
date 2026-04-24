/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// DASHBOARD HOME - Clean & Role-Aware
// File: src/app/(dashboard)/dashboard/page.tsx
// ============================================================================

'use client'

import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import AdminDashboard from '../admin/page'
import AuditorDashboard from '../admin/auditor/page'
import StoreKeeperDashboard from '../Store/page'
import ReceivingDashboard from '../Receiver/drugs/page'
import DispatchDashboard from '../dispatch/page'
import GenericDashboard from '../Inventory/page'

export default function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null

  const role = user.roleName?.toLowerCase()
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-blue-100 text-lg capitalize">
              {role?.replace('_', ' ')} Dashboard
            </p>
            {user.storeName && (
              <p className="text-blue-200 text-sm mt-1">
                📦 {user.storeName}
              </p>
            )}
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Specific Content */}
      {role === 'admin' && <AdminDashboard />}
      {role === 'auditor' && <AuditorDashboard />}
      {role === 'store_manager' && <StoreKeeperDashboard />}
      {role === 'receiving_officer' && <ReceivingDashboard />}
      {role === 'dispatch_officer' && <DispatchDashboard />}
      {(role === 'inventory_officer') && <GenericDashboard />}
    </div>
  )
}

// ============================================================================
// ROLE-SPECIFIC DASHBOARDS
// ============================================================================





// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

export  function StatCard({ label, value, trend, color, icon }: any) {
  const colors = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    yellow: 'from-yellow-500 to-orange-500',
    purple: 'from-purple-500 to-pink-500',
    cyan: 'from-cyan-500 to-blue-500',
    orange: 'from-orange-500 to-red-500',
    red: 'from-red-500 to-pink-500',
  }

  const isPositive = trend.startsWith('+')

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
          isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {trend}
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <p className={`text-3xl font-bold bg-gradient-to-r ${colors[color as keyof typeof colors]} bg-clip-text text-transparent`}>
        {value}
      </p>
    </div>
  )
}

export function QuickActions({ title, actions }: any) {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
      <div className="space-y-2">
        {actions.map((action: any) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                {action.label}
              </span>
            </div>
            {action.badge && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {action.badge}
              </span>
            )}
            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}

export  function RecentActivity() {
  const activities = [
    { action: 'GRN Approved', user: 'John Doe', time: '5 min ago', status: 'success' },
    { action: 'Order Created', user: 'Jane Smith', time: '15 min ago', status: 'info' },
    { action: 'Batch Quarantined', user: 'System', time: '1 hour ago', status: 'warning' },
  ]

  const statusColors = {
    success: 'bg-green-100 text-green-700',
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
            <div className={`px-2 py-1 rounded text-xs font-medium ${statusColors[activity.status as keyof typeof statusColors]}`}>
              {activity.status}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{activity.action}</p>
              <p className="text-xs text-slate-500">by {activity.user} • {activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

 export function AlertsPanel() {
  const alerts = [
    { type: 'warning', message: '5 items below reorder point' },
    { type: 'error', message: '2 batches expired' },
    { type: 'info', message: '3 transfers pending approval' },
  ]

  const alertColors = {
    error: 'border-red-200 bg-red-50 text-red-700',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div key={index} className={`border-l-4 p-3 rounded ${alertColors[alert.type as keyof typeof alertColors]}`}>
            <p className="text-sm font-medium">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Add fade-in animation
const style = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}
`