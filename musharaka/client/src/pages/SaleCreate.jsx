import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axiosClient'
import { useAuthStore } from '../store/authStore'
import AlertBanner from '../components/AlertBanner'
import ButtonSpinner from '../components/ButtonSpinner'
import { toast } from '../lib/useToast'
import './sale-create.css'

const MONTHS = [
  { v: 1, l: 'يناير' }, { v: 2, l: 'فبراير' }, { v: 3, l: 'مارس' },
  { v: 4, l: 'أبريل' }, { v: 5, l: 'مايو' },   { v: 6, l: 'يونيو' },
  { v: 7, l: 'يوليو' }, { v: 8, l: 'أغسطس' },  { v: 9, l: 'سبتمبر' },
  { v: 10, l: 'أكتوبر' }, { v: 11, l: 'نوفمبر' }, { v: 12, l: 'ديسمبر' },
]

const ALL_MODES = [
  { v: 'daily',   l: 'يومي' },
  { v: 'monthly', l: 'شهري' },
  { v: 'range',   l: 'فترة' },
]

const MODE_HINTS = {
  daily:   'في النمط اليومي، أدخل مبيعات يوم واحد محدد.',
  monthly: 'في النمط الشهري، أدخل إجمالي المبيعات للشهر الواحد. سيتم احتساب المتوسط اليومي تلقائياً.',
  range:   'في نمط الفترة، أدخل نطاق تواريخ ليتم توزيع المبلغ عليها.',
}

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
    api.get('/branches')
      .then(({ data }) => setBranches(Array.isArray(data) ? data : (data?.branches || [])))
      .catch(() => setBranches([]))
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
      setForm(prev => ({
        ...prev,
        amount: '',
        invoice_number: '',
        notes: '',
        month: prev.month === 12 ? 1 : prev.month + 1,
        year:  prev.month === 12 ? prev.year + 1 : prev.year,
      }))
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally { setLoading(false) }
  }

  return (
    <div className="sc-page">
      <div className="sc-header">
        <h1 className="sc-title">إضافة المبيعات</h1>
        <p className="t-small">اختر نمط الإدخال المناسب ثم أدخل التفاصيل</p>
      </div>

      {daysLeft !== null && daysLeft < 30 && (
        <div className="sc-alert">
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
        </div>
      )}

      {availableModes.length === 0 ? (
        <div className="sc-mode-hint" style={{ background: '#FEE2E2', color: '#991B1B' }}>
          <span>⚠️</span>
          <span>لا توجد أنواع إدخال مفعّلة لحسابك</span>
        </div>
      ) : (
        <div className="sc-segmented" role="tablist">
          {availableModes.map(({ v, l }) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={mode === v}
              className={`sc-seg-btn ${mode === v ? 'active' : ''}`}
              onClick={() => setMode(v)}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {MODE_HINTS[mode] && (
        <div className="sc-mode-hint">
          <span>💡</span>
          <span>{MODE_HINTS[mode]}</span>
        </div>
      )}

      <form className="sc-form-card" onSubmit={handleSubmit}>
        <div className="sc-form-grid">
          {/* Branch */}
          <div className="sc-field">
            <label className="sc-label">الفرع <span className="req">*</span></label>
            <select
              className={`input ${errors.branch_id ? 'error' : ''}`}
              value={form.branch_id}
              onChange={e => set('branch_id', e.target.value)}
              onBlur={e => validateField('branch_id', e.target.value)}
              data-testid="branch-select"
            >
              <option value="">اختر الفرع</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
            {errors.branch_id && <div className="sc-error-text">⚠ {errors.branch_id}</div>}
          </div>

          {/* Invoice number */}
          <div className="sc-field">
            <label className="sc-label">رقم الفاتورة (اختياري)</label>
            <input
              className="input"
              type="text"
              dir="ltr"
              value={form.invoice_number}
              onChange={e => set('invoice_number', e.target.value)}
              placeholder="INV-001"
            />
            <div className="sc-helper">يجب أن يكون فريداً لكل فرع</div>
          </div>

          {/* Date fields per mode */}
          {mode === 'daily' && (
            <div className="sc-field" style={{ gridColumn: '1 / -1' }}>
              <label className="sc-label">التاريخ <span className="req">*</span></label>
              <input
                className={`input ${errors.sale_date ? 'error' : ''}`}
                type="date"
                dir="ltr"
                min={minDate}
                max={maxDate}
                value={form.sale_date}
                onChange={e => set('sale_date', e.target.value)}
                onBlur={e => validateField('sale_date', e.target.value)}
              />
              {errors.sale_date && <div className="sc-error-text">⚠ {errors.sale_date}</div>}
            </div>
          )}

          {mode === 'monthly' && (
            <>
              <div className="sc-field">
                <label className="sc-label">السنة <span className="req">*</span></label>
                <select
                  className="input"
                  value={form.year}
                  onChange={e => set('year', parseInt(e.target.value))}
                  data-testid="year-select"
                >
                  {YEARS.map(y => (
                    <option key={y} value={y} disabled={y > currentYear}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="sc-field">
                <label className="sc-label">الشهر <span className="req">*</span></label>
                <select
                  className="input"
                  value={form.month}
                  onChange={e => set('month', parseInt(e.target.value))}
                  data-testid="month-select"
                >
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
            </>
          )}

          {mode === 'range' && (
            <>
              <div className="sc-field">
                <label className="sc-label">من التاريخ <span className="req">*</span></label>
                <input
                  className={`input ${errors.period_start_date ? 'error' : ''}`}
                  type="date"
                  dir="ltr"
                  min={minDate}
                  max={maxDate}
                  value={form.period_start_date}
                  onChange={e => set('period_start_date', e.target.value)}
                  onBlur={e => validateField('period_start_date', e.target.value)}
                />
                {errors.period_start_date && <div className="sc-error-text">⚠ {errors.period_start_date}</div>}
              </div>
              <div className="sc-field">
                <label className="sc-label">إلى التاريخ <span className="req">*</span></label>
                <input
                  className={`input ${errors.period_end_date ? 'error' : ''}`}
                  type="date"
                  dir="ltr"
                  min={minDate}
                  max={maxDate}
                  value={form.period_end_date}
                  onChange={e => set('period_end_date', e.target.value)}
                  onBlur={e => validateField('period_end_date', e.target.value)}
                />
                {errors.period_end_date && <div className="sc-error-text">⚠ {errors.period_end_date}</div>}
              </div>
            </>
          )}

          {/* Amount */}
          <div className="sc-field" style={{ gridColumn: '1 / -1' }}>
            <label className="sc-label">إجمالي المبيعات (ر.س) <span className="req">*</span></label>
            <input
              className={`input ${errors.amount ? 'error' : ''}`}
              type="number"
              min="0.01"
              step="0.01"
              dir="ltr"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              onBlur={e => validateField('amount', e.target.value)}
              placeholder="0.00"
            />
            {errors.amount && <div className="sc-error-text">⚠ {errors.amount}</div>}
          </div>

          {/* Notes */}
          <div className="sc-field" style={{ gridColumn: '1 / -1' }}>
            <label className="sc-label">ملاحظات (اختياري)</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>
        </div>

        <div className="sc-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <ButtonSpinner /> : null}
            {loading ? 'جاري الحفظ...' : 'حفظ المبيعة'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
