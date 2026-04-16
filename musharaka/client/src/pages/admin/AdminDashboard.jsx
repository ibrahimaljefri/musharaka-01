// v3 — D3 charts + live users
import { useEffect, useState } from 'react'
import { Building2, GitBranch, Users, Clock, UserCheck } from 'lucide-react'
import api from '../../lib/axiosClient'
import KpiCard from '../../components/KpiCard'
import SubscriptionStatusChart from '../../components/charts/SubscriptionStatusChart'
import BranchesPerTenantChart from '../../components/charts/BranchesPerTenantChart'
import UsersPerTenantChart from '../../components/charts/UsersPerTenantChart'
import Top10TenantsChart from '../../components/charts/Top10TenantsChart'
import LiveUsersWidget from '../../components/LiveUsersWidget'

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setError('تعذّر تحميل الإحصائيات'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <span className="text-yellow-600 font-arabic text-sm animate-pulse">جاري التحميل...</span>
    </div>
  )

  if (error) return (
    <div className="text-center py-12 text-red-500 font-arabic text-sm">{error}</div>
  )

  const { totals, subscriptions, users_per_tenant, branches_per_tenant } = stats

  return (
    <div className="space-y-6" dir="rtl">

      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 font-arabic">لوحة الإدارة</h1>
        <p className="text-xs text-gray-400 font-arabic mt-0.5">إحصائيات المنصة في الوقت الفعلي</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard title="المستأجرون"           value={totals.tenants}       color="green"  icon={Building2}  />
        <KpiCard title="الفروع"               value={totals.branches}      color="cyan"   icon={GitBranch}  />
        <KpiCard title="المستخدمون النشطون"  value={totals.tenant_users}  color="purple" icon={Users}      />
        <KpiCard title="في انتظار التفعيل"   value={totals.pending_users} color="yellow" icon={Clock}      />
        <KpiCard title="إجمالي المسجلين"     value={totals.auth_users}    color="pink"   icon={UserCheck}  />
      </div>

      {/* Live Users */}
      <LiveUsersWidget totalUsers={totals.auth_users} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SubscriptionStatusChart subscriptions={subscriptions} />
        <Top10TenantsChart branches_per_tenant={branches_per_tenant} />
        <BranchesPerTenantChart branches_per_tenant={branches_per_tenant} />
        <UsersPerTenantChart users_per_tenant={users_per_tenant} />
      </div>

    </div>
  )
}
