import { QuickActions, StatCard } from "../../dashboard/page"

export default function ReceivingDashboard() {
  const stats = [
    { label: 'Pending GRNs', value: '5', trend: '+2', color: 'yellow', icon: '📋' },
    { label: 'Today\'s Receipts', value: '12', trend: '+5', color: 'green', icon: '✅' },
    { label: 'Quality Issues', value: '2', trend: '0', color: 'red', icon: '⚠️' },
    { label: 'This Week', value: '45', trend: '+8', color: 'blue', icon: '📦' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <QuickActions title="Receiving Tasks" actions={[
          { label: 'Create GRN', href: '/grn/create', icon: '➕' },
          { label: 'Pending Approvals ', href: '/grn?status=pending', icon: '⏳', },
          { label: 'View All GRNs', href: '/grn', icon: '📋' },
        ]} />

        <QuickActions title="Quality Control" actions={[
          { label: 'Quality Checks', href: '/grn?filter=quality', icon: '🔍' },
          { label: 'Batch Management', href: '/batches', icon: '📦' },
          { label: 'Supplier List', href: '/suppliers', icon: '🚚' },
        ]} />
      </div>
    </div>
  )
}