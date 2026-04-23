import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import api from '../lib/axiosClient'
import ButtonSpinner from '../components/ButtonSpinner'
import { toast } from '../lib/useToast'
import { Send, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'

const MONTHS = [
  { v: 1, l: 'يناير' }, { v: 2, l: 'فبراير' }, { v: 3, l: 'مارس' },
  { v: 4, l: 'أبريل' }, { v: 5, l: 'مايو' },   { v: 6, l: 'يونيو' },
  { v: 7, l: 'يوليو' }, { v: 8, l: 'أغسطس' },  { v: 9, l: 'سبتمبر' },
  { v: 10, l: 'أكتوبر' }, { v: 11, l: 'نوفمبر' }, { v: 12, l: 'ديسمبر' },
]
const YEARS = Array.from({ length: 6 }, (_, i) => 2021 + i)

const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-1.5'

export default function Submit() {
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState({
    branch_id: '',
    month:  new Date().getMonth() + 1,
    year:   new Date().getFullYear(),
  })
  const [loading, setLoading]     = useState(false)
  const [lastError, setLastError] = useState('')
  // Preflight state — tells the user whether the submit would succeed before they click
  const [preflight, setPreflight] = useState({ checking: false, count: null, branchOk: null, reason: '' })

  useEffect(() => {
    supabase.from('branches').select('id,code,name,contract_number,token').order('name')
      .then(({ data }) => setBranches(data || []))
  }, [])

  // When the user picks a branch+month+year, preflight:
  //   - check pending sales count for that period
  //   - check that the selected branch has a contract_number + token
  // This surfaces the same conditions the server checks, inline, before the user clicks submit.
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

    supabase.from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', form.branch_id)
      .eq('status', 'pending')
      .gte('sale_date', fromDate)
      .lte('sale_date', toDate)
      .then(({ count }) => {
        if (cancelled) return
        const branchOk = !!(branch.contract_number && branch.token)
        let reason = ''
        if (!branch.contract_number) reason = 'الفرع بدون رقم عقد (lease_code) — اطلب من الإدارة إضافته'
        else if (!branch.token)      reason = 'الفرع بدون توكن سينومي — اطلب من الإدارة إضافته'
        else if ((count ?? 0) === 0) reason = 'لا توجد فواتير معلقة لهذه الفترة'
        setPreflight({ checking: false, count: count ?? 0, branchOk, reason })
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

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 font-arabic">إرسال الفواتير</h1>
        <Link to="/submissions"
          className="flex items-center gap-1.5 text-sm text-yellow-700 dark:text-yellow-500
                     hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors font-arabic">
          <FileText size={14} /> تقرير الإرسالات
        </Link>
      </div>

      {/* Glass form card */}
      <div className="card-surface p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch */}
          <div>
            <label className={labelCls}>الفرع <span className="text-red-500">*</span></label>
            <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}
              className="input-base font-arabic">
              <option value="">اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </div>

          {/* Month + Year */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>الشهر</label>
              <select value={form.month} onChange={e => set('month', parseInt(e.target.value))}
                className="input-base font-arabic">
                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className={labelCls}>السنة</label>
              <select value={form.year} onChange={e => set('year', parseInt(e.target.value))}
                className="input-base">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Preflight status — shows the exact reason the submit would fail */}
          {form.branch_id && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm font-arabic border ${
              preflight.checking
                ? 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-300'
                : preflight.reason
                  ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-300'
                  : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700/50 dark:text-green-300'
            }`}>
              {preflight.checking ? (
                <><ButtonSpinner /><span>جارٍ التحقق من جاهزية الإرسال…</span></>
              ) : preflight.reason ? (
                <><AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{preflight.reason}</span></>
              ) : (
                <><CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>جاهز للإرسال — {preflight.count} فاتورة معلقة لهذه الفترة</span></>
              )}
            </div>
          )}

          {/* Last submission error (from server) */}
          {lastError && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm font-arabic bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{lastError}</span>
            </div>
          )}

          {/* Submit button */}
          <button type="submit" disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2
                       bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800
                       disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3
                       rounded-xl transition-colors font-arabic text-sm shadow-sm">
            {loading ? <ButtonSpinner /> : <Send size={16} />}
            {loading ? 'جاري الإرسال...' : 'إرسال الفواتير'}
          </button>
        </form>

        <p className="text-xs text-gray-400 dark:text-gray-500 font-arabic text-center">
          سيتم إرسال جميع الفواتير المعلقة للفرع والفترة المحددة.
        </p>
      </div>
    </div>
  )
}
