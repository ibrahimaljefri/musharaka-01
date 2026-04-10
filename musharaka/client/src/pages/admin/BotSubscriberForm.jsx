/**
 * BotSubscriberForm — create or edit a bot subscriber.
 * Branch is no longer selected here — the bot identifies it per message.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/axiosClient'
import AlertBanner from '../../components/AlertBanner'
import { Save, ArrowRight, MessageCircle, Info } from 'lucide-react'

const PLATFORMS = [
  { v: 'telegram', l: 'تيليجرام' },
  { v: 'whatsapp', l: 'واتساب' },
]

export default function BotSubscriberForm({ mode = 'create' }) {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isEdit   = mode === 'edit'

  const [tenants, setTenants] = useState([])
  const [form, setForm]       = useState({
    tenant_id: '', tenant_name: '', platform: 'telegram',
    chat_id: '', contact_name: '', is_active: true,
  })
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  useEffect(() => {
    api.get('/admin/tenants').then(({ data }) => setTenants(data || []))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    api.get(`/admin/bot-subscribers/${id}`).then(({ data }) => {
      setForm({
        tenant_id:    data.tenant_id,
        tenant_name:  data.tenant_name,
        platform:     data.platform,
        chat_id:      data.chat_id,
        contact_name: data.contact_name || '',
        is_active:    data.is_active,
      })
      setFetching(false)
    }).catch(() => setFetching(false))
  }, [id, isEdit])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId)
    set('tenant_id', tenantId)
    set('tenant_name', tenant?.name || '')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/admin/bot-subscribers/${id}`, form)
        setSuccess('تم تحديث بيانات المشترك بنجاح')
      } else {
        await api.post('/admin/bot-subscribers', form)
        setSuccess('تم إضافة المشترك بنجاح')
        setTimeout(() => navigate('/admin/bot-subscribers'), 1500)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally { setLoading(false) }
  }

  if (fetching) return (
    <div className="flex items-center justify-center py-20">
      <div className="inline-block w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/bot-subscribers')} className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-arabic">
            {isEdit ? 'تعديل مشترك' : 'إضافة مشترك جديد'}
          </h1>
          <p className="text-xs text-gray-400 font-arabic mt-0.5">
            ربط رقم واتساب أو تيليجرام بمستأجر لتفعيل تسجيل المبيعات عبر الروبوت
          </p>
        </div>
      </div>

      {error   && <AlertBanner type="error"   message={error} />}
      {success && <AlertBanner type="success" message={success} dismissible={false} />}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Tenant */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 font-arabic text-sm border-b border-gray-100 pb-2">
            المستأجر
          </h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
              المستأجر <span className="text-red-500">*</span>
            </label>
            <select value={form.tenant_id} onChange={e => handleTenantChange(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">— اختر مستأجراً —</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.commercial_registration ? ` — ${t.commercial_registration}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Branch info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm font-arabic text-blue-800">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
            <span>الفرع يُحدَّد تلقائياً من كل رسالة. إذا لم يذكره المشترك، سيسأله الروبوت عنه.</span>
          </div>
        </div>

        {/* Platform + Chat ID */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 font-arabic text-sm border-b border-gray-100 pb-2 flex items-center gap-2">
            <MessageCircle size={14} className="text-gray-500" />
            بيانات التواصل
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">المنصة <span className="text-red-500">*</span></label>
              <select value={form.platform} onChange={e => set('platform', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
                {PLATFORMS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
                معرّف الدردشة <span className="text-red-500">*</span>
              </label>
              <input value={form.chat_id} onChange={e => set('chat_id', e.target.value)} required dir="ltr"
                placeholder={form.platform === 'telegram' ? '123456789' : '+966501234567'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              <p className="text-xs text-gray-400 font-arabic mt-1">
                {form.platform === 'telegram' ? 'رقم الـ Chat ID من تيليجرام' : 'رقم الهاتف بصيغة دولية'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">اسم جهة التواصل</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                placeholder="اسم المسؤول"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 font-arabic">تفعيل الحساب</p>
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${form.is_active ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-1' : 'translate-x-6'}`} />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm">
            <Save size={15} /> {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المشترك'}
          </button>
          <button type="button" onClick={() => navigate('/admin/bot-subscribers')}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-arabic">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
