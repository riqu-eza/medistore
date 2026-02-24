/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link"
import { QuickActions, RecentActivity, StatCard } from "../dashboard/page"

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '48', trend: '+4', color: 'blue', icon: '👥' },
    { label: 'Active Stores', value: '12', trend: '+2', color: 'green', icon: '🏪' },
    { label: 'Total Orders', value: '1,234', trend: '+12%', color: 'purple', icon: '📦' },
    { label: 'System Health', value: '98%', trend: '+2%', color: 'cyan', icon: '💚' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <QuickActions title="Management" actions={[
          { label: 'Manage Users', href: '/admin/users', icon: '👥' },
          { label: 'System Settings', href: '/admin/settings', icon: '⚙️' },
          { label: 'View Audit Logs', href: '/audit', icon: '🛡️' },
        ]} />

        <QuickActions title="Operations" actions={[
          { label: 'All Orders', href: '/orders', icon: '📋' },
          { label: 'Inventory Overview', href: '/inventory', icon: '📦' },
          { label: 'View Reports', href: '/reports', icon: '📊' },
        ]} />

        <RecentActivity />
      </div>
    </div>
  )
}


