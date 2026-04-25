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
import './ticket.css'

const CATEGORIES = ['مبيعات', 'فروع', 'مستخدمون', 'ترخيص', 'تقني', 'أخرى']

const CAT_MAP = {
  license:  'ترخيص',
  sales:    'مبيعات',
  branch:   'فروع',
  user:     'مستخدمون',
  tech:     'تقني',
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function TicketCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const user     = useAuthStore(s => s.user)

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
    <div className="ticket-page">
      <div className="tk-header">
        <h1 className="tk-title">رفع تذكرة دعم</h1>
        <div className="tk-subtitle">أرسل مشكلتك وسيتواصل معك فريق الدعم في أقرب وقت</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="surface">
          <h2>بيانات التواصل</h2>
          <FormField label="البريد الإلكتروني للتواصل" required error={errors.submitter_email}>
            <input value={form.submitter_email}
              onChange={e => set('submitter_email', e.target.value)}
              onBlur={e => validateField('submitter_email', e.target.value)}
              required type="email" placeholder="email@example.com" dir="ltr"
              className="input" />
          </FormField>
        </div>

        <div className="surface">
          <h2>تفاصيل المشكلة</h2>

          <FormField label="عنوان المشكلة" required error={errors.title}>
            <input value={form.title}
              onChange={e => set('title', e.target.value)}
              onBlur={e => validateField('title', e.target.value)}
              required placeholder="مثال: التقارير لا تظهر"
              className="input" />
          </FormField>

          <FormField label="التصنيف" required error={errors.category}>
            <select value={form.category}
              onChange={e => set('category', e.target.value)}
              onBlur={e => validateField('category', e.target.value)}
              required
              className="input">
              <option value="">— اختر التصنيف —</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </FormField>

          <FormField label="وصف المشكلة" required error={errors.description}>
            <textarea value={form.description}
              onChange={e => set('description', e.target.value)}
              onBlur={e => validateField('description', e.target.value)}
              required rows={4} placeholder="اشرح المشكلة بالتفصيل..."
              className="input" />
          </FormField>

          <FormField label="خطوات إعادة المشكلة" hint="اختياري">
            <textarea value={form.steps} onChange={e => set('steps', e.target.value)}
              rows={3} placeholder="مثال: ١- اضغط على التقارير  ٢- اختر الشهر  ٣- الصفحة فارغة"
              className="input" />
          </FormField>
        </div>

        <div className="surface">
          <h2>
            <Paperclip size={14} />
            مرفق (اختياري)
          </h2>

          {file ? (
            <div className="tk-file">
              <Paperclip size={14} style={{ flexShrink: 0 }} />
              <span className="tk-file-name">{file.name}</span>
              <button type="button" className="tk-file-rm" onClick={() => setFile(null)}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="tk-dropzone">
              <Paperclip size={16} />
              <span>اضغط لاختيار ملف (PNG, JPG, PDF — بحد أقصى 5 ميجابايت)</span>
              <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <ButtonSpinner /> : <Send size={15} />}
          {loading ? 'جاري الإرسال...' : 'إرسال التذكرة'}
        </button>
      </form>
    </div>
  )
}
