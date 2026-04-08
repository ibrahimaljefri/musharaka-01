import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { devAuth } from '../lib/devAuth'
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function ChangePassword({ forced = false }) {
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)
  const signOut   = useAuthStore(s => s.signOut)
  const setStore  = useAuthStore(s => s.setState)

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
    // Verify current password first
    const users = JSON.parse(localStorage.getItem('dev_auth_users') || '[]')
    const me    = users.find(u => u.id === user?.id)
    if (!me || me.password !== form.current) {
      setLoading(false)
      return setError('كلمة المرور الحالية غير صحيحة')
    }

    const { error: err } = await devAuth.changePassword(form.next)
    setLoading(false)
    if (err) return setError(err.message)

    // Update store flag
    useAuthStore.setState({ mustChangePassword: false })
    setDone(true)
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} className="text-green-600" />
        </div>
        <p className="font-arabic text-lg font-semibold text-gray-800">تم تغيير كلمة المرور بنجاح</p>
        <p className="font-arabic text-sm text-gray-400 mt-1">جاري التوجيه...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center mb-3">
            <KeyRound size={26} className="text-yellow-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 font-arabic">
            {forced ? 'يرجى تغيير كلمة المرور' : 'تغيير كلمة المرور'}
          </h1>
          {forced && (
            <p className="text-sm text-gray-500 font-arabic text-center mt-1">
              يجب عليك تغيير كلمة المرور المؤقتة قبل المتابعة
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-arabic text-center">
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
            className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm mt-2">
            {loading ? 'جاري الحفظ...' : <><KeyRound size={15} /><span>حفظ كلمة المرور</span></>}
          </button>

          {!forced && (
            <button type="button" onClick={() => navigate(-1)}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 font-arabic py-1">
              إلغاء
            </button>
          )}

          {forced && (
            <button type="button" onClick={() => { signOut(); navigate('/login') }}
              className="w-full text-center text-sm text-red-400 hover:text-red-600 font-arabic py-1">
              تسجيل الخروج
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
