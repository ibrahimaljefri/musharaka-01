import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import BranchBadge from '../components/BranchBadge'
import Pagination from '../components/Pagination'
import { useSortable } from '../lib/useSortable'
import DraggableHeaderRow from '../components/DraggableHeaderRow'
import DraggableSortHeader from '../components/DraggableSortHeader'
import { useColumnOrder } from '../lib/useColumnOrder'
import { exportNodeAsPdf } from '../lib/pdfExport'
import { toast } from '../lib/useToast'
import { ChevronDown, ChevronUp, Send, AlertCircle, FileDown } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import './submissions.css'

const SUBMISSIONS_PAGE_SIZE = 10
const MONTHS_AR = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const YEARS = Array.from({ length: 6 }, (_, i) => 2021 + i)

function fmt(n) { return Number(n||0).toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2}) }

const SUB_COLS = ['sale_date', 'invoice_number', 'amount']
const SUB_COL_META = {
  sale_date:      { label: 'التاريخ' },
  invoice_number: { label: 'رقم الفاتورة' },
  amount:         { label: 'المبلغ (ر.س)' },
}

function renderSubCell(s, key) {
  switch (key) {
    case 'sale_date':      return <span dir="ltr">{s.sale_date}</span>
    case 'invoice_number': return s.invoice_number || '—'
    case 'amount':         return <span style={{ fontWeight: 600 }}>{fmt(s.amount)}</span>
    default:               return '—'
  }
}

function MissingDays({ sentDates, month, year }) {
  if (!sentDates || sentDates.length === 0) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  // Build YYYY-MM-DD strings directly — avoids the timezone shift caused by
  // .toISOString() on a local-midnight Date in non-UTC timezones (e.g. SA = UTC+3).
  const mm = String(month).padStart(2, '0')
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dd = String(i + 1).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  })
  const sentSet = new Set(sentDates)
  const missing = allDays.filter(d => !sentSet.has(d))
  if (missing.length === 0) return (
    <div className="sm-missing"><span className="ok">لا توجد أيام ناقصة — جميع أيام الشهر مُغطاة</span></div>
  )
  const groups = []; let start = missing[0], prev = missing[0]
  for (let i = 1; i < missing.length; i++) {
    const curr = missing[i]
    const p = new Date(prev); p.setDate(p.getDate() + 1)
    if (p.toISOString().split('T')[0] !== curr) {
      groups.push({ start, end: prev }); start = curr
    }
    prev = curr
  }
  groups.push({ start, end: prev })
  return (
    <div className="sm-missing">
      <div className="h">الأيام غير المُرسلة ({missing.length} يوم):</div>
      <div className="chips">
        {groups.map((g, i) => (
          <span key={i} className="chip" dir="ltr">
            {g.start === g.end ? g.start : `${g.start} → ${g.end}`}
          </span>
        ))}
      </div>
    </div>
  )
}

