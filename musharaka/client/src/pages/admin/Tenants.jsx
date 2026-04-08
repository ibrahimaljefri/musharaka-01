import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axiosClient'
import AlertBanner from '../../components/AlertBanner'
import ConfirmDialog from '../../components/ConfirmDialog'
import {
  Plus, Edit2, Trash2, Key, CheckCircle2, XCircle,
  Clock, Building2, Calendar
} from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import TenantBadge from '../../components/TenantBadge'

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const PLAN_LABELS = { basic: 'أساسي', professional: 'احترافي', enterprise: 'مؤسسي' }
const PLAN_COLORS = {
  basic:        'bg-gray-100 text-gray-600',
  professional: 'bg-blue-100 text-blue-700',
  enterprise:   'bg-purple-100 text-purple-700',
}

function statusBadge(tenant) {
  const expired = tenant.expires_at && new Date(tenant.expires_at) < new Date()
  if (expired || tenant.status === 'expired')
    return <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-arabic"><XCircle size={10} />منتهي</span>
  if (tenant.status === 'suspended')
    return <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-arabic"><Clock size={10} />موقوف</span>
  return <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-arabic"><CheckCircle2 size={10} />نشط</span>
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return `${dt.getDate()} ${MONTHS_AR[dt.getMonth()]} ${dt.getFullYear()}`
}

export default function Tenants() {
  const [tenants, setTenants]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [flash, setFlash]             = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/tenants')
      setTenants(data || [])
    } catch (err) {
      setFlash({ type: 'error', msg: err.response?.data?.error || 'فشل تحميل المستأجرين' })
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/admin/tenants/${id}`)
      setFlash({ type: 'success', msg: 'تم حذف المستأجر بنجاح' })
      load()
    } catch (err) {
      setFlash({ type: 'error', msg: err.response?.data?.error || 'فشل الحذف' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-arabic">إدارة المستأجرين</h1>
          <p className="text-xs text-gray-400 font-arabic mt-0.5">التحكم الكامل في الحسابات والاشتراكات</p>
        </div>
        <Link to="/admin/tenants/create"
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic shadow-sm">
          <Plus size={15} /> مستأجر جديد
        </Link>
      </div>

      {flash && <AlertBanner type={flash.type} message={flash.msg} />}

      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <span className="font-semibold text-gray-700 font-arabic text-sm">الحسابات المسجلة</span>
          <span className="text-xs text-gray-400 font-arabic">{tenants.length} حساب</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 font-arabic text-sm">جاري التحميل...</p>
          </div>
        ) : tenants.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="لا يوجد مستأجرون بعد"
            description="أضف أول مستأجر لبدء إدارة الحسابات والاشتراكات"
            action={
              <Link to="/admin/tenants/create"
                className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic">
                <Plus size={15} /> مستأجر جديد
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-gray-500 text-xs font-arabic border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">الاسم</th>
                  <th className="px-4 py-3 text-right font-medium">الرمز</th>
                  <th className="px-4 py-3 text-right font-medium">الخطة</th>
                  <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium">تاريخ التفعيل</th>
                  <th className="px-4 py-3 text-right font-medium">تاريخ الانتهاء</th>
                  <th className="px-4 py-3 text-right font-medium">أنواع الإدخال</th>
                  <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-yellow-50/20 transition-colors">
                    <td className="px-4 py-3"><TenantBadge name={t.name} contractNumber={t.contract_number} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-arabic ${PLAN_COLORS[t.plan] || PLAN_COLORS.basic}`}>
                        {PLAN_LABELS[t.plan] || t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(t)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-arabic">{fmtDate(t.activated_at)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-arabic">
                      {t.expires_at
                        ? <span className={new Date(t.expires_at) < new Date() ? 'text-red-500 font-semibold' : ''}>{fmtDate(t.expires_at)}</span>
                        : <span className="text-gray-300">غير محدد</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(t.allowed_input_types || ['daily']).map(type => (
                          <span key={type} className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 px-1.5 py-0.5 rounded font-arabic">
                            {type === 'daily' ? 'يومي' : type === 'monthly' ? 'شهري' : 'مخصص'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/admin/tenants/${t.id}/edit`}
                          className="p-1.5 rounded-lg text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors" title="تعديل">
                          <Edit2 size={13} />
                        </Link>
                        <Link to={`/admin/tenants/${t.id}/api-keys`}
                          className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors" title="مفاتيح API">
                          <Key size={13} />
                        </Link>
                        <button onClick={() => setDeleteTarget(t)}
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
        title="حذف المستأجر"
        message={`هل أنت متأكد من حذف حساب "${deleteTarget?.name}"؟ سيتم حذف جميع البيانات المرتبطة به نهائياً.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
