import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import { Mail, ShieldCheck } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import ButtonSpinner from '../components/ButtonSpinner'

export default function ForgotPassword() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [sent, setSent]     = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError('يرجى إدخال البريد الإلكتروني')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setSent(true)
    } catch {
      setError('حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
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
      <div className="auth-form-title">تحقق من بريدك الإلكتروني</div>
      <div className="auth-form-sub">
        إذا كان البريد مسجلاً في النظام، ستصلك رسالة تحتوي على رابط إعادة التعيين خلال دقائق.
      </div>
      <div className="auth-register-cta" style={{ marginTop: '24px' }}>
        <Link to="/login">العودة لتسجيل الدخول</Link>
      </div>
    </>
  )

  return (
    <>
      <div className="auth-form-title">نسيت كلمة المرور؟</div>
      <div className="auth-form-sub">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة التعيين</div>

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
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? (
            <><ButtonSpinner /><span>جاري الإرسال...</span></>
          ) : (
            <span>إرسال رابط إعادة التعيين</span>
          )}
        </button>
      </form>

      <div className="auth-register-cta">
        تذكرت كلمة المرور؟ <Link to="/login">العودة لتسجيل الدخول</Link>
      </div>
    </>
  )
}
