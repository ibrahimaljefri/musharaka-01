/**
 * TicketCreate — client-facing support ticket submission form
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/axiosClient'
import FormField from '../components/FormField'
import ButtonSpinner from '../components/ButtonSpinner'
import { toast } from '../lib/useToast'
import { Send, Paperclip, X } from 'lucide-react'

const CATEGORIES = ['مبيعات', 'فروع', 'مستخدمون', 'ترخيص', 'تقني', 'أخرى']

/** Maps English URL param values → Arabic category labels */
const CAT_MAP = {
  license:  'ترخيص',
  sales:    'مبيعات',
  branch:   'فروع',
  user:     'مستخدمون',
  tech:     'تقني',
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export default function TicketCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const user     = useAuthStore(s => s.user)

  // Pre-fill category from URL param e.g. ?category=license
  const initialCategory = (() => {
    const param = new URLSearchParams(location.search).get('category')
    return CAT_MAP[param?.toLowerCase()] || ''
  })()

  const [form, setForm] = useState({
    submitter_email: '',
    title:           '',
    category:        initialCategory,
    description:     '',
    steps:           '',
  })
  const [file,    setFile]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validateField = (name, value) => {
    let err = ''
    if (name === 'title' && !value?.trim()) err = 'عنوان المشكلة مطلوب'
    if (name === 'category' && !value) err = 'التصنيف مطلوب'
    if (name === 'submitter_email' && !value?.trim()) err = 'البريد الإلكتروني مطلوب'
    if (name === 'description' && !value?.trim()) err = 'وصف المشكلة مطلوب'
    setErrors(prev => ({ ...prev, [name]: err }))
    return !err
  }

  const handleFileChange = e => {
    const f = e.target.files[0]
    if (!f) return
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error('يُسمح فقط بملفات PNG و JPG و PDF')
      e.target.value = ''
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('حجم الملف يتجاوز 5 ميجابايت')
      e.target.value = ''
      return
    }
    setFile(f)
  }

  const handleSubmit = async e => {
    e.preventDefault()

    const titleValid    = validateField('title',           form.title)
    const catValid      = validateField('category',        form.category)
    const emailValid    = validateField('submitter_email', form.submitter_email)
    const descValid     = validateField('description',     form.description)
    if (!titleValid || !catValid || !emailValid || !descValid) return

    setLoading(true)
    try {
      const submitter_name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم'

      const body = new FormData()
      body.append('submitter_name', submitter_name)
      Object.entries(form).forEach(([k, v]) => { if (v) body.append(k, v) })
      if (file) body.append('file', file)

      const { data } = await api.post('/tickets', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate(`/tickets/success?ref=${data.ticket_number}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white font-arabic">رفع تذكرة دعم</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 font-arabic mt-0.5">
          أرسل مشكلتك وسيتواصل معك فريق الدعم في أقرب وقت
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Contact email only */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
            بيانات التواصل
          </h2>
          <FormField label="البريد الإلكتروني للتواصل" required error={errors.submitter_email}>
            <input value={form.submitter_email}
              onChange={e => set('submitter_email', e.target.value)}
              onBlur={e => validateField('submitter_email', e.target.value)}
              required type="email" placeholder="email@example.com" dir="ltr"
              className="input-base font-mono" />
          </FormField>
        </div>

        {/* Ticket details */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
            تفاصيل المشكلة
          </h2>

          <FormField label="عنوان المشكلة" required error={errors.title}>
            <input value={form.title}
              onChange={e => set('title', e.target.value)}
              onBlur={e => validateField('title', e.target.value)}
              required placeholder="مثال: التقارير لا تظهر"
              className="input-base font-arabic" />
          </FormField>

          <FormField label="التصنيف" required error={errors.category}>
            <select value={form.category}
              onChange={e => set('category', e.target.value)}
              onBlur={e => validateField('category', e.target.value)}
              required
              className="input-base font-arabic">
              <option value="">— اختر التصنيف —</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </FormField>

          <FormField label="وصف المشكلة" required error={errors.description}>
            <textarea value={form.description}
              onChange={e => set('description', e.target.value)}
              onBlur={e => validateField('description', e.target.value)}
              required rows={4} placeholder="اشرح المشكلة بالتفصيل..."
              className="input-base font-arabic resize-none" />
          </FormField>

          <FormField label="خطوات إعادة المشكلة" hint="اختياري">
            <textarea value={form.steps} onChange={e => set('steps', e.target.value)}
              rows={3} placeholder="مثال: ١- اضغط على التقارير  ٢- اختر الشهر  ٣- الصفحة فارغة"
              className="input-base font-arabic resize-none" />
          </FormField>
        </div>

        {/* Attachment */}
        <div className="card-surface p-6 space-y-3">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 font-arabic text-sm border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
            <Paperclip size={14} className="text-gray-500 dark:text-gray-400" />
            مرفق <span className="text-gray-400 dark:text-gray-500 font-normal">(اختياري)</span>
          </h2>

          {file ? (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
              <Paperclip size={14} className="text-yellow-600 dark:text-yellow-500 shrink-0" />
              <span className="text-sm font-arabic text-yellow-800 dark:text-yellow-300 flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-300">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 cursor-pointer hover:border-yellow-400 dark:hover:border-yellow-500 transition-colors">
              <Paperclip size={16} className="text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400 font-arabic">اضغط لاختيار ملف (PNG, JPG, PDF — بحد أقصى 5 ميجابايت)</span>
              <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-3 rounded-lg transition-colors font-arabic">
          {loading ? <ButtonSpinner /> : <Send size={15} />}
          {loading ? 'جاري الإرسال...' : 'إرسال التذكرة'}
        </button>
      </form>
    </div>
  )
}
