/**
 * AdminTerms — super-admin page to edit the platform-wide T&C content.
 *
 * Loads the current Markdown body from `GET /api/terms`, lets the admin
 * edit it in a textarea with a live Markdown preview, and saves via
 * `PUT /api/terms`.
 *
 * Editing the content does NOT re-prompt users who already accepted —
 * each user's `terms_accepted_at` timestamp persists across content edits.
 */
import { useEffect, useState } from 'react'
import api from '../../lib/axiosClient'
import TermsContent from '../../components/TermsContent'
import ButtonSpinner from '../../components/ButtonSpinner'
import { toast } from '../../lib/useToast'
import { Save, FileText, AlertCircle } from 'lucide-react'
import '../terms.css'

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('ar-SA', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default function AdminTerms() {
  const [draft, setDraft]         = useState('')
  const [saved, setSaved]         = useState('')   // last-saved body (for dirty check)
  const [meta,  setMeta]          = useState({ updated_at: null, updated_by_name: null, updated_by_email: null })
  const [loading, setLoading]     = useState(true)
  const [saving,  setSaving]      = useState(false)
  const [error,   setError]       = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get('/terms')
      .then(({ data }) => {
        if (cancelled) return
        setDraft(data?.body || '')
        setSaved(data?.body || '')
        setMeta({
          updated_at:        data?.updated_at || null,
          updated_by_name:   data?.updated_by_name || null,
          updated_by_email:  data?.updated_by_email || null,
        })
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError('تعذّر تحميل المحتوى الحالي.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const isDirty = draft !== saved

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/terms', { body: draft })
      setSaved(draft)
      // Refetch to grab updated_at + updated_by display data.
      const { data } = await api.get('/terms')
      setMeta({
        updated_at:        data?.updated_at || null,
        updated_by_name:   data?.updated_by_name || null,
        updated_by_email:  data?.updated_by_email || null,
      })
      toast.success('تم حفظ الشروط والأحكام')
    } catch (err) {
      toast.error(err.response?.data?.error || 'تعذّر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-terms-page">
      <div className="adm-terms-header">
        <h1 className="adm-terms-title">
          <FileText size={20} style={{ color: 'var(--brand)' }} />
          إدارة الشروط والأحكام
        </h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!isDirty || saving || loading}
        >
          {saving
            ? <><ButtonSpinner /> جاري الحفظ…</>
            : <><Save size={14} /> حفظ التغييرات</>}
        </button>
      </div>

      <div className="adm-terms-notice">
        <AlertCircle size={16} style={{ color: '#92400E', flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>ملاحظة:</strong> تحديث المحتوى لا يطلب من المستخدمين الحاليين
          الموافقة من جديد. الموافقة المسجّلة لكل مستخدم تبقى سارية.
        </span>
      </div>

      {meta.updated_at && (
        <div className="adm-terms-meta">
          آخر تحديث: <strong>{fmtDate(meta.updated_at)}</strong>
          {(meta.updated_by_name || meta.updated_by_email) && (
            <> — بواسطة <strong>{meta.updated_by_name || meta.updated_by_email}</strong></>
          )}
        </div>
      )}

      {loading ? (
        <div className="terms-loading">جاري التحميل…</div>
      ) : error ? (
        <div className="terms-error">{error}</div>
      ) : (
        <div className="adm-terms-grid">
          <div className="adm-terms-pane">
            <div className="adm-terms-pane-head">
              تحرير (Markdown)
              {isDirty && <span className="adm-terms-dirty">• تغييرات غير محفوظة</span>}
            </div>
            <textarea
              className="adm-terms-editor"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              spellCheck={false}
              placeholder="# عنوان..."
              dir="rtl"
            />
            <div className="adm-terms-hint">
              يدعم تنسيق Markdown — العناوين بـ <code>#</code>, <code>##</code>,
              <code>###</code> · القوائم بـ <code>-</code> ·
              التعداد بـ <code>1.</code> · الروابط بـ <code>[نص](رابط)</code> ·
              التشديد بـ <code>**نص**</code>.
            </div>
          </div>

          <div className="adm-terms-pane">
            <div className="adm-terms-pane-head">معاينة مباشرة</div>
            <div className="adm-terms-preview">
              <TermsContent showLastUpdated={false} bodyOverride={draft} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
