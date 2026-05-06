import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { TOKEN_KEY } from '../lib/axiosClient'
import { useAuthStore } from '../store/authStore'
import { User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import ButtonSpinner from '../components/ButtonSpinner'

function getPasswordStrength(pwd) {
  let score = 0
  if (pwd.length >= 8) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  return score
}

export default function Register() {
  const navigate = useNavigate()
  const init = useAuthStore(s => s.init)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', acceptTerms: false })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  const strength = getPasswordStrength(form.password)

  const normalizePhone = (v) => (v || '').replace(/[\s\-()]/g, '').replace(/^(\+|00)/, '')
  const isValidSaPhone = (v) => {
    const n = normalizePhone(v)
    return /^(966)?5\d{8}$/.test(n) || /^0?5\d{8}$/.test(n)
  }

  const validateField = (key, value) => {
    if (key === 'name') {
      return value.trim() ? '' : 'الاسم الكامل مطلوب'
    }
    if (key === 'email') {
      if (!value.trim()) return 'البريد الإلكتروني مطلوب'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'صيغة البريد الإلكتروني غير صحيحة'
      return ''
    }
    if (key === 'phone') {
      if (!value.trim())      return 'رقم الجوال مطلوب'
      if (!isValidSaPhone(value)) return 'صيغة رقم الجوال غير صحيحة (مثال: 05xxxxxxxx)'
      return ''
    }
    if (key === 'password') {
      return value.length >= 8 ? '' : 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    }
    if (key === 'confirm') {
      return value === form.password ? '' : 'كلمة المرور غير متطابقة'
    }
    return ''
  }

  const handleBlur = key => {
    const msg = validateField(key, form[key])
    setErrors(prev => ({ ...prev, [key]: msg }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = 'الاسم الكامل مطلوب'
    if (!form.email.trim())   e.email   = 'البريد الإلكتروني مطلوب'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'صيغة البريد الإلكتروني غير صحيحة'
    if (!form.phone.trim())   e.phone   = 'رقم الجوال مطلوب'
    else if (!isValidSaPhone(form.phone)) e.phone = 'صيغة رقم الجوال غير صحيحة (مثال: 05xxxxxxxx)'
    if (!form.password)       e.password = 'كلمة المرور مطلوبة'
    else if (form.password.length < 8) e.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    if (form.password !== form.confirm) e.confirm = 'كلمة المرور غير متطابقة'
    if (!form.acceptTerms) e.acceptTerms = 'يجب الموافقة على الشروط والأحكام للمتابعة'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)
    setErrors({})
    setGeneralError('')
    setLoading(true)
    const canonicalPhone = (() => {
      const n = normalizePhone(form.phone)
      if (/^966/.test(n)) return n
      if (/^0/.test(n))   return '966' + n.slice(1)
      return '966' + n
    })()
    try {
      const { data } = await api.post('/auth/signup', {
        email: form.email, password: form.password,
        full_name: form.name, phone: canonicalPhone,
        terms_accepted: true,
      })
      localStorage.setItem(TOKEN_KEY, data.accessToken)
      await init()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || ''
      setGeneralError(msg.includes('مسبقاً') ? 'البريد الإلكتروني مسجل مسبقاً.' : 'حدث خطأ، يرجى المحاولة مجدداً.')
    } finally {
      setLoading(false)
    }
  }

  const fieldErrorStyle = { color: '#FCA5A5', fontSize: '12px', marginTop: '4px', display: 'block' }

  return (
    <>
      <div className="auth-form-title">إنشاء حساب جديد</div>
      <div className="auth-form-sub">أنشئ حسابك للبدء في تشارك بيانات فروعك بأمان</div>

      <AlertBanner type="error" message={generalError} dismissible onClose={() => setGeneralError('')} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label">الاسم الكامل</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><User size={16} /></span>
            <input
              className="auth-input"
              type="text"
              dir="rtl"
              autoComplete="name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onBlur={() => handleBlur('name')}
              placeholder="أحمد محمد"
            />
          </div>
          {errors.name && <span style={fieldErrorStyle}>{errors.name}</span>}
        </div>

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
              onBlur={() => handleBlur('email')}
              placeholder="you@company.com"
            />
          </div>
          {errors.email && <span style={fieldErrorStyle}>{errors.email}</span>}
        </div>

        <div className="auth-field">
          <label className="auth-label">رقم الجوال</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><Phone size={16} /></span>
            <input
              className="auth-input"
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              onBlur={() => handleBlur('phone')}
              placeholder="05xxxxxxxx"
            />
          </div>
          {errors.phone && <span style={fieldErrorStyle}>{errors.phone}</span>}
        </div>

        <div className="auth-field">
          <label className="auth-label">كلمة المرور</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><Lock size={16} /></span>
            <input
              className="auth-input"
              type={showPass ? 'text' : 'password'}
              dir="ltr"
              autoComplete="new-password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onBlur={() => handleBlur('password')}
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
          {form.password && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    height: '3px',
                    flex: 1,
                    borderRadius: '999px',
                    transition: 'background-color 150ms',
                    background: i <= strength
                      ? (strength <= 1 ? '#F87171' : strength === 2 ? '#FBBF24' : '#34D399')
                      : 'rgba(255,255,255,0.12)',
                  }}
                />
              ))}
            </div>
          )}
          {errors.password && <span style={fieldErrorStyle}>{errors.password}</span>}
        </div>

        <div className="auth-field">
          <label className="auth-label">تأكيد كلمة المرور</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><Lock size={16} /></span>
            <input
              className="auth-input"
              type={showConfirm ? 'text' : 'password'}
              dir="ltr"
              autoComplete="new-password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              onBlur={() => handleBlur('confirm')}
              placeholder="••••••••"
              style={{ paddingInlineEnd: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(p => !p)}
              className="auth-eye-toggle"
              aria-label={showConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {form.confirm && form.confirm === form.password
                ? <CheckCircle size={16} style={{ color: '#34D399' }} />
                : (showConfirm ? <EyeOff size={16} /> : <Eye size={16} />)}
            </button>
          </div>
          {errors.confirm && <span style={fieldErrorStyle}>{errors.confirm}</span>}
        </div>

        {/* Terms acceptance checkbox — required for signup */}
        <div className="form-group" style={{ marginTop: 4 }}>
          <label
            htmlFor="acceptTerms"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontSize: '13px', cursor: 'pointer', color: '#E7E5E4',
              lineHeight: 1.6,
            }}
          >
            <input
              id="acceptTerms"
              type="checkbox"
              checked={form.acceptTerms}
              onChange={e => {
                setForm(f => ({ ...f, acceptTerms: e.target.checked }))
                if (e.target.checked) setErrors(prev => ({ ...prev, acceptTerms: '' }))
              }}
              style={{ marginTop: 2, accentColor: '#D97706', flexShrink: 0 }}
            />
            <span>
              أوافق على{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#FBBF24', textDecoration: 'underline' }}>
                الشروط والأحكام
              </Link>
            </span>
          </label>
          {errors.acceptTerms && <span style={fieldErrorStyle}>{errors.acceptTerms}</span>}
        </div>

        <button type="submit" disabled={loading || !form.acceptTerms} className="auth-submit-btn">
          {loading ? (
            <><ButtonSpinner /><span>جاري إنشاء الحساب...</span></>
          ) : (
            <span>إنشاء الحساب</span>
          )}
        </button>
      </form>

      <div className="auth-register-cta">
        لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
      </div>
    </>
  )
}
