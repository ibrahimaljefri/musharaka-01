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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 font-arabic">إرسال الفواتير إلى سينومي</h1>
        <Link to="/submissions" className="flex items-center gap-1.5 text-sm text-yellow-700 hover:underline font-arabic">
          <FileText size={14} /> تقرير الإرسالات
        </Link>
      </div>

      <div className="card-surface p-6 space-y-5">
        {error   && <AlertBanner type="error"   message={error} />}
        {success && <AlertBanner type="success" message={success} dismissible={false} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">الفرع <span className="text-red-500">*</span></label>
            <select value={form.branch_id} onChange={e => set('branch_id', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">الشهر</label>
              <select value={form.month} onChange={e => set('month', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">السنة</label>
              <select value={form.year} onChange={e => set('year', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium py-3 rounded-lg transition-colors font-arabic text-sm">
            <Send size={16} /> {loading ? 'جاري الإرسال...' : 'إرسال الفواتير إلى سينومي'}
          </button>
        </form>

        <p className="text-xs text-gray-400 font-arabic text-center">
          سيتم إرسال جميع الفواتير المعلقة للفرع والفترة المحددة إلى منصة سينومي.
        </p>
      </div>
    </div>
  )
}
