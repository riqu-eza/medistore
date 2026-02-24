import { AlertsPanel, QuickActions, StatCard } from "../dashboard/page"

export default function StoreKeeperDashboard() {
  const stats = [
    { label: 'Stock Items', value: '1,245', trend: '+20', color: 'blue', icon: '📦' },
    { label: 'Transfers Today', value: '7', trend: '+3', color: 'green', icon: '🔄' },
    { label: 'Adjustments', value: '2', trend: '-1', color: 'yellow', icon: '📝' },
    { label: 'Alerts', value: '4', trend: '+1', color: 'red', icon: '⚠️' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <QuickActions title="Store Operations" actions={[
          { label: 'Create Transfer', href: '/inventory/transfers/create', icon: '➕' },
          { label: 'Stock Adjustment', href: '/inventory/adjustments/create', icon: '📝' },
          { label: 'View Inventory', href: '/inventory', icon: '📦' },
        ]} />

        <AlertsPanel />
      </div>
    </div>
  )
}