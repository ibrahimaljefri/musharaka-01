/**
 * Admin: Support Tickets — list/queue view
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axiosClient'
import { TableSkeleton } from '../../components/SkeletonLoader'
import Pagination from '../../components/Pagination'
import { toast } from '../../lib/useToast'
import { STATUS_LABELS, CATEGORY_LABELS, fmtTicketDate } from '../../lib/ticketConstants'
import './admin-tickets.css'

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { value: null,          label: 'الكل' },
  { value: 'new',         label: 'جديد' },
  { value: 'in_progress', label: 'قيد المعالجة' },
  { value: 'resolved',    label: 'محلول' },
]

const STATUS_CLASS = {
  new:         's-open',
  in_progress: 's-progress',
  resolved:    's-resolved',
}

export default function Tickets() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [page, setPage]       = useState(1)

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/tickets')
      setTickets(data || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تحميل التذاكر')
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter && t.status !== statusFilter) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        (t.ticket_number || '').toLowerCase().includes(q) ||
        (t.submitter_name || '').toLowerCase().includes(q) ||
        (t.tenant_name || '').toLowerCase().includes(q)
      )
    })
  }, [tickets, search, statusFilter])

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage  = Math.min(page, totalPages)
  const paged        = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const firstIdx     = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const lastIdx      = Math.min(currentPage * PAGE_SIZE, filtered.length)

  return (
    <div className="adm-tickets">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">تذاكر الدعم</h1>
          <div className="t-small">{tickets.length} تذكرة · إدارة وحل طلبات الدعم</div>
        </div>
      </div>

      <div className="adm-filter-bar">
        <input
          className="input"
          placeholder="🔍 بحث برقم التذكرة أو العميل أو المستأجر..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
          <div style={{ padding: 16 }}><TableSkeleton rows={5} cols={5} /></div>
        ) : tickets.length === 0 ? (
          <div className="adm-state">لا توجد تذاكر بعد</div>
        ) : filtered.length === 0 ? (
          <div className="adm-state">لا توجد نتائج مطابقة</div>
        ) : (
          <>
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>رقم التذكرة والحالة</th>
                  <th>المستأجر</th>
                  <th>العميل</th>
                  <th>التصنيف</th>
                  <th>تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(t => (
                  <tr key={t.id} onClick={() => navigate(`/admin/tickets/${t.id}`)}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="t-mono" style={{ fontWeight: 600, color: 'var(--text)' }}>{t.ticket_number}</span>
                        <span className={`adm-tag ${STATUS_CLASS[t.status] || ''}`} style={{ width: 'fit-content' }}>
                          {STATUS_LABELS[t.status] || t.status}
                        </span>
                      </div>
                    </td>
                    <td>{t.tenant_name}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500 }}>{t.submitter_name}</span>
                        <span className="t-mono" dir="ltr">{t.submitter_email}</span>
                      </div>
                    </td>
                    <td><span className="adm-tag">{CATEGORY_LABELS[t.category] || t.category}</span></td>
                    <td className="t-small">{fmtTicketDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="adm-cards-mobile">
              {paged.map(t => (
                <div key={t.id} className="adm-card-row" onClick={() => navigate(`/admin/tickets/${t.id}`)}>
                  <div className="card-title">{t.ticket_number}</div>
                  <div className="kv"><span className="k">الحالة</span>
                    <span className={`adm-tag ${STATUS_CLASS[t.status] || ''}`}>{STATUS_LABELS[t.status] || t.status}</span>
                  </div>
                  <div className="kv"><span className="k">المستأجر</span><span>{t.tenant_name}</span></div>
                  <div className="kv"><span className="k">العميل</span><span>{t.submitter_name}</span></div>
                  <div className="kv"><span className="k">التصنيف</span>
                    <span className="adm-tag">{CATEGORY_LABELS[t.category] || t.category}</span>
                  </div>
                  <div className="kv"><span className="k">التاريخ</span><span className="t-small">{fmtTicketDate(t.created_at)}</span></div>
                </div>
              ))}
            </div>

            <div className="adm-pagination">
              <span className="t-small">عرض {firstIdx}–{lastIdx} من {filtered.length}</span>
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
