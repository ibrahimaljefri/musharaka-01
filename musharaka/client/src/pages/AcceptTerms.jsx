/**
 * AcceptTerms — forced T&C acceptance for users who haven't accepted yet
 * (typically users created by a super-admin/tenant-admin via /admin/users).
 *
 * This page is the only thing they can see while logged in until they
 * tick the box and submit. The TermsGate in App.jsx redirects every
 * other protected route here when `mustAcceptTerms === true`.
 *
 * Logout button is always available so the user is never trapped.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { CheckCircle2, LogOut } from 'lucide-react'
import UrwahLogo from '../components/UrwahLogo'
import TermsContent from '../components/TermsContent'
import ButtonSpinner from '../components/ButtonSpinner'
import { toast } from '../lib/useToast'
import './terms.css'

export default function AcceptTerms() {
  const navigate     = useNavigate()
  const acceptTerms  = useAuthStore(s => s.acceptTerms)
  const signOut      = useAuthStore(s => s.signOut)
  const fullName     = useAuthStore(s => s.user?.full_name || s.user?.email || '')

  const [agreed, setAgreed]     = useState(false)
  const [submitting, setSub]    = useState(false)

  const handleAccept = async () => {
    if (!agreed) return
    setSub(true)
    try {
      await acceptTerms()
      toast.success('شكراً لموافقتك على الشروط والأحكام')
      navigate('/dashboard', { replace: true })
    } catch {
      toast.error('تعذّر حفظ موافقتك. حاول مرة أخرى.')
    } finally {
      setSub(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="terms-page">
      <header className="terms-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UrwahLogo variant="mark" width={32} />
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>عروة</span>
        </div>
        <button
          type="button"
          className="terms-print-btn"
          onClick={handleLogout}
          title="تسجيل الخروج"
        >
          <LogOut size={14} /> تسجيل الخروج
        </button>
      </header>

      <main className="terms-main">
        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            color: '#92400E',
            padding: '14px 18px',
            borderRadius: 10,
            marginBottom: 24,
            fontSize: '0.92rem',
          }}
        >
          <strong>أهلاً {fullName}</strong> — قبل البدء في استخدام نظام عروة،
          يجب الاطلاع على الشروط والأحكام والموافقة عليها.
        </div>

        <h1 className="terms-title">الشروط والأحكام</h1>
        <TermsContent />

        <div
          className="surface"
          style={{
            marginTop: 28,
            padding: 18,
            borderRadius: 12,
            border: '1px solid var(--border, #E7E5E4)',
            background: 'var(--surface, #fff)',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 4, accentColor: '#D97706', width: 18, height: 18, flexShrink: 0 }}
            />
            <span style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
              أقررّت بقراءة الشروط والأحكام أعلاه وأوافق عليها بالكامل.
            </span>
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAccept}
              disabled={!agreed || submitting}
              style={{ minWidth: 160 }}
            >
              {submitting
                ? <><ButtonSpinner /> جاري الحفظ…</>
                : <><CheckCircle2 size={16} /> أوافق وتابع</>}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleLogout}
              disabled={submitting}
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
