/**
 * Admin: Submissions — review + revert
 *
 * Reads from GET /api/admin/submissions (filterable by tenant + status).
 * Super-admin can revert a 'sent' submission via the "إعادة التعيين" button,
 * which calls POST /api/admin/submissions/:id/revert. The revert returns the
 * linked sales for that branch+period to 'pending' so the tenant can edit
 * and re-send. Other branches of the same tenant are unaffected.
 */
import { useState, useEffect, useMemo } from 'react'
import api from '../../lib/axiosClient'
import { TableSkeleton } from '../../components/SkeletonLoader'
import { toast } from '../../lib/useToast'
import ConfirmDialog from '../../components/ConfirmDialog'
import { RotateCcw } from 'lucide-react'

const STATUS_FILTERS = [
  { value: null,       label: 'الكل' },
  { value: 'sent',     label: 'مُرسل' },
  { value: 'reverted', label: 'تم التراجع' },
  { value: 'failed',   label: 'فشل' },
]

const STATUS_CLASS = {
  sent:     's-resolved',
  reverted: 's-progress',
  failed:   's-open',
}
const STATUS_LABELS = {
  sent:     'مُرسل',
  reverted: 'تم التراجع',
  failed:   'فشل',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
function fmtPeriod(start, end, mode) {
  if (!start || !end) return '—'
  if (start === end) return fmtDate(start)
  return `${fmtDate(start)} → ${fmtDate(end)}${mode ? ` (${mode === 'daily' ? 'يومي' : 'شهري'})` : ''}`
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
      if (tenantId)     params.tenant_id = tenantId
      if (statusFilter) params.status    = statusFilter
      const { data } = await api.get('/admin/submissions', { params })
      setRows(data || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تحميل الإرسالات')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tenantId, statusFilter])

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
    <div className="adm-tickets">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">مراجعة الإرسالات</h1>
          <div className="t-small">{rows.length} سجل · يمكنك التراجع عن أي إرسال للسماح للمستأجر بالتعديل وإعادة الإرسال</div>
        </div>
      </div>

      <div className="adm-filter-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select className="input" style={{ flex: '1 1 240px' }}
          value={tenantId} onChange={e => setTenantId(e.target.value)}>
          <option value="">جميع المستأجرين</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="adm-pills" dir="rtl">
        {STATUS_FILTERS.map(f => (
          <button key={String(f.value)}
            onClick={() => setStatusFilter(f.value)}
            className={`adm-pill ${statusFilter === f.value ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="surface adm-tbl-wrap">
        {loading ? (
          <div style={{ padding: 16 }}><TableSkeleton rows={5} cols={6} /></div>
        ) : rows.length === 0 ? (
          <div className="adm-state">لا توجد إرسالات</div>
        ) : (
          <table className="adm-tbl">
            <thead>
              <tr>
                <th>تاريخ الإرسال</th>
                <th>المستأجر</th>
                <th>الفرع</th>
                <th>الفترة</th>
                <th>عدد · المجموع</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}
                    style={{ textDecoration: r.status === 'reverted' ? 'line-through' : 'none', opacity: r.status === 'reverted' ? 0.6 : 1 }}>
                  <td className="t-small">{fmtDate(r.submitted_at)}</td>
                  <td>{r.tenant_name || '—'}</td>
                  <td>{r.branch_name ? `${r.branch_name} (${r.branch_code})` : '—'}</td>
                  <td>{fmtPeriod(r.period_start, r.period_end, r.post_mode)}</td>
                  <td>{r.invoice_count} · ﷼ {fmtAmount(r.total_amount)}</td>
                  <td><span className={`adm-tag ${STATUS_CLASS[r.status] || ''}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                  <td>
                    {r.status === 'sent' && (
                      <button className="btn btn-ghost" style={{ padding: '4px 10px' }}
                        onClick={() => setConfirmRow(r)}
                        title="إعادة الإرسال إلى pending">
                        <RotateCcw size={14} /> إعادة التعيين
                      </button>
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
          ? `سيتم إرجاع جميع المبيعات للفترة ${fmtPeriod(confirmRow.period_start, confirmRow.period_end)} ` +
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
