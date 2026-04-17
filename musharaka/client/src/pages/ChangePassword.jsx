import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { devAuth } from '../lib/devAuth'
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import LogoMark from '../components/LogoMark'

// Shared glass input style — matches Login/Register
const glassInput = {
  background: 'rgba(255,255,255,0.08)',
  borderColor: 'rgba(255,255,255,0.15)',
}

export default function ChangePassword({ forced = false }) {
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)
  const signOut   = useAuthStore(s => s.signOut)

  const [form, setForm]       = useState({ current: '', next: '', confirm: '' })
  const [show, setShow]       = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const toggle = key => setShow(s => ({ ...s, [key]: !s[key] }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.current) return setError('يرجى إدخال كلمة المرور الحالية')
    if (form.next.length < 6) return setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
    if (form.next !== form.confirm) return setError('كلمة المرور الجديدة غير متطابقة')
    if (form.next === form.current) return setError('كلمة المرور الجديدة يجب أن تختلف عن الحالية')

    setLoading(true)
    const users = JSON.parse(localStorage.getItem('dev_auth_users') || '[]')
    const me    = users.find(u => u.id === user?.id)
    if (!me || me.password !== form.current) {
      setLoading(false)
      return setError('كلمة المرور الحالية غير صحيحة')
    }

    const { error: err } = await devAuth.changePassword(form.next)
    setLoading(false)
    if (err) return setError(err.message)

    useAuthStore.setState({ mustChangePassword: false })
    setDone(true)
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) return (
    <div
      className="min-h-screen flex items-center justify-center"
      dir="rtl"
      style={{
        background: '#080E1A',
        backgroundImage: [
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.15) 0%, transparent 60%)',
          'radial-gradient(ellipse 40% 40% at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)',
        ].join(', '),
      }}
    >
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.30)' }}
        >
          <ShieldCheck size={32} className="text-green-400" />
        </div>
        <p className="font-arabic text-lg font-semibold text-white">تم تغيير كلمة المرور بنجاح</p>
        <p className="font-arabic text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>جاري التوجيه...</p>
      </div>
    </div>
  )

  // ── Form (standalone — not inside GuestLayout, so we render the background ourselves) ──
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      dir="rtl"
      style={{
        background: '#080E1A',
        backgroundImage: [
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.15) 0%, transparent 60%)',
          'radial-gradient(ellipse 40% 40% at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)',
        ].join(', '),
      }}
    >
      {/* Ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(245,158,11,0.06)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(139,92,246,0.05)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8 flex flex-col items-center gap-2">
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: -8, borderRadius: 24, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)', boxShadow: '0 0 30px rgba(245,158,11,0.15)' }} />
            <LogoMark size={64} id="cp-top" />
          </div>
          <div className="font-bold font-arabic text-xl" style={{ background: 'linear-gradient(135deg,#FBBF24,#D97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>عروة</div>
          <div className="text-sm font-arabic" style={{ color: 'rgba(255,255,255,0.45)' }}>نظام إدارة المبيعات</div>
        </div>

        {/* Glass card */}
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
              <KeyRound size={22} className="text-yellow-400" />
            </div>
            <h1 className="text-xl font-bold text-white font-arabic text-center">
              {forced ? 'يرجى تغيير كلمة المرور' : 'تغيير كلمة المرور'}
            </h1>
            {forced && (
              <p className="text-sm font-arabic text-center mt-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
                يجب عليك تغيير كلمة المرور المؤقتة قبل المتابعة
              </p>
            )}
          </div>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm font-arabic text-center border"
              style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)', color: '#FCA5A5' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {[
              { key: 'current', label: 'كلمة المرور الحالية' },
              { key: 'next',    label: 'كلمة المرور الجديدة' },
              { key: 'confirm', label: 'تأكيد كلمة المرور الجديدة' },
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
              className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all font-arabic text-sm font-bold disabled:opacity-60 hover:brightness-110 mt-2"
              style={{ background: '#F59E0B', color: '#0a0a0a' }}
            >
              {loading ? 'جاري الحفظ...' : <><KeyRound size={15} /><span>حفظ كلمة المرور</span></>}
            </button>

            {!forced && (
              <button type="button" onClick={() => navigate(-1)}
                className="w-full text-center text-sm font-arabic py-1 transition-colors"
                style={{ color: 'rgba(255,255,255,0.40)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.70)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.40)'}
              >
                إلغاء
              </button>
            )}

            {forced && (
              <button type="button" onClick={() => { signOut(); navigate('/login') }}
                className="w-full text-center text-sm font-arabic py-1 transition-colors"
                style={{ color: 'rgba(239,68,68,0.60)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#FCA5A5'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.60)'}
              >
                تسجيل الخروج
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
