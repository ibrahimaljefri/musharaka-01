import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/axiosClient'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import ButtonSpinner from '../components/ButtonSpinner'

function strength(pwd) {
  let s = 0
  if (pwd.length >= 8) s++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++
  if (/\d/.test(pwd)) s++
  if (/[^a-zA-Z0-9]/.test(pwd)) s++
  return s
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [form, setForm]   = useState({ next: '', confirm: '' })
  const [show, setShow]   = useState({ next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone]   = useState(false)

  const pw = strength(form.next)

  if (!token) return (
    <>
      <div className="auth-form-title">رابط غير صالح</div>
      <div className="auth-form-sub">رابط إعادة التعيين غير صالح أو منتهي الصلاحية.</div>
      <div className="auth-register-cta">
        <Link to="/forgot-password">طلب رابط جديد</Link>
      </div>
    </>
  )

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.next.length < 8) return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    if (form.next !== form.confirm) return setError('كلمة المرور غير متطابقة')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: form.next })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'الرابط غير صالح أو منتهي الصلاحية')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div
          style={{
            width: '56px', height: '56px', borderRadius: '999px',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.30)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <ShieldCheck size={28} style={{ color: '#34D399' }} />
        </div>
      </div>
      <div className="auth-form-title">تم إعادة تعيين كلمة المرور</div>
      <div className="auth-form-sub">جاري التوجيه لتسجيل الدخول...</div>
    </>
  )

  const fields = [
    { key: 'next',    label: 'كلمة المرور الجديدة' },
    { key: 'confirm', label: 'تأكيد كلمة المرور' },
  ]

  return (
    <>
      <div className="auth-form-title">إعادة تعيين كلمة المرور</div>
      <div className="auth-form-sub">أدخل كلمة المرور الجديدة</div>

      <AlertBanner type="error" message={error} dismissible onClose={() => setError('')} />

      <form onSubmit={handleSubmit} noValidate>
        {fields.map(({ key, label }) => (
          <div key={key} className="auth-field">
            <label className="auth-label">{label}</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><Lock size={16} /></span>
              <input
                className="auth-input"
                type={show[key] ? 'text' : 'password'}
                dir="ltr"
                autoComplete="new-password"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder="••••••••"
                style={{ paddingInlineEnd: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                className="auth-eye-toggle"
                aria-label={show[key] ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {key === 'next' && form.next && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    style={{
                      height: '3px',
                      flex: 1,
                      borderRadius: '999px',
                      transition: 'background-color 150ms',
                      background: i <= pw
                        ? (pw <= 1 ? '#F87171' : pw === 2 ? '#FBBF24' : '#34D399')
                        : 'rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? (
            <><ButtonSpinner /><span>جاري الحفظ...</span></>
          ) : (
            <span>حفظ كلمة المرور الجديدة</span>
          )}
        </button>
      </form>

      <div className="auth-register-cta">
        <Link to="/login">العودة لتسجيل الدخول</Link>
      </div>
    </>
  )
}
