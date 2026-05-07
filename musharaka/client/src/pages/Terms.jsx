/**
 * Terms — public, read-only Terms & Conditions page.
 *
 * Reachable from the landing-page footer or directly typed in the URL.
 * Works for logged-out and logged-in users alike. Fetches the latest
 * content from `GET /api/terms` (no auth required).
 */
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import UrwahLogo from '../components/UrwahLogo'
import TermsContent from '../components/TermsContent'
import './terms.css'

export default function Terms() {
  return (
    <div className="terms-page">
      <header className="terms-header">
        <Link to="/" className="terms-back" aria-label="العودة للرئيسية">
          <UrwahLogo variant="mark" width={32} />
          <span>العودة للرئيسية</span>
          <ArrowLeft size={16} />
        </Link>
      </header>

      <main className="terms-main">
        <h1 className="terms-title">الشروط والأحكام</h1>
        <TermsContent />
      </main>
    </div>
  )
}
