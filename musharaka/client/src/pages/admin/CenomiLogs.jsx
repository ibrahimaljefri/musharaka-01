/**
 * Admin: Cenomi Logs — request/response audit viewer
 *
 * Reads from GET /api/admin/cenomi-logs (filterable by tenant, branch, date).
 * Each row shows: timestamp · tenant · branch · URL · response status pill.
 * Click a row to expand the full request body, redacted headers, and the
 * Cenomi response body for forensics.
 */
import { useState, useEffect, useMemo } from 'react'
import api from '../../lib/axiosClient'
import { TableSkeleton } from '../../components/SkeletonLoader'
import Pagination from '../../components/Pagination'
import { toast } from '../../lib/useToast'
import { ChevronDown, ChevronLeft } from 'lucide-react'

const PAGE_SIZE = 25

function StatusPill({ status }) {
  if (status == null) return <span className="adm-tag s-closed">فشل اتصال</span>
  if (status >= 200 && status < 300) return <span className="adm-tag s-resolved">{status}</span>
  return <span className="adm-tag s-open">{status}</span>
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
}

export default function CenomiLogs() {
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [filters, setFilters] = useState({ tenant_id: '', branch_id: '', from: '', to: '' })
  const [expanded, setExpanded] = useState({})    // { [id]: true }
  const [tenants, setTenants] = useState([])

  // Load tenants for filter dropdown
  useEffect(() => {
    api.get('/admin/tenants').then(({ data }) => setTenants(data || [])).catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
      if (filters.tenant_id) params.tenant_id = filters.tenant_id
      if (filters.branch_id) params.branch_id = filters.branch_id
      if (filters.from)      params.from      = filters.from
      if (filters.to)        params.to        = filters.to
      const { data } = await api.get('/admin/cenomi-logs', { params })
      setRows(data.rows || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تحميل السجلات')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page])
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  const applyFilters = () => { setPage(1); load() }
  const clearFilters = () => {
    setFilters({ tenant_id: '', branch_id: '', from: '', to: '' })
    setPage(1)
    setTimeout(load, 0)
  }
  const toggleRow = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  return (
    <div className="adm-tickets">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">سجلات سينومي</h1>
          <div className="t-small">{total} محاولة إرسال · مراجعة كل طلب وردّ من Cenomi</div>
        </div>
      </div>

      <div className="adm-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <select className="input" style={{ flex: '1 1 200px' }}
          value={filters.tenant_id}
          onChange={e => setFilters(f => ({ ...f, tenant_id: e.target.value }))}>
          <option value="">جميع المستأجرين</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className="input" type="date" dir="ltr" style={{ width: 160 }}
          value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          placeholder="من" />
        <input className="input" type="date" dir="ltr" style={{ width: 160 }}
          value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          placeholder="إلى" />
        <button className="btn" onClick={applyFilters}>تطبيق</button>
        <button className="btn btn-ghost" onClick={clearFilters}>مسح</button>
      </div>

      <div className="surface adm-tbl-wrap">
        {loading ? (
          <div style={{ padding: 16 }}><TableSkeleton rows={5} cols={5} /></div>
        ) : rows.length === 0 ? (
          <div className="adm-state">لا توجد سجلات</div>
        ) : (
          <>
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>التاريخ</th>
                  <th>المستأجر</th>
                  <th>الفرع</th>
                  <th>الرابط</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <>
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => toggleRow(r.id)}>
                      <td>{expanded[r.id] ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}</td>
                      <td className="t-small">{fmtDate(r.created_at)}</td>
                      <td>{r.tenant_name || '—'}</td>
                      <td>{r.branch_name ? `${r.branch_name} (${r.branch_code})` : '—'}</td>
                      <td className="t-mono" dir="ltr"
                          style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.request_url}
                      </td>
                      <td><StatusPill status={r.response_status} /></td>
                    </tr>
                    {expanded[r.id] && (
                      <tr key={`${r.id}-detail`}>
                        <td colSpan={6} style={{ background: 'var(--surface-2, #fafafa)' }}>
                          <div style={{ padding: 12, display: 'grid', gap: 12 }}>
                            <div>
                              <div className="t-small" style={{ fontWeight: 600, marginBottom: 4 }}>Request headers (token redacted):</div>
                              <pre className="t-mono" dir="ltr"
                                   style={{ fontSize: 12, padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'auto', margin: 0 }}>
                                {JSON.stringify(r.request_headers, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="t-small" style={{ fontWeight: 600, marginBottom: 4 }}>Request body:</div>
                              <pre className="t-mono" dir="ltr"
                                   style={{ fontSize: 12, padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'auto', margin: 0 }}>
                                {JSON.stringify(r.request_body, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="t-small" style={{ fontWeight: 600, marginBottom: 4 }}>
                                Response — HTTP {r.response_status ?? 'connection failed'}:
                              </div>
                              <pre className="t-mono" dir="ltr"
                                   style={{ fontSize: 12, padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'auto', margin: 0 }}>
                                {r.response_body ? JSON.stringify(r.response_body, null, 2) : (r.error_message || '—')}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            <div className="adm-pagination">
              <span className="t-small">عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} من {total}</span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
