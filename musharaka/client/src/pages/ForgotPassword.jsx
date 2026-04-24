import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import { MailOpen, ShieldCheck, ArrowRight } from 'lucide-react'

const glassInput = {
  background: 'rgba(255,255,255,0.08)',
  borderColor: 'rgba(255,255,255,0.15)',
}

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
      <h2 className="text-lg font-bold text-white font-arabic mb-2">تحقق من بريدك الإلكتروني</h2>
      <p className="text-sm font-arabic mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
        إذا كان البريد مسجلاً في النظام، ستصلك رسالة تحتوي على رابط إعادة التعيين خلال دقائق.
      </p>
      <Link to="/login"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all font-arabic hover:brightness-110 font-bold"
        style={{ background: '#F59E0B', color: '#0a0a0a' }}
      >
        <ArrowRight size={15} /> تسجيل الدخول
      </Link>
    </div>
  )

  return (
    <div
      className="backdrop-blur-xl rounded-2xl p-8 border shadow-2xl"
      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <MailOpen size={22} className="text-yellow-400" />
        </div>
        <h1 className="text-xl font-bold text-white font-arabic">نسيت كلمة المرور؟</h1>
        <p className="text-sm font-arabic text-center mt-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
          أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
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

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all font-arabic text-sm font-bold disabled:opacity-60 hover:brightness-110"
          style={{ background: '#F59E0B', color: '#0a0a0a' }}
        >
          {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
        </button>
      </form>

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
