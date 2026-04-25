/**
 * TenantForm — used by both TenantCreate and TenantEdit
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ButtonSpinner from '../../components/ButtonSpinner'
import { toast } from '../../lib/useToast'
import { Save, UserPlus, Eye, EyeOff, ArrowRight } from 'lucide-react'
import './admin-tenant-form.css'

const PLANS = [
  { v: 'basic',        l: 'أساسي' },
  { v: 'professional', l: 'احترافي' },
  { v: 'enterprise',   l: 'مؤسسي' },
]
const STATUSES = [
  { v: 'active',    l: 'نشط' },
  { v: 'suspended', l: 'موقوف' },
  { v: 'expired',   l: 'منتهي' },
]
const INPUT_TYPES = [
  { v: 'daily',   l: 'يومي' },
  { v: 'monthly', l: 'شهري' },
  { v: 'range',   l: 'فترة مخصصة' },
]

export default function TenantForm({ mode = 'create' }) {
  const navigate   = useNavigate()
  const { id }     = useParams()
  const isEdit     = mode === 'edit'

  const [form, setForm] = useState({
    name: '', slug: '',
    commercial_registration: '', primary_phone: '', account_number: '',
    plan: 'basic', status: 'active',
    activated_at: new Date().toISOString().split('T')[0],
    expires_at: '',
    notes: '',
    allowed_input_types: ['daily'],
    allow_advanced_dashboard: false,
    allow_import:             false,
    allow_reports:            false,
    max_branches: 3,
    plan_id:      '',
    cenomi_api_token: '',
  })
  const [showCenomiToken, setShowCenomiToken] = useState(false)
  const [userForm, setUserForm] = useState({
    user_email: '', user_password: '', user_name: '',
  })
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    api.get(`/admin/tenants/${id}`).then(({ data }) => {
      setForm({
        name:                     data.name,
        slug:                     data.slug,
        commercial_registration:  data.commercial_registration || '',
        primary_phone:            data.primary_phone           || '',
        account_number:           data.account_number          || '',
        plan:                     data.plan,
        status:                   data.status,
        activated_at:             data.activated_at?.split('T')[0] || '',
        expires_at:               data.expires_at?.split('T')[0] || '',
        notes:                    data.notes || '',
        allowed_input_types:      data.allowed_input_types || ['daily'],
        allow_advanced_dashboard: data.allow_advanced_dashboard || false,
        allow_import:             data.allow_import             || false,
        allow_reports:            data.allow_reports            || false,
        max_branches:             data.max_branches || 3,
        plan_id:                  data.plan_id || '',
        cenomi_api_token:         data.cenomi_api_token || '',
      })
      setFetching(false)
    }).catch(() => setFetching(false))
  }, [id, isEdit])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleInputType = (type) => {
    const current = form.allowed_input_types
    set('allowed_input_types',
      current.includes(type) ? current.filter(t => t !== type) : [...current, type]
    )
  }

  const handleNameChange = (v) => {
    set('name', v)
    if (!isEdit) {
      set('slug', v.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .slice(0, 50)
      )
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        expires_at:   form.expires_at || null,
        max_branches: form.max_branches,
        plan_id:      form.plan_id || null,
        ...(isEdit ? {} : userForm),
      }
      if (isEdit) {
        await api.put(`/admin/tenants/${id}`, payload)
        toast.success('تم تحديث بيانات المستأجر بنجاح')
      } else {
        await api.post('/admin/tenants', payload)
        toast.success('تم إنشاء المستأجر بنجاح')
        setTimeout(() => navigate('/admin/tenants'), 1500)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally { setLoading(false) }
  }

  const Header = (
    <div className="adm-page-header">
      <button onClick={() => navigate('/admin/tenants')} className="adm-back" aria-label="رجوع">
        <ArrowRight size={18} />
      </button>
      <div>
        <h1 className="adm-page-title">{isEdit ? 'تعديل المستأجر' : 'إضافة مستأجر جديد'}</h1>
        <div className="t-small">{isEdit ? 'تعديل بيانات الحساب والاشتراك' : 'إنشاء حساب جديد وتهيئة الصلاحيات'}</div>
      </div>
    </div>
  )

  if (fetching) return (
    <div className="adm-tenant-form">
      {Header}
      <div className="adm-section">
        <div className="skeleton" style={{ height: 40 }} />
        <div className="skeleton" style={{ height: 40 }} />
        <div className="skeleton" style={{ height: 40 }} />
        <div className="skeleton" style={{ height: 40 }} />
      </div>
    </div>
  )

  return (
    <div className="adm-tenant-form">
      {Header}

      <form onSubmit={handleSubmit} className="adm-form">

        {/* Basic info */}
        <div className="adm-section">
          <h2 className="adm-section-title">معلومات الحساب</h2>
          <div className="grid-2">
            <div className="field">
              <label className="field-label">اسم المؤسسة <span className="field-required">*</span></label>
              <input className="input" value={form.name} onChange={e => handleNameChange(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label">الرمز المختصر (slug) <span className="field-required">*</span></label>
              <input className="input mono" value={form.slug} onChange={e => set('slug', e.target.value)} required dir="ltr" />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label className="field-label">رقم السجل التجاري <span className="field-muted">(اختياري)</span></label>
              <input className="input mono" value={form.commercial_registration} dir="ltr"
                onChange={e => set('commercial_registration', e.target.value)} placeholder="1010123456" />
            </div>
            <div className="field">
              <label className="field-label">رقم الجوال الرئيسي <span className="field-muted">(اختياري)</span></label>
              <input className="input mono" value={form.primary_phone} dir="ltr"
                onChange={e => set('primary_phone', e.target.value)} placeholder="05XXXXXXXX" />
              <span className="field-hint">للتواصل مع المستأجر</span>
            </div>
            <div className="field">
              <label className="field-label">رقم الحساب <span className="field-muted">(اختياري)</span></label>
              <input className="input mono" value={form.account_number} dir="ltr"
                onChange={e => set('account_number', e.target.value)} placeholder="ACC-2024-001" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">ملاحظات</label>
            <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>

        {/* Subscription */}
        <div className="adm-section">
          <h2 className="adm-section-title">الاشتراك والصلاحيات</h2>
          <div className="grid-3">
            <div className="field">
              <label className="field-label">الخطة</label>
              <select className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                {PLANS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">تاريخ التفعيل</label>
              <input className="input" type="date" dir="ltr" value={form.activated_at}
                onChange={e => set('activated_at', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">تاريخ الانتهاء <span className="field-muted">(اختياري)</span></label>
              <input className="input" type="date" dir="ltr" value={form.expires_at}
                onChange={e => set('expires_at', e.target.value)} />
            </div>
          </div>

          {isEdit && (
            <div className="field">
              <label className="field-label">الحالة</label>
              <div className="adm-radio-row">
                {STATUSES.map(s => (
                  <label key={s.v}>
                    <input type="radio" name="status" value={s.v} checked={form.status === s.v}
                      onChange={() => set('status', s.v)} />
                    {s.l}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Feature toggles */}
          <div className="field">
            <label className="field-label">الميزات المتاحة</label>
            {[
              { key: 'allow_advanced_dashboard', label: 'لوحة التحكم المتقدمة', desc: 'رسوم بيانية ومؤشرات تحليلية متقدمة' },
              { key: 'allow_import',             label: 'استيراد Excel',         desc: 'رفع ملفات Excel لإدخال المبيعات' },
              { key: 'allow_reports',            label: 'التقارير',              desc: 'صفحة التقارير والتحليلات التفصيلية' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="adm-toggle-row" style={{ marginTop: 8 }}>
                <div>
                  <div className="row-name">{label}</div>
                  <div className="row-desc">{desc}</div>
                </div>
                <button type="button" onClick={() => set(key, !form[key])}
                  className={`adm-toggle ${form[key] ? 'on' : ''}`} aria-pressed={!!form[key]}>
                  <span className="knob" />
                </button>
              </div>
            ))}
          </div>

          {/* Input types */}
          <div className="field">
            <label className="field-label">أنواع الإدخال المسموح بها</label>
            <div className="adm-chips">
              {INPUT_TYPES.map(type => {
                const active = form.allowed_input_types.includes(type.v)
                return (
                  <button key={type.v} type="button" onClick={() => toggleInputType(type.v)}
                    className={`adm-chip-btn ${active ? 'active' : ''}`}>
                    {type.l}
                  </button>
                )
              })}
            </div>
            <span className="field-hint">حدد الأنواع التي يمكن للمستأجر استخدامها عند إدخال المبيعات</span>
          </div>

          <div className="field">
            <label className="field-label">الحد الأقصى للفروع <span className="field-muted">(الحد الأدنى: 3)</span></label>
            <input className="input" type="number" min="3" value={form.max_branches}
              onChange={e => set('max_branches', Math.max(3, parseInt(e.target.value) || 3))} />
          </div>
        </div>

        {/* Cenomi integration */}
        <div className="adm-section">
          <h2 className="adm-section-title">تكامل سينومي</h2>
          <div className="field">
            <label className="field-label">
              توكن سينومي (Cenomi API Token) <span className="field-muted">(اختياري)</span>
            </label>
            <div className="pwd-wrap">
              <input className="input mono" type={showCenomiToken ? 'text' : 'password'} dir="ltr"
                value={form.cenomi_api_token}
                onChange={e => set('cenomi_api_token', e.target.value)}
                placeholder="••••••••••••••••" />
              <button type="button" onClick={() => setShowCenomiToken(v => !v)}
                className="pwd-toggle" tabIndex={-1} aria-label="عرض/إخفاء">
                {showCenomiToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span className="field-hint">يُصدر سينومي توكناً واحداً لكل حساب. يُستخدم لإرسال بيانات المبيعات تلقائياً.</span>
          </div>
        </div>

        {/* User (create only) */}
        {!isEdit && (
          <div className="adm-section">
            <h2 className="adm-section-title"><UserPlus size={14} /> حساب المستخدم الأول (اختياري)</h2>
            <div className="grid-2">
              <div className="field">
                <label className="field-label">البريد الإلكتروني</label>
                <input className="input" type="email" dir="ltr" value={userForm.user_email}
                  onChange={e => setUserForm(f => ({...f, user_email: e.target.value}))} />
              </div>
              <div className="field">
                <label className="field-label">كلمة المرور المؤقتة</label>
                <input className="input" type="text" dir="ltr" value={userForm.user_password}
                  onChange={e => setUserForm(f => ({...f, user_password: e.target.value}))} placeholder="8+ أحرف" />
              </div>
              <div className="field">
                <label className="field-label">الاسم الكامل</label>
                <input className="input" type="text" value={userForm.user_name}
                  onChange={e => setUserForm(f => ({...f, user_name: e.target.value}))} />
              </div>
            </div>
          </div>
        )}

        <div className="adm-actions">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? <ButtonSpinner /> : <Save size={15} />}
            {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء الحساب'}
          </button>
          <button type="button" onClick={() => navigate('/admin/tenants')} className="btn btn-ghost">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
