/**
 * TicketCreate — client-facing support ticket submission form
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/axiosClient'
import AlertBanner from '../components/AlertBanner'
import { Send, Paperclip, X } from 'lucide-react'

const CATEGORIES = [
  { v: 'integration', l: 'تكامل' },
  { v: 'license',     l: 'ترخيص' },
  { v: 'technical',   l: 'تقني' },
  { v: 'reporting',   l: 'تقارير' },
]

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export default function TicketCreate() {
  const navigate = useNavigate()
  const user     = useAuthStore(s => s.user)

  const [form, setForm] = useState({
    submitter_email: '',
    title:           '',
    category:        '',
    description:     '',
    steps:           '',
  })
  const [file,    setFile]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFileChange = e => {
    const f = e.target.files[0]
    if (!f) return
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('يُسمح فقط بملفات PNG و JPG و PDF')
      e.target.value = ''
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('حجم الملف يتجاوز 5 ميجابايت')
      e.target.value = ''
      return
    }
    setError('')
    setFile(f)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
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
      setError(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800 font-arabic">رفع تذكرة دعم</h1>
        <p className="text-xs text-gray-400 font-arabic mt-0.5">
          أرسل مشكلتك وسيتواصل معك فريق الدعم في أقرب وقت
        </p>
      </div>

      {error && <AlertBanner type="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Contact email only */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 font-arabic text-sm border-b border-gray-100 pb-2">
            بيانات التواصل
          </h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
              البريد الإلكتروني للتواصل <span className="text-red-500">*</span>
            </label>
            <input value={form.submitter_email} onChange={e => set('submitter_email', e.target.value)}
              required type="email" placeholder="email@example.com" dir="ltr"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        </div>

        {/* Ticket details */}
        <div className="card-surface p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 font-arabic text-sm border-b border-gray-100 pb-2">
            تفاصيل المشكلة
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
              عنوان المشكلة <span className="text-red-500">*</span>
            </label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              required placeholder="مثال: التقارير لا تظهر"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
              التصنيف <span className="text-red-500">*</span>
            </label>
            <select value={form.category} onChange={e => set('category', e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">— اختر التصنيف —</option>
              {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
              وصف المشكلة <span className="text-red-500">*</span>
            </label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              required rows={4} placeholder="اشرح المشكلة بالتفصيل..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 font-arabic mb-1.5">
              خطوات إعادة المشكلة <span className="text-gray-400">(اختياري)</span>
            </label>
            <textarea value={form.steps} onChange={e => set('steps', e.target.value)}
              rows={3} placeholder="مثال: ١- اضغط على التقارير  ٢- اختر الشهر  ٣- الصفحة فارغة"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
          </div>
        </div>

        {/* Attachment */}
        <div className="card-surface p-6 space-y-3">
          <h2 className="font-semibold text-gray-700 font-arabic text-sm border-b border-gray-100 pb-2 flex items-center gap-2">
            <Paperclip size={14} className="text-gray-500" />
            مرفق <span className="text-gray-400 font-normal">(اختياري)</span>
          </h2>

          {file ? (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Paperclip size={14} className="text-yellow-600 shrink-0" />
              <span className="text-sm font-arabic text-yellow-800 flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-yellow-500 hover:text-yellow-700">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-yellow-400 transition-colors">
              <Paperclip size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500 font-arabic">اضغط لاختيار ملف (PNG, JPG, PDF — بحد أقصى 5 ميجابايت)</span>
              <input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-3 rounded-lg transition-colors font-arabic">
          <Send size={15} />
          {loading ? 'جاري الإرسال...' : 'إرسال التذكرة'}
        </button>
      </form>
    </div>
  )
}
