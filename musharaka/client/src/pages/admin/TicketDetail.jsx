/**
 * Admin: TicketDetail — view full ticket details, update status and add a comment
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ButtonSpinner from '../../components/ButtonSpinner'
import { toast } from '../../lib/useToast'
import { ArrowRight, Paperclip, Save } from 'lucide-react'
import { STATUS_OPTIONS, CATEGORY_LABELS, fmtTicketDate } from '../../lib/ticketConstants'
import './admin-ticket-detail.css'

const STATUS_CLASS = {
  open: 's-open',
  in_progress: 's-progress',
  resolved: 's-resolved',
  closed: 's-closed',
  new: 's-open',
}

export default function TicketDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()

  const [ticket,  setTicket]  = useState(null)
  const [status,  setStatus]  = useState('new')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    api.get(`/admin/tickets/${id}`)
      .then(({ data }) => {
        setTicket(data)
        setStatus(data.status)
        setComment(data.admin_comment || '')
      })
      .catch(() => toast.error('تعذّر تحميل التذكرة'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/tickets/${id}`, { status, admin_comment: comment })
      setTicket(data)
      toast.success('تم حفظ التغييرات بنجاح')
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحفظ')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="adm-ticket-detail">
      <div className="adm-loading"><div className="adm-spinner" /></div>
    </div>
  )

  if (!ticket) return (
    <div className="adm-ticket-detail">
      <div className="adm-loading" style={{ color: 'var(--text-muted)' }}>التذكرة غير موجودة</div>
    </div>
  )

  return (
    <div className="adm-ticket-detail">
      <div className="adm-page-header">
        <button onClick={() => navigate('/admin/tickets')} className="adm-back" aria-label="رجوع">
          <ArrowRight size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="adm-page-title">{ticket.title}</h1>
            <span className={`adm-tag ${STATUS_CLASS[ticket.status] || ''}`}>
              {STATUS_OPTIONS.find(s => s.v === ticket.status)?.l}
            </span>
          </div>
          <p className="t-mono" style={{ margin: 0 }}>#{ticket.ticket_number}</p>
        </div>
      </div>

      <div className="adm-grid">
        <div className="adm-main">
          {/* Ticket details */}
          <div className="adm-section">
            <h2 className="adm-section-title">تفاصيل المشكلة</h2>
            <div className="adm-meta-grid">
              <div className="meta-cell">
                <span className="meta-label">التصنيف</span>
                <span className="meta-value">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
              </div>
              <div className="meta-cell">
                <span className="meta-label">تاريخ الإنشاء</span>
                <span className="meta-value">{fmtTicketDate(ticket.created_at, true)}</span>
              </div>
            </div>

            <div className="meta-cell">
              <span className="meta-label">وصف المشكلة</span>
              <div className="adm-block">{ticket.description}</div>
            </div>

            {ticket.steps && (
              <div className="meta-cell">
                <span className="meta-label">خطوات إعادة المشكلة</span>
                <div className="adm-block">{ticket.steps}</div>
              </div>
            )}

            {ticket.attachment_url && (
              <div className="meta-cell">
                <span className="meta-label">المرفق</span>
                <a href={ticket.attachment_url} target="_blank" rel="noreferrer" className="adm-attach">
                  <Paperclip size={13} />
                  {ticket.attachment_name || 'عرض المرفق'}
                </a>
              </div>
            )}
          </div>

          {/* Admin action */}
          <div className="adm-section">
            <h2 className="adm-section-title">إجراء المشرف</h2>
            <div className="meta-cell">
              <span className="meta-label">الحالة</span>
              <select className="input" style={{ maxWidth: 280 }} value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            <div className="meta-cell">
              <span className="meta-label">ملاحظات / الحل المقترح</span>
              <textarea className="input" value={comment} onChange={e => setComment(e.target.value)}
                rows={4} placeholder="اكتب الحل أو الملاحظات الداخلية هنا..." />
            </div>
            <div>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? <ButtonSpinner /> : <Save size={15} />}
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>

        <aside className="adm-side">
          <div className="adm-section">
            <h2 className="adm-section-title">بيانات العميل</h2>
            <div className="meta-cell">
              <span className="meta-label">الاسم</span>
              <span className="meta-value" style={{ fontWeight: 500 }}>{ticket.submitter_name}</span>
            </div>
            <div className="meta-cell">
              <span className="meta-label">البريد الإلكتروني</span>
              <span className="meta-value mono" dir="ltr">{ticket.submitter_email}</span>
            </div>
            <div className="meta-cell">
              <span className="meta-label">المستأجر</span>
              <span className="meta-value">{ticket.tenant_name || '—'}</span>
            </div>
            {ticket.tenant_phone && (
              <div className="meta-cell">
                <span className="meta-label">رقم الجوال</span>
                <span className="meta-value mono" dir="ltr">{ticket.tenant_phone}</span>
              </div>
            )}
            {ticket.branch_count != null && (
              <div className="meta-cell">
                <span className="meta-label">عدد الفروع</span>
                <span className="meta-value">{ticket.branch_count} فرع</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
