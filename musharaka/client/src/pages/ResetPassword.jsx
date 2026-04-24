import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/axiosClient'
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'

function strength(pwd) {
  let s = 0
  if (pwd.length >= 8) s++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++
  if (/\d/.test(pwd)) s++
  if (/[^a-zA-Z0-9]/.test(pwd)) s++
  return s
}

const glass = { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }

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
    <div className="text-center text-white font-arabic">
      <p>رابط إعادة التعيين غير صالح.</p>
      <Link to="/forgot-password" className="text-yellow-400 underline mt-2 inline-block">طلب رابط جديد</Link>
    </div>
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
    <div
      className="backdrop-blur-xl rounded-2xl p-8 border shadow-2xl text-center"
      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)' }}>
        <ShieldCheck size={28} className="text-green-400" />
      </div>
      <h2 className="text-lg font-bold text-white font-arabic mb-2">تم إعادة تعيين كلمة المرور</h2>
      <p className="text-sm font-arabic" style={{ color: 'rgba(255,255,255,0.50)' }}>جاري التوجيه لتسجيل الدخول...</p>
    </div>
  )

  return (
    <div
      className="backdrop-blur-xl rounded-2xl p-8 border shadow-2xl"
      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <KeyRound size={22} className="text-yellow-400" />
        </div>
        <h1 className="text-xl font-bold text-white font-arabic">إعادة تعيين كلمة المرور</h1>
        <p className="text-sm font-arabic text-center mt-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
          أدخل كلمة المرور الجديدة
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm font-arabic text-center border"
          style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {[
          { key: 'next',    label: 'كلمة المرور الجديدة' },
          { key: 'confirm', label: 'تأكيد كلمة المرور' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium font-arabic mb-1.5"
              style={{ color: 'rgba(255,255,255,0.70)' }}>{label}</label>
            <div className="relative">
              <input
                type={show[key] ? 'text' : 'password'} dir="ltr"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 border transition-colors pl-10"
                style={glass}
              />
              <button type="button" onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.40)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.70)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.40)'}
              >
                {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {key === 'next' && form.next && (
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= pw ? pw <= 1 ? 'bg-red-400' : pw === 2 ? 'bg-amber-400' : 'bg-green-400'
                    : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                ))}
              </div>
            )}
          </div>
        ))}
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all font-arabic text-sm font-bold disabled:opacity-60 hover:brightness-110"
          style={{ background: '#F59E0B', color: '#0a0a0a' }}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
        </button>
      </form>
    </div>
  )
}
