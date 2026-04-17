/**
 * TenantForm — used by both TenantCreate and TenantEdit
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/axiosClient'
import AlertBanner from '../../components/AlertBanner'
import { Save, ArrowRight, UserPlus } from 'lucide-react'

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
  })
  const [userForm, setUserForm] = useState({
    user_email: '', user_password: '', user_name: '',
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')


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
      })
      setFetching(false)
    }).catch(() => setFetching(false))
  }, [id, isEdit])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleInputType = (type) => {
    const current = form.allowed_input_types
    set('allowed_input_types',
      current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type]
    )
  }

  // Auto-generate slug from name
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
    setError(''); setSuccess('')
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
        setSuccess('تم تحديث بيانات المستأجر بنجاح')
      } else {
        await api.post('/admin/tenants', payload)
        setSuccess('تم إنشاء المستأجر بنجاح')
        setTimeout(() => navigate('/admin/tenants'), 1500)
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
        <button onClick={() => navigate('/admin/tenants')} className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-arabic">
            {isEdit ? 'تعديل المستأجر' : 'إضافة مستأجر جديد'}
          </h1>
          <p className="text-xs text-gray-400 font-arabic mt-0.5">
            {isEdit ? 'تعديل بيانات الحساب والاشتراك' : 'إنشاء حساب جديد وتهيئة الصلاحيات'}
          </p>
        </div>
      </div>

      {error   && <AlertBanner type="error"   message={error} />}
      {success && <AlertBanner type="success" message={success} dismissible={false} />}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic info */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 font-arabic text-sm border-b border-gray-100 pb-2">معلومات الحساب</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">اسم المؤسسة <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => handleNameChange(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">الرمز المختصر (slug) <span className="text-red-500">*</span></label>
              <input value={form.slug} onChange={e => set('slug', e.target.value)} required dir="ltr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
                رقم السجل التجاري <span className="text-gray-400 font-normal">(اختياري)</span>
              </label>
              <input value={form.commercial_registration} onChange={e => set('commercial_registration', e.target.value)}
                dir="ltr" placeholder="1010123456"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
                رقم الجوال الرئيسي <span className="text-gray-400 font-normal">(اختياري)</span>
              </label>
              <input value={form.primary_phone} onChange={e => set('primary_phone', e.target.value)}
                dir="ltr" placeholder="05XXXXXXXX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              <p className="text-xs text-gray-400 font-arabic mt-1">للتواصل عبر واتساب</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
                رقم الحساب <span className="text-gray-400 font-normal">(اختياري)</span>
              </label>
              <input value={form.account_number} onChange={e => set('account_number', e.target.value)}
                dir="ltr" placeholder="ACC-2024-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
          </div>
        </div>

        {/* Subscription */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 font-arabic text-sm border-b border-gray-100 pb-2">الاشتراك والصلاحيات</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">الخطة</label>
              <select value={form.plan} onChange={e => set('plan', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
                {PLANS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">تاريخ التفعيل</label>
              <input type="date" value={form.activated_at} onChange={e => set('activated_at', e.target.value)} dir="ltr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">تاريخ الانتهاء <span className="text-gray-400 font-normal">(اختياري)</span></label>
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} dir="ltr"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">الحالة</label>
              <div className="flex gap-3">
                {STATUSES.map(s => (
                  <label key={s.v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" value={s.v} checked={form.status === s.v} onChange={() => set('status', s.v)} className="text-yellow-600 focus:ring-yellow-400" />
                    <span className="text-sm font-arabic text-gray-700">{s.l}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Feature toggles */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-2">الميزات المتاحة</label>
            {[
              { key: 'allow_advanced_dashboard', label: 'لوحة التحكم المتقدمة', desc: 'رسوم بيانية ومؤشرات تحليلية متقدمة' },
              { key: 'allow_import',             label: 'استيراد Excel',         desc: 'رفع ملفات Excel لإدخال المبيعات' },
              { key: 'allow_reports',            label: 'التقارير',              desc: 'صفحة التقارير والتحليلات التفصيلية' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700 font-arabic">{label}</p>
                  <p className="text-xs text-gray-400 font-arabic mt-0.5">{desc}</p>
                </div>
                <button type="button"
                  onClick={() => set(key, !form[key])}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${form[key] ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form[key] ? 'translate-x-1' : 'translate-x-6'}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Input type permissions */}
          <div>
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-2">أنواع الإدخال المسموح بها</label>
            <div className="flex gap-3 flex-wrap">
              {INPUT_TYPES.map(type => {
                const active = form.allowed_input_types.includes(type.v)
                return (
                  <button
                    key={type.v} type="button"
                    onClick={() => toggleInputType(type.v)}
                    className={`px-4 py-2 rounded-lg text-sm font-arabic border transition-colors ${
                      active
                        ? 'bg-yellow-600 text-white border-yellow-600'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-yellow-400'
                    }`}
                  >
                    {type.l}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 font-arabic mt-1.5">
              حدد الأنواع التي يمكن للمستأجر استخدامها عند إدخال المبيعات
            </p>
          </div>

          {/* Max branches override */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 font-arabic mb-1">
              الحد الأقصى للفروع
              <span className="text-gray-400 mr-1 text-xs">(الحد الأدنى: 3)</span>
            </label>
            <input
              type="number"
              min="3"
              value={form.max_branches}
              onChange={e => set('max_branches', Math.max(3, parseInt(e.target.value) || 3))}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>

        {/* User (create only) */}
        {!isEdit && (
          <div className="card-surface p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 font-arabic text-sm border-b border-gray-100 pb-2 flex items-center gap-2">
              <UserPlus size={14} className="text-gray-500" />
              حساب المستخدم الأول (اختياري)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">البريد الإلكتروني</label>
                <input type="email" value={userForm.user_email} onChange={e => setUserForm(f => ({...f, user_email: e.target.value}))} dir="ltr"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">كلمة المرور المؤقتة</label>
                <input type="text" value={userForm.user_password} onChange={e => setUserForm(f => ({...f, user_password: e.target.value}))} dir="ltr"
                  placeholder="8+ أحرف"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">الاسم الكامل</label>
                <input type="text" value={userForm.user_name} onChange={e => setUserForm(f => ({...f, user_name: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm">
            <Save size={15} /> {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء الحساب'}
          </button>
          <button type="button" onClick={() => navigate('/admin/tenants')}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-arabic">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
