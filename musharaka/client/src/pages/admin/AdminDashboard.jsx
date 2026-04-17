// v4 — PageHeader + skeleton loaders + better error state
import { useEffect, useState } from 'react'
import { Building2, GitBranch, Users, Clock, UserCheck, LayoutDashboard, RefreshCw } from 'lucide-react'
import api from '../../lib/axiosClient'
import KpiCard from '../../components/KpiCard'
import PageHeader from '../../components/PageHeader'
import { KpiSkeleton } from '../../components/SkeletonLoader'
import SubscriptionStatusChart from '../../components/charts/SubscriptionStatusChart'
import BranchesPerTenantChart from '../../components/charts/BranchesPerTenantChart'
import UsersPerTenantChart from '../../components/charts/UsersPerTenantChart'
import Top10TenantsChart from '../../components/charts/Top10TenantsChart'
import LiveUsersWidget from '../../components/LiveUsersWidget'

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setError('تعذّر تحميل الإحصائيات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="لوحة التحكم الرئيسية"
        subtitle="إحصائيات المنصة في الوقت الفعلي"
        icon={LayoutDashboard}
      />

      {/* KPI row */}
      {loading ? (
        <KpiSkeleton count={5} />
      ) : error ? (
        <div className="card-surface p-8 text-center space-y-3">
          <p className="text-red-500 font-arabic text-sm">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-sm text-yellow-600 hover:text-yellow-700 font-arabic transition-colors"
          >
            <RefreshCw size={14} />
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard title="المستأجرون"           value={stats.totals.tenants}       color="green"  icon={Building2}  />
            <KpiCard title="الفروع"               value={stats.totals.branches}      color="cyan"   icon={GitBranch}  />
            <KpiCard title="المستخدمون النشطون"  value={stats.totals.tenant_users}  color="purple" icon={Users}      />
            <KpiCard title="في انتظار التفعيل"   value={stats.totals.pending_users} color="yellow" icon={Clock}      />
            <KpiCard title="إجمالي المسجلين"     value={stats.totals.auth_users}    color="pink"   icon={UserCheck}  />
          </div>

          {/* Live Users */}
          <LiveUsersWidget totalUsers={stats.totals.auth_users} />

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SubscriptionStatusChart subscriptions={stats.subscriptions} />
            <Top10TenantsChart branches_per_tenant={stats.branches_per_tenant} />
            <BranchesPerTenantChart branches_per_tenant={stats.branches_per_tenant} />
            <UsersPerTenantChart users_per_tenant={stats.users_per_tenant} />
          </div>
        </>
      )}

      {/* Skeleton chart placeholders shown while loading */}
      {loading && (
        <>
          <div className="card-surface h-64 skeleton rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-surface h-64 skeleton rounded-2xl" />
            <div className="card-surface h-64 skeleton rounded-2xl" />
            <div className="card-surface h-64 skeleton rounded-2xl" />
            <div className="card-surface h-64 skeleton rounded-2xl" />
          </div>
        </>
      )}
    </div>
  )
}
