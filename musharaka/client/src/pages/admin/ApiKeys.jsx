import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/axiosClient'
import ConfirmDialog from '../../components/ConfirmDialog'
import { toast } from '../../lib/useToast'
import { Key, Plus, Trash2, Copy, Check, ArrowRight, Power, PowerOff, Shield, Zap, BookOpen } from 'lucide-react'

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
    <button onClick={copy} className={`p-1.5 rounded transition-colors ${copied ? 'text-green-600' : 'text-gray-400 hover:text-gray-700'}`}>
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
      allowed_fields: curr.includes(field)
        ? curr.filter(x => x !== field)
        : [...curr, field],
    }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.label) return toast.error('اسم المفتاح مطلوب')
    setSaving(true)
    try {
      const { data } = await api.post(`/admin/tenants/${id}/api-keys`, {
        ...form,
        expires_at: form.expires_at || null,
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

  // Stats derived from the keys list — drives the sidebar metric tiles
  const activeCount   = keys.filter(k => k.is_active).length
  const disabledCount = keys.length - activeCount
  const lastUsed      = keys.reduce((acc, k) => {
    if (!k.last_used_at) return acc
    const t = new Date(k.last_used_at).getTime()
    return !acc || t > acc ? t : acc
  }, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/tenants')} className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 font-arabic">مفاتيح API</h1>
          <p className="text-xs text-gray-400 font-arabic mt-0.5">{tenantName}</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="mr-auto inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors font-arabic shadow-sm">
          <Plus size={14} /> مفتاح جديد
        </button>
      </div>

      {/* Metric tiles — fill the header strip, give the page immediate hierarchy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Key size={13} className="text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-arabic">إجمالي</span>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{keys.length}</p>
        </div>
        <div className="card-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Power size={13} className="text-green-600" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-arabic">نشط</span>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{activeCount}</p>
        </div>
        <div className="card-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <PowerOff size={13} className="text-gray-400" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-arabic">معطّل</span>
          </div>
          <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">{disabledCount}</p>
        </div>
        <div className="card-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={13} className="text-yellow-600" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-arabic">آخر استخدام</span>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 font-arabic truncate">
            {lastUsed ? fmtDate(new Date(lastUsed)) : 'لم يُستخدم بعد'}
          </p>
        </div>
      </div>

      {/* 2-col layout on lg+: main content + sticky sidebar with docs */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6 min-w-0">
      {/* One-time key reveal */}
      {newKey && (
        <div className="card-surface p-5 border-green-200 bg-green-50">
          <p className="text-sm font-semibold text-green-800 font-arabic mb-2">تم إنشاء المفتاح — احفظه الآن، لن يُعرض مرة أخرى</p>
          <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg p-3 font-mono text-sm" dir="ltr">
            <span className="flex-1 break-all text-gray-800">{newKey}</span>
            <CopyButton text={newKey} />
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-green-600 hover:underline font-arabic">تم الحفظ، إخفاء المفتاح</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card-surface p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 font-arabic text-sm">إنشاء مفتاح جديد</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 font-arabic mb-1.5">اسم المفتاح (للتعريف) <span className="text-red-500">*</span></label>
              <input value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))} required
                placeholder="مثال: ERP Integration"
                className="input-base" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-arabic mb-1.5">تاريخ الانتهاء (اختياري)</label>
              <input type="date" value={form.expires_at} onChange={e => setForm(f => ({...f, expires_at: e.target.value}))} dir="ltr"
                className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-arabic mb-2">الحقول المسموح بها في الاستجابة</label>
            <div className="flex flex-wrap gap-2">
              {allFields.map(f => {
                const active = form.allowed_fields.includes(f)
                return (
                  <button key={f} type="button" onClick={() => toggleField(f)}
                    className={`px-3 py-1 rounded-full text-xs font-arabic border transition-colors ${
                      active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'
                    }`}>
                    {FIELD_LABELS[f] || f}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <Key size={14} /> {saving ? 'جاري الإنشاء...' : 'إنشاء المفتاح'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="btn-ghost">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Keys list */}
      <div className="card-surface overflow-hidden">
        <div className="section-header">
          <span className="font-semibold text-gray-700 font-arabic text-sm">المفاتيح الحالية</span>
          <span className="text-xs text-gray-400 font-arabic">{keys.length} مفتاح</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-400 font-arabic text-sm">جاري التحميل...</div>
        ) : keys.length === 0 ? (
          <div className="p-10 text-center">
            <Key size={32} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 font-arabic text-sm">لا توجد مفاتيح API بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map(k => (
              <div key={k.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 font-arabic text-sm">{k.label}</span>
                    {k.is_active
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-arabic">نشط</span>
                      : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-arabic">معطّل</span>
                    }
                  </div>
                  <p className="text-xs text-gray-400 font-mono mb-2">{k.key_prefix}••••••••••••••••••••</p>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(k.allowed_fields || []).map(f => (
                      <span key={f} className="text-xs bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-arabic">
                        {FIELD_LABELS[f] || f}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 font-arabic">
                    أُنشئ: {fmtDate(k.created_at)}
                    {k.expires_at && <> · ينتهي: {fmtDate(k.expires_at)}</>}
                    {k.last_used_at && <> · آخر استخدام: {fmtDate(k.last_used_at)}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(k.id, k.is_active)}
                    className={`p-1.5 rounded-lg border transition-colors ${k.is_active ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                    title={k.is_active ? 'تعطيل' : 'تفعيل'}>
                    {k.is_active ? <Power size={13} /> : <PowerOff size={13} />}
                  </button>
                  <button onClick={() => setDeleteTarget(k)}
                    className="p-1.5 rounded-lg text-red-400 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

        </div>{/* /main column */}

        {/* Sidebar — sticky on lg+ so docs stay in view while scrolling the keys list */}
        <aside className="space-y-4 lg:sticky lg:top-6 self-start">
          {/* Usage example */}
          <div className="card-surface rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 font-arabic">مثال على الاستخدام</h3>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono text-green-400 overflow-x-auto" dir="ltr">
              <div>GET /api/contracts?api_key=msk_your_key_here</div>
              <div className="mt-1 text-gray-500"># Optional filters:</div>
              <div className="break-all">GET /api/contracts?api_key=msk_...&amp;from=2026-01-01&amp;to=2026-03-31</div>
              <div className="mt-2 text-gray-400 break-all">X-API-Key: msk_your_key_here</div>
              <div className="mt-0.5 text-gray-500"># Alternative: request header</div>
            </div>
          </div>

          {/* Security guidance — vendor-neutral best practices */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-700/50 p-4 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Shield size={13} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-bold text-blue-800 dark:text-blue-300 font-arabic">إرشادات الأمان</span>
            </div>
            <ul className="space-y-2.5">
              {[
                'انسخ المفتاح الآن — لن يُعرض مجدداً بعد الإغلاق.',
                'لا تشارك المفتاح في مستودعات Git أو رسائل غير آمنة.',
                'أنشئ مفتاحاً منفصلاً لكل تكامل، وعطّل غير المستخدم.',
                'راقب حقل "آخر استخدام" لاكتشاف أي نشاط غير متوقع.',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-blue-800 dark:text-blue-200 font-arabic leading-relaxed">
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>{/* /grid */}

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
