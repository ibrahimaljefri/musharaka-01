/**
 * Admin: Cenomi Logs — request/response audit viewer
 *
 * Tabular layout. Each row expands in-place to reveal three JSON viewers
 * (request headers / request body / Cenomi response) with copy-to-clipboard
 * buttons. The x-api-key header is server-side redacted to "***" before
 * insert into cenomi_logs — never leaves the DB.
 */
import { useState, useEffect, useMemo, Fragment } from 'react'
import api from '../../lib/axiosClient'
import { TableSkeleton } from '../../components/SkeletonLoader'
import Pagination from '../../components/Pagination'
import { toast } from '../../lib/useToast'
import SearchableTenantSelect from '../../components/SearchableTenantSelect'
import { useSortable } from '../../lib/useSortable'
import DraggableHeaderRow from '../../components/DraggableHeaderRow'
import DraggableSortHeader from '../../components/DraggableSortHeader'
import { useColumnOrder } from '../../lib/useColumnOrder'
import {
  ChevronDown, ChevronUp, Copy, Check, FileText,
  CheckCircle2, XCircle, WifiOff, Activity,
} from 'lucide-react'
import './cenomi-admin.css'

const PAGE_SIZE = 25

function classifyTone(status) {
  if (status == null)                return 'gray'
  if (status >= 200 && status < 300) return 'green'
  return 'red'
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'medium' })
}

const CL_COLS = ['created_at', 'tenant_name', 'branch_name', 'request_url', 'response_status', 'error_message']
const CL_COL_META = {
  created_at:      { label: 'التاريخ' },
  tenant_name:     { label: 'المستأجر' },
  branch_name:     { label: 'الفرع' },
  request_url:     { label: 'رابط الطلب' },
  response_status: { label: 'رمز الاستجابة' },
  error_message:   { label: 'رسالة الخطأ' },
}

function renderLogCell(r, key) {
  switch (key) {
    case 'created_at':
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(r.created_at)}</span>
    case 'tenant_name':
      return <strong>{r.tenant_name || '—'}</strong>
    case 'branch_name': {
      if (!r.branch_name && !r.branch_code) return <span style={{ color: 'var(--text-muted)' }}>—</span>
      return (
        <span>
          {r.branch_name || '—'}
          {r.branch_code && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> ({r.branch_code})</span>}
        </span>
      )
    }
    case 'request_url': {
      const url = r.request_url || '—'
      return <span className="adm-truncate mono" title={url}>{url}</span>
    }
    case 'response_status': {
      const s = r.response_status
      const tone = classifyTone(s)
      const label = s == null ? 'بدون رد' : String(s)
      return <span className={`cen-status-pill ${tone}`}>{label}</span>
    }
    case 'error_message': {
      const msg = r.error_message || ''
      if (!msg) return <span style={{ color: 'var(--text-muted)' }}>—</span>
      return <span className="adm-truncate" title={msg} style={{ color: '#dc2626' }}>{msg}</span>
    }
    default:
      return '—'
  }
}

