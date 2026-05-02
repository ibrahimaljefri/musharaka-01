/**
 * Admin: Submissions — review + revert
 *
 * Card-row layout with traffic-light status bars (green=sent, gold=reverted,
 * red=failed). 4 metric cards at the top show the distribution at a glance.
 * Reverting a row marks the submission 'reverted' and returns the linked
 * sales for that branch+period to 'pending' so the tenant can edit and
 * re-send. Other branches of the same tenant are unaffected.
 */
import { useState, useEffect, useMemo } from 'react'
import api from '../../lib/axiosClient'
import { TableSkeleton } from '../../components/SkeletonLoader'
import { toast } from '../../lib/useToast'
import ConfirmDialog from '../../components/ConfirmDialog'
import SearchableTenantSelect from '../../components/SearchableTenantSelect'
import { useSortable } from '../../lib/useSortable'
import {
  RotateCcw, Send, CheckCircle2, XCircle, Inbox, Calendar, GitBranch,
  Building2,
} from 'lucide-react'
import './cenomi-admin.css'

const STATUS_CLASS = { sent: 'green', reverted: 'gold', failed: 'red' }
const STATUS_LABEL = { sent: 'مُرسل', reverted: 'تم التراجع', failed: 'فشل' }
const STATUS_ICON  = { sent: CheckCircle2, reverted: RotateCcw, failed: XCircle }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
}
function fmtPeriod(start, end, mode) {
  if (!start || !end) return '—'
  const modeChip = mode === 'daily' ? 'يومي' : 'شهري'
  if (start === end) return `${fmtDate(start)} · ${modeChip}`
  return `${fmtDate(start)} → ${fmtDate(end)} · ${modeChip}`
}
function fmtAmount(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AdminSubmissions() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState([])
  const [tenantId, setTenantId] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [confirmRow, setConfirmRow] = useState(null)
  const [reverting, setReverting] = useState(false)

  useEffect(() => {
    api.get('/admin/tenants').then(({ data }) => setTenants(data || [])).catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const params = { limit: 200 }
      if (tenantId) params.tenant_id = tenantId
      // Note: NOT passing status here — we want all rows for the metric cards.
      // The status filter is applied client-side below.
      const { data } = await api.get('/admin/submissions', { params })
      setRows(data || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تحميل الإرسالات')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tenantId])

  // Metrics (computed from full list, before status filter)
  const metrics = useMemo(() => {
    const m = { total: rows.length, sent: 0, reverted: 0, failed: 0, sentAmount: 0 }
    for (const r of rows) {
      if (r.status === 'sent')     { m.sent++;     m.sentAmount += parseFloat(r.total_amount || 0) }
      if (r.status === 'reverted')   m.reverted++
      if (r.status === 'failed')     m.failed++
    }
    return m
  }, [rows])

  const filtered = useMemo(
    () => statusFilter ? rows.filter(r => r.status === statusFilter) : rows,
    [rows, statusFilter]
  )

  // Card-row layout — sort via dropdown above the cards
  const getter = (row, key) => {
    if (key === 'total_amount') return parseFloat(row.total_amount || 0)
    if (key === 'invoice_count') return Number(row.invoice_count || 0)
    return row?.[key]
  }
  const { sorted, sortKey, sortDir, toggle: toggleSort } = useSortable(filtered, 'submitted_at', 'desc', getter)

  const handleRevert = async () => {
    if (!confirmRow) return
    setReverting(true)
    try {
      const { data } = await api.post(`/admin/submissions/${confirmRow.id}/revert`)
      toast.success(data.message || 'تم التراجع عن الإرسال')
      setConfirmRow(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل التراجع عن الإرسال')
    } finally { setReverting(false) }
  }

  return (
    <div className="cen-page">
      <div className="cen-page-head">
        <h1 className="cen-page-title">مراجعة الإرسالات</h1>
        <div className="cen-page-sub">
          نظرة عامة على جميع إرسالات سينومي · يمكنك التراجع عن أي إرسال للسماح للمستأجر بالتعديل وإعادة الإرسال
        </div>
      </div>

      {/* Metric cards */}
      <div className="cen-metrics">
        <Metric icon={Inbox}        tone="gray"  value={metrics.total}    label="إجمالي الإرسالات" />
        <Metric icon={CheckCircle2} tone="green" value={metrics.sent}     label="مُرسل بنجاح"
                aux={metrics.sentAmount > 0 ? `﷼ ${fmtAmount(metrics.sentAmount)}` : null} />
        <Metric icon={RotateCcw}    tone="gold"  value={metrics.reverted} label="تم التراجع" />
        <Metric icon={XCircle}      tone="red"   value={metrics.failed}   label="فشل" />
      </div>

      {/* Filters: status pills with counts + tenant dropdown */}
      <div className="cen-filters">
        <div className="cen-filter-row">
          <Pill active={statusFilter === null}       onClick={() => setStatusFilter(null)}      label="الكل"        count={metrics.total} />
          <Pill active={statusFilter === 'sent'}     onClick={() => setStatusFilter('sent')}    label="مُرسل"        count={metrics.sent} />
          <Pill active={statusFilter === 'reverted'} onClick={() => setStatusFilter('reverted')} label="تم التراجع"  count={metrics.reverted} />
          <Pill active={statusFilter === 'failed'}   onClick={() => setStatusFilter('failed')}  label="فشل"          count={metrics.failed} />
        </div>
        <SearchableTenantSelect tenants={tenants} value={tenantId} onChange={setTenantId} />
        <SortDropdown sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} options={[
          { k: 'submitted_at',  label: 'تاريخ الإرسال' },
          { k: 'tenant_name',   label: 'المستأجر' },
          { k: 'branch_name',   label: 'الفرع' },
          { k: 'total_amount',  label: 'المبلغ' },
          { k: 'invoice_count', label: 'عدد الفواتير' },
          { k: 'status',        label: 'الحالة' },
        ]} />
      </div>

      {/* Rows */}
      {loading ? (
        <div className="cen-row" style={{ padding: 20 }}><TableSkeleton rows={4} cols={1} /></div>
      ) : sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="cen-rows">
          {sorted.map(r => (
            <SubmissionRow key={r.id} row={r} onRevert={setConfirmRow} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRow}
        title="تأكيد التراجع عن الإرسال"
        message={confirmRow
          ? `سيتم إرجاع جميع المبيعات للفترة ${fmtPeriod(confirmRow.period_start, confirmRow.period_end, confirmRow.post_mode)} ` +
            `للفرع ${confirmRow.branch_name} (${confirmRow.branch_code}) إلى حالة "معلَّقة" بحيث يمكن للمستأجر ` +
            `تعديلها وإعادة إرسالها إلى سينومي. الفروع الأخرى لن تتأثر.`
          : ''}
        onConfirm={reverting ? () => {} : handleRevert}
        onCancel={() => { if (!reverting) setConfirmRow(null) }}
        danger={false}
      />
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

function SubmissionRow({ row, onRevert }) {
  const Icon  = STATUS_ICON[row.status] || Send
  const tone  = STATUS_CLASS[row.status] || 'gray'
  const isReverted = row.status === 'reverted'
  return (
    <div className={`cen-row ${tone} ${isReverted ? 'faded' : ''}`}>
      <div className="cen-row-top">
        <div className="cen-row-meta">
          <span className={`cen-status ${tone}`}>
            <Icon size={12} /> {STATUS_LABEL[row.status] || row.status}
          </span>
          <span className="cen-row-time">{fmtDateTime(row.submitted_at)}</span>
        </div>
        <div className="cen-row-actions">
          {row.status === 'sent' && (
            <button className="cen-revert-btn" onClick={() => onRevert(row)}
                    title="إعادة الإرسال إلى pending">
              <RotateCcw size={12} /> إعادة التعيين
            </button>
          )}
        </div>
      </div>

      <div className="cen-row-body">
        <div className="cen-row-line">
          <Building2 size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          <strong>{row.tenant_name || '—'}</strong>
          <span className="muted">→</span>
          <GitBranch size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          <span>{row.branch_name} <span className="muted">({row.branch_code})</span></span>
        </div>
        <div className="cen-row-line">
          <Calendar size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          <span className="muted">{fmtPeriod(row.period_start, row.period_end, row.post_mode)}</span>
          <span className="cen-chip">{row.invoice_count} فاتورة</span>
          <span className="cen-chip" style={{ fontWeight: 600 }}>﷼ {fmtAmount(row.total_amount)}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="cen-empty">
      <div className="cen-empty-icon"><Send size={20} /></div>
      <div className="cen-empty-title">لا توجد إرسالات</div>
      <div className="cen-empty-desc">
        ستظهر هنا جميع إرسالات سينومي بمجرد قيام أي مستأجر بالضغط على "إرسال الفواتير".
      </div>
    </div>
  )
}

// Card-row pages can't use SortHeader on a <th>; this dropdown gives super-admin
// the same sort capability for the cen-row layout.
export function SortDropdown({ sortKey, sortDir, onToggle, options }) {
  return (
    <select
      className="cen-input"
      value={`${sortKey}:${sortDir}`}
      onChange={e => {
        const [k, d] = e.target.value.split(':')
        // Toggle direction: call onToggle once for key change (sets asc),
        // then again if desc was requested
        if (k !== sortKey) onToggle(k)
        if (d === 'desc' && sortDir !== 'desc') onToggle(k)
      }}
      style={{ minWidth: 180 }}
      title="ترتيب حسب"
    >
      {options.flatMap(opt => [
        <option key={`${opt.k}:asc`}  value={`${opt.k}:asc`}>{`${opt.label} ↑`}</option>,
        <option key={`${opt.k}:desc`} value={`${opt.k}:desc`}>{`${opt.label} ↓`}</option>,
      ])}
    </select>
  )
}
