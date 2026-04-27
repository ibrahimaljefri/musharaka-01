import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axiosClient'
import AlertBanner from '../components/AlertBanner'
import { useAuthStore } from '../store/authStore'
import './branch-form.css'

// ── Field must live OUTSIDE BranchCreate so React keeps the same component
// identity across re-renders. Defining it inside the parent would create a
// new function reference on every keystroke → React unmounts/remounts the
// input → focus is lost after each character typed.
function Field({ name, label, required, dir = 'rtl', placeholder = '', type = 'text', full = false, form, set }) {
  return (
    <div className={`bf-field ${full ? 'full' : ''}`}>
      <label className="bf-label">
        {label} {required && <span className="req">*</span>}
      </label>
      <input
        type={type}
        dir={dir}
        className="input"
        value={form[name]}
        onChange={e => set(name, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export default function BranchCreate() {
  const navigate     = useNavigate()
  const maxBranches  = useAuthStore(s => s.maxBranches)

  useEffect(() => {
    async function checkLimit() {
      if (maxBranches == null) return
      try {
        const { data } = await api.get('/branches')
        if ((data || []).length >= maxBranches) navigate('/branches', { replace: true })
      } catch { /* ignore */ }
    }
    checkLimit()
  }, [maxBranches, navigate])

  const [form, setForm] = useState({
    code: '', name: '', contract_number: '', brand_name: '',
    unit_number: '', location: '', address: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.code.trim()) return setError('كود الفرع مطلوب')
    if (!form.name.trim()) return setError('اسم الفرع مطلوب')
    setLoading(true)
    try {
      await api.post('/branches', {
        code:            form.code.trim(),
        name:            form.name.trim(),
        contract_number: form.contract_number || null,
        brand_name:      form.brand_name      || null,
        unit_number:     form.unit_number     || null,
        location:        form.location        || null,
        address:         form.address         || null,
      })
      navigate('/branches')
    } catch (e) {
      const msg = e.response?.data?.error
      setError(msg || 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="branch-form-page">
      <div className="bf-header">
        <div>
          <h1 className="bf-title">إضافة فرع جديد</h1>
          <div className="bf-subtitle">أدخل بيانات الفرع الجديد لإضافته إلى قائمة فروعك</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="surface">
        {error && <div className="bf-alert"><AlertBanner type="error" message={error} /></div>}

        <div className="bf-grid">
          <Field name="code" label="كود الفرع" required dir="ltr" placeholder="BR-001" form={form} set={set} />
          <Field name="name" label="اسم الفرع" required placeholder="فرع الرياض" form={form} set={set} />
          <Field name="contract_number" label="رقم العقد" dir="ltr" placeholder="CNT-2024-001" form={form} set={set} />
          <Field name="brand_name" label="اسم البراند" form={form} set={set} />
          <Field name="unit_number" label="رقم الوحدة" dir="ltr" form={form} set={set} />
          <Field name="location" label="الموقع" placeholder="الرياض، حي العليا" form={form} set={set} />
          <div className="bf-field full">
            <label className="bf-label">العنوان</label>
            <textarea
              className="input"
              rows={2}
              value={form.address}
              onChange={e => set('address', e.target.value)}
            />
          </div>
        </div>

        <div className="bf-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ الفرع'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/branches')}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
