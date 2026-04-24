import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import TenantBadge from '../../components/TenantBadge'
import { TableSkeleton } from '../../components/SkeletonLoader'
import TableControls from '../../components/TableControls'
import Pagination from '../../components/Pagination'
import { toast } from '../../lib/useToast'

const PAGE_SIZE = 20
import { Plus, Edit2, Trash2, MessageCircle, CheckCircle2, XCircle } from 'lucide-react'

// Label/color maps kept for legacy whatsapp rows in the DB; the UI no longer
// offers WhatsApp as a create option but will still render existing rows correctly.
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
  const [subscribers, setSubscribers]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch]             = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/bot-subscribers')
      setSubscribers(data || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تحميل المشتركين')
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/admin/bot-subscribers/${id}`)
      toast.success('تم حذف المشترك بنجاح')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحذف')
    }
  }

  const filtered = useMemo(() => {
    if (!search) return subscribers
    const q = search.toLowerCase()
    return subscribers.filter(s =>
      (s.platform || '').toLowerCase().includes(q) ||
      (s.chat_id || '').toLowerCase().includes(q) ||
      (s.tenant_name || '').toLowerCase().includes(q) ||
      (s.contact_name || '').toLowerCase().includes(q)
    )
  }, [subscribers, search])

  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [search])
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-arabic">مشتركو الروبوت</h1>
          <p className="text-xs text-gray-400 font-arabic mt-0.5">إدارة حسابات تيليجرام المرتبطة بالفروع</p>
        </div>
        <Link to="/admin/bot-subscribers/create"
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic shadow-sm">
          <Plus size={15} /> مشترك جديد
        </Link>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <span className="font-semibold text-gray-700 font-arabic text-sm">المشتركون المسجلون</span>
          <span className="text-xs text-gray-400 font-arabic">{subscribers.length} مشترك</span>
        </div>

        <div className="px-4 pt-3">
          <TableControls
            value={search}
            onChange={setSearch}
            count={filtered.length}
            total={subscribers.length}
            placeholder="بحث بالمنصة أو المعرّف أو المستأجر..."
          />
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={8} />
          </div>
        ) : subscribers.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="لا يوجد مشتركون بعد"
            description="أضف مشتركاً لربط حساب تيليجرام بفرع وتفعيل التسجيل عبر الروبوت"
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
              <thead className="table-head">
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
                {paged.map(s => (
                  <tr key={s.id} className="hover:bg-yellow-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <TenantBadge name={s.tenant_name} subtext={s.contract_number} />
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
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </div>
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
