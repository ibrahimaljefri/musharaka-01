/**
 * TermsContent — fetches the current T&C body from `GET /api/terms`
 * and renders it as Markdown. Used by the public `/terms` page, the
 * forced `/accept-terms` page, and the admin `/admin/terms` preview.
 *
 * Loading and error states render gracefully so the page never appears
 * broken if the API is slow / unreachable.
 *
 * Props:
 *   showLastUpdated — when true, prints a small "آخر تحديث" line under
 *                     the body (default: true)
 *   bodyOverride    — when provided, skips the fetch and renders this
 *                     string instead. Used by the admin edit page's
 *                     live preview pane.
 */
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../lib/axiosClient'

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('ar-SA', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default function TermsContent({ showLastUpdated = true, bodyOverride = null }) {
  const [body, setBody]             = useState(bodyOverride ?? '')
  const [updatedAt, setUpdatedAt]   = useState(null)
  const [loading, setLoading]       = useState(bodyOverride == null)
  const [error, setError]           = useState(null)

  useEffect(() => {
    if (bodyOverride != null) {
      setBody(bodyOverride)
      return
    }
    let cancelled = false
    setLoading(true)
    api.get('/terms')
      .then(({ data }) => {
        if (cancelled) return
        setBody(data?.body || '')
        setUpdatedAt(data?.updated_at || null)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('تعذّر تحميل محتوى الشروط والأحكام. يُرجى تحديث الصفحة.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bodyOverride])

  if (loading) {
    return <div className="terms-loading" aria-busy="true">جاري تحميل المحتوى…</div>
  }
  if (error) {
    return <div className="terms-error">{error}</div>
  }
  if (!body.trim()) {
    return <div className="terms-empty">لا يوجد محتوى للشروط والأحكام بعد.</div>
  }

  return (
    <div className="terms-body">
      <ReactMarkdown>{body}</ReactMarkdown>
      {showLastUpdated && updatedAt && (
        <div className="terms-meta" dir="rtl">
          آخر تحديث: <time dateTime={updatedAt}>{fmtDate(updatedAt)}</time>
        </div>
      )}
    </div>
  )
}
