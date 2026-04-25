import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import { useAuthStore } from '../store/authStore'
import { toast } from '../lib/useToast'
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
import './dashboard.css'

const PAGE_SIZE  = 25
const MONTHS_AR  = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function fmt(n) {
  return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString('ar-SA')
}

function fmtShortDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

function statusLabel(status) {
  if (status === 'sent') return 'مُرسل'
  if (status === 'pending') return 'معلّق'
  return status || '—'
}

// Build sparkline points string from an array of numeric values
function sparklinePoints(values, width = 100, height = 24) {
  if (!values || values.length === 0) return ''
  const nonZero = values.filter(v => Number.isFinite(v))
  if (nonZero.length === 0) return `0,${height / 2} ${width},${height / 2}`
  const max = Math.max(...nonZero, 1)
  const min = Math.min(...nonZero, 0)
  const range = max - min || 1
  const step = values.length > 1 ? width / (values.length - 1) : width
  return values.map((v, i) => {
    const x = (i * step).toFixed(2)
    const y = (height - ((v - min) / range) * (height - 4) - 2).toFixed(2)
    return `${x},${y}`
  }).join(' ')
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
function LicenseWidget({ activatedAt, expiresAt, planName }) {
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

      <div className="card-surface p-5">
        <MiniBarChart data={stats.monthlyData} label={`المبيعات الشهرية — ${new Date().getFullYear()}`} />
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user                   = useAuthStore(s => s.user)
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
  const [allSalesCache, setAllSalesCache] = useState([])
  const [kpis, setKpis]           = useState({ total: 0, month: 0, count: 0, pendingCount: 0, confirmedCount: 0 })
  const [kpisLoading, setKpisLoading] = useState(true)
  const [page, setPage]           = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [deleteId, setDeleteId]   = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [branchQuota, setBranchQuota] = useState(null)
  const [chartRange, setChartRange] = useState('monthly') // 'daily' | 'monthly' | 'yearly'

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
      setAllSalesCache(allSales)

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
      setAllSalesCache([])
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

  // ── Derived chart/sparkline data ────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!allSalesCache || allSalesCache.length === 0) return []
    if (chartRange === 'yearly') {
      const byYear = new Map()
      for (const r of allSalesCache) {
        if (!r.sale_date) continue
        const y = new Date(r.sale_date).getFullYear()
        byYear.set(y, (byYear.get(y) || 0) + parseFloat(r.amount || 0))
      }
      return [...byYear.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([k, v]) => ({ key: String(k), value: v }))
    }
    if (chartRange === 'daily') {
      const days = 30
      const buckets = []
      const today = new Date()
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        buckets.push({ iso: d.toISOString().slice(0, 10), value: 0 })
      }
      const idx = new Map(buckets.map((b, i) => [b.iso, i]))
      for (const r of allSalesCache) {
        if (!r.sale_date) continue
        const key = String(r.sale_date).slice(0, 10)
        if (idx.has(key)) {
          buckets[idx.get(key)].value += parseFloat(r.amount || 0)
        }
      }
      return buckets.map(b => ({ key: b.iso.slice(5), value: b.value }))
    }
    // monthly (current year)
    const y = now.getFullYear()
    const months = Array.from({ length: 12 }, (_, i) => ({ key: MONTHS_AR[i].slice(0, 3), value: 0 }))
    for (const r of allSalesCache) {
      if (!r.sale_date) continue
      const d = new Date(r.sale_date)
      if (d.getFullYear() !== y) continue
      months[d.getMonth()].value += parseFloat(r.amount || 0)
    }
    return months
  }, [allSalesCache, chartRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chart path for SVG area
  const chartPath = useMemo(() => {
    if (!chartData || chartData.length === 0) return null
    const W = 600, H = 200
    const max = Math.max(...chartData.map(d => d.value), 1)
    const step = chartData.length > 1 ? W / (chartData.length - 1) : W
    const coords = chartData.map((d, i) => {
      const x = (i * step).toFixed(2)
      const y = (H - (d.value / max) * (H - 20) - 10).toFixed(2)
      return `${x},${y}`
    })
    const line = coords.join(' ')
    const area = `M${coords[0]} L${coords.slice(1).join(' L')} L${W},${H} L0,${H} Z`
    return { line, area }
  }, [chartData])

  // Per-KPI sparkline inputs (from chart data / counts)
  const monthlySparkValues = useMemo(() => chartData.map(d => d.value), [chartData])

  // Branch growth trend (count per month)
  const branchCountSpark = useMemo(() => {
    // Simple placeholder: flat line of current count + slight variance — avoids fake data
    const n = branches.length || 1
    return [n, n, n, n, n, n]
  }, [branches])

  // Invoice count per month (count of records)
  const invoiceCountSpark = useMemo(() => {
    if (!allSalesCache || allSalesCache.length === 0) return []
    const y = now.getFullYear()
    const months = Array.from({ length: 12 }, () => 0)
    for (const r of allSalesCache) {
      if (!r.sale_date) continue
      const d = new Date(r.sale_date)
      if (d.getFullYear() !== y) continue
      months[d.getMonth()] += 1
    }
    return months
  }, [allSalesCache]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pending count spark (per month)
  const pendingSpark = useMemo(() => {
    if (!allSalesCache || allSalesCache.length === 0) return []
    const y = now.getFullYear()
    const months = Array.from({ length: 12 }, () => 0)
    for (const r of allSalesCache) {
      if (!r.sale_date || r.status !== 'pending') continue
      const d = new Date(r.sale_date)
      if (d.getFullYear() !== y) continue
      months[d.getMonth()] += 1
    }
    return months
  }, [allSalesCache]) // eslint-disable-line react-hooks/exhaustive-deps

  // Month-over-month growth for monthly-sales KPI
  const monthlyGrowthPct = useMemo(() => {
    if (!monthlySparkValues || monthlySparkValues.length < 2) return null
    const curr = monthlySparkValues[now.getMonth()] ?? 0
    const prev = monthlySparkValues[Math.max(0, now.getMonth() - 1)] ?? 0
    if (prev <= 0) return null
    return Math.round(((curr - prev) / prev) * 100)
  }, [monthlySparkValues]) // eslint-disable-line react-hooks/exhaustive-deps

  const greetingName = user?.full_name || 'أهلاً'

  return (
    <div className="dash-wrap">
      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-title">مرحباً، {greetingName} 👋</div>
          <div className="t-small">لوحة تحكم عروة — تنظيمك اليومي</div>
        </div>
        <Link to="/sales/create" className="btn-sm btn-primary">+ إضافة المبيعات</Link>
      </div>

      {/* License / expiry / quota banners (retained) */}
      {!isSuperAdmin && (activatedAt || expiresAt || planName) && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <LicenseWidget activatedAt={activatedAt} expiresAt={expiresAt} planName={planName} />
        </div>
      )}
      {!isSuperAdmin && daysLeft !== null && daysLeft < 30 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <AlertBanner type="warning" message={
            <span className="font-arabic">
              ⚠️ ينتهي ترخيصك خلال {daysLeft > 0 ? daysLeft : 0} يوم. تواصل مع الإدارة للتجديد.
            </span>
          } />
        </div>
      )}
      {branchQuota && branchQuota.max !== null && branchQuota.max !== undefined &&
        branchQuota.used >= Math.floor(branchQuota.max * 0.8) && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <AlertBanner
            type={branchQuota.used >= branchQuota.max ? 'error' : 'warning'}
            message={
              branchQuota.used >= branchQuota.max
                ? `تنبيه: لقد وصلت إلى الحد الأقصى للفروع (${branchQuota.max} فروع). تواصل مع الإدارة للترقية.`
                : `تنبيه: لديك ${branchQuota.max - branchQuota.used} فرع متبقٍ من أصل ${branchQuota.max}. تواصل مع الإدارة للترقية.`
            }
          />
        </div>
      )}

      {/* Branch filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <label className="t-small" style={{ whiteSpace: 'nowrap' }}>الفرع:</label>
        <select
          value={branchId}
          onChange={e => { setBranchId(e.target.value); setPage(0) }}
          className="input-base"
          style={{ maxWidth: 260 }}
          data-testid="branch-filter"
        >
          <option value="">جميع الفروع</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* KPI grid — 4 cards matching mockup */}
      {kpisLoading ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <KpiSkeleton count={4} />
        </div>
      ) : (
        <div className="kpi-grid">
          {/* 1. Monthly total */}
          <div className="kpi surface brand-edge">
            <div className="kpi-label">إجمالي المبيعات (الشهر)</div>
            <div className="kpi-value">{fmt(kpis.month)} ر.س</div>
            <div className={`kpi-trend ${monthlyGrowthPct !== null && monthlyGrowthPct < 0 ? 'down' : ''}`}>
              {monthlyGrowthPct === null
                ? <>— {MONTHS_AR[now.getMonth()]}</>
                : <>{monthlyGrowthPct >= 0 ? '▲' : '▼'} {Math.abs(monthlyGrowthPct)}٪ عن الشهر السابق</>}
            </div>
            <svg className="kpi-spark" viewBox="0 0 100 24" preserveAspectRatio="none">
              <polyline points={sparklinePoints(monthlySparkValues)} fill="none" stroke="var(--brand)" strokeWidth="1.5" />
            </svg>
          </div>

          {/* 2. Invoice count */}
          <div className="kpi surface">
            <div className="kpi-label">عدد الفواتير</div>
            <div className="kpi-value">{fmtInt(kpis.count)}</div>
            <div className="kpi-trend">الإجمالي التراكمي</div>
            <svg className="kpi-spark" viewBox="0 0 100 24" preserveAspectRatio="none">
              <polyline points={sparklinePoints(invoiceCountSpark)} fill="none" stroke="var(--brand)" strokeWidth="1.5" />
            </svg>
          </div>

          {/* 3. Active branches */}
          <div className="kpi surface">
            <div className="kpi-label">الفروع النشطة</div>
            <div className="kpi-value">{fmtInt(branches.length)}</div>
            <div className="kpi-trend">
              {branchQuota?.max ? `من أصل ${fmtInt(branchQuota.max)}` : 'جميع الفروع'}
            </div>
            <svg className="kpi-spark" viewBox="0 0 100 24" preserveAspectRatio="none">
              <polyline points={sparklinePoints(branchCountSpark)} fill="none" stroke="var(--brand)" strokeWidth="1.5" />
            </svg>
          </div>

          {/* 4. Pending submissions */}
          <div className="kpi surface">
            <div className="kpi-label">بانتظار الإرسال</div>
            <div className="kpi-value">{fmtInt(kpis.pendingCount)}</div>
            <div className={`kpi-trend ${kpis.pendingCount > 0 ? 'down' : ''}`}>
              {kpis.pendingCount > 0 ? '▼ يحتاج مراجعة' : '▲ لا توجد معلقات'}
            </div>
            <svg className="kpi-spark" viewBox="0 0 100 24" preserveAspectRatio="none">
              <polyline
                points={sparklinePoints(pendingSpark)}
                fill="none"
                stroke={kpis.pendingCount > 0 ? '#B91C1C' : 'var(--brand)'}
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Chart card */}
      <div className="surface chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">المبيعات</div>
            <div className="t-micro">
              {chartRange === 'daily' ? 'آخر ٣٠ يوم' : chartRange === 'yearly' ? 'جميع السنوات' : `شهور ${now.getFullYear()}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`btn-sm btn-ghost ${chartRange === 'daily' ? 'active' : ''}`}
              onClick={() => setChartRange('daily')}
            >يومي</button>
            <button
              type="button"
              className={`btn-sm btn-ghost ${chartRange === 'monthly' ? 'active' : ''}`}
              onClick={() => setChartRange('monthly')}
            >شهري</button>
            <button
              type="button"
              className={`btn-sm btn-ghost ${chartRange === 'yearly' ? 'active' : ''}`}
              onClick={() => setChartRange('yearly')}
            >سنوي</button>
          </div>
        </div>
        <div className="chart-area">
          {chartPath ? (
            <svg className="chart-line" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dash-chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--brand)" stopOpacity="0.3" />
                  <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={chartPath.area} fill="url(#dash-chart-grad)" />
              <polyline points={chartPath.line} fill="none" stroke="var(--brand)" strokeWidth="2" />
            </svg>
          ) : (
            <div className="chart-empty">لا توجد بيانات كافية لعرض الرسم البياني</div>
          )}
        </div>
      </div>

      {/* Recent sales */}
      <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="recent-header">
          <div className="chart-title">آخر المبيعات</div>
          <Link to="/submissions" className="t-small">عرض الكل ←</Link>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : sales.length === 0 ? (
          <div className="recent-empty">
            <EmptyState
              icon={DollarSign}
              title="لا توجد مبيعات بعد"
              description="ابدأ بتسجيل مبيعاتك اليومية أو الشهرية لمتابعة أداء فروعك"
              action={
                <Link to="/sales/create" className="btn-sm btn-primary">
                  <PlusCircle size={15} /> إضافة أول مبيعة
                </Link>
              }
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="recent-table">
              <thead>
                <tr>
                  <th>الفرع</th>
                  <th>رقم الفاتورة</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 8).map(s => (
                  <tr key={s.id} data-testid="sale-row">
                    <td>
                      {s.branches
                        ? <BranchBadge code={s.branches.code || '—'} />
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="t-mono">{s.invoice_number || '—'}</td>
                    <td className="t-mono" dir="ltr">{fmt(s.amount)} ر.س</td>
                    <td>{fmtShortDate(s.sale_date)}</td>
                    <td>
                      <span className={`status-pill ${s.status === 'sent' ? 'status-submitted' : 'status-pending'}`}>
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td>
                      {s.status === 'sent' ? (
                        <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                          <Lock size={10} /> محمية
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteId(s.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                          aria-label="حذف"
                          data-testid="delete-sale-btn"
                        >
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

        {totalPages > 1 && (
          <div data-testid="pagination" style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-subtle)',
          }}>
            <span className="t-micro">صفحة {page + 1} من {totalPages} — {fmtInt(totalRows)} سجل</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="btn-sm btn-ghost"
                style={{ opacity: page === 0 ? 0.4 : 1 }}
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="btn-sm btn-ghost"
                style={{ opacity: page >= totalPages - 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Secondary section — quick actions + advanced analytics + extra KPIs */}
      <div className="dash-secondary">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3" dir="rtl">
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

        {/* Cumulative totals + confirmed count (retained from original 5-KPI layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-surface p-4 flex items-center gap-3">
            <DollarSign size={22} className="text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-arabic mb-0.5">إجمالي المبيعات التراكمي</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 font-arabic">{fmt(kpis.total)} ر.س</p>
            </div>
          </div>
          <div className="card-surface p-4 flex items-center gap-3">
            <CheckCircle2 size={22} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-arabic mb-0.5">فواتير مؤكدة</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 font-arabic">{fmtInt(kpis.confirmedCount)} <span className="text-xs text-gray-400">تم إرسالها</span></p>
            </div>
          </div>
        </div>

        {/* Advanced analytics (subscription-gated) */}
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

// Unused import guards (retained for backward compat during incremental refactor)
// eslint-disable-next-line no-unused-vars
const _unused = { Hash, TrendingUp }
