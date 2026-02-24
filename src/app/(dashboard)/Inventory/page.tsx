import { QuickActions } from "../dashboard/page";

export default function GenericDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <QuickActions title="Quick Access" actions={[
          { label: 'View Inventory', href: '/inventory', icon: '📦' },
          { label: 'Browse Orders', href: '/orders', icon: '📋' },
          { label: 'View Reports', href: '/reports', icon: '📊' },
        ]} />

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">System Overview</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <p>✅ All systems operational</p>
            <p>📊 Last sync: Just now</p>
            <p>🔒 Security status: Secure</p>
          </div>
        </div>
      </div>
    </div>
  )
}