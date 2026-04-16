import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import TipsPanel from '../components/TipsPanel'
import AlertBanner from '../components/AlertBanner'

const TIPS = [
  'كود الفرع يجب أن يكون فريداً ويُستخدم في ملفات Excel.',
  'توكن الفرع يُستخدم للمصادقة مع المنصة.',
  'رقم الوحدة ورقم العقد حقول اختيارية للتتبع الداخلي.',
  'لا تشارك توكن الفرع مع أطراف غير مصرح لها.',
]

export default function BranchCreate() {
  const navigate  = useNavigate()
  const tenantId  = useAuthStore(s => s.tenantId)
  const [form, setForm] = useState({
    code: '', name: '', contract_number: '', brand_name: '',
    unit_number: '', token: '', location: '', address: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.code.trim()) return setError('كود الفرع مطلوب')
    if (!form.name.trim()) return setError('اسم الفرع مطلوب')
    if (!tenantId) return setError('لم يتم تحديد المستأجر. يرجى تسجيل الخروج والدخول مجدداً.')
    setLoading(true)
    try {
      // Check branch limit
      const { count: currentCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('max_branches')
        .eq('id', tenantId)
        .single()

      const maxBranches = tenantData?.max_branches
      if (maxBranches !== null && maxBranches !== undefined && currentCount >= maxBranches) {
        setLoading(false)
        return setError(`لقد وصلت إلى الحد الأقصى للفروع المسموح بها (${maxBranches} فروع). تواصل مع الإدارة للترقية.`)
      }

      const { error: err } = await supabase.from('branches').insert({
        tenant_id:       tenantId,
        code:            form.code.trim(),
        name:            form.name.trim(),
        contract_number: form.contract_number || null,
        brand_name:      form.brand_name || null,
        unit_number:     form.unit_number || null,
        token:           form.token || null,
        location:        form.location || null,
        address:         form.address || null,
      })
      if (err) return setError(err.code === '23505' ? 'كود الفرع مستخدم مسبقاً. يرجى اختيار كود آخر.' : err.message)
      navigate('/branches')
    } catch (e) {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مجدداً.')
    } finally {
      setLoading(false)
    }
  }

  const field = (key, label, required = false, dir = 'rtl', placeholder = '', type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} dir={dir} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 font-arabic mb-6">إضافة فرع جديد</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 card-surface rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {error && <AlertBanner type="error" message={error} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            {field('code',            'كود الفرع',          true,  'ltr', 'BR-001')}
            {field('name',            'اسم الفرع',          true,  'rtl', 'فرع الرياض')}
            {field('contract_number', 'رقم العقد',          false, 'ltr', 'CNT-2024-001')}
            {field('brand_name',      'اسم البراند',        false, 'rtl')}
            {field('unit_number',     'رقم الوحدة',         false, 'ltr')}
            {field('token',           'توكن الفرع (سري)',   false, 'ltr', '', 'password')}
            {field('location',        'الموقع',             false, 'rtl', 'الرياض، حي العليا')}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-1.5">العنوان</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm">
                {loading ? 'جاري الحفظ...' : 'حفظ الفرع'}
              </button>
              <button type="button" onClick={() => navigate('/branches')}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-arabic">
                إلغاء
              </button>
            </div>
          </form>
        </div>
        <div className="w-full lg:w-64 shrink-0"><TipsPanel tips={TIPS} /></div>
      </div>
    </div>
  )
}
