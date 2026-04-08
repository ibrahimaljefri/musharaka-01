import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const init = useAuthStore(s => s.init)

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ALLOWED_REDIRECTS = [
    '/dashboard','/sales/create','/sales/import',
    '/reports','/branches','/submit','/submissions',
  ]

  const getRedirect = () => {
    const params = new URLSearchParams(location.search)
    const r = params.get('redirect') || '/dashboard'
    return ALLOWED_REDIRECTS.includes(r) ? r : '/dashboard'
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.email) return setError('البريد الإلكتروني مطلوب')
    if (!form.password) return setError('كلمة المرور مطلوبة')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    })
    setLoading(false)
    if (err) return setError('بيانات الدخول غير صحيحة. يرجى المحاولة مجدداً.')
    await init()
    navigate(getRedirect(), { replace: true })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <h1 className="text-xl font-bold text-gray-800 font-arabic mb-6 text-center">تسجيل الدخول</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-arabic text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">البريد الإلكتروني</label>
          <input
            type="email" dir="ltr" autoComplete="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">كلمة المرور</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'} dir="ltr" autoComplete="current-password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent pl-10"
            />
            <button
              type="button" onClick={() => setShowPass(p => !p)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm"
        >
          {loading ? 'جاري الدخول...' : <><LogIn size={16} /><span>دخول</span></>}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-yellow-700 font-arabic hover:underline">
          نسيت كلمة المرور؟
        </Link>
      </div>

      <p className="mt-3 text-center text-sm text-gray-500 font-arabic">
        ليس لديك حساب؟{' '}
        <Link to="/register" className="text-yellow-700 hover:underline font-medium">إنشاء حساب جديد</Link>
      </p>
    </div>
  )
}