export default function CenomiLogs() {
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [tenants, setTenants] = useState([])

  // Filters
  const [tenantId, setTenantId]     = useState('')
  const [from, setFrom]             = useState('')
  const [to, setTo]                 = useState('')
  const [statusFilter, setStatusFilter] = useState(null)   // null | '2xx' | '4xx' | 'none'

  const [expanded, setExpanded] = useState({})

  const [colOrder, setColOrder] = useColumnOrder(CL_COLS, 'adm_cl_col_order')

  useEffect(() => {
    api.get('/admin/tenants').then(({ data }) => setTenants(data || [])).catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
      if (tenantId) params.tenant_id = tenantId
      if (from)     params.from      = from
      if (to)       params.to        = to
      const { data } = await api.get('/admin/cenomi-logs', { params })
      setRows(data.rows || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تحميل السجلات')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, tenantId, from, to])
  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [tenantId, from, to, statusFilter])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  // Status filter is applied client-side over the loaded page.
  const filtered = useMemo(() => {
    if (!statusFilter) return rows
    return rows.filter(r => {
      const s = r.response_status
      if (statusFilter === '2xx')  return s != null && s >= 200 && s < 300
      if (statusFilter === '4xx')  return s != null && s >= 400
      if (statusFilter === 'none') return s == null
      return true
    })
  }, [rows, statusFilter])

  // Metrics computed from the full page (not filtered subset)
  const metrics = useMemo(() => {
    const m = { total: rows.length, ok: 0, fail: 0, none: 0 }
    for (const r of rows) {
      const s = r.response_status
      if (s == null)                m.none++
      else if (s >= 200 && s < 300) m.ok++
      else                          m.fail++
    }
    return m
  }, [rows])
  const successRate = metrics.total > 0 ? Math.round((metrics.ok / metrics.total) * 100) : null

  // Sort over the filtered rows
  const getter = (row, key) => {
    if (key === 'response_status') return row.response_status == null ? -1 : Number(row.response_status)
    return row?.[key]
  }
  const { sorted, sortKey, sortDir, toggle: toggleSort } = useSortable(filtered, 'created_at', 'desc', getter)

  const clearFilters = () => {
    setTenantId(''); setFrom(''); setTo(''); setStatusFilter(null)
  }

  const toggleRow = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  return (
    <div className="cen-page">
      <div className="cen-page-head">
        <h1 className="cen-page-title">سجلات سينومي</h1>
        <div className="cen-page-sub">
          كل محاولة إرسال إلى Cenomi — للفحص والمراجعة الجنائية. التوكن مُخفي تلقائياً (***).
        </div>
      </div>

      {/* Metric cards */}
      <div className="cen-metrics">
        <Metric icon={Activity}     tone="gray"  value={total}        label="إجمالي المحاولات" />
        <Metric icon={CheckCircle2} tone="green" value={metrics.ok}   label="ناجح (2xx)"
                aux={successRate != null ? `${successRate}%` : null} />
        <Metric icon={XCircle}      tone="red"   value={metrics.fail} label="فشل (4xx/5xx)" />
        <Metric icon={WifiOff}      tone="gray"  value={metrics.none} label="بدون رد (انقطاع)" />
      </div>

      {/* Filters */}
      <div className="cen-filters">
        <div className="cen-filter-row">
          <Pill active={statusFilter === null}  onClick={() => setStatusFilter(null)}  label="الكل"     count={metrics.total} />
          <Pill active={statusFilter === '2xx'}  onClick={() => setStatusFilter('2xx')}  label="ناجح"      count={metrics.ok} />
          <Pill active={statusFilter === '4xx'}  onClick={() => setStatusFilter('4xx')}  label="فشل"        count={metrics.fail} />
          <Pill active={statusFilter === 'none'} onClick={() => setStatusFilter('none')} label="بدون رد"   count={metrics.none} />
        </div>
        <SearchableTenantSelect tenants={tenants} value={tenantId} onChange={setTenantId} />
        <input className="cen-input" type="date" dir="ltr" value={from}
               onChange={e => setFrom(e.target.value)} placeholder="من" title="من تاريخ" />
        <input className="cen-input" type="date" dir="ltr" value={to}
               onChange={e => setTo(e.target.value)} placeholder="إلى" title="إلى تاريخ" />
        {(tenantId || from || to || statusFilter) && (
          <button className="cen-btn-ghost" onClick={clearFilters}>مسح</button>
        )}
      </div>

      {/* Table */}
      <div className="adm-tbl-wrap">
        {loading ? (
          <div style={{ padding: 16 }}>
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <table className="adm-tbl">
              <thead>
                <tr>
                  <DraggableHeaderRow order={colOrder} onReorder={setColOrder}>
                    {colOrder.map(k => (
                      <DraggableSortHeader
                        key={k}
                        id={k}
                        label={CL_COL_META[k].label}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onToggle={toggleSort}
                      />
                    ))}
                  </DraggableHeaderRow>
                  <th className="cen-th-actions">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const isOpen = !!expanded[r.id]
                  return (
                    <Fragment key={r.id}>
                      <tr>
                        {colOrder.map(k => <td key={k}>{renderLogCell(r, k)}</td>)}
                        <td>
                          <button className="cen-expand-btn" onClick={() => toggleRow(r.id)}>
                            {isOpen
                              ? <><ChevronUp size={12} /> إخفاء</>
                              : <><ChevronDown size={12} /> عرض</>}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="cen-expand-row">
                          <td colSpan={colOrder.length + 1}>
                            <div className="cen-expand">
                              <JsonBlock title="Request headers (token redacted)" data={r.request_headers} />
                              <JsonBlock title="Request body" data={r.request_body} />
                              <JsonBlock
                                title={`Cenomi response — ${r.response_status != null ? `HTTP ${r.response_status}` : 'لا يوجد رد (فشل اتصال)'}`}
                                data={r.response_body || (r.error_message ? { error: r.error_message } : null)}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>

            <div className="cen-pagination">
              <span className="cen-pagination-info">
                عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} من {total}
              </span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Metric({ icon: Icon, tone, value, label, aux }) {
  return (
    <div className={`cen-metric ${tone}`}>
      <div className="cen-metric-icon"><Icon size={18} /></div>
      <div className="cen-metric-body">
        <div className="cen-metric-value">{value}</div>
        <div className="cen-metric-label">{label}</div>
        {aux && <div className="cen-metric-aux">{aux}</div>}
      </div>
    </div>
  )
}

function Pill({ active, onClick, label, count }) {
  return (
    <button onClick={onClick} className={`cen-pill ${active ? 'active' : ''}`}>
      <span>{label}</span>
      {typeof count === 'number' && <span className="count">{count}</span>}
    </button>
  )
}

function JsonBlock({ title, data }) {
  const [copied, setCopied] = useState(false)
  const text = data == null ? '—' : JSON.stringify(data, null, 2)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('فشل النسخ — يرجى تحديده يدوياً')
    }
  }

  return (
    <div className="cen-json-block">
      <div className="cen-json-head">
        <span>{title}</span>
        {data != null && (
          <button className={`cen-copy-btn ${copied ? 'copied' : ''}`} onClick={onCopy}>
            {copied ? <><Check size={11} /> نُسخ</> : <><Copy size={11} /> نسخ</>}
          </button>
        )}
      </div>
      <pre className="cen-json-body">{text}</pre>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="cen-empty">
      <div className="cen-empty-icon"><FileText size={20} /></div>
      <div className="cen-empty-title">لا توجد سجلات</div>
      <div className="cen-empty-desc">
        ستظهر هنا كل محاولة إرسال إلى Cenomi (سواء نجحت أو فشلت) للفحص والمراجعة.
      </div>
    </div>
  )
}
