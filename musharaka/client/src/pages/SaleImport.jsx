import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../lib/axiosClient'
import AlertBanner from '../components/AlertBanner'
import { Upload, Eye, X, Download } from 'lucide-react'
import './sale-import.css'

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
    <div className="import-page">
      <div className="ip-header">
        <h1 className="ip-title">استيراد ملف Excel</h1>
        <div className="ip-subtitle">ارفع ملف المبيعات أو حمّل نموذج جاهز ثم أعد رفعه بعد تعبئته</div>
      </div>

      <div className="ip-grid">
        {/* LEFT: upload & import */}
        <div className="surface">
          {error  && <div style={{ marginBottom: 'var(--space-3, 12px)' }}><AlertBanner type="error" message={error} /></div>}
          {result && (
            <div className="ip-result">
              <p style={{ margin: 0, fontWeight: 600 }}>{result.message}</p>
              {result.warnings?.map((w,i) => <p key={i} className="warn" style={{ margin: '2px 0 0' }}>{w}</p>)}
              {result.errors?.map((e,i)   => <p key={i} className="err" style={{ margin: '2px 0 0' }}>{e}</p>)}
            </div>
          )}

          <div className="ip-field">
            <label className="ip-label">الفرع <span className="req">*</span></label>
            <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)} data-testid="branch-select">
              <option value="">اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </div>

          <div className="ip-field">
            <label className="ip-label">الملف (.xlsx, .xls, .csv)</label>
            <div className="ip-dropzone" data-testid="drop-zone" onClick={() => fileRef.current?.click()}>
              <Upload size={28} className="ip-dz-icon" />
              <div className="ip-dz-main">{file ? file.name : 'انقر لاختيار ملف أو اسحب وأفلت'}</div>
              <div className="ip-dz-sub">xlsx, xls, csv — بحد أقصى 10 MB</div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => { setFile(e.target.files[0] || null); setResult(null) }} />
          </div>

          <div className="ip-actions">
            <button type="button" className="btn btn-secondary" onClick={handlePreview} disabled={!file || previewing}>
              <Eye size={15} /> {previewing ? 'جاري المعاينة...' : 'معاينة'}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleImport} disabled={!file || !branchId || loading}>
              <Upload size={15} /> {loading ? 'جاري الاستيراد...' : 'استيراد'}
            </button>
          </div>

          <div className="ip-examples">
            <b>أمثلة على البيانات:</b>
            <p><code>daily</code> | التاريخ: 2026-01-15 | المبلغ: 5000</p>
            <p><code>monthly</code> | الشهر: 1 | السنة: 2026 | المبلغ: 150000</p>
            <p><code>range</code> | البداية: 2026-01-01 | النهاية: 2026-01-10 | المبلغ: 50000</p>
          </div>
        </div>

        {/* RIGHT: template download + instructions */}
        <div>
          <div className="surface ip-instructions">
            <div className="ip-template-card">
              <h3>تحميل نموذج فارغ للمبيعات</h3>
              <p>اختر الفرع والشهر، ثم نزّل نموذج Excel معبّأ بأيام الشهر — فقط أدخل قيمة المبيعات لكل يوم وأعد رفع الملف.</p>
              <div className="ip-template-row">
                <div>
                  <label className="ip-label" style={{ fontSize: '0.75rem' }}>الشهر</label>
                  <select className="input" value={tplMonth} onChange={e => setTplMonth(parseInt(e.target.value))}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ip-label" style={{ fontSize: '0.75rem' }}>السنة</label>
                  <input type="number" min="2020" max="2100" value={tplYear}
                    onChange={e => setTplYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="input" />
                </div>
                <button type="button" className="btn btn-primary" onClick={handleDownloadTemplate} disabled={!branchId}>
                  <Download size={14} /> تحميل
                </button>
              </div>
            </div>

            <h3>إرشادات الاستيراد</h3>
            <ul>
              {tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && preview && createPortal(
        <div className="import-page">
          <div className="ip-modal-backdrop" dir="rtl">
            <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowPreview(false)} />
            <div className="ip-modal">
              <div className="ip-modal-head">
                <h2>معاينة البيانات ({preview.length} صف)</h2>
                <button type="button" className="ip-modal-close" onClick={() => setShowPreview(false)} aria-label="إغلاق" data-testid="modal-close">
                  <X size={18} />
                </button>
              </div>
              <div className="ip-modal-body">
                <table>
                  <thead>
                    <tr>{preview[0] && Object.keys(preview[0]).map(k => <th key={k}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
