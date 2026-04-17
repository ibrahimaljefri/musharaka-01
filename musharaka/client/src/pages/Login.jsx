import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import ButtonSpinner from '../components/ButtonSpinner'

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
    <div>
      <h1
        className="text-xl font-bold text-white font-arabic mb-6 text-center"
        style={{ letterSpacing: '-0.01em' }}
      >
        تسجيل الدخول
      </h1>

      <AlertBanner type="error" message={error} dismissible onClose={() => setError('')} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium font-arabic mb-1.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
            البريد الإلكتروني
          </label>
          <input
            type="email" dir="ltr" autoComplete="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 border transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium font-arabic mb-1.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
            كلمة المرور
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'} dir="ltr" autoComplete="current-password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 border transition-colors pl-10"
              style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
            />
            <button
              type="button" onClick={() => setShowPass(p => !p)}
              className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'rgba(255,255,255,0.40)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.70)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.40)'}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all font-arabic text-sm font-bold disabled:opacity-60 hover:brightness-110"
          style={{ background: '#F59E0B', color: '#0a0a0a' }}
        >
          {loading ? (
            <><ButtonSpinner /><span>جاري الدخول...</span></>
          ) : (
            <><LogIn size={16} /><span>دخول</span></>
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link
          to="/forgot-password"
          className="text-sm font-arabic hover:underline transition-colors"
          style={{ color: 'rgba(255,255,255,0.40)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#F59E0B'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.40)'}
        >
          نسيت كلمة المرور؟
        </Link>
      </div>

      <p className="mt-3 text-center text-sm font-arabic" style={{ color: 'rgba(255,255,255,0.50)' }}>
        ليس لديك حساب؟{' '}
        <Link to="/register" className="text-yellow-400 hover:underline font-medium">إنشاء حساب جديد</Link>
      </p>
    </div>
  )
}
