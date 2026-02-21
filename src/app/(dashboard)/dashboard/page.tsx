// ============================================================================
// DASHBOARD HOME - Role-Specific Views
// File: src/app/(dashboard)/dashboard/page.tsx
// ============================================================================

'use client'

import { useAuth } from '@/hooks/use-auth'
import { PERMISSIONS } from '@/lib/auth/permissions'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, hasPermission } = useAuth()

  // Determine which dashboard to show based on role
  if (!user) return null

  if (hasPermission(PERMISSIONS.ALL)) {
    return <AdminDashboard />
  } else if (hasPermission(PERMISSIONS.STORES_READ)) {
    return <StoreManagerDashboard />
  } else if (hasPermission(PERMISSIONS.GRN_CREATE)) {
    return <ReceivingOfficerDashboard />
  } else if (hasPermission(PERMISSIONS.DISPATCH_CREATE)) {
    return <DispatchOfficerDashboard />
  } else if (hasPermission(PERMISSIONS.INVENTORY_WRITE)) {
    return <InventoryOfficerDashboard />
  } else if (hasPermission(PERMISSIONS.AUDIT_VIEW)) {
    return <AuditorDashboard />
  } else {
    return <ViewerDashboard />
  }
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

function AdminDashboard() {
  const stats = [
    { name: 'Total Users', value: '48', change: '+4', icon: 'users' },
    { name: 'Active Stores', value: '12', change: '+2', icon: 'warehouse' },
    { name: 'Total Orders', value: '1,234', change: '+12%', icon: 'shopping-cart' },
    { name: 'Pending Approvals', value: '23', change: '-5', icon: 'clock' },
  ]

  const recentActivity = [
    { action: 'GRN Approved', user: 'John Doe', time: '5 min ago', status: 'success' },
    { action: 'Order Created', user: 'Jane Smith', time: '12 min ago', status: 'info' },
    { action: 'User Locked', user: 'Bob Wilson', time: '1 hour ago', status: 'warning' },
    { action: 'Batch Recalled', user: 'System', time: '2 hours ago', status: 'error' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administrator Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Complete system overview and management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
                <p className={`mt-2 text-sm ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change} from last month
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <StatIcon name={stat.icon} className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div className="mt-4 space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusDot status={activity.status} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">by {activity.user}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            <QuickActionButton href="/users/create" icon="user-plus" label="Add New User" />
            <QuickActionButton href="/stores/create" icon="warehouse" label="Create Store" />
            <QuickActionButton href="/drugs/create" icon="pill" label="Add Drug" />
            <QuickActionButton href="/reports" icon="chart-bar" label="View Reports" />
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">System Alerts</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc space-y-1 pl-5">
                <li>5 batches expiring in next 30 days</li>
                <li>2 stores approaching capacity limit</li>
                <li>3 pending GRN approvals</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STORE MANAGER DASHBOARD
// ============================================================================

function StoreManagerDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Store Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          {user?.storeName || 'Your Store'} Operations
        </p>
      </div>

      {/* Store Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Current Inventory" value="2,450" subtitle="items in stock" color="blue" />
        <StatCard title="Pending Orders" value="12" subtitle="awaiting dispatch" color="yellow" />
        <StatCard title="Near Expiry" value="8" subtitle="batches <90 days" color="orange" />
        <StatCard title="Low Stock" value="5" subtitle="items below minimum" color="red" />
      </div>

      {/* Pending Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActionCard
          title="Pending Approvals"
          count={7}
          items={[
            { label: 'GRN Approvals', count: 3, href: '/grn?status=pending' },
            { label: 'Transfer Requests', count: 2, href: '/inventory/transfers?status=pending' },
            { label: 'Adjustment Requests', count: 2, href: '/inventory/adjustments?status=pending' },
          ]}
        />
        <ActionCard
          title="Today's Tasks"
          count={5}
          items={[
            { label: 'Orders to Allocate', count: 8, href: '/orders?status=approved' },
            { label: 'Dispatches Scheduled', count: 12, href: '/dispatch?date=today' },
            { label: 'Inventory Counts', count: 3, href: '/inventory/counts' },
          ]}
        />
      </div>
    </div>
  )
}

// ============================================================================
// RECEIVING OFFICER DASHBOARD
// ============================================================================

function ReceivingOfficerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receiving Officer Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage incoming goods and quality checks
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard title="Pending GRNs" value="5" subtitle="awaiting approval" color="yellow" />
        <StatCard title="Today's Receipts" value="12" subtitle="items received" color="green" />
        <StatCard title="Quality Issues" value="2" subtitle="require attention" color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent GRNs</h2>
            <Link href="/grn/create" className="text-sm text-blue-600 hover:text-blue-800">
              + Create New
            </Link>
          </div>
          {/* GRN List */}
          <div className="space-y-3">
            <GRNItem number="GRN-001234" status="pending" supplier="PharmaCorp" />
            <GRNItem number="GRN-001235" status="approved" supplier="MediSupply" />
            <GRNItem number="GRN-001236" status="pending" supplier="HealthDist" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickActionButton href="/grn/create" icon="plus" label="Create GRN" />
            <QuickActionButton href="/grn?status=pending" icon="clock" label="Pending Approvals" />
            <QuickActionButton href="/batches" icon="box" label="View Batches" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// DISPATCH OFFICER DASHBOARD
// ============================================================================

function DispatchOfficerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Officer Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage order dispatches and deliveries
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-4">
        <StatCard title="Ready to Dispatch" value="15" subtitle="orders allocated" color="blue" />
        <StatCard title="In Transit" value="23" subtitle="dispatches" color="yellow" />
        <StatCard title="Delivered Today" value="8" subtitle="completed" color="green" />
        <StatCard title="Pending Pickup" value="3" subtitle="awaiting driver" color="orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Today's Dispatches</h2>
          <div className="space-y-3">
            <DispatchItem orderNumber="ORD-4521" customer="City Hospital" status="ready" />
            <DispatchItem orderNumber="ORD-4522" customer="County Clinic" status="in-progress" />
            <DispatchItem orderNumber="ORD-4523" customer="Rural Health" status="completed" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickActionButton href="/dispatch/create" icon="truck" label="Create Dispatch Note" />
            <QuickActionButton href="/orders?status=allocated" icon="list" label="View Allocated Orders" />
            <QuickActionButton href="/dispatch?status=in-transit" icon="map" label="Track Deliveries" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// INVENTORY OFFICER DASHBOARD
// ============================================================================

function InventoryOfficerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Officer Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor and manage inventory levels
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-4">
        <StatCard title="Total Items" value="2,450" subtitle="in inventory" color="blue" />
        <StatCard title="Low Stock" value="12" subtitle="below minimum" color="red" />
        <StatCard title="Near Expiry" value="8" subtitle="<90 days" color="orange" />
        <StatCard title="Pending Transfers" value="5" subtitle="awaiting approval" color="yellow" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Critical Alerts</h2>
          <div className="space-y-3">
            <AlertItem type="error" message="3 batches expired - require disposal" />
            <AlertItem type="warning" message="5 items below reorder point" />
            <AlertItem type="info" message="2 transfer requests pending" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickActionButton href="/inventory/transfers/create" icon="arrows" label="Create Transfer" />
            <QuickActionButton href="/inventory/adjustments/create" icon="edit" label="Stock Adjustment" />
            <QuickActionButton href="/inventory?filter=low-stock" icon="alert" label="View Low Stock" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AUDITOR DASHBOARD
// ============================================================================

function AuditorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditor Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          System audit and compliance monitoring
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-4">
        <StatCard title="Today's Actions" value="156" subtitle="logged events" color="blue" />
        <StatCard title="Failed Logins" value="8" subtitle="security events" color="red" />
        <StatCard title="Reports Generated" value="12" subtitle="this week" color="green" />
        <StatCard title="Compliance Score" value="98%" subtitle="system health" color="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Audit Logs</h2>
          <div className="space-y-3">
            <AuditItem action="GRN Approved" user="John Doe" time="5 min ago" />
            <AuditItem action="Order Cancelled" user="Jane Smith" time="15 min ago" />
            <AuditItem action="Batch Quarantined" user="System" time="1 hour ago" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Quick Reports</h2>
          <div className="space-y-3">
            <QuickActionButton href="/reports/batch-movement" icon="chart" label="Batch Movement Report" />
            <QuickActionButton href="/reports/user-activity" icon="users" label="User Activity Report" />
            <QuickActionButton href="/audit?filter=today" icon="shield" label="Today's Audit Logs" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// VIEWER DASHBOARD
// ============================================================================

function ViewerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          System overview (Read-only access)
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard title="Total Inventory" value="2,450" subtitle="items" color="blue" />
        <StatCard title="Active Orders" value="45" subtitle="in progress" color="yellow" />
        <StatCard title="System Health" value="98%" subtitle="operational" color="green" />
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          You have read-only access. Contact your administrator to request additional permissions.
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function StatCard({ title, value, subtitle, color }: any) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}

function QuickActionButton({ href, icon, label }: any) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
    >
      <div className="rounded-full bg-blue-100 p-2">
        <div className="h-5 w-5 text-blue-600">→</div>
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  )
}

function ActionCard({ title, count, items }: any) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-600">
          {count}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item: any, index: number) => (
          <Link
            key={index}
            href={item.href}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
          >
            <span className="text-sm text-gray-700">{item.label}</span>
            <span className="text-sm font-semibold text-blue-600">{item.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }
  return <div className={`h-2 w-2 rounded-full ${colors[status as keyof typeof colors]}`} />
}

function StatIcon({ name, className }: any) {
  return <div className={className}>📊</div>
}

function GRNItem({ number, status, supplier }: any) {
  return (
    <Link href={`/grn/${number}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
      <div>
        <p className="text-sm font-medium">{number}</p>
        <p className="text-xs text-gray-500">{supplier}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${
        status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      }`}>
        {status}
      </span>
    </Link>
  )
}

function DispatchItem({ orderNumber, customer, status }: any) {
  return (
    <Link href={`/dispatch/${orderNumber}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
      <div>
        <p className="text-sm font-medium">{orderNumber}</p>
        <p className="text-xs text-gray-500">{customer}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${
        status === 'completed' ? 'bg-green-100 text-green-700' : 
        status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 
        'bg-gray-100 text-gray-700'
      }`}>
        {status}
      </span>
    </Link>
  )
}

function AlertItem({ type, message }: any) {
  const colors = {
    error: 'border-red-200 bg-red-50 text-red-700',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  }
  return (
    <div className={`border-l-4 p-3 ${colors[type as keyof typeof colors]}`}>
      <p className="text-sm">{message}</p>
    </div>
  )
}

function AuditItem({ action, user, time }: any) {
  return (
    <div className="flex items-center justify-between p-3 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{action}</p>
        <p className="text-xs text-gray-500">by {user}</p>
      </div>
      <span className="text-xs text-gray-500">{time}</span>
    </div>
  )
}