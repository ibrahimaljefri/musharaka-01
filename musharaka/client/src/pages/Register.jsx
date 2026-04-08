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
      <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">{label}</label>
      <input
        type={type} dir={dir} autoComplete={key}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${errors[key] ? 'border-red-400' : 'border-gray-300'}`}
      />
      {errors[key] && <p className="mt-1 text-xs text-red-500 font-arabic">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <h1 className="text-xl font-bold text-gray-800 font-arabic mb-6 text-center">إنشاء حساب جديد</h1>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-arabic text-center">
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
          className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm mt-2"
        >
          {loading ? 'جاري إنشاء الحساب...' : <><UserPlus size={16} /><span>إنشاء الحساب</span></>}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500 font-arabic">
        لديك حساب بالفعل؟{' '}
        <Link to="/login" className="text-yellow-700 hover:underline font-medium">تسجيل الدخول</Link>
      </p>
    </div>
  )
}
