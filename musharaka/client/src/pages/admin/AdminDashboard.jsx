// v2 — cache-bust rebuild
import { useEffect, useState } from 'react'
import { Building2, GitBranch, Users, Clock, UserCheck } from 'lucide-react'
import api from '../../lib/axiosClient'
import KpiCard from '../../components/KpiCard'

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

  const subBuckets = [
    { label: 'أقل من 3 أشهر',  value: subscriptions.expiring_3m,       color: 'bg-red-100 text-red-700 border-red-200' },
    { label: '3 – 6 أشهر',     value: subscriptions.expiring_6m,       color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { label: '6 – 11 شهراً',   value: subscriptions.expiring_11m,      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { label: '+12 شهراً',       value: subscriptions.expiring_12m_plus, color: 'bg-green-100 text-green-700 border-green-200' },
    { label: 'مفتوح',           value: subscriptions.no_expiry,         color: 'bg-gray-100 text-gray-600 border-gray-200' },
  ]

  const usersRows    = Object.entries(users_per_tenant).sort((a, b) => b[1] - a[1])
  const branchesRows = Object.entries(branches_per_tenant).sort((a, b) => b[1] - a[1])

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

      {/* Subscription expiry buckets */}
      <div className="card-surface">
        <div className="section-header mb-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm">حالة الاشتراكات (المستأجرون النشطون)</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {subBuckets.map(b => (
            <div key={b.label} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-arabic ${b.color}`}>
              <span className="text-xl font-bold">{b.value}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-tenant tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Users per tenant */}
        <div className="card-surface">
          <div className="section-header mb-3">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm">
              المستخدمون لكل مستأجر
            </h2>
          </div>
          {usersRows.length === 0 ? (
            <p className="text-gray-400 text-xs font-arabic text-center py-4">لا توجد بيانات</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-arabic border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 text-right font-medium">المستأجر</th>
                  <th className="pb-2 text-left font-medium">المستخدمون</th>
                </tr>
              </thead>
              <tbody>
                {usersRows.map(([name, count]) => (
                  <tr key={name} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-2 font-arabic text-gray-700 dark:text-gray-300">{name}</td>
                    <td className="py-2 text-left font-bold text-yellow-600">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Branches per tenant */}
        <div className="card-surface">
          <div className="section-header mb-3">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm">
              الفروع لكل مستأجر
            </h2>
          </div>
          {branchesRows.length === 0 ? (
            <p className="text-gray-400 text-xs font-arabic text-center py-4">لا توجد بيانات</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-arabic border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 text-right font-medium">المستأجر</th>
                  <th className="pb-2 text-left font-medium">الفروع</th>
                </tr>
              </thead>
              <tbody>
                {branchesRows.map(([name, count]) => (
                  <tr key={name} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-2 font-arabic text-gray-700 dark:text-gray-300">{name}</td>
                    <td className="py-2 text-left font-bold text-yellow-600">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
