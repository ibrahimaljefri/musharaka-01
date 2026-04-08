import { useState } from 'react'
import { Link } from 'react-router-dom'
import { devAuth } from '../lib/devAuth'
import { MailOpen, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react'

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
    // In dev mode: check if the email exists in dev_auth_users
    const users = JSON.parse(localStorage.getItem('dev_auth_users') || '[]')
    if (!users.find(u => u.email === email.trim())) {
      return setError('البريد الإلكتروني غير مسجل في النظام')
    }
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

  if (step === 'done') return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <ShieldCheck size={28} className="text-green-600" />
      </div>
      <h2 className="text-lg font-bold text-gray-800 font-arabic mb-2">تم إعادة تعيين كلمة المرور</h2>
      <p className="text-sm text-gray-500 font-arabic mb-5">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
      <Link to="/login"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors font-arabic">
        <ArrowRight size={15} /> تسجيل الدخول
      </Link>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <div className="flex flex-col items-center mb-6">
        <div className="w-13 h-13 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center mb-3 p-3">
          <MailOpen size={24} className="text-yellow-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 font-arabic">نسيت كلمة المرور؟</h1>
        <p className="text-sm text-gray-500 font-arabic text-center mt-1">
          {step === 'email'
            ? 'أدخل بريدك الإلكتروني للمتابعة'
            : 'أدخل كلمة المرور الجديدة'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-arabic text-center">
          {error}
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={handleEmail} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">البريد الإلكتروني</label>
            <input
              type="email" dir="ltr" autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
          <button type="submit"
            className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm">
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
              <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={show[key] ? 'text' : 'password'} dir="ltr"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent pl-10"
                />
                <button type="button" onClick={() => toggle(key)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm">
            {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
          </button>
          <button type="button" onClick={() => { setStep('email'); setError('') }}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 font-arabic py-1">
            رجوع
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-gray-500 font-arabic">
        <Link to="/login" className="text-yellow-700 hover:underline font-medium">العودة لتسجيل الدخول</Link>
      </p>
    </div>
  )
}
