import { Outlet } from 'react-router-dom'
import UrwahLogo from '../components/UrwahLogo'
import './../pages/auth.css'

export default function GuestLayout() {
  return (
    <div className="auth-root">
      <div className="auth-split">
        <aside className="auth-brand-panel">
          <div className="auth-brand-logo">
            <UrwahLogo variant="mark" width={56} />
          </div>
          <div className="auth-brand-content">
            <h1 className="auth-brand-title">تشارك البيانات بدقة وأمان</h1>
            <p className="auth-brand-sub">منصة عروة تساعدك على تشارك بيانات فروعك مع منصات التكامل بأمان</p>
          </div>
          <div className="auth-brand-footer">© 2026 عروة. جميع الحقوق محفوظة.</div>
        </aside>
        <main className="auth-form-panel">
          <div className="auth-form-box">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
