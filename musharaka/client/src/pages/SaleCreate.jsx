import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import api from '../lib/axiosClient'
import { useAuthStore } from '../store/authStore'
import AlertBanner from '../components/AlertBanner'
import ButtonSpinner from '../components/ButtonSpinner'
import SaleRecentList from '../components/SaleRecentList'
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

// Ordered list of draggable field IDs — persisted to localStorage
const DEFAULT_FIELD_ORDER = ['branch', 'invoice_number', 'date', 'amount', 'notes']
const LS_KEY = 'sc_field_order'

function loadFieldOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY))
    if (Array.isArray(saved) && saved.length === DEFAULT_FIELD_ORDER.length) return saved
  } catch { /* ignore */ }
  return DEFAULT_FIELD_ORDER
}

// ── Sortable field wrapper ────────────────────────────────────────────────────
function SortableField({ id, children }) {
  const {
    attributes, listeners,
    setNodeRef,
    transform, transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    zIndex: isDragging ? 20 : undefined,
    position: 'relative',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sc-drag-row${isDragging ? ' sc-drag-active' : ''}`}
    >
      <div className="sc-drag-content">{children}</div>
      <button
        type="button"
        className="sc-drag-handle"
        aria-label="اسحب لتغيير الترتيب"
        title="اسحب لتغيير الترتيب"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SaleCreate() {
  const navigate           = useNavigate()
  const allowedInputTypes  = useAuthStore(s => s.allowedInputTypes)
  const activatedAt        = useAuthStore(s => s.activatedAt)
  const dataEntryFrom      = useAuthStore(s => s.dataEntryFrom)
  const expiresAt          = useAuthStore(s => s.expiresAt)
  const availableModes     = ALL_MODES.filter(m => allowedInputTypes.includes(m.v))

  // ── License date window ───────────────────────────────────────────────────
  const lowerBound = dataEntryFrom || activatedAt
  const today    = new Date().toISOString().split('T')[0]
  const minDate  = lowerBound ? lowerBound.split('T')[0] : '2020-01-01'
  const maxDate  = (expiresAt && expiresAt.split('T')[0] < today)
    ? expiresAt.split('T')[0]
    : today

  const daysLeft = useMemo(() => {
    if (!expiresAt) return null
    return Math.ceil((new Date(expiresAt) - new Date()) / 86400000)
  }, [expiresAt])

  const currentYear   = new Date().getFullYear()
  const licenseStartY = lowerBound ? new Date(lowerBound).getFullYear() : 2021
  const YEARS = Array.from(
    { length: currentYear - licenseStartY + 1 },
    (_, i) => licenseStartY + i,
  )
  const currentMonth = new Date().getMonth() + 1

  // ── State ────────────────────────────────────────────────────────────────
  const [branches, setBranches] = useState([])
  const [mode, setMode]         = useState(availableModes[0]?.v || 'daily')
  const [form, setForm]         = useState({
    branch_id: '', amount: '', invoice_number: '', notes: '',
    sale_date: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    period_start_date: '', period_end_date: '',
  })
  const [loading, setLoading]         = useState(false)
  const [errors, setErrors]           = useState({})
  const [refreshTick, setRefreshTick] = useState(0)

  // Draggable field order — persisted across sessions
  const [fieldOrder, setFieldOrder] = useState(loadFieldOrder)

  // ── DnD sensors ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setFieldOrder(order => {
      const next = arrayMove(order, order.indexOf(active.id), order.indexOf(over.id))
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  // ── Data ─────────────────────────────────────────────────────────────────
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
      setRefreshTick(t => t + 1)
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

  // ── Field renderers ───────────────────────────────────────────────────────
  function renderField(id) {
    switch (id) {
      case 'branch':
        return (
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
        )

      case 'invoice_number':
        return (
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
        )

      case 'date':
        if (mode === 'daily') return (
          <div className="sc-field">
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
        )
        if (mode === 'monthly') return (
          <div className="sc-field">
            <label className="sc-label">الفترة <span className="req">*</span></label>
            <div className="sc-inline-pair">
              <div className="sc-inline-item">
                <label className="sc-sublabel">السنة</label>
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
              <div className="sc-inline-item">
                <label className="sc-sublabel">الشهر</label>
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
            </div>
          </div>
        )
        // range
        return (
          <div className="sc-field">
            <label className="sc-label">الفترة <span className="req">*</span></label>
            <div className="sc-inline-pair">
              <div className="sc-inline-item">
                <label className="sc-sublabel">من</label>
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
              <div className="sc-inline-item">
                <label className="sc-sublabel">إلى</label>
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
            </div>
          </div>
        )

      case 'amount':
        return (
          <div className="sc-field">
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
        )

      case 'notes':
        return (
          <div className="sc-field">
            <label className="sc-label">ملاحظات (اختياري)</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>
        )

      default: return null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fieldOrder} strategy={verticalListSortingStrategy}>
            <div className="sc-drag-list">
              {fieldOrder.map(id => (
                <SortableField key={id} id={id}>
                  {renderField(id)}
                </SortableField>
              ))}
            </div>
          </SortableContext>
        </DndContext>

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

      <SaleRecentList branchId={form.branch_id} refreshTick={refreshTick} />
    </div>
  )
}
