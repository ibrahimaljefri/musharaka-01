import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import api from '../lib/axiosClient'
import AlertBanner from '../components/AlertBanner'
import { Send, FileText } from 'lucide-react'

const MONTHS = [
  { v: 1, l: 'يناير' }, { v: 2, l: 'فبراير' }, { v: 3, l: 'مارس' },
  { v: 4, l: 'أبريل' }, { v: 5, l: 'مايو' },   { v: 6, l: 'يونيو' },
  { v: 7, l: 'يوليو' }, { v: 8, l: 'أغسطس' },  { v: 9, l: 'سبتمبر' },
  { v: 10, l: 'أكتوبر' }, { v: 11, l: 'نوفمبر' }, { v: 12, l: 'ديسمبر' },
]
const YEARS = Array.from({ length: 6 }, (_, i) => 2021 + i)

const selectCls = `w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-arabic
                   bg-white/70 dark:bg-gray-900/70 text-gray-900 dark:text-gray-100
                   backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-yellow-400`

const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 font-arabic mb-1.5'

export default function Submit() {
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState({
    branch_id: '',
    month:  new Date().getMonth() + 1,
    year:   new Date().getFullYear(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.from('branches').select('id,code,name').order('name')
      .then(({ data }) => setBranches(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.branch_id) return setError('يرجى اختيار الفرع')
    setLoading(true)
    try {
      const { data } = await api.post('/submit', form)
      setSuccess(`${data.message} — عدد الفواتير: ${data.submission?.invoice_count || 0}`)
    } catch (err) {
      setError(err.response?.data?.error || 'فشل إرسال الفواتير')
    } finally { setLoading(false) }
  }

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
        {error   && <AlertBanner type="error"   message={error} />}
        {success && <AlertBanner type="success" message={success} dismissible={false} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch */}
          <div>
            <label className={labelCls}>الفرع <span className="text-red-500">*</span></label>
            <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}
              className={selectCls}>
              <option value="">اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </div>

          {/* Month + Year */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>الشهر</label>
              <select value={form.month} onChange={e => set('month', parseInt(e.target.value))}
                className={selectCls}>
                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className={labelCls}>السنة</label>
              <select value={form.year} onChange={e => set('year', parseInt(e.target.value))}
                className={selectCls}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Submit button */}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2
                       bg-green-600 hover:bg-green-700 active:bg-green-800
                       disabled:opacity-60 text-white font-medium py-3
                       rounded-xl transition-colors font-arabic text-sm shadow-sm">
            <Send size={16} />
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
