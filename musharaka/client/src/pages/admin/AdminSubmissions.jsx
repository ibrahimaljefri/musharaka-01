/**
 * Admin: Submissions — review + revert
 *
 * Tabular layout with metric cards, status pill filters, tenant picker,
 * and per-row revert action. Reverting a row marks the submission
 * 'reverted' and returns the linked sales for that branch+period to
 * 'pending' so the tenant can edit and re-send. Other branches of the
 * same tenant are unaffected.
 */
import { useState, useEffect, useMemo } from 'react'
import api from '../../lib/axiosClient'
import { TableSkeleton } from '../../components/SkeletonLoader'
import { toast } from '../../lib/useToast'
import ConfirmDialog from '../../components/ConfirmDialog'
import SearchableTenantSelect from '../../components/SearchableTenantSelect'
import { useSortable } from '../../lib/useSortable'
import DraggableHeaderRow from '../../components/DraggableHeaderRow'
import DraggableSortHeader from '../../components/DraggableSortHeader'
import { useColumnOrder } from '../../lib/useColumnOrder'
import {
  RotateCcw, Send, CheckCircle2, XCircle, Inbox,
} from 'lucide-react'
import './cenomi-admin.css'

const STATUS_TONE  = { sent: 'green', reverted: 'gold', failed: 'red' }
const STATUS_LABEL = { sent: 'مُرسل', reverted: 'تم التراجع', failed: 'فشل' }

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
function fmtAmountSAR(n) {
  return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtAmountPlain(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const SB_COLS = ['submitted_at', 'tenant_name', 'branch_name', 'period', 'total_amount', 'invoice_count', 'status']
const SB_COL_META = {
  submitted_at:  { label: 'تاريخ الإرسال' },
  tenant_name:   { label: 'المستأجر' },
  branch_name:   { label: 'الفرع' },
  period:        { label: 'الفترة' },
  total_amount:  { label: 'المبلغ الإجمالي' },
  invoice_count: { label: 'عدد الفواتير' },
  status:        { label: 'الحالة' },
}

function renderSubmissionCell(r, key) {
  switch (key) {
    case 'submitted_at':
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(r.submitted_at)}</span>
    case 'tenant_name':
      return <strong>{r.tenant_name || '—'}</strong>
    case 'branch_name':
      return (
        <span>
          {r.branch_name || '—'}
          {r.branch_code && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> ({r.branch_code})</span>}
        </span>
      )
    case 'period':
      return <span style={{ color: 'var(--text-muted)' }}>{fmtPeriod(r.period_start, r.period_end, r.post_mode)}</span>
    case 'total_amount':
      return (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {fmtAmountSAR(r.total_amount)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>ر.س</span>
        </span>
      )
    case 'invoice_count':
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.invoice_count ?? 0}</span>
    case 'status': {
      const tone = STATUS_TONE[r.status] || 'gray'
      return <span className={`cen-status-pill ${tone}`}>{STATUS_LABEL[r.status] || r.status}</span>
    }
    default:
      return '—'
  }
}

export default function AdminSubmissions() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState([])
  const [tenantId, setTenantId] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [confirmRow, setConfirmRow] = useState(null)
  const [reverting, setReverting] = useState(false)

  const [colOrder, setColOrder] = useColumnOrder(SB_COLS, 'adm_sb_col_order')

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

  // Sort across all columns; map computed/composite keys to a sortable value
  const getter = (row, key) => {
    if (key === 'total_amount')  return parseFloat(row.total_amount || 0)
    if (key === 'invoice_count') return Number(row.invoice_count || 0)
    if (key === 'period')        return row.period_start || ''
    if (key === 'submitted_at')  return row.submitted_at || ''
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
                aux={metrics.sentAmount > 0 ? `﷼ ${fmtAmountPlain(metrics.sentAmount)}` : null} />
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
      </div>

      {/* Table */}
      <div className="adm-tbl-wrap">
        {loading ? (
          <div style={{ padding: 16 }}>
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="adm-tbl">
            <thead>
              <tr>
                <DraggableHeaderRow order={colOrder} onReorder={setColOrder}>
                  {colOrder.map(k => (
                    <DraggableSortHeader
                      key={k}
                      id={k}
                      label={SB_COL_META[k].label}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onToggle={toggleSort}
                    />
                  ))}
                </DraggableHeaderRow>
                <th className="adm-th-actions">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id} className={r.status === 'reverted' ? 'cen-row-reverted' : undefined}>
                  {colOrder.map(k => <td key={k}>{renderSubmissionCell(r, k)}</td>)}
                  <td className="adm-td-actions">
                    {r.status === 'sent' ? (
                      <button
                        className="cen-row-revert-mini"
                        onClick={() => setConfirmRow(r)}
                        title="إعادة الإرسال إلى pending"
                      >
                        <RotateCcw size={11} /> إعادة التعيين
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

// Backwards-compat: CenomiLogs.jsx imports SortDropdown from this module.
// Now that both pages use draggable sortable headers, this component is
// effectively unused but exported to avoid breaking the import chain.
export function SortDropdown() { return null }