function SubmissionCard({ sub }) {
  const [open, setOpen] = useState(false)
  const [sales, setSales] = useState([])
  const [loadingSales, setLoadingSales] = useState(false)
  const [exporting, setExporting] = useState(false)
  const printRef = useRef(null)

  const toggle = async () => {
    if (!open && sales.length === 0) {
      setLoadingSales(true)
      try {
        // submission_id is now respected by the server (sales.js was patched
        // to accept the param). Returns ONLY rows linked to this submission.
        const { data } = await api.get('/sales', { params: { submission_id: sub.id, limit: 5000 } })
        setSales(data?.sales || [])
      } catch { setSales([]) }
      setLoadingSales(false)
    }
    setOpen(o => !o)
  }

  const sentDates = sales.map(s => s.sale_date)
  // Sort the row table inside the expanded card
  const { sorted: sortedSales, sortKey, sortDir, toggle: toggleSort } = useSortable(sales, 'sale_date', 'asc')
  const [colOrder, setColOrder] = useColumnOrder(SUB_COLS, 'sub_col_order')

  // PDF export — html2canvas + jsPDF, lazy loaded
  const handleExportPdf = async (e) => {
    e.stopPropagation()
    setExporting(true)
    try {
      // Wait two animation frames so React has mounted the off-screen
      // wrapper (which only renders when exporting === true) and the
      // browser has had a chance to lay it out before we capture.
      await new Promise(r => requestAnimationFrame(r))
      await new Promise(r => requestAnimationFrame(r))
      if (!printRef.current) throw new Error('PDF wrapper not mounted')
      const fname = `submission-${sub.branches?.code || 'branch'}-${sub.month}-${sub.year}.pdf`
      await exportNodeAsPdf(printRef.current, fname)
    } catch (err) {
      toast.error('فشل تصدير PDF — يرجى المحاولة مجدداً')
    } finally { setExporting(false) }
  }

  return (
    <div className="sm-card" data-testid="submission-card">
      <button type="button" className="sm-card-head" onClick={toggle} data-testid="expand-submission">
        <div className="sm-card-left">
          <BranchBadge code={sub.branches?.code || '?'} />
          <div>
            <div className="sm-card-branch">{sub.branches?.name}</div>
            <div className="sm-card-period">{MONTHS_AR[sub.month]} {sub.year}</div>
          </div>
        </div>
        <div className="sm-card-right">
          <div className="sm-card-stat">
            <div className="lbl">عدد الفواتير</div>
            <div className="val">{sub.invoice_count}</div>
          </div>
          <div className="sm-card-stat val-money">
            <div className="lbl">الإجمالي</div>
            <div className="val">{fmt(sub.total_amount)} ر.س</div>
          </div>
          {sub.status === 'reverted'
            ? <span className="sm-pill" style={{ background: 'rgba(120,113,108,0.12)', color: '#78716c', textDecoration: 'line-through' }}>تم التراجع</span>
            : sub.status === 'failed'
              ? <span className="sm-pill" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>فشل</span>
              : <span className="sm-pill keep">مُرسل</span>}
          {open
            ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          }
        </div>
      </button>

      {open && (
        <div className="sm-card-body">
          {loadingSales ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} className="sm-loading-card" />)}
            </div>
          ) : sales.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              لا توجد سجلات فاتورة مرتبطة بهذا الإرسال (قد يكون إرسالاً قديماً قبل ربط الفواتير).
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button
                  type="button"
                  className="sm-export-btn"
                  onClick={handleExportPdf}
                  disabled={exporting}
                  title="تصدير ملف PDF بمحتوى هذا الإرسال"
                >
                  <FileDown size={14} /> {exporting ? 'جاري التصدير…' : 'تصدير PDF'}
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="sm-tbl">
                  <thead>
                    <tr>
                      <DraggableHeaderRow order={colOrder} onReorder={setColOrder}>
                        {colOrder.map(k => (
                          <DraggableSortHeader
                            key={k}
                            id={k}
                            label={SUB_COL_META[k].label}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onToggle={toggleSort}
                          />
                        ))}
                      </DraggableHeaderRow>
                      <th>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSales.map(s => (
                      <tr key={s.id}>
                        {colOrder.map(k => <td key={k}>{renderSubCell(s, k)}</td>)}
                        <td>{s.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <MissingDays sentDates={sentDates} month={sub.month} year={sub.year} />

              {/* ── Off-screen polished PDF document — captured by html2canvas ── */}
              {exporting && (
                <div className="sm-pdf-mount" aria-hidden="true">
                  <div className="sm-pdf-doc" ref={printRef}>
                    <div className="sm-pdf-titleblock">
                      <h1 className="sm-pdf-title">تقرير إرسال فواتير المبيعات</h1>
                      <div className="sm-pdf-subtitle-row">
                        <span className="lbl">التقرير للفترة:</span>
                        <strong>{MONTHS_AR[sub.month]} {sub.year}</strong>
                      </div>
                      <div className="sm-pdf-subtitle-row">
                        <span className="lbl">الفرع:</span>
                        <strong>{sub.branches?.name} ({sub.branches?.code})</strong>
                      </div>
                      {sub.contract_number && (
                        <div className="sm-pdf-subtitle-row">
                          <span className="lbl">رقم العقد:</span>
                          <strong dir="ltr">{sub.contract_number}</strong>
                        </div>
                      )}
                      <div className="sm-pdf-subtitle-row">
                        <span className="lbl">تاريخ الإصدار:</span>
                        <strong dir="ltr">{new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      </div>
                    </div>

                    <div className="sm-pdf-kpis">
                      <div className="sm-pdf-kpi"><div className="lbl">إجمالي المبيعات</div><div className="val">{fmt(sub.total_amount)} ر.س</div></div>
                      <div className="sm-pdf-kpi"><div className="lbl">عدد الفواتير</div><div className="val">{sub.invoice_count}</div></div>
                    </div>

                    <h2 className="sm-pdf-section-title">تفاصيل الفواتير المُرسَلة</h2>
                    <table className="sm-pdf-tbl">
                      <thead>
                        <tr>
                          <th>التاريخ</th>
                          <th>رقم الفاتورة</th>
                          <th>المبلغ</th>
                          <th>ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSales.map(s => (
                          <tr key={s.id}>
                            <td dir="ltr">{(s.sale_date || '').slice(0, 10)}</td>
                            <td>{s.invoice_number || '—'}</td>
                            <td dir="ltr">{fmt(s.amount)} ر.س</td>
                            <td>{s.notes || '—'}</td>
                          </tr>
                        ))}
                        <tr className="sm-pdf-total-row">
                          <td colSpan={2}>الإجمالي</td>
                          <td dir="ltr">{fmt(sub.total_amount)} ر.س</td>
                          <td>{sub.invoice_count} فاتورة</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Submissions() {
  const [branches, setBranches]       = useState([])
  const [submissions, setSubmissions] = useState([])
  const [filters, setFilters]         = useState({ branch_id: '', month: '', year: '', status: '' })
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    api.get('/branches')
      .then(({ data }) => setBranches(Array.isArray(data) ? data : (data?.branches || [])))
      .catch(() => setBranches([]))
    load({})
  }, [])

  async function load(f) {
    setLoading(true)
    try {
      const params = { limit: 1000 }
      if (f.branch_id) params.branch_id = f.branch_id
      if (f.month)     params.month     = f.month
      if (f.year)      params.year      = f.year
      if (f.status)    params.status    = f.status
      const { data } = await api.get('/submissions', { params })
      const rows = data?.submissions || []
      const branchMap = new Map(branches.map(b => [b.id, b]))
      const enriched = rows.map(r => {
        const b = branchMap.get(r.branch_id)
        return {
          ...r,
          branches: r.branch_code
            ? { code: r.branch_code, name: r.branch_name }
            : (b ? { code: b.code, name: b.name } : null),
          contract_number: r.contract_number || b?.contract_number || null,
        }
      })
      setSubmissions(enriched)
    } catch { setSubmissions([]) }
    setLoading(false)
  }

  return (
    <div className="submissions-page">
      <div className="sm-header">
        <div>
          <h1 className="sm-title">تقرير الإرسالات</h1>
          <div className="t-small">سجلات الإرساليات المُنفّذة لكل فرع وفترة</div>
        </div>
        <Link to="/submit" className="btn btn-primary">
          <Send size={15} /> إرسال جديد
        </Link>
      </div>

      <div className="surface">
        <div className="sm-filter-bar">
          <div className="field">
            <label>الفرع</label>
            <select className="input" value={filters.branch_id} onChange={e => setFilters(f => ({...f, branch_id: e.target.value}))} data-testid="branch-select">
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>الشهر</label>
            <select className="input" value={filters.month} onChange={e => setFilters(f => ({...f, month: e.target.value}))} data-testid="month-select">
              <option value="">الكل</option>
              {[...Array(12)].map((_,i) => <option key={i+1} value={i+1}>{MONTHS_AR[i+1]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>السنة</label>
            <select className="input" value={filters.year} onChange={e => setFilters(f => ({...f, year: e.target.value}))} data-testid="year-select">
              <option value="">الكل</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field">
            <label>الحالة</label>
            <select
              className="input"
              value={filters.status}
              onChange={e => setFilters(f => ({...f, status: e.target.value}))}
              data-testid="status-select"
            >
              <option value="">جميع الحالات</option>
              <option value="sent">مُرسل</option>
              <option value="failed">فشل</option>
              <option value="reverted">تم التراجع</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => load(filters)}>
            بحث
          </button>
        </div>
      </div>

      {loading ? (
        <div className="sm-list">
          {[1,2,3].map(i => <div key={i} className="sm-loading-card" />)}
        </div>
      ) : submissions.length === 0 ? (
        <div className="sm-empty">
          <EmptyState
            icon={AlertCircle}
            title="لا توجد إرسالات"
            description="لا توجد إرسالات في الفترة المحددة — جرّب تغيير عوامل التصفية أو أنشئ إرسالاً جديداً"
            action={
              <Link to="/submit" className="btn btn-primary">
                <Send size={15} /> إرسال جديد
              </Link>
            }
          />
        </div>
      ) : (
        <SubmissionsList submissions={submissions} />
      )}
    </div>
  )
}

function SubmissionsList({ submissions }) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [submissions])
  const totalPages  = Math.max(1, Math.ceil(submissions.length / SUBMISSIONS_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged       = submissions.slice((currentPage - 1) * SUBMISSIONS_PAGE_SIZE, currentPage * SUBMISSIONS_PAGE_SIZE)

  return (
    <div className="sm-list">
      {paged.map(sub => <SubmissionCard key={sub.id} sub={sub} />)}
      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
