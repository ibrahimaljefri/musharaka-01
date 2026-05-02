import { useState, useEffect, useMemo, useRef } from 'react'
import api from '../lib/axiosClient'
import BranchBadge from '../components/BranchBadge'
import { TableSkeleton, KpiSkeleton } from '../components/SkeletonLoader'
import Pagination from '../components/Pagination'
import DraggableHeaderRow from '../components/DraggableHeaderRow'
import DraggableSortHeader from '../components/DraggableSortHeader'
import { useColumnOrder } from '../lib/useColumnOrder'
import { exportNodeAsPdf } from '../lib/pdfExport'
import { exportRowsAsXlsx } from '../lib/excelExport'
import { toast } from '../lib/useToast'
import { Search, FileDown, FileSpreadsheet } from 'lucide-react'
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

const REP_COLS = ['sale_date', 'branch', 'input_type', 'invoice_number', 'amount', 'status']
const REP_COL_META = {
  sale_date:      { label: 'التاريخ' },
  branch:         { label: 'الفرع' },
  input_type:     { label: 'النوع' },
  invoice_number: { label: 'رقم الفاتورة' },
  amount:         { label: 'المبلغ (ر.س)' },
  status:         { label: 'الحالة' },
}

function renderReportCell(s, key) {
  switch (key) {
    case 'sale_date':      return <span className="t-mono" dir="ltr">{s.sale_date}</span>
    case 'branch':         return <BranchBadge code={s.branches?.code || '—'} />
    case 'input_type':     return s.input_type === 'daily' ? 'يومي' : s.input_type === 'monthly' ? 'شهري' : 'مخصص'
    case 'invoice_number': return <span className="t-mono">{s.invoice_number || '—'}</span>
    case 'amount':         return <span style={{ fontWeight: 600 }}>{fmt(s.amount)}</span>
    case 'status':         return (
      <span className={`rp-pill ${s.status === 'sent' ? 'sent' : 'pending'}`}>
        {s.status === 'sent' ? 'مرسلة' : 'معلقة'}
      </span>
    )
    default: return '—'
  }
}

