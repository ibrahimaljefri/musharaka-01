import { useState, useEffect, useMemo } from 'react'
import api from '../lib/axiosClient'
import BranchBadge from '../components/BranchBadge'
import { TableSkeleton, KpiSkeleton } from '../components/SkeletonLoader'
import SortableHeader from '../components/SortableHeader'
import Pagination from '../components/Pagination'
import { Search } from 'lucide-react'
import './reports.css'

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
    <div className="reports-page">
      <div className="rp-header">
        <div>
          <h1 className="rp-title">التقارير</h1>
          <div className="t-small">عرض مفصّل لبيانات المبيعات حسب الفترة والفرع</div>
        </div>
      </div>

      {/* Filters */}
      <div className="surface">
        <div className="rp-filter-bar">
          <div className="field">
            <label>الفرع</label>
            <select className="input" value={filters.branch_id} onChange={e => setFilters(f => ({...f, branch_id: e.target.value}))}>
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>الشهر</label>
            <select className="input" value={filters.month} onChange={e => setFilters(f => ({...f, month: e.target.value}))}>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>السنة</label>
            <select className="input" value={filters.year} onChange={e => setFilters(f => ({...f, year: e.target.value}))}>
              {YEARS.map(y => <option key={y.v} value={y.v}>{y.l}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleSearch}>
            <Search size={15} /> بحث
          </button>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div style={{ marginBottom: 'var(--space-4, 16px)' }}><KpiSkeleton count={4} /></div>
      ) : (
        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-label">إجمالي المبيعات</div>
            <div className="kpi-value">{fmt(kpis.total)} ر.س</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">متوسط المبيعة</div>
            <div className="kpi-value">{fmt(kpis.avg)} ر.س</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">عدد السجلات</div>
            <div className="kpi-value">{kpis.count.toLocaleString('ar-SA')}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">متوسط يومي</div>
            <div className="kpi-value">{fmt(kpis.dailyAvg)} ر.س</div>
          </div>
        </div>
      )}

      {/* Sales table */}
      <div className="surface flush">
        <div className="rp-tbl-head">
          <h2>تفاصيل المبيعات</h2>
          <span className="t-small">{sales.length.toLocaleString('ar-SA')} نتيجة</span>
        </div>
        {loading ? (
          <div style={{ padding: 16 }}>
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : sales.length === 0 ? (
          <div className="rp-empty">لا توجد مبيعات في هذه الفترة</div>
        ) : (
          <>
            <div className="rp-tbl-wrap">
              <table className="rp-tbl">
                <thead>
                  <tr>
                    <SortableHeader field="sale_date" sort={sort} onSort={setSort}>التاريخ</SortableHeader>
                    <th>الفرع</th>
                    <th>النوع</th>
                    <th>رقم الفاتورة</th>
                    <SortableHeader field="amount" sort={sort} onSort={setSort}>المبلغ (ر.س)</SortableHeader>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(s => (
                    <tr key={s.id}>
                      <td className="t-mono" dir="ltr">{s.sale_date}</td>
                      <td><BranchBadge code={s.branches?.code || '—'} /></td>
                      <td>{s.input_type === 'daily' ? 'يومي' : s.input_type === 'monthly' ? 'شهري' : 'مخصص'}</td>
                      <td className="t-mono">{s.invoice_number || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(s.amount)}</td>
                      <td>
                        <span className={`rp-pill ${s.status === 'sent' ? 'sent' : 'pending'}`}>
                          {s.status === 'sent' ? 'مرسلة' : 'معلقة'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="rp-pagination">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
