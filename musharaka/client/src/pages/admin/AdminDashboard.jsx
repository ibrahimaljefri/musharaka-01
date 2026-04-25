// v5 — restyle with .adm-dash scoped tokens; same data + chart components
import { useEffect, useState } from 'react'
import { Building2, GitBranch, Users, Clock, UserCheck, RefreshCw } from 'lucide-react'
import api from '../../lib/axiosClient'
import KpiCard from '../../components/KpiCard'
import { KpiSkeleton } from '../../components/SkeletonLoader'
import SubscriptionStatusChart from '../../components/charts/SubscriptionStatusChart'
import BranchesPerTenantChart from '../../components/charts/BranchesPerTenantChart'
import UsersPerTenantChart from '../../components/charts/UsersPerTenantChart'
import Top10TenantsChart from '../../components/charts/Top10TenantsChart'
import LiveUsersWidget from '../../components/LiveUsersWidget'
import './admin-dash.css'

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
    <div className="adm-dash" dir="rtl">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">لوحة التحكم الرئيسية</h1>
          <div className="t-small">إحصائيات المنصة في الوقت الفعلي</div>
        </div>
      </div>

      {loading ? (
        <>
          <div className="adm-kpi-grid">
            <KpiSkeleton count={5} />
          </div>
          <div className="adm-skel-chart adm-live-wrap" />
          <div className="adm-charts-grid">
            <div className="adm-skel-chart" />
            <div className="adm-skel-chart" />
            <div className="adm-skel-chart" />
            <div className="adm-skel-chart" />
          </div>
        </>
      ) : error ? (
        <div className="adm-state">
          <p className="err">{error}</p>
          <button onClick={load} className="adm-retry">
            <RefreshCw size={14} /> إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <div className="adm-kpi-grid">
            <KpiCard title="المستأجرون"          value={stats.totals.tenants}       color="green"  icon={Building2}  />
            <KpiCard title="الفروع"              value={stats.totals.branches}      color="cyan"   icon={GitBranch}  />
            <KpiCard title="المستخدمون النشطون" value={stats.totals.tenant_users}  color="purple" icon={Users}      />
            <KpiCard title="في انتظار التفعيل"  value={stats.totals.pending_users} color="yellow" icon={Clock}      />
            <KpiCard title="إجمالي المسجلين"    value={stats.totals.auth_users}    color="pink"   icon={UserCheck}  />
          </div>

          <div className="adm-live-wrap">
            <LiveUsersWidget totalUsers={stats.totals.auth_users} />
          </div>

          <div className="adm-charts-grid">
            <SubscriptionStatusChart subscriptions={stats.subscriptions} />
            <Top10TenantsChart branches_per_tenant={stats.branches_per_tenant} />
            <BranchesPerTenantChart branches_per_tenant={stats.branches_per_tenant} />
            <UsersPerTenantChart users_per_tenant={stats.users_per_tenant} />
          </div>
        </>
      )}
    </div>
  )
}
