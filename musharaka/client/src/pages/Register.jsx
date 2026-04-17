import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { UserPlus, CheckCircle } from 'lucide-react'
import FormField from '../components/FormField'
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
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  const strength = getPasswordStrength(form.password)

  const validateField = (key, value) => {
    if (key === 'name') {
      return value.trim() ? '' : 'الاسم الكامل مطلوب'
    }
    if (key === 'email') {
      if (!value.trim()) return 'البريد الإلكتروني مطلوب'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'صيغة البريد الإلكتروني غير صحيحة'
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
    if (!form.password)       e.password = 'كلمة المرور مطلوبة'
    else if (form.password.length < 8) e.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    if (form.password !== form.confirm) e.confirm = 'كلمة المرور غير متطابقة'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)
    setErrors({})
    setGeneralError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.name } },
    })
    setLoading(false)
    if (err) {
      setGeneralError(err.message.includes('already') ? 'البريد الإلكتروني مسجل مسبقاً.' : 'حدث خطأ، يرجى المحاولة مجدداً.')
      return
    }
    await init()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white font-arabic mb-6 text-center">إنشاء حساب جديد</h1>

      <AlertBanner type="error" message={generalError} dismissible onClose={() => setGeneralError('')} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField label="الاسم الكامل" error={errors.name} required>
          <input
            type="text"
            dir="rtl"
            autoComplete="name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onBlur={() => handleBlur('name')}
            placeholder="أحمد محمد"
            className="input-base"
          />
        </FormField>

        <FormField label="البريد الإلكتروني" error={errors.email} required>
          <input
            type="email"
            dir="ltr"
            autoComplete="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onBlur={() => handleBlur('email')}
            placeholder="example@email.com"
            className="input-base"
          />
        </FormField>

        <FormField label="كلمة المرور" error={errors.password} required>
          <input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onBlur={() => handleBlur('password')}
            className="input-base"
          />
          {form.password && (
            <div className="flex gap-1 mt-1.5">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= strength
                      ? strength <= 1
                        ? 'bg-red-400'
                        : strength === 2
                        ? 'bg-amber-400'
                        : 'bg-green-400'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          )}
        </FormField>

        <FormField label="تأكيد كلمة المرور" error={errors.confirm} required>
          <div className="relative">
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              onBlur={() => handleBlur('confirm')}
              className="input-base"
            />
            {form.confirm && form.confirm === form.password && (
              <CheckCircle size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
            )}
          </div>
        </FormField>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-all font-arabic text-sm font-bold disabled:opacity-60 hover:brightness-110 mt-2"
          style={{ background: '#F59E0B', color: '#0a0a0a' }}
        >
          {loading ? (
            <><ButtonSpinner /><span>جاري إنشاء الحساب...</span></>
          ) : (
            <><UserPlus size={16} /><span>إنشاء الحساب</span></>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm font-arabic" style={{ color: 'rgba(255,255,255,0.50)' }}>
        لديك حساب بالفعل؟{' '}
        <Link to="/login" className="text-yellow-400 hover:underline font-medium">تسجيل الدخول</Link>
      </p>
    </div>
  )
}
