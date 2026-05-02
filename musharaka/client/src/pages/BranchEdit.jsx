import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../lib/axiosClient'
import AlertBanner from '../components/AlertBanner'
import { useAuthStore } from '../store/authStore'
import './branch-form.css'

export default function BranchEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin)
  // Super-admin reaches BranchEdit by expanding a tenant on /admin/tenants;
  // /branches has no link in the admin sidebar so dumping them there strands
  // them. Route them back to /admin/tenants instead.
  const backPath  = isSuperAdmin ? '/admin/tenants' : '/branches'
  const backLabel = isSuperAdmin ? 'إدارة المستأجرين' : 'الفروع'
  const [form, setForm] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get(`/branches/${id}`)
      .then(({ data }) => { if (data) setForm(data); setFetching(false) })
      .catch(() => setFetching(false))
  }, [id])

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.code?.trim()) return setError('كود الفرع مطلوب')
    if (!form.name?.trim()) return setError('اسم الفرع مطلوب')
    setLoading(true)
    try {
      await api.put(`/branches/${id}`, {
        code:            form.code.trim(),
        name:            form.name.trim(),
        contract_number: form.contract_number || null,
        brand_name:      form.brand_name      || null,
        unit_number:     form.unit_number     || null,
        location:        form.location        || null,
        address:         form.address         || null,
      })
      setSuccess('تم حفظ التغييرات بنجاح')
      setTimeout(() => navigate(backPath), 1200)
    } catch (e) {
      const msg = e.response?.data?.error || 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="branch-form-page"><div className="bf-loading">جاري التحميل...</div></div>
  if (!form)    return <div className="branch-form-page"><div className="bf-notfound">الفرع غير موجود</div></div>

  return (
    <div className="branch-form-page">
      <div className="bf-header">
        <div>
          <div className="bf-breadcrumb">
            <Link to={backPath}>{backLabel}</Link> / تعديل
          </div>
          <h1 className="bf-title">{form.name || form.code}</h1>
          <div className="bf-subtitle">
            كود الفرع: <span dir="ltr" style={{ fontFamily: 'ui-monospace, monospace' }}>{form.code}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="surface">
        {error && <div className="bf-alert"><AlertBanner type="error" message={error} /></div>}
        {success && <div className="bf-alert"><AlertBanner type="success" message={success} dismissible={false} /></div>}

        <div className="bf-grid">
          <div className="bf-field">
            <label className="bf-label">كود الفرع <span className="req">*</span></label>
            <input className="input" dir="ltr" value={form.code || ''} onChange={e => set('code', e.target.value)} />
          </div>
          <div className="bf-field">
            <label className="bf-label">اسم الفرع <span className="req">*</span></label>
            <input className="input" value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="bf-field">
            <label className="bf-label">
              رقم العقد
              {form.contract_number && !isSuperAdmin && (
                <span style={{ marginRight: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🔒 لا يمكن التعديل
                </span>
              )}
            </label>
            <input
              className="input"
              dir="ltr"
              value={form.contract_number || ''}
              onChange={form.contract_number && !isSuperAdmin ? undefined : e => set('contract_number', e.target.value)}
              readOnly={!!(form.contract_number && !isSuperAdmin)}
              style={form.contract_number && !isSuperAdmin ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
            />
          </div>
          <div className="bf-field">
            <label className="bf-label">اسم البراند</label>
            <input className="input" value={form.brand_name || ''} onChange={e => set('brand_name', e.target.value)} />
          </div>
          <div className="bf-field">
            <label className="bf-label">رقم الوحدة</label>
            <input className="input" dir="ltr" value={form.unit_number || ''} onChange={e => set('unit_number', e.target.value)} />
          </div>
          <div className="bf-field">
            <label className="bf-label">الموقع</label>
            <input className="input" value={form.location || ''} onChange={e => set('location', e.target.value)} />
          </div>
          <div className="bf-field full">
            <label className="bf-label">العنوان</label>
            <textarea className="input" rows={2} value={form.address || ''} onChange={e => set('address', e.target.value)} />
          </div>
        </div>

        <div className="bf-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(backPath)}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
