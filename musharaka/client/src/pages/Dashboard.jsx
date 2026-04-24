import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import { useAuthStore } from '../store/authStore'
import { toast } from '../lib/useToast'
import KpiCard from '../components/KpiCard'
import PageHeader from '../components/PageHeader'
import { TableSkeleton, KpiSkeleton } from '../components/SkeletonLoader'
import {
  DollarSign, TrendingUp, Hash, Lock, Trash2,
  ChevronLeft, ChevronRight, PlusCircle, Clock,
  CheckCircle2, BarChart2, ArrowUpRight, BadgeCheck, CalendarDays,
  Send, ChevronDown,
} from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import AlertBanner from '../components/AlertBanner'
import BranchBadge from '../components/BranchBadge'
import EmptyState from '../components/EmptyState'

const PAGE_SIZE  = 25
const MONTHS_AR  = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function fmt(n) {
  return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusDot({ status }) {
  return status === 'sent'
    ? <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-arabic">
        <CheckCircle2 size={10} /> مرسلة
      </span>
    : <span className="inline-flex items-center gap-1.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-arabic">
        <Clock size={10} /> معلقة
      </span>
}

// ── Advanced Analytics ─────────────────────────────────────────────────────────

function PercentBar({ label, value, total, color = 'bg-yellow-500' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs font-arabic mb-1">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-gray-800 dark:text-gray-100">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MiniBarChart({ data, label }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-arabic mb-3">{label}</p>
      <div className="flex items-end gap-1.5 h-20">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-yellow-400 rounded-t transition-all duration-700 hover:bg-yellow-500"
              style={{ height: `${Math.max(4, (d.value / max) * 72)}px` }}
              title={`${d.key}: ${fmt(d.value)} ر.س`}
            />
            <span className="text-xs text-gray-400 font-arabic truncate w-full text-center">{d.key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── License Widget ──────────────────────────────────────────────────────────────
function LicenseWidget({ activatedAt, expiresAt, planName, onRenew }) {
  const daysLeft = useMemo(() => {
    if (!expiresAt) return null
    return Math.ceil((new Date(expiresAt) - new Date()) / 86400000)
  }, [expiresAt])

  const totalDays = useMemo(() => {
    if (!activatedAt || !expiresAt) return null
    return Math.ceil((new Date(expiresAt) - new Date(activatedAt)) / 86400000)
  }, [activatedAt, expiresAt])

  const pct = (totalDays && daysLeft !== null)
    ? Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100)))
    : null

  const colorClass = daysLeft === null
    ? 'text-gray-500 dark:text-gray-400'
    : daysLeft > 90
    ? 'text-green-600 dark:text-green-400'
    : daysLeft > 30
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  const barColor = daysLeft === null
    ? 'bg-gray-300 dark:bg-gray-600'
    : daysLeft > 90
    ? 'bg-green-500'
    : daysLeft > 30
    ? 'bg-amber-400'
    : 'bg-red-500'

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  const daysLabel = daysLeft === null
    ? 'ترخيص مفتوح'
    : daysLeft <= 0
    ? 'منتهي'
    : `${daysLeft.toLocaleString('ar-SA')} ${daysLeft === 1 ? 'يوم' : 'يوم'}`

  return (
    <div className="card-surface p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Plan & expiry info */}
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          {planName && (
            <div className="flex items-center gap-1.5">
              <BadgeCheck size={14} className="text-yellow-600 shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-arabic">الباقة:</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-arabic capitalize">{planName}</span>
            </div>
          )}
          {expiryLabel && (
            <div className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-arabic">الانتهاء:</span>
              <span className="text-sm text-gray-700 dark:text-gray-200 font-arabic">{expiryLabel}</span>
            </div>
          )}
        </div>

        {/* Days left + progress */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`text-sm font-bold font-arabic ${colorClass} flex items-center gap-1`}>
            {daysLeft !== null && daysLeft > 0 && daysLeft < 30 && (
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <span>متبقي: {daysLabel}</span>
          </div>
          {pct !== null && (
            <div className="w-24 hidden sm:block">
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-left mt-0.5">{pct}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdvancedDashboard({ branchId }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [branchId])

  async function loadStats() {
    setLoading(true)
    const now = new Date()
    const y   = now.getFullYear()

    // Fetch all sales for this year in one call (tenant-scoped server-side)
    const params = {
      from:  `${y}-01-01`,
      to:    `${y}-12-31`,
      limit: 10000,
    }
    if (branchId) params.branch_id = branchId

    let yearSales = []
    try {
      const { data } = await api.get('/sales', { params })
      yearSales = data?.sales || []
    } catch {
      yearSales = []
    }

    // Monthly breakdown
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      key:   MONTHS_AR[i].slice(0, 3),
      value: 0,
    }))
    let sentTotal = 0, pendingTotal = 0
    for (const r of yearSales) {
      if (!r.sale_date) continue
      const d = new Date(r.sale_date)
      const m = d.getMonth()
      const amt = parseFloat(r.amount || 0)
      monthlyData[m].value += amt
      if (r.status === 'sent')    sentTotal    += amt
      if (r.status === 'pending') pendingTotal += amt
    }
    const grandTotal = sentTotal + pendingTotal

    // Best month
    const best = [...monthlyData].sort((a, b) => b.value - a.value)[0]

    setStats({ monthlyData, sentTotal, pendingTotal, grandTotal, bestMonth: best })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!stats) return null

  const currentMonthData = stats.monthlyData[new Date().getMonth()]

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-surface p-4">
          <p className="text-xs text-gray-400 font-arabic mb-1">نسبة المرسلة من الإجمالي</p>
          <PercentBar
            label={`${fmt(stats.sentTotal)} ر.س مرسلة`}
            value={stats.sentTotal}
            total={stats.grandTotal}
            color="bg-green-500"
          />
          <PercentBar
            label={`${fmt(stats.pendingTotal)} ر.س معلقة`}
            value={stats.pendingTotal}
            total={stats.grandTotal}
            color="bg-amber-400"
          />
        </div>
        <div className="card-surface p-4">
          <p className="text-xs text-gray-400 font-arabic mb-1">أفضل شهر</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-arabic">{stats.bestMonth?.key || '—'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-arabic mt-1">{fmt(stats.bestMonth?.value)} ر.س</p>
          <div className="flex items-center gap-1 mt-1.5">
            <ArrowUpRight size={12} className="text-green-500" />
            <span className="text-xs text-green-600 font-arabic">الأعلى هذا العام</span>
          </div>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs text-gray-400 font-arabic mb-1">الشهر الحالي مقارنة بالمتوسط</p>
          {(() => {
            const avg = stats.monthlyData.filter(d => d.value > 0).reduce((s, d, _, arr) => s + d.value / arr.length, 0)
            const curr = currentMonthData?.value || 0
            const pct  = avg > 0 ? Math.round(((curr - avg) / avg) * 100) : 0
            return (
              <>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-arabic">{pct > 0 ? `+${pct}%` : `${pct}%`}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-arabic mt-1">المتوسط الشهري: {fmt(avg)} ر.س</p>
                <div className={`flex items-center gap-1 mt-1.5 ${pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  <TrendingUp size={12} />
                  <span className="text-xs font-arabic">{pct >= 0 ? 'فوق المتوسط' : 'دون المتوسط'}</span>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="card-surface p-5">
        <MiniBarChart data={stats.monthlyData} label={`المبيعات الشهرية — ${new Date().getFullYear()}`} />
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const allowAdvancedDashboard = useAuthStore(s => s.allowAdvancedDashboard)
  const tenantId               = useAuthStore(s => s.tenantId)
  const isSuperAdmin           = useAuthStore(s => s.isSuperAdmin)
  const activatedAt            = useAuthStore(s => s.activatedAt)
  const expiresAt              = useAuthStore(s => s.expiresAt)
  const planName               = useAuthStore(s => s.planName)

  // License widget helpers (memoized to avoid re-computation every render)
  const daysLeft = useMemo(() => {
    if (!expiresAt) return null
    return Math.ceil((new Date(expiresAt) - new Date()) / 86400000)
  }, [expiresAt])

  const [branches, setBranches]   = useState([])
  const [branchId, setBranchId]   = useState('')
  const [sales, setSales]         = useState([])
  const [kpis, setKpis]           = useState({ total: 0, month: 0, count: 0, pendingCount: 0, confirmedCount: 0 })
  const [kpisLoading, setKpisLoading] = useState(true)
  const [page, setPage]           = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [deleteId, setDeleteId]   = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [branchQuota, setBranchQuota] = useState(null)

  useEffect(() => {
    api.get('/branches')
      .then(({ data }) => setBranches(Array.isArray(data) ? data : (data?.branches || [])))
      .catch(() => setBranches([]))
  }, [])

  const maxBranches = useAuthStore(s => s.maxBranches)
  useEffect(() => {
    if (!tenantId) return
    api.get('/branches')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.branches || [])
        setBranchQuota({ used: list.length, max: maxBranches ?? null })
      })
      .catch(() => {})
  }, [tenantId, maxBranches])

  useEffect(() => { load() }, [branchId, page])

  async function load() {
    setLoading(true)
    setKpisLoading(true)
    const now     = new Date()
    const m       = now.getMonth() + 1
    const y       = now.getFullYear()
    const lastDay = new Date(y, m, 0).getDate()
    const mFrom   = `${y}-${String(m).padStart(2,'0')}-01`
    const mTo     = `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`

    try {
      // Fetch ALL tenant sales (server enforces tenant_id isolation) for totals
      const allParams = { limit: 10000 }
      if (branchId) allParams.branch_id = branchId
      const allRes = await api.get('/sales', { params: allParams })
      const allSales = allRes.data?.sales || []

      const total        = allSales.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
      const month        = allSales
        .filter(r => r.sale_date >= mFrom && r.sale_date <= mTo)
        .reduce((s, r) => s + parseFloat(r.amount || 0), 0)
      const count        = allSales.length
      const pendingCount = allSales.filter(r => r.status === 'pending').length
      const confirmedCount = allSales.filter(r => r.status === 'sent').length

      setKpis({ total, month, count, pendingCount, confirmedCount })
      setKpisLoading(false)

      // Paginated slice
      const start = page * PAGE_SIZE
      const end   = start + PAGE_SIZE
      const branchMap = new Map(branches.map(b => [b.id, b]))
      const enriched = allSales
        .sort((a, b) => new Date(b.created_at || b.sale_date) - new Date(a.created_at || a.sale_date))
        .slice(start, end)
        .map(r => ({
          ...r,
          branches: branchMap.get(r.branch_id)
            ? { code: branchMap.get(r.branch_id).code, name: branchMap.get(r.branch_id).name }
            : null,
        }))
      setSales(enriched)
      setTotalRows(count)
    } catch (e) {
      setKpis({ total: 0, month: 0, count: 0, pendingCount: 0, confirmedCount: 0 })
      setKpisLoading(false)
      setSales([])
      setTotalRows(0)
    }
    setLoading(false)
  }

  async function handleDelete() {
    try {
      await api.delete(`/sales/${deleteId}`)
      setDeleteId(null)
      toast.success('تم حذف السجل بنجاح')
      load()
    } catch (err) {
      setDeleteId(null)
      toast.error(err.response?.data?.error || 'لا يمكن حذف هذا السجل')
    }
  }

  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const now = new Date()

  return (
    <div className="space-y-6">

      {/* Page header */}
      <PageHeader title="لوحة القيادة" />

      {/* License widget — hidden for super-admins (they have no tenant license) */}
      {!isSuperAdmin && (activatedAt || expiresAt || planName) && (
        <LicenseWidget
          activatedAt={activatedAt}
          expiresAt={expiresAt}
          planName={planName}
        />
      )}

      {/* Expiry CTA banner — shown when < 30 days remain */}
      {!isSuperAdmin && daysLeft !== null && daysLeft < 30 && (
        <AlertBanner type="warning" message={
          <span className="font-arabic">
            ⚠️ ينتهي ترخيصك خلال {daysLeft > 0 ? daysLeft : 0} يوم. تواصل مع الإدارة للتجديد.
          </span>
        } />
      )}

      {/* Branch quota warning */}
      {branchQuota && branchQuota.max !== null && branchQuota.max !== undefined &&
        branchQuota.used >= Math.floor(branchQuota.max * 0.8) && (
        <AlertBanner
          type={branchQuota.used >= branchQuota.max ? 'error' : 'warning'}
          message={
            branchQuota.used >= branchQuota.max
              ? `تنبيه: لقد وصلت إلى الحد الأقصى للفروع (${branchQuota.max} فروع). تواصل مع الإدارة للترقية.`
              : `تنبيه: لديك ${branchQuota.max - branchQuota.used} فرع متبقٍ من أصل ${branchQuota.max}. تواصل مع الإدارة للترقية.`
          }
        />
      )}

      {/* Branch filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500 dark:text-gray-400 font-arabic whitespace-nowrap">الفرع:</label>
        <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(0) }}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm font-arabic bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400">
          <option value="">جميع الفروع</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* KPI Cards — 5 cards */}
      {kpisLoading ? (
        <KpiSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard title="إجمالي المبيعات"      value={`${fmt(kpis.total)} ر.س`}                   subtitle="جميع السجلات"          color="green"  icon={DollarSign} />
          <KpiCard title={`مبيعات ${MONTHS_AR[now.getMonth()]}`} value={`${fmt(kpis.month)} ر.س`} subtitle="الشهر الحالي"          color="pink"   icon={TrendingUp} />
          <KpiCard title="إجمالي السجلات"       value={kpis.count.toLocaleString('ar-SA')}           subtitle="جميع الإدخالات"        color="purple" icon={Hash} />
          <KpiCard title="فواتير معلقة"         value={kpis.pendingCount.toLocaleString('ar-SA')}    subtitle="في انتظار الإرسال"     color="yellow" icon={Clock} />
          <KpiCard title="فواتير مؤكدة"         value={kpis.confirmedCount.toLocaleString('ar-SA')}  subtitle="تم إرسالها بنجاح"      color="cyan"   icon={CheckCircle2} />
        </div>
      )}

      {/* Quick Action Row */}
      <div className="grid grid-cols-2 gap-3 mb-6" dir="rtl">
        {[
          { icon: PlusCircle, label: 'إضافة مبيعات',  to: '/sales/create',    color: 'text-yellow-600 dark:text-yellow-400' },
          { icon: Send,       label: 'إرسال الفواتير', to: '/submit',          color: 'text-blue-600 dark:text-blue-400' },
        ].map(({ icon: Icon, label, to, color }) => (
          <Link key={to} to={to}
            className="card-surface hover:shadow-md active:scale-95 transition-all p-3 flex items-center gap-3 rounded-xl cursor-pointer"
          >
            <Icon size={18} className={color} />
            <span className="text-sm font-medium font-arabic text-gray-700 dark:text-gray-200">{label}</span>
          </Link>
        ))}
      </div>

      {/* Advanced Analytics (subscription-gated) */}
      {allowAdvancedDashboard && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-yellow-600" />
              <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm">التحليلات المتقدمة</h2>
            </div>
            <button onClick={() => setShowAdvanced(s => !s)}
              className="text-xs text-yellow-600 hover:underline font-arabic flex items-center gap-1">
              {showAdvanced ? 'إخفاء' : 'إظهار'}
              <ChevronDown
                size={13}
                className="transition-transform"
                style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          </div>
          {showAdvanced && <AdvancedDashboard branchId={branchId} />}
        </div>
      )}

      {/* Recent sales table */}
      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm">آخر المبيعات</h2>
          <span className="text-xs text-gray-400 font-arabic">{totalRows.toLocaleString('ar-SA')} سجل</span>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="لا توجد مبيعات بعد"
            description="ابدأ بتسجيل مبيعاتك اليومية أو الشهرية لمتابعة أداء فروعك"
            action={
              <Link to="/sales/create"
                className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic">
                <PlusCircle size={15} /> إضافة أول مبيعة
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 dark:text-gray-300 text-xs font-arabic border-b border-gray-100 dark:border-gray-700">
                <tr className="bg-gray-50/80 dark:bg-gray-800/60">
                  <th className="px-4 py-3 text-right font-medium">رقم الفاتورة</th>
                  <th className="px-4 py-3 text-right font-medium">الفرع</th>
                  <th className="px-4 py-3 text-right font-medium">النوع</th>
                  <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium">المبلغ (ر.س)</th>
                  <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {sales.map(s => (
                  <tr key={s.id} className={`transition-colors ${s.status === 'sent' ? 'bg-gray-50/40 dark:bg-gray-800/20' : 'hover:bg-yellow-50/30 dark:hover:bg-yellow-900/10'}`}>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-arabic text-xs">{s.invoice_number || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="px-4 py-3"><BranchBadge code={s.branches?.code || '—'} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-arabic text-xs">
                      {s.input_type === 'daily' ? 'يومي' : s.input_type === 'monthly' ? 'شهري' : 'مخصص'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs" dir="ltr">{s.sale_date}</td>
                    <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-100 font-arabic">{fmt(s.amount)}</td>
                    <td className="px-4 py-3"><StatusDot status={s.status} /></td>
                    <td className="px-4 py-3">
                      {s.status === 'sent' ? (
                        <span className="text-xs text-gray-300 dark:text-gray-600 flex items-center gap-1"><Lock size={10} /> محمية</span>
                      ) : (
                        <button onClick={() => setDeleteId(s.id)} className="text-red-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs text-gray-400 font-arabic">صفحة {page + 1} من {totalPages}</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-200 transition-colors">
                <ChevronRight size={15} />
              </button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-200 transition-colors">
                <ChevronLeft size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف السجل"
        message="هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
