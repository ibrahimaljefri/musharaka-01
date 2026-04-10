/**
 * Admin: Support Tickets — list/queue view
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axiosClient'
import AlertBanner from '../../components/AlertBanner'
import EmptyState from '../../components/EmptyState'
import { Ticket } from 'lucide-react'

const STATUS_LABELS = { new: 'جديد', in_progress: 'قيد المعالجة', resolved: 'محلول' }
const STATUS_COLORS = {
  new:         'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
}
const CATEGORY_LABELS = { integration: 'تكامل', license: 'ترخيص', technical: 'تقني', reporting: 'تقارير' }
const CATEGORY_COLORS = {
  integration: 'bg-purple-100 text-purple-700',
  license:     'bg-blue-100 text-blue-700',
  technical:   'bg-orange-100 text-orange-700',
  reporting:   'bg-teal-100 text-teal-700',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Tickets() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [flash,   setFlash]   = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/tickets')
      setTickets(data || [])
    } catch (err) {
      setFlash({ type: 'error', msg: err.response?.data?.error || 'فشل تحميل التذاكر' })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800 font-arabic">تذاكر الدعم</h1>
        <p className="text-xs text-gray-400 font-arabic mt-0.5">إدارة وحل طلبات الدعم المقدمة من العملاء</p>
      </div>

      {flash && <AlertBanner type={flash.type} message={flash.msg} />}

      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <span className="font-semibold text-gray-700 font-arabic text-sm">قائمة التذاكر</span>
          <span className="text-xs text-gray-400 font-arabic">{tickets.length} تذكرة</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 font-arabic text-sm">جاري التحميل...</p>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="لا توجد تذاكر بعد"
            description="ستظهر هنا تذاكر الدعم المقدمة من العملاء"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-gray-500 text-xs font-arabic border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">رقم التذكرة والحالة</th>
                  <th className="px-4 py-3 text-right font-medium">المستأجر</th>
                  <th className="px-4 py-3 text-right font-medium">العميل</th>
                  <th className="px-4 py-3 text-right font-medium">التصنيف</th>
                  <th className="px-4 py-3 text-right font-medium">تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/admin/tickets/${t.id}`)}
                    className="hover:bg-yellow-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-semibold text-gray-800 text-xs">{t.ticket_number}</span>
                        <span className={`inline-flex w-fit text-xs px-2 py-0.5 rounded-full font-arabic ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[t.status] || t.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-arabic text-sm text-gray-700">{t.tenant_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800 font-arabic">{t.submitter_name}</span>
                        <span className="text-xs text-gray-400 font-mono" dir="ltr">{t.submitter_email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-arabic ${CATEGORY_COLORS[t.category] || 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-arabic">{fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
