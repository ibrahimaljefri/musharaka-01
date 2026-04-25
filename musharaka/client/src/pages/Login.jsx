import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api, { TOKEN_KEY } from '../lib/axiosClient'
import { useAuthStore } from '../store/authStore'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
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
    try {
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password })
      localStorage.setItem(TOKEN_KEY, data.accessToken)
      await init()
      navigate(getRedirect(), { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || ''
      if (msg.includes('NEEDS_RESET') || msg.includes('إعادة تعيين')) {
        setError('هذا الحساب يحتاج إعادة تعيين كلمة المرور — تحقق من بريدك الإلكتروني.')
      } else {
        setError('بيانات الدخول غير صحيحة. يرجى المحاولة مجدداً.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="auth-form-title">تسجيل الدخول</div>
      <div className="auth-form-sub">أدخل بياناتك للدخول إلى لوحة التحكم</div>

      <AlertBanner type="error" message={error} dismissible onClose={() => setError('')} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label">البريد الإلكتروني</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><Mail size={16} /></span>
            <input
              className="auth-input"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div className="auth-field">
          <div className="auth-sign-row">
            <label className="auth-label">كلمة المرور</label>
            <Link to="/forgot-password" className="auth-forgot">نسيت كلمة المرور؟</Link>
          </div>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><Lock size={16} /></span>
            <input
              className="auth-input"
              type={showPass ? 'text' : 'password'}
              dir="ltr"
              autoComplete="current-password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              style={{ paddingInlineEnd: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="auth-eye-toggle"
              aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? (
            <><ButtonSpinner /><span>جاري الدخول...</span></>
          ) : (
            <span>دخول</span>
          )}
        </button>
      </form>

      <div className="auth-divider">أو</div>

      <div className="auth-register-cta">
        هل أنت مستخدم جديد؟ <Link to="/register">تواصل مع فريق المبيعات</Link>
      </div>
    </>
  )
}
