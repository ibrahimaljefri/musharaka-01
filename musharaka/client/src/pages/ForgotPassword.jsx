import { useState } from 'react'
import { Link } from 'react-router-dom'
import { devAuth } from '../lib/devAuth'
import { MailOpen, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react'

const glassInput = {
  background: 'rgba(255,255,255,0.08)',
  borderColor: 'rgba(255,255,255,0.15)',
}

export default function ForgotPassword() {
  const [step, setStep]       = useState('email')  // 'email' | 'reset' | 'done'
  const [email, setEmail]     = useState('')
  const [form, setForm]       = useState({ next: '', confirm: '' })
  const [show, setShow]       = useState({ next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const toggle = key => setShow(s => ({ ...s, [key]: !s[key] }))

  const handleEmail = e => {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError('يرجى إدخال البريد الإلكتروني')
    const users = JSON.parse(localStorage.getItem('dev_auth_users') || '[]')
    if (!users.find(u => u.email === email.trim()))
      return setError('البريد الإلكتروني غير مسجل في النظام')
    setStep('reset')
  }

  const handleReset = async e => {
    e.preventDefault()
    setError('')
    if (form.next.length < 6) return setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
    if (form.next !== form.confirm) return setError('كلمة المرور غير متطابقة')
    setLoading(true)
    const { error: err } = await devAuth.resetPassword(email.trim(), form.next)
    setLoading(false)
    if (err) return setError(err.message)
    setStep('done')
  }

  // ── Done state ────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div
      className="backdrop-blur-xl rounded-2xl p-8 border shadow-2xl text-center"
      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)' }}
      >
        <ShieldCheck size={28} className="text-green-400" />
      </div>
      <h2 className="text-lg font-bold text-white font-arabic mb-2">تم إعادة تعيين كلمة المرور</h2>
      <p className="text-sm font-arabic mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
        يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
      </p>
      <Link to="/login"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all font-arabic hover:brightness-110 font-bold"
        style={{ background: '#F59E0B', color: '#0a0a0a' }}
      >
        <ArrowRight size={15} /> تسجيل الدخول
      </Link>
    </div>
  )

  // ── Main card ─────────────────────────────────────────────────────────────
  return (
    <div
      className="backdrop-blur-xl rounded-2xl p-8 border shadow-2xl"
      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      {/* Icon + title */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <MailOpen size={22} className="text-yellow-400" />
        </div>
        <h1 className="text-xl font-bold text-white font-arabic">نسيت كلمة المرور؟</h1>
        <p className="text-sm font-arabic text-center mt-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
          {step === 'email' ? 'أدخل بريدك الإلكتروني للمتابعة' : 'أدخل كلمة المرور الجديدة'}
        </p>
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm font-arabic text-center border"
          style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)', color: '#FCA5A5' }}
        >
          {error}
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={handleEmail} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium font-arabic mb-1.5"
              style={{ color: 'rgba(255,255,255,0.70)' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email" dir="ltr" autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 border transition-colors"
              style={glassInput}
            />
          </div>
          <button type="submit"
            className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all font-arabic text-sm font-bold hover:brightness-110"
            style={{ background: '#F59E0B', color: '#0a0a0a' }}
          >
            متابعة
          </button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          {[
            { key: 'next',    label: 'كلمة المرور الجديدة' },
            { key: 'confirm', label: 'تأكيد كلمة المرور' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium font-arabic mb-1.5"
                style={{ color: 'rgba(255,255,255,0.70)' }}>
                {label}
              </label>
              <div className="relative">
                <input
                  type={show[key] ? 'text' : 'password'} dir="ltr"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 border transition-colors pl-10"
                  style={glassInput}
                />
                <button type="button" onClick={() => toggle(key)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.40)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.70)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.40)'}
                >
                  {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all font-arabic text-sm font-bold disabled:opacity-60 hover:brightness-110"
            style={{ background: '#F59E0B', color: '#0a0a0a' }}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
          </button>
          <button type="button" onClick={() => { setStep('email'); setError('') }}
            className="w-full text-center text-sm font-arabic py-1 transition-colors"
            style={{ color: 'rgba(255,255,255,0.40)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.70)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.40)'}
          >
            رجوع
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm font-arabic" style={{ color: 'rgba(255,255,255,0.45)' }}>
        <Link
          to="/login"
          className="font-medium transition-colors"
          style={{ color: '#FBBF24' }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
        >
          العودة لتسجيل الدخول
        </Link>
      </p>
    </div>
  )
}
