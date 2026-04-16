import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import TipsPanel from '../components/TipsPanel'
import AlertBanner from '../components/AlertBanner'

const TIPS = [
  'يمكنك تحديث جميع بيانات الفرع.',
  'تغيير الكود قد يؤثر على ملفات الاستيراد القديمة.',
  'آخر تحديث يُسجَّل تلقائياً.',
]

export default function BranchEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase.from('branches').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setForm(data); setFetching(false) })
  }, [id])

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.code?.trim()) return setError('كود الفرع مطلوب')
    if (!form.name?.trim()) return setError('اسم الفرع مطلوب')
    setLoading(true)
    try {
      const { error: err } = await supabase.from('branches').update({
        code:            form.code.trim(),
        name:            form.name.trim(),
        contract_number: form.contract_number || null,
        brand_name:      form.brand_name || null,
        unit_number:     form.unit_number || null,
        token:           form.token || null,
        location:        form.location || null,
        address:         form.address || null,
      }).eq('id', id)
      if (err) return setError(err.code === '23505' ? 'كود الفرع مستخدم مسبقاً.' : err.message)
      setSuccess('تم حفظ التغييرات بنجاح')
      setTimeout(() => navigate('/branches'), 1200)
    } catch (e) {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مجدداً.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8 text-center text-gray-400 font-arabic">جاري التحميل...</div>
  if (!form)    return <div className="p-8 text-center text-red-400 font-arabic">الفرع غير موجود</div>

  const field = (key, label, dir = 'rtl', type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">{label}</label>
      <input type={type} dir={dir} value={form[key] || ''} onChange={e => set(key, e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 font-arabic mb-6">تعديل الفرع</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
          {error   && <AlertBanner type="error"   message={error}   />}
          {success && <AlertBanner type="success" message={success} dismissible={false} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            {field('code',            'كود الفرع *',        'ltr')}
            {field('name',            'اسم الفرع *',        'rtl')}
            {field('contract_number', 'رقم العقد',          'ltr')}
            {field('brand_name',      'اسم البراند',        'rtl')}
            {field('unit_number',     'رقم الوحدة',         'ltr')}
            {field('token',           'توكن الفرع',         'ltr', 'password')}
            {field('location',        'الموقع',             'rtl')}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">العنوان</label>
              <textarea value={form.address || ''} onChange={e => set('address', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            </div>

            {/* Metadata */}
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-400 space-y-1 font-arabic">
              <p>تم الإنشاء: <span dir="ltr">{new Date(form.created_at).toLocaleString('ar-SA')}</span></p>
              <p>آخر تحديث: <span dir="ltr">{new Date(form.updated_at).toLocaleString('ar-SA')}</span></p>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={loading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm">
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
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
