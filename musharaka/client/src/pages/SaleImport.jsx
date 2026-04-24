import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../lib/axiosClient'
import TipsPanel from '../components/TipsPanel'
import AlertBanner from '../components/AlertBanner'
import { Upload, Eye, X, Download } from 'lucide-react'

export default function SaleImport() {
  const [branches, setBranches]     = useState([])
  const [branchId, setBranchId]     = useState('')
  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState('')
  const fileRef = useRef()

  useEffect(() => {
    api.get('/branches').then(({ data }) => setBranches(data || []))
      .catch(() => setBranches([]))
  }, [])

  const now         = new Date()
  const [tplMonth, setTplMonth] = useState(now.getMonth() + 1)
  const [tplYear,  setTplYear]  = useState(now.getFullYear())

  const handleDownloadTemplate = async () => {
    if (!branchId) return setError('يرجى اختيار الفرع أولاً لتحميل النموذج')
    setError('')
    try {
      const res = await api.get('/sales/import/template', {
        params: { branch_id: branchId, month: tplMonth, year: tplYear },
        responseType: 'blob',
      })
      const branch = branches.find(b => b.id === branchId)
      const mm     = String(tplMonth).padStart(2, '0')
      const name   = `template-${branch?.code || 'branch'}-${tplYear}-${mm}.xlsx`
      const blob   = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href = url; a.download = name; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تحميل النموذج')
    }
  }

  const handlePreview = async () => {
    if (!file) return setError('يرجى اختيار ملف أولاً')
    setError(''); setPreviewing(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const { data } = await api.post('/sales/import/preview', fd)
      setPreview(data.rows)
      setShowPreview(true)
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في معاينة الملف')
    } finally { setPreviewing(false) }
  }

  const handleImport = async () => {
    if (!file)     return setError('يرجى اختيار ملف')
    if (!branchId) return setError('يرجى اختيار الفرع')
    setError(''); setLoading(true)
    const fd = new FormData(); fd.append('file', file); fd.append('branch_id', branchId)
    try {
      const { data } = await api.post('/sales/import', fd)
      setResult(data)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الاستيراد')
    } finally { setLoading(false) }
  }

  const tips = [
    'الأعمدة المطلوبة: input_type، amount',
    'input_type يجب أن يكون: daily أو monthly أو range',
    'للنوع daily أضف: sale_date (YYYY-MM-DD)',
    'للنوع monthly أضف: month (1-12) و year',
    'للنوع range أضف: period_start_date و period_end_date',
    'حجم الملف الأقصى: 10 ميجابايت',
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 font-arabic mb-6">استيراد ملف Excel</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {error  && <AlertBanner type="error" message={error} />}
          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
              <p className="text-sm font-semibold text-green-700 font-arabic">{result.message}</p>
              {result.warnings?.map((w,i) => <p key={i} className="text-xs text-yellow-600 font-arabic">{w}</p>)}
              {result.errors?.map((e,i)   => <p key={i} className="text-xs text-red-500 font-arabic">{e}</p>)}
            </div>
          )}

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">الفرع <span className="text-red-500">*</span></label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </div>

          {/* Template download — select period + download prefilled template */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold font-arabic text-gray-700 mb-2">تحميل نموذج فارغ للمبيعات</p>
            <p className="text-xs font-arabic text-gray-500 mb-3">اختر الفرع والشهر، ثم نزّل نموذج Excel معبّأ بأيام الشهر — فقط أدخل قيمة المبيعات لكل يوم وأعد رفع الملف.</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-arabic text-gray-600 mb-1">الشهر</label>
                <select value={tplMonth} onChange={e => setTplMonth(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-arabic text-gray-600 mb-1">السنة</label>
                <input type="number" min="2020" max="2100" value={tplYear}
                  onChange={e => setTplYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <button onClick={handleDownloadTemplate} disabled={!branchId}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 border border-yellow-600 rounded-lg transition-colors font-arabic">
                <Download size={14} /> تحميل
              </button>
            </div>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 font-arabic mb-1.5">الملف (.xlsx, .xls, .csv)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-yellow-400 rounded-lg p-8 text-center cursor-pointer transition-colors"
            >
              <Upload size={28} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 font-arabic">{file ? file.name : 'انقر لاختيار ملف أو اسحب وأفلت'}</p>
              <p className="text-xs text-gray-400 font-arabic mt-1">xlsx, xls, csv — بحد أقصى 10 MB</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => { setFile(e.target.files[0] || null); setResult(null) }} />
          </div>

          <div className="flex gap-3">
            <button onClick={handlePreview} disabled={!file || previewing}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg transition-colors font-arabic disabled:opacity-50">
              <Eye size={15} /> {previewing ? 'جاري المعاينة...' : 'معاينة'}
            </button>
            <button onClick={handleImport} disabled={!file || !branchId || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors font-arabic">
              <Upload size={15} /> {loading ? 'جاري الاستيراد...' : 'استيراد'}
            </button>
          </div>

          {/* Template examples */}
          <div className="mt-2 p-4 bg-gray-50 rounded-lg text-xs font-arabic text-gray-500 space-y-1">
            <p className="font-semibold text-gray-600 mb-2">أمثلة على البيانات:</p>
            <p><span className="font-mono bg-white px-1 rounded">daily</span> | التاريخ: 2026-01-15 | المبلغ: 5000</p>
            <p><span className="font-mono bg-white px-1 rounded">monthly</span> | الشهر: 1 | السنة: 2026 | المبلغ: 150000</p>
            <p><span className="font-mono bg-white px-1 rounded">range</span> | البداية: 2026-01-01 | النهاية: 2026-01-10 | المبلغ: 50000</p>
          </div>
        </div>

        <div className="w-full lg:w-64 shrink-0"><TipsPanel tips={tips} /></div>
      </div>

      {/* Preview Modal */}
      {showPreview && preview && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold font-arabic text-gray-800">معاينة البيانات ({preview.length} صف)</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 font-arabic">
                  <tr>{preview[0] && Object.keys(preview[0]).map(k => <th key={k} className="px-3 py-2 text-right text-gray-500 font-medium">{k}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((row, i) => (
                    <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-gray-700 font-arabic">{String(v)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
