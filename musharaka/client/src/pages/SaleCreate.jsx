import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axiosClient'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import TipsPanel from '../components/TipsPanel'
import AlertBanner from '../components/AlertBanner'
import FormField from '../components/FormField'
import ButtonSpinner from '../components/ButtonSpinner'
import { toast } from '../lib/useToast'

const MONTHS = [
  { v: 1, l: 'يناير' }, { v: 2, l: 'فبراير' }, { v: 3, l: 'مارس' },
  { v: 4, l: 'أبريل' }, { v: 5, l: 'مايو' },   { v: 6, l: 'يونيو' },
  { v: 7, l: 'يوليو' }, { v: 8, l: 'أغسطس' },  { v: 9, l: 'سبتمبر' },
  { v: 10, l: 'أكتوبر' }, { v: 11, l: 'نوفمبر' }, { v: 12, l: 'ديسمبر' },
]

const ALL_MODES = [
  { v: 'daily',   l: 'يومي' },
  { v: 'monthly', l: 'شهري' },
  { v: 'range',   l: 'فترة مخصصة' },
]

export default function SaleCreate() {
  const navigate           = useNavigate()
  const allowedInputTypes  = useAuthStore(s => s.allowedInputTypes)
  const activatedAt        = useAuthStore(s => s.activatedAt)
  const expiresAt          = useAuthStore(s => s.expiresAt)
  const availableModes     = ALL_MODES.filter(m => allowedInputTypes.includes(m.v))

  // ── License date window ───────────────────────────────────────────────────────
  const today    = new Date().toISOString().split('T')[0]           // 'YYYY-MM-DD'
  const minDate  = activatedAt ? activatedAt.split('T')[0] : '2020-01-01'
  const maxDate  = (expiresAt && expiresAt.split('T')[0] < today)
    ? expiresAt.split('T')[0]
    : today

  // Days left in license (null = open / unlimited)
  const daysLeft = useMemo(() => {
    if (!expiresAt) return null
    return Math.ceil((new Date(expiresAt) - new Date()) / 86400000)
  }, [expiresAt])

  // Year options: from activatedAt year to current year (inclusive)
  const currentYear   = new Date().getFullYear()
  const licenseStartY = activatedAt ? new Date(activatedAt).getFullYear() : 2021
  const YEARS = Array.from(
    { length: currentYear - licenseStartY + 1 },
    (_, i) => licenseStartY + i,
  )

  // Current month/year for blocking future selections
  const currentMonth = new Date().getMonth() + 1
  const [branches, setBranches] = useState([])
  const [mode, setMode]         = useState(availableModes[0]?.v || 'daily')
  const [form, setForm]         = useState({
    branch_id: '', amount: '', invoice_number: '', notes: '',
    sale_date: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    period_start_date: '', period_end_date: '',
  })
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState({})

  useEffect(() => {
    supabase.from('branches').select('id,code,name').order('name')
      .then(({ data }) => setBranches(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validateField = (name, value) => {
    let err = ''
    if (name === 'branch_id' && !value) err = 'الفرع مطلوب'
    if (name === 'amount' && (!value || Number(value) <= 0)) err = 'يجب أن يكون المبلغ أكبر من صفر'
    if (name === 'sale_date' && value) {
      if (value < minDate || value > maxDate) err = 'التاريخ خارج نطاق الترخيص'
    }
    if (name === 'period_start_date' && value) {
      if (value < minDate || value > maxDate) err = 'التاريخ خارج نطاق الترخيص'
    }
    if (name === 'period_end_date' && value) {
      if (value < minDate || value > maxDate) err = 'التاريخ خارج نطاق الترخيص'
    }
    setErrors(prev => ({ ...prev, [name]: err }))
    return !err
  }

  const handleSubmit = async e => {
    e.preventDefault()

    const branchValid = validateField('branch_id', form.branch_id)
    const amountValid = validateField('amount', form.amount)
    if (!branchValid || !amountValid) return

    if (!form.branch_id) return toast.error('يرجى اختيار الفرع')
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('يرجى إدخال مبلغ صحيح أكبر من صفر')

    const payload = { ...form, input_type: mode, amount: parseFloat(form.amount) }
    setLoading(true)
    try {
      const { data } = await api.post('/sales', payload)
      toast.success(data.message)
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally { setLoading(false) }
  }

  const tips = [
    'يومي: أدخل مبيعات يوم واحد محدد.',
    'شهري: يتم توزيع المبلغ تلقائياً على جميع أيام الشهر.',
    'فترة مخصصة: أدخل نطاق تواريخ ليتم التوزيع عليها.',
    'رقم الفاتورة اختياري ويستخدم للتتبع.',
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white font-arabic mb-6">إضافة مبيعات</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 card-surface p-6">
          {daysLeft !== null && daysLeft < 30 && (
            <AlertBanner type="warning" message={
              <span className="font-arabic">
                ⚠️ ينتهي ترخيصك خلال {daysLeft > 0 ? daysLeft : 0} يوم.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/tickets/create?category=license')}
                  className="underline font-semibold hover:no-underline"
                >
                  سجّل طلب تجديد الآن ←
                </button>
              </span>
            } />
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mode selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-2">نوع الإدخال</label>
              <div className="flex gap-4 flex-wrap">
                {availableModes.map(({ v, l }) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="text-yellow-600 focus:ring-yellow-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-arabic">{l}</span>
                  </label>
                ))}
                {availableModes.length === 0 && (
                  <p className="text-sm text-red-500 font-arabic">لا توجد أنواع إدخال مفعّلة لحسابك</p>
                )}
              </div>
            </div>

            {/* Date inputs based on mode */}
            {mode === 'daily' && (
              <FormField label="التاريخ" error={errors.sale_date}>
                <input type="date" value={form.sale_date}
                  onChange={e => set('sale_date', e.target.value)}
                  onBlur={e => validateField('sale_date', e.target.value)}
                  dir="ltr"
                  min={minDate} max={maxDate}
                  className="input-base" />
              </FormField>
            )}
            {mode === 'monthly' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-1.5">الشهر</label>
                  <select value={form.month} onChange={e => set('month', parseInt(e.target.value))}
                    className="input-base font-arabic">
                    {MONTHS.map(m => {
                      const isFuture = form.year === currentYear && m.v > currentMonth
                      return (
                        <option key={m.v} value={m.v} disabled={isFuture}>
                          {m.l}{isFuture ? ' (مستقبلي)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-1.5">السنة</label>
                  <select value={form.year} onChange={e => set('year', parseInt(e.target.value))}
                    className="input-base">
                    {YEARS.map(y => (
                      <option key={y} value={y} disabled={y > currentYear}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {mode === 'range' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <FormField label="من التاريخ" error={errors.period_start_date}>
                    <input type="date" value={form.period_start_date}
                      onChange={e => set('period_start_date', e.target.value)}
                      onBlur={e => validateField('period_start_date', e.target.value)}
                      dir="ltr"
                      min={minDate} max={maxDate}
                      className="input-base w-full" />
                  </FormField>
                </div>
                <div className="flex-1">
                  <FormField label="إلى التاريخ" error={errors.period_end_date}>
                    <input type="date" value={form.period_end_date}
                      onChange={e => set('period_end_date', e.target.value)}
                      onBlur={e => validateField('period_end_date', e.target.value)}
                      dir="ltr"
                      min={minDate} max={maxDate}
                      className="input-base w-full" />
                  </FormField>
                </div>
              </div>
            )}

            {/* Branch */}
            <FormField label="الفرع" required error={errors.branch_id}>
              <select value={form.branch_id}
                onChange={e => set('branch_id', e.target.value)}
                onBlur={e => validateField('branch_id', e.target.value)}
                className="input-base font-arabic">
                <option value="">اختر الفرع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </select>
            </FormField>

            {/* Amount */}
            <FormField label="المبلغ (ر.س)" required error={errors.amount}>
              <input type="number" min="0.01" step="0.01" dir="ltr" value={form.amount}
                onChange={e => set('amount', e.target.value)}
                onBlur={e => validateField('amount', e.target.value)}
                placeholder="0.00"
                className="input-base" />
            </FormField>

            {/* Invoice number */}
            <FormField label="رقم الفاتورة (اختياري)">
              <input type="text" dir="ltr" value={form.invoice_number}
                onChange={e => set('invoice_number', e.target.value)}
                placeholder="INV-001"
                className="input-base" />
            </FormField>

            {/* Notes */}
            <FormField label="ملاحظات (اختياري)">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="input-base font-arabic resize-none" />
            </FormField>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors font-arabic text-sm">
                {loading ? <ButtonSpinner /> : null}
                {loading ? 'جاري الحفظ...' : 'حفظ المبيعات'}
              </button>
              <button type="button" onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-arabic">
                إلغاء
              </button>
            </div>
          </form>
        </div>

        {/* Tips panel */}
        <div className="w-full lg:w-64 shrink-0">
          <TipsPanel tips={tips} />
        </div>
      </div>
    </div>
  )
}
