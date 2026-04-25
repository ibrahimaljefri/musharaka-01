import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ConfirmDialog from '../../components/ConfirmDialog'
import { toast } from '../../lib/useToast'
import { Key, Plus, Trash2, Copy, Check, ArrowRight, Power, PowerOff, Shield, Zap, BookOpen } from 'lucide-react'
import './admin-apikeys.css'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' })
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className={`adm-copy-btn ${copied ? 'copied' : ''}`} aria-label="نسخ">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

export default function ApiKeys() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [keys, setKeys]             = useState([])
  const [allFields, setAllFields]   = useState([])
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading]       = useState(true)
  const [newKey, setNewKey]         = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ label: '', allowed_fields: ['contract_number','period_from_date','period_to_date','amount'], expires_at: '' })
  const [saving, setSaving]         = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const [keysRes, tenantRes] = await Promise.all([
        api.get(`/admin/tenants/${id}/api-keys`),
        api.get(`/admin/tenants/${id}`),
      ])
      setKeys(keysRes.data.keys || [])
      setAllFields(keysRes.data.all_fields || [])
      setTenantName(tenantRes.data.name || '')
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل التحميل')
    } finally { setLoading(false) }
  }

  const toggleField = (field) => {
    const curr = form.allowed_fields
    setForm(f => ({
      ...f,
      allowed_fields: curr.includes(field) ? curr.filter(x => x !== field) : [...curr, field],
    }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.label) return toast.error('اسم المفتاح مطلوب')
    setSaving(true)
    try {
      const { data } = await api.post(`/admin/tenants/${id}/api-keys`, {
        ...form, expires_at: form.expires_at || null,
      })
      setNewKey(data.raw_key)
      setKeys(prev => [data, ...prev])
      setShowForm(false)
      setForm({ label: '', allowed_fields: ['contract_number','period_from_date','period_to_date','amount'], expires_at: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل إنشاء المفتاح')
    } finally { setSaving(false) }
  }

  async function toggleActive(keyId, current) {
    try {
      const { data } = await api.put(`/admin/api-keys/${keyId}`, { is_active: !current })
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, is_active: data.is_active } : k))
    } catch {
      toast.error('فشل تحديث الحالة')
    }
  }

  async function handleConfirmedDelete() {
    const keyId = deleteTarget.id
    setDeleteTarget(null)
    try {
      await api.delete(`/admin/api-keys/${keyId}`)
      setKeys(prev => prev.filter(k => k.id !== keyId))
      toast.success('تم حذف المفتاح')
    } catch {
      toast.error('فشل الحذف')
    }
  }

  const FIELD_LABELS = {
    contract_number: 'رقم العقد', branch_code: 'كود الفرع', branch_name: 'اسم الفرع',
    brand_name: 'اسم العلامة', unit_number: 'رقم الوحدة', location: 'الموقع',
    invoice_number: 'رقم الفاتورة', input_type: 'نوع الإدخال',
    period_from_date: 'تاريخ البداية', period_to_date: 'تاريخ النهاية',
    sale_date: 'تاريخ البيع', month: 'الشهر', year: 'السنة',
    amount: 'المبلغ', status: 'الحالة',
  }

  const activeCount   = keys.filter(k => k.is_active).length
  const disabledCount = keys.length - activeCount
  const lastUsed      = keys.reduce((acc, k) => {
    if (!k.last_used_at) return acc
    const t = new Date(k.last_used_at).getTime()
    return !acc || t > acc ? t : acc
  }, 0)

  return (
    <div className="adm-apikeys">
      <div className="adm-page-header">
        <button onClick={() => navigate('/admin/tenants')} className="adm-back" aria-label="رجوع">
          <ArrowRight size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="adm-page-title">مفاتيح API</h1>
          <div className="t-small">{tenantName}</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn btn-primary">
          <Plus size={14} /> مفتاح جديد
        </button>
      </div>

      {/* KPIs */}
      <div className="adm-kpi-grid">
        <div className="adm-kpi">
          <div className="adm-kpi-head"><Key size={13} /> إجمالي</div>
          <div className="adm-kpi-val">{keys.length}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-head"><Power size={13} /> نشط</div>
          <div className="adm-kpi-val" style={{ color: '#15803D' }}>{activeCount}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-head"><PowerOff size={13} /> معطّل</div>
          <div className="adm-kpi-val" style={{ color: 'var(--text-muted)' }}>{disabledCount}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-head"><Zap size={13} /> آخر استخدام</div>
          <div className="adm-kpi-val small">{lastUsed ? fmtDate(new Date(lastUsed)) : 'لم يُستخدم بعد'}</div>
        </div>
      </div>

      <div className="adm-grid">
        <div className="adm-main">
          {/* One-time key reveal */}
          {newKey && (
            <div className="adm-reveal">
              <p className="adm-reveal-msg">تم إنشاء المفتاح — احفظه الآن، لن يُعرض مرة أخرى</p>
              <div className="adm-reveal-key" dir="ltr">
                <span className="key-text">{newKey}</span>
                <CopyButton text={newKey} />
              </div>
              <button onClick={() => setNewKey(null)} className="adm-reveal-dismiss">تم الحفظ، إخفاء المفتاح</button>
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleCreate} className="adm-form-card">
              <h3 className="adm-form-title">إنشاء مفتاح جديد</h3>
              <div className="adm-form-grid">
                <div className="field">
                  <label className="field-label">اسم المفتاح (للتعريف) <span className="field-required">*</span></label>
                  <input className="input" value={form.label}
                    onChange={e => setForm(f => ({...f, label: e.target.value}))}
                    required placeholder="مثال: ERP Integration" />
                </div>
                <div className="field">
                  <label className="field-label">تاريخ الانتهاء (اختياري)</label>
                  <input className="input" type="date" dir="ltr" value={form.expires_at}
                    onChange={e => setForm(f => ({...f, expires_at: e.target.value}))} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">الحقول المسموح بها في الاستجابة</label>
                <div className="adm-chips">
                  {allFields.map(f => {
                    const active = form.allowed_fields.includes(f)
                    return (
                      <button key={f} type="button" onClick={() => toggleField(f)}
                        className={`adm-chip-btn ${active ? 'active' : ''}`}>
                        {FIELD_LABELS[f] || f}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  <Key size={14} /> {saving ? 'جاري الإنشاء...' : 'إنشاء المفتاح'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">إلغاء</button>
              </div>
            </form>
          )}

          {/* Keys list */}
          <div className="surface adm-tbl-wrap">
            <div className="adm-sec-head">
              <span className="adm-sec-title">المفاتيح الحالية</span>
              <span className="t-small">{keys.length} مفتاح</span>
            </div>
            {loading ? (
              <div className="adm-state">جاري التحميل...</div>
            ) : keys.length === 0 ? (
              <div className="adm-state">
                <Key size={32} style={{ color: 'var(--border-strong)', display: 'block', margin: '0 auto 8px' }} />
                لا توجد مفاتيح API بعد
              </div>
            ) : (
              keys.map(k => (
                <div key={k.id} className="adm-key-row">
                  <div className="adm-key-info">
                    <div className="adm-key-head">
                      <span className="adm-key-label">{k.label}</span>
                      <span className={`adm-status ${k.is_active ? 's-active' : 's-disabled'}`}>
                        {k.is_active ? 'نشط' : 'معطّل'}
                      </span>
                    </div>
                    <p className="adm-key-prefix" dir="ltr">{k.key_prefix}••••••••••••••••••••</p>
                    <div className="adm-field-chips">
                      {(k.allowed_fields || []).map(f => (
                        <span key={f} className="adm-field-chip">{FIELD_LABELS[f] || f}</span>
                      ))}
                    </div>
                    <div className="adm-key-meta">
                      أُنشئ: {fmtDate(k.created_at)}
                      {k.expires_at && <> · ينتهي: {fmtDate(k.expires_at)}</>}
                      {k.last_used_at && <> · آخر استخدام: {fmtDate(k.last_used_at)}</>}
                    </div>
                  </div>
                  <div className="adm-actions">
                    <button onClick={() => toggleActive(k.id, k.is_active)} className="adm-icon-btn"
                      title={k.is_active ? 'تعطيل' : 'تفعيل'}>
                      {k.is_active ? <Power size={13} /> : <PowerOff size={13} />}
                    </button>
                    <button onClick={() => setDeleteTarget(k)} className="adm-icon-btn danger" title="حذف">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="adm-sidebar">
          <div className="adm-side-card">
            <h3 className="adm-side-title"><BookOpen size={14} /> مثال على الاستخدام</h3>
            <div className="adm-code-block" dir="ltr">
              <div>GET /api/contracts?api_key=msk_your_key_here</div>
              <div className="muted"># Optional filters:</div>
              <div style={{ wordBreak: 'break-all' }}>GET /api/contracts?api_key=msk_...&amp;from=2026-01-01&amp;to=2026-03-31</div>
              <div className="light" style={{ marginTop: 8, wordBreak: 'break-all' }}>X-API-Key: msk_your_key_here</div>
              <div className="muted"># Alternative: request header</div>
            </div>
          </div>

          <div className="adm-tip-card">
            <div className="adm-tip-title"><Shield size={13} /> إرشادات الأمان</div>
            <ul className="adm-tip-list">
              {[
                'انسخ المفتاح الآن — لن يُعرض مجدداً بعد الإغلاق.',
                'لا تشارك المفتاح في مستودعات Git أو رسائل غير آمنة.',
                'أنشئ مفتاحاً منفصلاً لكل تكامل، وعطّل غير المستخدم.',
                'راقب حقل "آخر استخدام" لاكتشاف أي نشاط غير متوقع.',
              ].map((t, i) => (
                <li key={i} className="adm-tip-item">
                  <span className="adm-tip-num">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف مفتاح API"
        message="هل أنت متأكد من حذف هذا المفتاح؟ لا يمكن التراجع عن هذه العملية."
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
