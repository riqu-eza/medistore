import { QuickActions, StatCard } from "../dashboard/page"

export default function DispatchDashboard() {
  const stats = [
    { label: 'Ready to Dispatch', value: '15', trend: '+5', color: 'blue', icon: '📦' },
    { label: 'In Transit', value: '23', trend: '+3', color: 'yellow', icon: '🚚' },
    { label: 'Delivered Today', value: '8', trend: '+2', color: 'green', icon: '✅' },
    { label: 'Pending Pickup', value: '3', trend: '-1', color: 'orange', icon: '⏳' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <QuickActions title="Dispatch Operations" actions={[
          { label: 'Create Dispatch Note', href: '/dispatch/create', icon: '➕' },
          { label: 'Allocated Orders (15)', href: '/orders?status=allocated', icon: '📋', badge: 15 },
          { label: 'Track Deliveries', href: '/dispatch?status=in-transit', icon: '🗺️' },
        ]} />

        <QuickActions title="Today\'s Schedule" actions={[
          { label: 'Morning Deliveries', href: '/dispatch?shift=morning', icon: '🌅' },
          { label: 'Afternoon Deliveries', href: '/dispatch?shift=afternoon', icon: '☀️' },
          { label: 'Delivery Reports', href: '/reports/dispatch', icon: '📊' },
        ]} />
      </div>
    </div>
  )
}