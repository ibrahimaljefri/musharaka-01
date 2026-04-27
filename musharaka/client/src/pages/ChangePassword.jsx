import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/axiosClient'
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import AlertBanner from '../components/AlertBanner'
import ButtonSpinner from '../components/ButtonSpinner'
import './password.css'

function getPasswordStrength(pwd) {
  let score = 0
  if (pwd.length >= 8) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  return score
}

function strengthClass(i, strength) {
  if (i > strength) return ''
  if (strength <= 1) return 'weak'
  if (strength === 2) return 'med'
  return 'strong'
}

export default function ChangePassword({ forced = false }) {
  const navigate  = useNavigate()
  const signOut   = useAuthStore(s => s.signOut)

  const [form, setForm]       = useState({ current: '', next: '', confirm: '' })
  const [show, setShow]       = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const toggle = key => setShow(s => ({ ...s, [key]: !s[key] }))

  const strength = getPasswordStrength(form.next)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.current) return setError('يرجى إدخال كلمة المرور الحالية')
    if (form.next.length < 6) return setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
    if (form.next !== form.confirm) return setError('كلمة المرور الجديدة غير متطابقة')
    if (form.next === form.current) return setError('كلمة المرور الجديدة يجب أن تختلف عن الحالية')

    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: form.current,
        new_password: form.next,
      })
      useAuthStore.setState({ mustChangePassword: false })
      setDone(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={`password-page ${forced ? 'standalone' : ''}`} dir="rtl">
        <div className="pw-card">
          <div className="pw-success">
            <div className="icon-wrap">
              <ShieldCheck size={32} />
            </div>
            <div className="msg">تم تغيير كلمة المرور بنجاح</div>
            <div className="redir">جاري التوجيه...</div>
          </div>
        </div>
      </div>
    )
  }

  const fields = [
    { key: 'current', label: 'كلمة المرور الحالية' },
    { key: 'next',    label: 'كلمة المرور الجديدة' },
    { key: 'confirm', label: 'تأكيد كلمة المرور الجديدة' },
  ]

  return (
    <div className={`password-page ${forced ? 'standalone' : ''}`} dir="rtl">
      <div className="pw-card">
        <div className="pw-head">
          <div className="icon-wrap">
            <KeyRound size={22} />
          </div>
          <h1 className="pw-title">
            {forced ? 'يرجى تغيير كلمة المرور' : 'تغيير كلمة المرور'}
          </h1>
          {forced && (
            <div className="pw-hint">يجب عليك تغيير كلمة المرور المؤقتة قبل المتابعة</div>
          )}
        </div>

        {error && <AlertBanner type="error" message={error} dismissible onClose={() => setError('')} />}

        <form onSubmit={handleSubmit} noValidate>
          {fields.map(({ key, label }) => (
            <div key={key} className="pw-field">
              <label className="pw-label">{label}</label>
              <div className="pw-input-wrap">
                <input
                  type={show[key] ? 'text' : 'password'}
                  dir="ltr"
                  className="input"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
                <button type="button" className="pw-toggle" onClick={() => toggle(key)}>
                  {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {key === 'next' && form.next && (
                <div className="pw-strength">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`pw-strength-bar ${strengthClass(i, strength)}`} />
                  ))}
                </div>
              )}
            </div>
          ))}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <><ButtonSpinner /><span>جاري الحفظ...</span></>
            ) : (
              <><KeyRound size={15} /><span>حفظ كلمة المرور</span></>
            )}
          </button>

          {!forced && (
            <button type="button" className="pw-cancel" onClick={() => navigate(-1)}>
              إلغاء
            </button>
          )}

          {forced && (
            <button type="button" className="pw-cancel danger" onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}>
              تسجيل الخروج
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
