import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/axiosClient'
import TipsPanel from '../components/TipsPanel'
import AlertBanner from '../components/AlertBanner'
import { Building2, Calendar, MapPin, Hash, ExternalLink, FileText, Send } from 'lucide-react'

const TIPS = [
  'يمكنك تحديث جميع بيانات الفرع.',
  'تغيير الكود قد يؤثر على ملفات الاستيراد القديمة.',
  'آخر تحديث يُسجَّل تلقائياً.',
]

function SummaryRow({ icon: Icon, label, value, dir = 'rtl' }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <div className="p-1.5 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg shrink-0 mt-0.5">
        <Icon size={13} className="text-yellow-600 dark:text-yellow-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-arabic leading-none mb-1">{label}</p>
        <p className="text-sm text-gray-700 dark:text-gray-200 truncate" dir={dir}>{value || '—'}</p>
      </div>
    </div>
  )
}

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
    api.get(`/branches/${id}`)
      .then(({ data }) => { if (data) setForm(data); setFetching(false) })
      .catch(() => setFetching(false))
  }, [id])

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.code?.trim()) return setError('كود الفرع مطلوب')
    if (!form.name?.trim()) return setError('اسم الفرع مطلوب')
    setLoading(true)
    try {
      await api.put(`/branches/${id}`, {
        code:            form.code.trim(),
        name:            form.name.trim(),
        contract_number: form.contract_number || null,
        brand_name:      form.brand_name      || null,
        unit_number:     form.unit_number     || null,
        token:           form.token           || null,
        location:        form.location        || null,
        address:         form.address         || null,
      })
      setSuccess('تم حفظ التغييرات بنجاح')
      setTimeout(() => navigate('/branches'), 1200)
    } catch (e) {
      const msg = e.response?.data?.error || 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8 text-center text-gray-400 font-arabic">جاري التحميل...</div>
  if (!form)    return <div className="p-8 text-center text-red-400 font-arabic">الفرع غير موجود</div>

  const field = (key, label, dir = 'rtl', type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-1.5">{label}</label>
      <input type={type} dir={dir} value={form[key] || ''} onChange={e => set(key, e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
    </div>
  )

  const fmt = (d) => d ? new Date(d).toLocaleString('ar-SA') : '—'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header — widens to full container, puts branch identity front and center */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 font-arabic">تعديل الفرع</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-arabic mt-0.5">
              {form.name || form.code} · <span className="font-mono" dir="ltr">{form.code}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-arabic">
          <Calendar size={12} className="text-gray-400" />
          <span>آخر تحديث: <span dir="ltr">{fmt(form.updated_at)}</span></span>
        </div>
      </div>

      {/* 2-col layout on lg+ — form takes majority, sidebar fills the rest */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main: form card */}
        <div className="card-surface rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {error   && <AlertBanner type="error"   message={error}   />}
          {success && <AlertBanner type="success" message={success} dismissible={false} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('code',            'كود الفرع *',        'ltr')}
              {field('name',            'اسم الفرع *',        'rtl')}
              {field('contract_number', 'رقم العقد',          'ltr')}
              {field('brand_name',      'اسم البراند',        'rtl')}
              {field('unit_number',     'رقم الوحدة',         'ltr')}
              {field('token',           'توكن الفرع',         'ltr', 'password')}
              {field('location',        'الموقع',             'rtl')}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-1.5">العنوان</label>
              <textarea value={form.address || ''} onChange={e => set('address', e.target.value)} rows={2}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm shadow-sm">
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button type="button" onClick={() => navigate('/branches')}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-arabic">
                إلغاء
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar: stacks multiple contextual cards to fill the right column */}
        <aside className="space-y-4 lg:sticky lg:top-6 self-start">
          {/* Branch summary at-a-glance */}
          <div className="card-surface rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Hash size={14} className="text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 font-arabic">ملخص الفرع</h3>
            </div>
            <SummaryRow icon={Building2} label="الكود"       value={form.code}            dir="ltr" />
            <SummaryRow icon={FileText}  label="رقم العقد"   value={form.contract_number} dir="ltr" />
            <SummaryRow icon={MapPin}    label="الموقع"      value={form.location} />
            <SummaryRow icon={Calendar}  label="أُنشئ في"    value={fmt(form.created_at)} dir="ltr" />
          </div>

          {/* Quick actions — send the tenant to related pages for this branch */}
          <div className="card-surface rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 font-arabic mb-3">إجراءات سريعة</h3>
            <div className="space-y-2">
              <button onClick={() => navigate(`/submit?branch=${id}`)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-arabic text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/60 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-700 dark:hover:text-yellow-400 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-700/50 transition-colors">
                <span className="flex items-center gap-2"><Send size={13} /> إرسال فواتير هذا الفرع</span>
                <ExternalLink size={11} className="text-gray-400" />
              </button>
              <button onClick={() => navigate(`/submissions?branch=${id}`)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-arabic text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/60 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-700 dark:hover:text-yellow-400 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-700/50 transition-colors">
                <span className="flex items-center gap-2"><FileText size={13} /> سجل الإرسالات</span>
                <ExternalLink size={11} className="text-gray-400" />
              </button>
            </div>
          </div>

          <TipsPanel tips={TIPS} />
        </aside>
      </div>
    </div>
  )
}
