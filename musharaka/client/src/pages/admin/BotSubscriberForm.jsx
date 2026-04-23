/**
 * BotSubscriberForm — create or edit a bot subscriber.
 * Branch is no longer selected here — the bot identifies it per message.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/axiosClient'
import FormField from '../../components/FormField'
import ButtonSpinner from '../../components/ButtonSpinner'
import { toast } from '../../lib/useToast'
import { Save, ArrowRight, MessageCircle, Info } from 'lucide-react'

// WhatsApp is temporarily hidden from the UI per product direction; keep the
// value list single-entry so it's trivial to restore ({ v: 'whatsapp', l: 'واتساب' }).
const PLATFORMS = [
  { v: 'telegram', l: 'تيليجرام' },
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
  const [errors,  setErrors]    = useState({})

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

  const validateField = (name, value) => {
    let err = ''
    if (name === 'tenant_id' && !value) err = 'المستأجر مطلوب'
    if (name === 'platform'  && !value) err = 'المنصة مطلوبة'
    if (name === 'chat_id'   && !value?.trim()) err = 'معرّف الدردشة مطلوب'
    setErrors(prev => ({ ...prev, [name]: err }))
    return !err
  }

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId)
    set('tenant_id', tenantId)
    set('tenant_name', tenant?.name || '')
    validateField('tenant_id', tenantId)
  }

  const handleSubmit = async e => {
    e.preventDefault()

    const tenantValid  = validateField('tenant_id', form.tenant_id)
    const platformValid = validateField('platform', form.platform)
    const chatIdValid  = validateField('chat_id',   form.chat_id)
    if (!tenantValid || !platformValid || !chatIdValid) return

    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/admin/bot-subscribers/${id}`, form)
        toast.success('تم تحديث بيانات المشترك بنجاح')
      } else {
        await api.post('/admin/bot-subscribers', form)
        toast.success('تم إضافة المشترك بنجاح')
        setTimeout(() => navigate('/admin/bot-subscribers'), 1500)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً')
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
          <h1 className="text-xl font-bold text-gray-800 dark:text-white font-arabic">
            {isEdit ? 'تعديل مشترك' : 'إضافة مشترك جديد'}
          </h1>
          <p className="text-xs text-gray-400 font-arabic mt-0.5">
            ربط حساب تيليجرام بمستأجر لتفعيل تسجيل المبيعات عبر الروبوت
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Tenant */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
            المستأجر
          </h2>
          <FormField label="المستأجر" required error={errors.tenant_id}>
            <select value={form.tenant_id}
              onChange={e => handleTenantChange(e.target.value)}
              onBlur={e => validateField('tenant_id', e.target.value)}
              required
              className="input-base font-arabic">
              <option value="">— اختر مستأجراً —</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.commercial_registration ? ` — ${t.commercial_registration}` : ''}</option>
              ))}
            </select>
          </FormField>

          {/* Branch info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg text-sm font-arabic text-blue-800 dark:text-blue-300">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
            <span>الفرع يُحدَّد تلقائياً من كل رسالة. إذا لم يذكره المشترك، سيسأله الروبوت عنه.</span>
          </div>
        </div>

        {/* Platform + Chat ID */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
            <MessageCircle size={14} className="text-gray-500" />
            بيانات التواصل
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="المنصة" required error={errors.platform}>
              <select value={form.platform}
                onChange={e => set('platform', e.target.value)}
                onBlur={e => validateField('platform', e.target.value)}
                required
                className="input-base font-arabic">
                {PLATFORMS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </FormField>

            <FormField
              label="معرّف الدردشة"
              required
              error={errors.chat_id}
              hint={form.platform === 'telegram' ? 'رقم الـ Chat ID من تيليجرام' : 'رقم الهاتف بصيغة دولية'}
            >
              <input value={form.chat_id}
                onChange={e => set('chat_id', e.target.value)}
                onBlur={e => validateField('chat_id', e.target.value)}
                required dir="ltr"
                placeholder={form.platform === 'telegram' ? '123456789' : '+966501234567'}
                className="input-base font-mono" />
            </FormField>

            <FormField label="اسم جهة التواصل">
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                placeholder="اسم المسؤول"
                className="input-base font-arabic" />
            </FormField>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 font-arabic">تفعيل الحساب</p>
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
            {loading ? <ButtonSpinner /> : <Save size={15} />}
            {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المشترك'}
          </button>
          <button type="button" onClick={() => navigate('/admin/bot-subscribers')}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-arabic">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
