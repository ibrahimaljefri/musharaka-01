/**
 * Admin: Cenomi Logs — request/response audit viewer
 *
 * Card-row layout with traffic-light status bars (green=2xx, red=4xx/5xx,
 * gray=connection failure). Each row expands in-place to reveal three
 * JSON viewers (request headers / request body / Cenomi response) with
 * copy-to-clipboard buttons. The x-api-key header is server-side
 * redacted to "***" before insert into cenomi_logs — never leaves the DB.
 */
import { useState, useEffect, useMemo } from 'react'
import api from '../../lib/axiosClient'
import { TableSkeleton } from '../../components/SkeletonLoader'
import Pagination from '../../components/Pagination'
import { toast } from '../../lib/useToast'
import SearchableTenantSelect from '../../components/SearchableTenantSelect'
import { useSortable } from '../../lib/useSortable'
import { SortDropdown } from './AdminSubmissions'
import {
  ChevronDown, ChevronUp, Copy, Check, FileText,
  CheckCircle2, XCircle, WifiOff, Activity, Building2, GitBranch,
} from 'lucide-react'
import './cenomi-admin.css'

const PAGE_SIZE = 25

function classify(status) {
  if (status == null)              return { tone: 'gray',  label: 'بدون رد' }
  if (status >= 200 && status < 300) return { tone: 'green', label: String(status) }
  return { tone: 'red', label: String(status) }
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'medium' })
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
  // (Server-side filtering by HTTP-status range would require an extra
  // index; the audit log is naturally bounded by the date range so
  // local filtering is fine.)
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
      if (s == null)              m.none++
      else if (s >= 200 && s < 300) m.ok++
      else                         m.fail++
    }
    return m
  }, [rows])
  const successRate = metrics.total > 0 ? Math.round((metrics.ok / metrics.total) * 100) : null

  // Sort over the filtered rows
  const { sorted, sortKey, sortDir, toggle: toggleSort } = useSortable(filtered, 'created_at', 'desc')

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
        <SortDropdown sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} options={[
          { k: 'created_at',      label: 'التاريخ' },
          { k: 'tenant_name',     label: 'المستأجر' },
          { k: 'branch_name',     label: 'الفرع' },
          { k: 'response_status', label: 'الحالة' },
        ]} />
      </div>

      {/* Rows */}
      {loading ? (
        <div className="cen-row" style={{ padding: 20 }}><TableSkeleton rows={4} cols={1} /></div>
      ) : sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="cen-rows">
            {sorted.map(r => (
              <LogRow key={r.id} row={r} expanded={!!expanded[r.id]} onToggle={() => toggleRow(r.id)} />
            ))}
          </div>

          <div className="cen-pagination">
            <span className="cen-pagination-info">
              عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} من {total}
            </span>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
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

function LogRow({ row, expanded, onToggle }) {
  const { tone, label } = classify(row.response_status)
  return (
    <div className={`cen-row ${tone}`}>
      <div className="cen-row-top">
        <div className="cen-row-meta">
          <span className={`cen-status ${tone}`}>{label}</span>
          <span className="cen-row-time">{fmtDateTime(row.created_at)}</span>
        </div>
        <div className="cen-row-actions">
          <button className="cen-expand-btn" onClick={onToggle}>
            {expanded
              ? <><ChevronUp size={12} /> إخفاء</>
              : <><ChevronDown size={12} /> عرض التفاصيل</>}
          </button>
        </div>
      </div>

      <div className="cen-row-body">
        <div className="cen-row-line">
          <Building2 size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          <strong>{row.tenant_name || '—'}</strong>
          {row.branch_code && (
            <>
              <span className="muted">·</span>
              <GitBranch size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              <span>{row.branch_name} <span className="muted">({row.branch_code})</span></span>
            </>
          )}
        </div>
        <div className="cen-row-url" title={row.request_url}>POST {row.request_url}</div>
        {row.error_message && <div className="cen-row-error">⚠ {row.error_message}</div>}
      </div>

      {expanded && (
        <div className="cen-expand">
          <JsonBlock title="Request headers (token redacted)" data={row.request_headers} />
          <JsonBlock title="Request body" data={row.request_body} />
          <JsonBlock
            title={`Cenomi response — ${row.response_status != null ? `HTTP ${row.response_status}` : 'لا يوجد رد (فشل اتصال)'}`}
            data={row.response_body || (row.error_message ? { error: row.error_message } : null)}
          />
        </div>
      )}
    </div>
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
