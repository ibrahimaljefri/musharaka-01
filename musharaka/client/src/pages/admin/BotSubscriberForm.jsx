/**
 * BotSubscriberForm — create or edit a bot subscriber.
 * Branch is no longer selected here — the bot identifies it per message.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ButtonSpinner from '../../components/ButtonSpinner'
import { toast } from '../../lib/useToast'
import { Save, ArrowRight, MessageCircle, Info } from 'lucide-react'
import './admin-bot-sub-form.css'

// WhatsApp temporarily hidden from create UI per product direction.
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
    const tenantValid   = validateField('tenant_id', form.tenant_id)
    const platformValid = validateField('platform',  form.platform)
    const chatIdValid   = validateField('chat_id',   form.chat_id)
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
    <div className="adm-bot-sub-form">
      <div className="adm-loading"><div className="adm-spinner" /></div>
    </div>
  )

  return (
    <div className="adm-bot-sub-form">
      <div className="adm-page-header">
        <button onClick={() => navigate('/admin/bot-subscribers')} className="adm-back" aria-label="رجوع">
          <ArrowRight size={18} />
        </button>
        <div>
          <h1 className="adm-page-title">{isEdit ? 'تعديل مشترك' : 'إضافة مشترك جديد'}</h1>
          <div className="t-small">ربط حساب تيليجرام بمستأجر لتفعيل تسجيل المبيعات عبر الروبوت</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="adm-form">

        {/* Tenant */}
        <div className="adm-section">
          <h2 className="adm-section-title">المستأجر</h2>
          <div className="field">
            <label className="field-label">المستأجر <span className="field-required">*</span></label>
            <select className={`input ${errors.tenant_id ? 'has-error' : ''}`}
              value={form.tenant_id}
              onChange={e => handleTenantChange(e.target.value)}
              onBlur={e => validateField('tenant_id', e.target.value)}
              required>
              <option value="">— اختر مستأجراً —</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.commercial_registration ? ` — ${t.commercial_registration}` : ''}</option>
              ))}
            </select>
            {errors.tenant_id && <span className="field-error">{errors.tenant_id}</span>}
          </div>

          <div className="adm-info">
            <Info size={15} />
            <span>الفرع يُحدَّد تلقائياً من كل رسالة. إذا لم يذكره المشترك، سيسأله الروبوت عنه.</span>
          </div>
        </div>

        {/* Platform + Chat ID */}
        <div className="adm-section">
          <h2 className="adm-section-title"><MessageCircle size={14} /> بيانات التواصل</h2>
          <div className="grid-2">
            <div className="field">
              <label className="field-label">المنصة <span className="field-required">*</span></label>
              <select className={`input ${errors.platform ? 'has-error' : ''}`}
                value={form.platform}
                onChange={e => set('platform', e.target.value)}
                onBlur={e => validateField('platform', e.target.value)}
                required>
                {PLATFORMS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
              {errors.platform && <span className="field-error">{errors.platform}</span>}
            </div>

            <div className="field">
              <label className="field-label">معرّف الدردشة <span className="field-required">*</span></label>
              <input className={`input mono ${errors.chat_id ? 'has-error' : ''}`}
                value={form.chat_id}
                onChange={e => set('chat_id', e.target.value)}
                onBlur={e => validateField('chat_id', e.target.value)}
                required dir="ltr"
                placeholder={form.platform === 'telegram' ? '123456789' : '+966501234567'} />
              <span className="field-hint">
                {form.platform === 'telegram' ? 'رقم الـ Chat ID من تيليجرام' : 'رقم الهاتف بصيغة دولية'}
              </span>
              {errors.chat_id && <span className="field-error">{errors.chat_id}</span>}
            </div>

            <div className="field">
              <label className="field-label">اسم جهة التواصل</label>
              <input className="input" value={form.contact_name}
                onChange={e => set('contact_name', e.target.value)}
                placeholder="اسم المسؤول" />
            </div>
          </div>

          {isEdit && (
            <div className="adm-toggle-row">
              <span className="row-name">تفعيل الحساب</span>
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={`adm-toggle ${form.is_active ? 'on' : ''}`} aria-pressed={!!form.is_active}>
                <span className="knob" />
              </button>
            </div>
          )}
        </div>

        <div className="adm-actions">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? <ButtonSpinner /> : <Save size={15} />}
            {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المشترك'}
          </button>
          <button type="button" onClick={() => navigate('/admin/bot-subscribers')} className="btn btn-ghost">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
