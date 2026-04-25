import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import ButtonSpinner from '../components/ButtonSpinner'
import { toast } from '../lib/useToast'
import { Send, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import './submit.css'

const MONTHS = [
  { v: 1, l: 'يناير' }, { v: 2, l: 'فبراير' }, { v: 3, l: 'مارس' },
  { v: 4, l: 'أبريل' }, { v: 5, l: 'مايو' },   { v: 6, l: 'يونيو' },
  { v: 7, l: 'يوليو' }, { v: 8, l: 'أغسطس' },  { v: 9, l: 'سبتمبر' },
  { v: 10, l: 'أكتوبر' }, { v: 11, l: 'نوفمبر' }, { v: 12, l: 'ديسمبر' },
]
const YEARS = Array.from({ length: 6 }, (_, i) => 2021 + i)

export default function Submit() {
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState({
    branch_id: '',
    month:  new Date().getMonth() + 1,
    year:   new Date().getFullYear(),
  })
  const [loading, setLoading]     = useState(false)
  const [lastError, setLastError] = useState('')
  const [preflight, setPreflight] = useState({ checking: false, count: null, branchOk: null, reason: '' })

  useEffect(() => {
    api.get('/branches')
      .then(({ data }) => setBranches(Array.isArray(data) ? data : (data?.branches || [])))
      .catch(() => setBranches([]))
  }, [])

  useEffect(() => {
    if (!form.branch_id) {
      setPreflight({ checking: false, count: null, branchOk: null, reason: '' })
      return
    }
    const branch = branches.find(b => b.id === form.branch_id)
    if (!branch) return

    let cancelled = false
    setPreflight(p => ({ ...p, checking: true, reason: '' }))

    const mm        = String(form.month).padStart(2, '0')
    const lastDay   = new Date(form.year, form.month, 0).getDate()
    const fromDate  = `${form.year}-${mm}-01`
    const toDate    = `${form.year}-${mm}-${String(lastDay).padStart(2, '0')}`

    api.get('/sales', {
      params: {
        branch_id: form.branch_id,
        status:    'pending',
        from:      fromDate,
        to:        toDate,
        limit:     1,
      },
    }).then(({ data }) => {
      if (cancelled) return
      const count = data?.total ?? 0
      const branchOk = !!branch.contract_number
      let reason = ''
      if (!branch.contract_number) reason = 'الفرع بدون رقم عقد (lease_code) — اطلب من الإدارة إضافته'
      else if (count === 0)        reason = 'لا توجد فواتير معلقة لهذه الفترة'
      setPreflight({ checking: false, count, branchOk, reason })
    }).catch(() => {
      if (!cancelled) setPreflight({ checking: false, count: 0, branchOk: false, reason: 'تعذر التحقق من الفواتير المعلقة' })
    })
    return () => { cancelled = true }
  }, [form.branch_id, form.month, form.year, branches])

  const set = (k, v) => {
    setLastError('')
    setForm(f => ({ ...f, [k]: v }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLastError('')
    if (!form.branch_id) return setLastError('يرجى اختيار الفرع')
    setLoading(true)
    try {
      const { data } = await api.post('/submit', form)
      toast.success(`${data.message} — عدد الفواتير: ${data.submission?.invoice_count || 0}`)
      setPreflight(p => ({ ...p, count: 0, reason: 'لا توجد فواتير معلقة لهذه الفترة' }))
    } catch (err) {
      const msg = err.response?.data?.error || 'فشل إرسال الفواتير'
      setLastError(msg)
    } finally { setLoading(false) }
  }

  const canSubmit = !!form.branch_id && preflight.branchOk !== false && (preflight.count ?? 0) > 0 && !loading

  const preflightClass = preflight.checking ? 'checking' : preflight.reason ? 'warn' : 'ok'

  return (
    <div className="submit-page">
      <div className="sb-header">
        <div>
          <h1 className="sb-title">إرسال الفواتير</h1>
          <div className="sb-subtitle">اختر الفرع والفترة لإرسال الفواتير المعلقة إلى منصة التكامل</div>
        </div>
        <Link to="/submissions" className="sb-header-link">
          <FileText size={14} /> تقرير الإرسالات
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="surface">
        <div className="sb-field">
          <label className="sb-label">الفرع <span className="req">*</span></label>
          <select className="input" value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
            <option value="">اختر الفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </select>
        </div>

        <div className="sb-field">
          <div className="sb-row">
            <div>
              <label className="sb-label">الشهر</label>
              <select className="input" value={form.month} onChange={e => set('month', parseInt(e.target.value))}>
                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div className="w-year">
              <label className="sb-label">السنة</label>
              <select className="input" value={form.year} onChange={e => set('year', parseInt(e.target.value))}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {form.branch_id && (
          <div className={`sb-preflight ${preflightClass}`}>
            {preflight.checking ? (
              <><ButtonSpinner /><span>جارٍ التحقق من جاهزية الإرسال…</span></>
            ) : preflight.reason ? (
              <><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /><span>{preflight.reason}</span></>
            ) : (
              <><CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>جاهز للإرسال — {preflight.count} فاتورة معلقة لهذه الفترة</span></>
            )}
          </div>
        )}

        {lastError && (
          <div className="sb-preflight error">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{lastError}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {loading ? <ButtonSpinner /> : <Send size={16} />}
          {loading ? 'جاري الإرسال...' : 'إرسال الفواتير'}
        </button>

        <p className="sb-footer">سيتم إرسال جميع الفواتير المعلقة للفرع والفترة المحددة.</p>
      </form>
    </div>
  )
}
