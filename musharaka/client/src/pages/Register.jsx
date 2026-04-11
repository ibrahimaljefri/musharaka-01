import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { UserPlus } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const init = useAuthStore(s => s.init)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = 'الاسم الكامل مطلوب'
    if (!form.email.trim())   e.email   = 'البريد الإلكتروني مطلوب'
    if (!form.password)       e.password = 'كلمة المرور مطلوبة'
    if (form.password !== form.confirm) e.confirm = 'كلمة المرور غير متطابقة'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)
    setErrors({})
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.name } },
    })
    setLoading(false)
    if (err) return setErrors({ general: err.message.includes('already') ? 'البريد الإلكتروني مسجل مسبقاً.' : 'حدث خطأ، يرجى المحاولة مجدداً.' })
    await init()
    navigate('/dashboard', { replace: true })
  }

  const field = (key, label, type = 'text', dir = 'rtl', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium font-arabic mb-1.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
        {label}
      </label>
      <input
        type={type} dir={dir} autoComplete={key}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 border transition-colors"
        style={{
          background: 'rgba(255,255,255,0.08)',
          borderColor: errors[key] ? 'rgba(239,68,68,0.60)' : 'rgba(255,255,255,0.15)',
        }}
      />
      {errors[key] && <p className="mt-1 text-xs font-arabic" style={{ color: '#FCA5A5' }}>{errors[key]}</p>}
    </div>
  )

  return (
    <div
      className="backdrop-blur-xl rounded-2xl p-8 border shadow-2xl"
      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      {/* Brand mark */}
      <div className="flex justify-center mb-5">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xl"
          style={{ background: '#F59E0B' }}
        >
          م
        </div>
      </div>

      <h1 className="text-xl font-bold text-white font-arabic mb-6 text-center">إنشاء حساب جديد</h1>

      {errors.general && (
        <div
          className="mb-4 p-3 rounded-lg text-sm font-arabic text-center border"
          style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)', color: '#FCA5A5' }}
        >
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {field('name',     'الاسم الكامل',       'text',     'rtl', 'أحمد محمد')}
        {field('email',    'البريد الإلكتروني',  'email',    'ltr', 'example@email.com')}
        {field('password', 'كلمة المرور',        'password', 'ltr')}
        {field('confirm',  'تأكيد كلمة المرور', 'password', 'ltr')}

        <button
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all font-arabic text-sm font-bold disabled:opacity-60 hover:brightness-110 mt-2"
          style={{ background: '#F59E0B', color: '#0a0a0a' }}
        >
          {loading ? 'جاري إنشاء الحساب...' : <><UserPlus size={16} /><span>إنشاء الحساب</span></>}
        </button>
      </form>

      <p className="mt-5 text-center text-sm font-arabic" style={{ color: 'rgba(255,255,255,0.50)' }}>
        لديك حساب بالفعل؟{' '}
        <Link to="/login" className="text-yellow-400 hover:underline font-medium">تسجيل الدخول</Link>
      </p>
    </div>
  )
}
