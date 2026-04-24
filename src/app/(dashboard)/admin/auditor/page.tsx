import { QuickActions, StatCard } from "../../dashboard/page"

export default function AuditorDashboard() {
  const stats = [
    { label: 'Current Inventory', value: '2,450', trend: '+5%', color: 'blue', icon: '📦' },
    { label: 'Pending Orders', value: '12', trend: '-3', color: 'yellow', icon: '⏳' },
    { label: 'Near Expiry', value: '8', trend: '+2', color: 'orange', icon: '⚠️' },
    { label: 'Low Stock', value: '5', trend: '-1', color: 'red', icon: '📉' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <QuickActions title="Today's Tasks" actions={[
          { label: 'Approve GRNs (3)', href: '/grn?status=pending', icon: '✅', badge: 3 },
          { label: 'Allocate Orders (8)', href: '/orders?status=approved', icon: '🎯', badge: 8 },
          { label: 'Review Adjustments', href: '/inventory/adjustments', icon: '📝' },
        ]} />

        <QuickActions title="Quick Access" actions={[
          { label: 'Inventory Transfers', href: '/inventory/transfers', icon: '🔄' },
          { label: 'Store Overview', href: '/stores', icon: '🏪' },
          { label: 'Generate Report', href: '/reports', icon: '📊' },
        ]} />
      </div>
    </div>
  )
}