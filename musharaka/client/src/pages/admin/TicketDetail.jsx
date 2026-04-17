/**
 * Admin: TicketDetail — view full ticket details, update status and add a comment
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ButtonSpinner from '../../components/ButtonSpinner'
import { toast } from '../../lib/useToast'
import { ArrowRight, Paperclip, Save } from 'lucide-react'
import { STATUS_OPTIONS, STATUS_COLORS, CATEGORY_LABELS, fmtTicketDate } from '../../lib/ticketConstants'

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
    <div className="flex items-center justify-center py-20">
      <div className="inline-block w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!ticket) return (
    <div className="text-center py-20 font-arabic text-gray-500">التذكرة غير موجودة</div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/admin/tickets')} className="text-gray-400 hover:text-gray-600 mt-1">
          <ArrowRight size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white font-arabic">{ticket.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-arabic ${STATUS_COLORS[ticket.status]}`}>
              {STATUS_OPTIONS.find(s => s.v === ticket.status)?.l}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">#{ticket.ticket_number}</p>
        </div>
      </div>

      {/* Ticket details */}
      <div className="card-surface p-6 space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
          تفاصيل المشكلة
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 font-arabic mb-0.5">التصنيف</p>
            <p className="font-arabic text-gray-700 dark:text-gray-200">{CATEGORY_LABELS[ticket.category] || ticket.category}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-arabic mb-0.5">تاريخ الإنشاء</p>
            <p className="font-arabic text-gray-700 dark:text-gray-200">{fmtTicketDate(ticket.created_at, true)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 font-arabic mb-1">وصف المشكلة</p>
          <p className="text-sm font-arabic text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        {ticket.steps && (
          <div>
            <p className="text-xs text-gray-400 font-arabic mb-1">خطوات إعادة المشكلة</p>
            <p className="text-sm font-arabic text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
              {ticket.steps}
            </p>
          </div>
        )}

        {ticket.attachment_url && (
          <div>
            <p className="text-xs text-gray-400 font-arabic mb-1">المرفق</p>
            <a href={ticket.attachment_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-yellow-700 hover:text-yellow-800 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg transition-colors font-arabic">
              <Paperclip size={13} />
              {ticket.attachment_name || 'عرض المرفق'}
            </a>
          </div>
        )}
      </div>

      {/* Client info */}
      <div className="card-surface p-6 space-y-3">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
          بيانات العميل
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 font-arabic mb-0.5">الاسم</p>
            <p className="font-arabic text-gray-800 dark:text-gray-100 font-medium">{ticket.submitter_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-arabic mb-0.5">البريد الإلكتروني</p>
            <p className="font-mono text-gray-700 dark:text-gray-300 text-xs text-right" dir="ltr">{ticket.submitter_email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-arabic mb-0.5">المستأجر</p>
            <p className="font-arabic text-gray-800 dark:text-gray-100">{ticket.tenant_name || '—'}</p>
          </div>
          {ticket.tenant_phone && (
            <div>
              <p className="text-xs text-gray-400 font-arabic mb-0.5">رقم الجوال</p>
              <p className="font-mono text-gray-700 dark:text-gray-300 text-sm" dir="ltr">{ticket.tenant_phone}</p>
            </div>
          )}
          {ticket.branch_count != null && (
            <div>
              <p className="text-xs text-gray-400 font-arabic mb-0.5">عدد الفروع</p>
              <p className="font-arabic text-gray-800 dark:text-gray-100 font-medium">{ticket.branch_count} فرع</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin action */}
      <div className="card-surface p-6 space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
          إجراء المشرف
        </h2>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 font-arabic mb-1.5">الحالة</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="input-base w-full sm:w-56 font-arabic">
            {STATUS_OPTIONS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 font-arabic mb-1.5">
            ملاحظات / الحل المقترح
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            rows={4} placeholder="اكتب الحل أو الملاحظات الداخلية هنا..."
            className="input-base font-arabic resize-none" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-lg transition-colors font-arabic text-sm">
          {saving ? <ButtonSpinner /> : <Save size={15} />}
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  )
}
