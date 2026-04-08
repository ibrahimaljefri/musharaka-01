import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axiosClient'
import AlertBanner from '../../components/AlertBanner'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import TenantBadge from '../../components/TenantBadge'
import { Plus, Edit2, Trash2, MessageCircle, CheckCircle2, XCircle } from 'lucide-react'

const PLATFORM_LABELS = { telegram: 'تيليجرام', whatsapp: 'واتساب' }
const PLATFORM_COLORS = {
  telegram: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA')
}

export default function BotSubscribers() {
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading]         = useState(true)
  const [flash, setFlash]             = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/bot-subscribers')
      setSubscribers(data || [])
    } catch (err) {
      setFlash({ type: 'error', msg: err.response?.data?.error || 'فشل تحميل المشتركين' })
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/admin/bot-subscribers/${id}`)
      setFlash({ type: 'success', msg: 'تم حذف المشترك بنجاح' })
      load()
    } catch (err) {
      setFlash({ type: 'error', msg: err.response?.data?.error || 'فشل الحذف' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-arabic">مشتركو الروبوت</h1>
          <p className="text-xs text-gray-400 font-arabic mt-0.5">إدارة حسابات واتساب وتيليجرام المرتبطة بالفروع</p>
        </div>
        <Link to="/admin/bot-subscribers/create"
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic shadow-sm">
          <Plus size={15} /> مشترك جديد
        </Link>
      </div>

      {flash && <AlertBanner type={flash.type} message={flash.msg} />}

      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <span className="font-semibold text-gray-700 font-arabic text-sm">المشتركون المسجلون</span>
          <span className="text-xs text-gray-400 font-arabic">{subscribers.length} مشترك</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 font-arabic text-sm">جاري التحميل...</p>
          </div>
        ) : subscribers.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="لا يوجد مشتركون بعد"
            description="أضف مشتركاً لربط رقم واتساب أو تيليجرام بفرع وتفعيل التسجيل عبر الروبوت"
            action={
              <Link to="/admin/bot-subscribers/create"
                className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic">
                <Plus size={15} /> إضافة مشترك
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-gray-500 text-xs font-arabic border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">المستأجر</th>
                  <th className="px-4 py-3 text-right font-medium">الفرع</th>
                  <th className="px-4 py-3 text-right font-medium">المنصة</th>
                  <th className="px-4 py-3 text-right font-medium">معرّف الدردشة</th>
                  <th className="px-4 py-3 text-right font-medium">الاسم</th>
                  <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium">آخر رسالة</th>
                  <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.map(s => (
                  <tr key={s.id} className="hover:bg-yellow-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <TenantBadge name={s.tenant_name} contractNumber={s.contract_number} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800 font-arabic">{s.branch_name}</span>
                        <span className="text-xs text-gray-400 font-mono">{s.branch_code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-arabic ${PLATFORM_COLORS[s.platform] || 'bg-gray-100 text-gray-600'}`}>
                        {PLATFORM_LABELS[s.platform] || s.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono" dir="ltr">{s.chat_id}</td>
                    <td className="px-4 py-3 text-gray-700 font-arabic text-sm">{s.contact_name || '—'}</td>
                    <td className="px-4 py-3">
                      {s.is_active
                        ? <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-arabic"><CheckCircle2 size={10} />نشط</span>
                        : <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-arabic"><XCircle size={10} />معطل</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-arabic">{fmtDate(s.last_message_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/admin/bot-subscribers/${s.id}/edit`}
                          className="p-1.5 rounded-lg text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors" title="تعديل">
                          <Edit2 size={13} />
                        </Link>
                        <button onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors" title="حذف">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف المشترك"
        message={`هل أنت متأكد من حذف مشترك "${deleteTarget?.contact_name || deleteTarget?.chat_id}"؟`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
