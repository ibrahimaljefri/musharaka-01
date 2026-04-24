import { useState, useEffect, useMemo } from 'react'
import api from '../lib/axiosClient'
import KpiCard from '../components/KpiCard'
import BranchBadge from '../components/BranchBadge'
import PageHeader from '../components/PageHeader'
import { TableSkeleton, KpiSkeleton } from '../components/SkeletonLoader'
import SortableHeader from '../components/SortableHeader'
import Pagination from '../components/Pagination'
import { DollarSign, BarChart2, Hash, TrendingUp, Search } from 'lucide-react'

const PAGE_SIZE = 50

const MONTHS = [
  { v: '', l: 'جميع الأشهر' },
  { v: 1, l: 'يناير' }, { v: 2, l: 'فبراير' }, { v: 3, l: 'مارس' },
  { v: 4, l: 'أبريل' }, { v: 5, l: 'مايو' },   { v: 6, l: 'يونيو' },
  { v: 7, l: 'يوليو' }, { v: 8, l: 'أغسطس' },  { v: 9, l: 'سبتمبر' },
  { v: 10, l: 'أكتوبر' }, { v: 11, l: 'نوفمبر' }, { v: 12, l: 'ديسمبر' },
]
const YEARS = [{ v: '', l: 'جميع السنوات' }, ...Array.from({ length: 6 }, (_, i) => ({ v: 2021 + i, l: String(2021 + i) }))]

function fmt(n) { return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function Reports() {
  const [branches, setBranches] = useState([])
  const [filters, setFilters]   = useState({ branch_id: '', month: '', year: new Date().getFullYear() })
  const [applied, setApplied]   = useState({ branch_id: '', month: '', year: new Date().getFullYear() })
  const [sales, setSales]       = useState([])
  const [kpis, setKpis]         = useState({ total: 0, avg: 0, count: 0, dailyAvg: 0 })
  const [loading, setLoading]   = useState(false)
  const [sort, setSort]         = useState({ field: null, dir: 'asc' })
  const [page, setPage]         = useState(1)

  useEffect(() => {
    api.get('/branches')
      .then(({ data }) => setBranches(Array.isArray(data) ? data : (data?.branches || [])))
      .catch(() => setBranches([]))
    runQuery({ branch_id: '', month: '', year: new Date().getFullYear() })
  }, [])

  // Reset to page 1 whenever applied filters or sort change
  useEffect(() => { setPage(1) }, [applied, sort])

  const runQuery = async (f) => {
    setLoading(true)
    try {
      const params = { limit: 10000 }
      if (f.branch_id) params.branch_id = f.branch_id
      if (f.month)     params.month     = f.month
      if (f.year)      params.year      = f.year

      const { data } = await api.get('/sales', { params })
      const rows = data?.sales || []

      // Enrich with branch info (so existing UI that expects row.branches.code still works)
      const branchMap = new Map(branches.map(b => [b.id, b]))
      const enriched = rows.map(r => ({
        ...r,
        branches: branchMap.get(r.branch_id)
          ? { code: branchMap.get(r.branch_id).code, name: branchMap.get(r.branch_id).name }
          : null,
      }))
      setSales(enriched)
      const total    = enriched.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
      const count    = enriched.length
      const avg      = count ? total / count : 0
      const days     = new Set(enriched.map(r => r.sale_date)).size
      const dailyAvg = days ? total / days : 0
      setKpis({ total, avg, count, dailyAvg })
    } catch {
      setSales([])
      setKpis({ total: 0, avg: 0, count: 0, dailyAvg: 0 })
    }
    setLoading(false)
  }

  const handleSearch = () => { setApplied(filters); runQuery(filters) }

  // Client-side sort
  const sortedSales = useMemo(() => {
    if (!sort.field) return sales
    return [...sales].sort((a, b) => {
      let aVal = a[sort.field]
      let bVal = b[sort.field]
      if (sort.field === 'amount') {
        aVal = parseFloat(aVal || 0)
        bVal = parseFloat(bVal || 0)
      } else {
        aVal = aVal ?? ''
        bVal = bVal ?? ''
      }
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [sales, sort])

  const totalPages = Math.ceil(sortedSales.length / PAGE_SIZE)
  const paged = sortedSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader title="التقارير" />

      {/* Filters */}
      <div className="card-surface p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 font-arabic mb-1">الفرع</label>
            <select value={filters.branch_id} onChange={e => setFilters(f => ({...f, branch_id: e.target.value}))}
              className="input-base">
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-arabic mb-1">الشهر</label>
            <select value={filters.month} onChange={e => setFilters(f => ({...f, month: e.target.value}))}
              className="input-base">
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-arabic mb-1">السنة</label>
            <select value={filters.year} onChange={e => setFilters(f => ({...f, year: e.target.value}))}
              className="input-base">
              {YEARS.map(y => <option key={y.v} value={y.v}>{y.l}</option>)}
            </select>
          </div>
          <button onClick={handleSearch}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors font-arabic">
            <Search size={15} /> بحث
          </button>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <KpiSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="إجمالي المبيعات"  value={`${fmt(kpis.total)} ر.س`}    color="green"  icon={DollarSign} />
          <KpiCard title="متوسط المبيعة"    value={`${fmt(kpis.avg)} ر.س`}      color="pink"   icon={BarChart2}  />
          <KpiCard title="عدد السجلات"      value={kpis.count.toLocaleString()}  color="purple" icon={Hash}       />
          <KpiCard title="متوسط يومي"       value={`${fmt(kpis.dailyAvg)} ر.س`} color="cyan"   icon={TrendingUp} />
        </div>
      )}

      {/* Sales table */}
      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm">تفاصيل المبيعات</h2>
          <span className="text-xs text-gray-400 font-arabic">{sales.length.toLocaleString('ar-SA')} نتيجة</span>
        </div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-gray-400 font-arabic text-sm">لا توجد مبيعات في هذه الفترة</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <SortableHeader field="sale_date" sort={sort} onSort={setSort}>التاريخ</SortableHeader>
                    <th className="px-4 py-3 text-right font-medium">الفرع</th>
                    <th className="px-4 py-3 text-right font-medium">النوع</th>
                    <th className="px-4 py-3 text-right font-medium">رقم الفاتورة</th>
                    <SortableHeader field="amount" sort={sort} onSort={setSort}>المبلغ (ر.س)</SortableHeader>
                    <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paged.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-arabic" dir="ltr">{s.sale_date}</td>
                      <td className="px-4 py-3"><BranchBadge code={s.branches?.code || '—'} /></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-arabic">{s.input_type === 'daily' ? 'يومي' : s.input_type === 'monthly' ? 'شهري' : 'مخصص'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.invoice_number || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100 font-arabic">{fmt(s.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-arabic ${s.status === 'sent' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'}`}>
                          {s.status === 'sent' ? 'مرسلة' : 'معلقة'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
