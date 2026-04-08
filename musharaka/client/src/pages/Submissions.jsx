import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BranchBadge from '../components/BranchBadge'
import { ChevronDown, ChevronUp, Send, AlertCircle } from 'lucide-react'
import EmptyState from '../components/EmptyState'

const MONTHS_AR = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const YEARS = Array.from({ length: 6 }, (_, i) => 2021 + i)
function fmt(n) { return Number(n||0).toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2}) }

function MissingDays({ sentDates, month, year }) {
  if (!sentDates || sentDates.length === 0) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1)
    return d.toISOString().split('T')[0]
  })
  const sentSet = new Set(sentDates)
  const missing = allDays.filter(d => !sentSet.has(d))
  if (missing.length === 0) return (
    <div className="text-xs text-green-600 font-arabic mt-2">لا توجد أيام ناقصة — جميع أيام الشهر مُغطاة</div>
  )
  // Group consecutive
  const groups = []; let start = missing[0], prev = missing[0]
  for (let i = 1; i < missing.length; i++) {
    const curr = missing[i]
    const p = new Date(prev); p.setDate(p.getDate() + 1)
    if (p.toISOString().split('T')[0] !== curr) {
      groups.push({ start, end: prev }); start = curr
    }
    prev = curr
  }
  groups.push({ start, end: prev })
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-red-600 font-arabic mb-1">الأيام غير المُرسلة ({missing.length} يوم):</p>
      <div className="flex flex-wrap gap-1.5">
        {groups.map((g, i) => (
          <span key={i} className="text-xs bg-red-50 border border-red-200 text-red-600 px-2 py-0.5 rounded font-arabic" dir="ltr">
            {g.start === g.end ? g.start : `${g.start} → ${g.end}`}
          </span>
        ))}
      </div>
    </div>
  )
}

function SubmissionCard({ sub }) {
  const [open, setOpen] = useState(false)
  const [sales, setSales] = useState([])
  const [loadingSales, setLoadingSales] = useState(false)

  const toggle = async () => {
    if (!open && sales.length === 0) {
      setLoadingSales(true)
      const { data } = await supabase.from('sales').select('*').eq('submission_id', sub.id).order('sale_date')
      setSales(data || [])
      setLoadingSales(false)
    }
    setOpen(o => !o)
  }

  const sentDates = sales.map(s => s.sale_date)

  return (
    <div className="card-surface overflow-hidden hover-lift">
      <button onClick={toggle} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-4">
          <BranchBadge code={sub.branches?.code || '?'} />
          <div className="text-right">
            <p className="font-semibold text-gray-800 font-arabic text-sm">{sub.branches?.name}</p>
            <p className="text-xs text-gray-500 font-arabic">{MONTHS_AR[sub.month]} {sub.year}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 font-arabic">عدد الفواتير</p>
            <p className="font-semibold text-gray-700 font-arabic text-sm">{sub.invoice_count}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 font-arabic">الإجمالي</p>
            <p className="font-semibold text-green-700 font-arabic text-sm">{fmt(sub.total_amount)} ر.س</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-arabic">مرسل</span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          {loadingSales ? (
            <p className="text-sm text-gray-400 font-arabic text-center py-4">جاري التحميل...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-arabic">
                    <tr>
                      <th className="px-3 py-2 text-right font-medium">التاريخ</th>
                      <th className="px-3 py-2 text-right font-medium">رقم الفاتورة</th>
                      <th className="px-3 py-2 text-right font-medium">المبلغ (ر.س)</th>
                      <th className="px-3 py-2 text-right font-medium">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map(s => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 text-gray-600" dir="ltr">{s.sale_date}</td>
                        <td className="px-3 py-2 text-gray-600">{s.invoice_number || '—'}</td>
                        <td className="px-3 py-2 font-semibold text-gray-800 font-arabic">{fmt(s.amount)}</td>
                        <td className="px-3 py-2 text-gray-500 font-arabic">{s.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <MissingDays sentDates={sentDates} month={sub.month} year={sub.year} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Submissions() {
  const [branches, setBranches]       = useState([])
  const [submissions, setSubmissions] = useState([])
  const [filters, setFilters]         = useState({ branch_id: '', month: '', year: '' })
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    supabase.from('branches').select('id,code,name').order('name').then(({ data }) => setBranches(data || []))
    load({})
  }, [])

  async function load(f) {
    setLoading(true)
    let q = supabase.from('submissions').select('*, branches(code,name)').order('submitted_at', { ascending: false })
    if (f.branch_id) q = q.eq('branch_id', f.branch_id)
    if (f.month)     q = q.eq('month', f.month)
    if (f.year)      q = q.eq('year', f.year)
    const { data } = await q
    setSubmissions(data || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 font-arabic">تقرير الإرسالات</h1>
        <Link to="/submit" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic">
          <Send size={15} /> إرسال جديد
        </Link>
      </div>

      {/* Filters */}
      <div className="card-surface p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 font-arabic mb-1">الفرع</label>
            <select value={filters.branch_id} onChange={e => setFilters(f => ({...f,branch_id:e.target.value}))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-arabic mb-1">الشهر</label>
            <select value={filters.month} onChange={e => setFilters(f => ({...f,month:e.target.value}))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">الكل</option>
              {[...Array(12)].map((_,i) => <option key={i+1} value={i+1}>{MONTHS_AR[i+1]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-arabic mb-1">السنة</label>
            <select value={filters.year} onChange={e => setFilters(f => ({...f,year:e.target.value}))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">الكل</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => load(filters)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors font-arabic">
            بحث
          </button>
        </div>
      </div>

      {/* Submission cards */}
      {loading ? (
        <div className="text-center text-gray-400 font-arabic py-12">جاري التحميل...</div>
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="لا توجد إرسالات"
          description="لا توجد إرسالات في الفترة المحددة — جرّب تغيير عوامل التصفية أو أنشئ إرسالاً جديداً"
          action={
            <Link to="/submit"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic">
              <Send size={15} /> إرسال جديد
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => <SubmissionCard key={sub.id} sub={sub} />)}
        </div>
      )}
    </div>
  )
}