export default function Reports() {
  const [branches, setBranches] = useState([])
  const [filters, setFilters]   = useState({ branch_id: '', month: '', year: new Date().getFullYear(), status: '' })
  const [applied, setApplied]   = useState({ branch_id: '', month: '', year: new Date().getFullYear(), status: '' })
  const [exporting, setExporting] = useState(false)
  const pdfRef = useRef(null)
  const [sales, setSales]       = useState([])
  const [kpis, setKpis]         = useState({ total: 0, avg: 0, count: 0, dailyAvg: 0 })
  const [loading, setLoading]   = useState(false)
  const [sort, setSort]         = useState({ field: null, dir: 'asc' })
  const [page, setPage]         = useState(1)

  useEffect(() => {
    api.get('/branches')
      .then(({ data }) => setBranches(Array.isArray(data) ? data : (data?.branches || [])))
      .catch(() => setBranches([]))
    runQuery({ branch_id: '', month: '', year: new Date().getFullYear(), status: '' })
  }, [])

  useEffect(() => { setPage(1) }, [applied, sort])

  const runQuery = async (f) => {
    setLoading(true)
    try {
      const params = { limit: 10000 }
      if (f.branch_id) params.branch_id = f.branch_id
      if (f.month)     params.month     = f.month
      if (f.year)      params.year      = f.year
      if (f.status)    params.status    = f.status

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

  const [colOrder, setColOrder] = useColumnOrder(REP_COLS, 'rep_col_order')
  const toggleSort = (field) =>
    setSort(prev => prev.field === field
      ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' })

  // ── Filter summary for header / exports ─────────────────────────────────
  const filterSummary = useMemo(() => {
    const branchName = applied.branch_id
      ? (branches.find(b => b.id === applied.branch_id)?.name || '—')
      : 'جميع الفروع'
    const monthName = applied.month
      ? MONTHS.find(m => String(m.v) === String(applied.month))?.l
      : 'جميع الأشهر'
    const yearName = applied.year || 'جميع السنوات'
    const statusName = applied.status === 'pending' ? 'معلقة' : applied.status === 'sent' ? 'مرسلة' : 'الكل'
    return { branchName, monthName, yearName, statusName }
  }, [applied, branches])

  const fileBase = useMemo(() => {
    const b = applied.branch_id
      ? (branches.find(x => x.id === applied.branch_id)?.code || 'all')
      : 'all'
    const m = applied.month || 'all'
    const y = applied.year  || 'all'
    return `sales-report-${b}-${m}-${y}`
  }, [applied, branches])

  // ── Excel export ────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (sortedSales.length === 0) return
    setExporting(true)
    try {
      const inputTypeLabel = (t) => t === 'daily' ? 'يومي' : t === 'monthly' ? 'شهري' : 'مخصص'
      const statusLabel    = (s) => s === 'sent' ? 'مرسلة' : 'معلقة'
      const columns = [
        { key: 'sale_date',      label: 'التاريخ',       width: 14, get: r => r.sale_date || '' },
        { key: 'branch',         label: 'الفرع',          width: 14, get: r => r.branches?.code || '—' },
        { key: 'input_type',     label: 'النوع',          width: 12, get: r => inputTypeLabel(r.input_type) },
        { key: 'invoice_number', label: 'رقم الفاتورة',   width: 18, get: r => r.invoice_number || '' },
        { key: 'amount',         label: 'المبلغ (ر.س)',   width: 16, get: r => Number(r.amount || 0) },
        { key: 'status',         label: 'الحالة',         width: 12, get: r => statusLabel(r.status) },
      ]
      const totalsRow = {
        sale_date:   'الإجمالي',
        branch:      '',
        input_type:  '',
        invoice_number: `${sortedSales.length} سجل`,
        amount:      Number(kpis.total),
        status:      '',
      }
      await exportRowsAsXlsx({
        filename:  `${fileBase}.xlsx`,
        sheetName: 'تقرير المبيعات',
        columns,
        rows: sortedSales,
        totalsRow,
      })
    } catch (err) {
      toast.error('فشل تصدير ملف Excel')
    } finally { setExporting(false) }
  }

  // ── PDF export ──────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    if (sortedSales.length === 0) return
    setExporting(true)
    try {
      // Wait one tick so the off-screen wrapper mounts before capture
      await new Promise(r => requestAnimationFrame(r))
      if (!pdfRef.current) throw new Error('pdf wrapper not mounted')
      await exportNodeAsPdf(pdfRef.current, `${fileBase}.pdf`)
    } catch (err) {
      toast.error('فشل تصدير ملف PDF')
    } finally { setExporting(false) }
  }

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
          <div className="field">
            <label>الحالة</label>
            <select className="input" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} data-testid="status-select">
              <option value="">جميع الحالات</option>
              <option value="pending">معلقة</option>
              <option value="sent">مرسلة</option>
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
          <div>
            <h2>تفاصيل المبيعات</h2>
            <span className="t-small">{sales.length.toLocaleString('ar-SA')} نتيجة</span>
          </div>
          <div className="rp-actions">
            <button
              type="button"
              className="rp-export-btn"
              onClick={handleExportExcel}
              disabled={exporting || sortedSales.length === 0}
              title="تصدير ملف Excel"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              type="button"
              className="rp-export-btn"
              onClick={handleExportPdf}
              disabled={exporting || sortedSales.length === 0}
              title="تصدير ملف PDF"
            >
              <FileDown size={14} /> PDF
            </button>
          </div>
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
                    <DraggableHeaderRow order={colOrder} onReorder={setColOrder}>
                      {colOrder.map(k => (
                        <DraggableSortHeader
                          key={k}
                          id={k}
                          label={REP_COL_META[k].label}
                          sortKey={sort.field}
                          sortDir={sort.dir}
                          onToggle={toggleSort}
                        />
                      ))}
                    </DraggableHeaderRow>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(s => (
                    <tr key={s.id}>
                      {colOrder.map(k => <td key={k}>{renderReportCell(s, k)}</td>)}
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

      {/* ── Off-screen PDF document — captured by html2canvas ──────────── */}
      {exporting && sortedSales.length > 0 && (
        <div className="rp-pdf-mount" aria-hidden="true">
          <div className="rp-pdf-doc" ref={pdfRef}>
            <div className="rp-pdf-header">
              <div className="rp-pdf-brand">
                <div className="rp-pdf-logo-wrap">عروة</div>
                <div className="rp-pdf-brand-text">
                  <div className="rp-pdf-brand-name">عروة</div>
                  <div className="rp-pdf-brand-sub">نظام إدارة المبيعات</div>
                </div>
              </div>
              <div className="rp-pdf-meta">
                <div className="rp-pdf-meta-row"><span>الفرع:</span><strong>{filterSummary.branchName}</strong></div>
                <div className="rp-pdf-meta-row"><span>الفترة:</span><strong>{filterSummary.monthName} {filterSummary.yearName}</strong></div>
                <div className="rp-pdf-meta-row"><span>الحالة:</span><strong>{filterSummary.statusName}</strong></div>
                <div className="rp-pdf-meta-row"><span>تاريخ الإصدار:</span><strong dir="ltr">{new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
              </div>
            </div>

            <div className="rp-pdf-banner">تقرير تفاصيل المبيعات</div>

            <div className="rp-pdf-kpis">
              <div className="rp-pdf-kpi"><div className="lbl">إجمالي المبيعات</div><div className="val">{fmt(kpis.total)} ر.س</div></div>
              <div className="rp-pdf-kpi"><div className="lbl">متوسط المبيعة</div><div className="val">{fmt(kpis.avg)} ر.س</div></div>
              <div className="rp-pdf-kpi"><div className="lbl">عدد السجلات</div><div className="val">{kpis.count.toLocaleString('ar-SA')}</div></div>
              <div className="rp-pdf-kpi"><div className="lbl">متوسط يومي</div><div className="val">{fmt(kpis.dailyAvg)} ر.س</div></div>
            </div>

            <table className="rp-pdf-tbl">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الفرع</th>
                  <th>النوع</th>
                  <th>رقم الفاتورة</th>
                  <th>المبلغ (ر.س)</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {sortedSales.map(s => (
                  <tr key={s.id}>
                    <td dir="ltr">{s.sale_date}</td>
                    <td>{s.branches?.code || '—'}</td>
                    <td>{s.input_type === 'daily' ? 'يومي' : s.input_type === 'monthly' ? 'شهري' : 'مخصص'}</td>
                    <td>{s.invoice_number || '—'}</td>
                    <td dir="ltr">{fmt(s.amount)}</td>
                    <td>{s.status === 'sent' ? 'مرسلة' : 'معلقة'}</td>
                  </tr>
                ))}
                <tr className="rp-pdf-total-row">
                  <td colSpan={4}>الإجمالي</td>
                  <td dir="ltr">{fmt(kpis.total)}</td>
                  <td>{kpis.count} سجل</td>
                </tr>
              </tbody>
            </table>

            <div className="rp-pdf-footer">
              تم إنشاء هذا التقرير تلقائياً من نظام عروة — {new Date().toLocaleString('ar-SA')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
