import { useState } from 'react'
import { Link } from 'react-router-dom'
import UrwahLogo from '../components/UrwahLogo'
import { PRESALES, SUPPORT_EMAIL } from '../config/contact'
import './landing.css'

const PhoneIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)

const MailIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

export default function LandingPage() {
  const [isContactOpen, setIsContactOpen] = useState(false)

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
  }

  const openContact = () => setIsContactOpen(true)
  const closeContact = () => setIsContactOpen(false)

  return (
    <div className="landing-root">
      {/* Theme toggle */}
      <button className="theme-toggle" onClick={toggleTheme} aria-label="تبديل السمة">
        <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      </button>

      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="nav-brand">
            <UrwahLogo variant="mark" width={32} />
          </Link>
          <div className="nav-links">
            <a href="#features" className="nav-link">الميزات</a>
            <a href="#how" className="nav-link">كيف يعمل؟</a>
            <button type="button" className="nav-link" onClick={openContact}>تواصل معنا</button>
          </div>
          <div className="nav-cta">
            <Link to="/login" className="btn btn-ghost btn-sm">دخول</Link>
            <Link to="/register" className="btn btn-primary btn-sm">ابدأ الآن</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        {/* Doodles */}
        <svg className="doodle doodle-bob" style={{ top: '80px', insetInlineStart: '6%', width: '56px', height: '56px' }} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M32 6v14M32 44v14M6 32h14M44 32h14M14 14l10 10M40 40l10 10M14 50l10-10M40 24l10-10"/>
        </svg>
        <svg className="doodle doodle-spin" style={{ top: '120px', insetInlineEnd: '8%', width: '48px', height: '48px' }} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M32 8l5 13 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1z"/>
        </svg>
        <svg className="doodle" style={{ top: '280px', insetInlineStart: '4%', width: '70px', height: '50px' }} viewBox="0 0 80 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 50L22 30L36 38L52 18L74 12"/>
          <circle cx="22" cy="30" r="3" fill="currentColor"/>
          <circle cx="52" cy="18" r="3" fill="currentColor"/>
          <circle cx="74" cy="12" r="3" fill="currentColor"/>
        </svg>
        <svg className="doodle doodle-bob" style={{ top: '320px', insetInlineEnd: '5%', width: '44px', height: '44px' }} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 36c0-12 8-22 20-22s20 10 20 22"/>
          <path d="M40 28l6 8-10 4"/>
        </svg>
        <svg className="doodle" style={{ top: '460px', insetInlineStart: '10%', width: '36px', height: '36px' }} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="6" r="2.5"/><circle cx="20" cy="10" r="2"/>
          <circle cx="12" cy="20" r="2"/><circle cx="26" cy="22" r="2.5"/>
          <path d="M6 6L20 10L12 20L26 22" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5"/>
        </svg>
        <svg className="doodle doodle-spin" style={{ top: '520px', insetInlineEnd: '12%', width: '38px', height: '38px' }} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="16" cy="16" r="13"/>
          <path d="M16 9v14M9 16h14"/>
        </svg>

        <div className="hero-content">
          <span className="eyebrow">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
            تشارك البيانات بدقة امنة
          </span>
          <h1>تشارك البيانات بدقة امنة</h1>
          <p className="lede">
            منصة عروة تمكّن وتسهل تشارك البيانات بدقة امنة
            مع منصات التكامل أتمتة كاملة، تقارير فورية، واجهة عربية .
          </p>
          <div className="hero-ctas">
            <Link to="/register" className="btn btn-primary">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              ابدأ تجربة مجانية
            </Link>
            <button type="button" className="btn btn-ghost" onClick={openContact}>
              تواصل معنا
            </button>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="hero-preview">
          <div className="hero-preview-bar">
            <div className="hero-preview-dots"><span></span><span></span><span></span></div>
          </div>
          <div className="hero-preview-body">
            <aside className="hp-sidebar">
              <div className="brand-row">
                <UrwahLogo variant="full" width={140} />
              </div>
              <div className="hp-nav-item active">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                لوحة التحكم
              </div>
              <div className="hp-nav-item">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M5 9l7-7 7 7"/></svg>
                المبيعات
              </div>
              <div className="hp-nav-item">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V7l9-4 9 4v14M9 21V12h6v9"/></svg>
                الفروع
              </div>
              <div className="hp-nav-item">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                التقارير
              </div>
              <div className="hp-nav-item">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11H5a2 2 0 00-2 2v7h18v-7a2 2 0 00-2-2h-4M9 11V7a3 3 0 116 0v4M9 11h6"/></svg>
                الإرسال
              </div>
              <div className="hp-nav-item">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/></svg>
                المستخدمين
              </div>
            </aside>

            <div className="hp-section">
              <div className="hero-kpis">
                <div className="hero-kpi">
                  <div className="label">إجمالي المبيعات</div>
                  <div className="value">٢,١٨٤,٥٠٠</div>
                  <div className="trend">+12.4% ↑</div>
                </div>
                <div className="hero-kpi">
                  <div className="label">هذا الشهر</div>
                  <div className="value">٥١٢,٣٠٠</div>
                  <div className="trend">+3.8% ↑</div>
                </div>
                <div className="hero-kpi">
                  <div className="label">بيانات مرسلة</div>
                  <div className="value">١٨٢</div>
                  <div className="trend" style={{ color: 'var(--text-muted)' }}>هذا الشهر</div>
                </div>
                <div className="hero-kpi">
                  <div className="label">معلقة</div>
                  <div className="value">١٤</div>
                  <div className="trend" style={{ color: 'var(--warning)' }}>بانتظار الإرسال</div>
                </div>
              </div>

              <div className="hero-chart">
                <svg viewBox="0 0 600 140" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B8860B" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#B8860B" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M 0 100 Q 50 80, 100 70 T 200 60 T 300 55 T 400 35 T 500 45 T 600 25 L 600 140 L 0 140 Z" fill="url(#chartFill)"/>
                  <path d="M 0 100 Q 50 80, 100 70 T 200 60 T 300 55 T 400 35 T 500 45 T 600 25" fill="none" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="600" cy="25" r="4" fill="#B8860B"/>
                  <circle cx="500" cy="45" r="3" fill="#B8860B" opacity="0.5"/>
                </svg>
              </div>

              <div className="hp-section-title" style={{ marginTop: '16px' }}>
                آخر المبيعات
                <span className="pill">٥ جديدة</span>
              </div>
              <table className="hp-table">
                <thead><tr><th>الفرع</th><th>البيان</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                <tbody>
                  <tr><td>الرياض — مول العرب</td><td>INV-342</td><td>٥,٨٤٠</td><td><span className="badge hp-badge-ok">مُرسل</span></td></tr>
                  <tr><td>جدة — النخيل</td><td>INV-341</td><td>٣,٢٠٠</td><td><span className="badge hp-badge-ok">مُرسل</span></td></tr>
                  <tr><td>الدمام — الظهران</td><td>INV-340</td><td>٧,١٢٠</td><td><span className="badge hp-badge-pending">معلّق</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="features" id="features" style={{ position: 'relative' }}>
        <svg className="doodle" style={{ top: '40px', insetInlineStart: '3%', width: '50px', height: '50px' }} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="24" cy="24" r="18"/>
          <path d="M16 24l6 6 12-12"/>
        </svg>
        <svg className="doodle doodle-bob" style={{ bottom: '60px', insetInlineEnd: '4%', width: '60px', height: '60px' }} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="32" cy="32" r="24"/>
          <circle cx="32" cy="32" r="14"/>
          <circle cx="32" cy="32" r="5" fill="currentColor"/>
        </svg>
        <svg className="doodle doodle-spin" style={{ top: '50%', insetInlineEnd: '2%', width: '32px', height: '32px' }} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M16 2l3 11h11l-9 7 3 11-8-7-8 7 3-11-9-7h11z"/>
        </svg>

        <div className="features-header">
          <h2>كل ما تحتاجه لإدارة مبيعات</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div className="feature-text">
              <h3>تكامل كامل مع المنصات</h3>
              <p>إرسال تلقائي للبيانات — متزامن ومؤرشف وآمن</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M9 13l2 2 4-4"/>
              </svg>
            </div>
            <div className="feature-text">
              <h3>استيراد Excel</h3>
              <p>نموذج معبّأ بأيام الشهر، استيراد ذكي بدون أخطاء</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="M7 16l4-6 4 4 5-7"/>
              </svg>
            </div>
            <div className="feature-text">
              <h3>تقارير ولوحة تحكم حيّة</h3>
              <p>مؤشرات أداء ومقارنة الفروع وتصدير CSV</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div className="feature-text">
              <h3>صلاحيات الفروع</h3>
              <p>كل مستخدم يرى الفروع المخصصة له فقط</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how" id="how" style={{ position: 'relative' }}>
        <svg className="doodle doodle-bob" style={{ top: '50px', insetInlineEnd: '5%', width: '44px', height: '44px' }} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M24 6a12 12 0 00-7 21v5h14v-5a12 12 0 00-7-21z"/>
          <path d="M19 38h10M21 42h6"/>
        </svg>
        <svg className="doodle" style={{ bottom: '80px', insetInlineStart: '4%', width: '52px', height: '52px' }} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 36c8-14 22-22 36-24"/>
          <path d="M36 18l6-6-2 8"/>
        </svg>
        <div className="how-header">
          <h2>كيف يعمل؟</h2>
          <p style={{ color: 'var(--text-sec)', maxWidth: '600px', margin: '0 auto' }}>ثلاث خطوات بسيطة من تسجيل المبيعات إلى إرسال الدفعة</p>
        </div>
        <div className="how-stage">
          <div className="how-steps">
            <div className="how-step">
              <div className="num">01</div>
              <h3>شارك البيانات بسلاسة</h3>
              <p>يدوياً أو عبر استيراد Excel  المرونة الكاملة لأسلوبك المفضل</p>
            </div>
            <div className="how-step">
              <div className="num">02</div>
              <h3>راجع البيانات</h3>
              <p>تحقق من كل بيان، عدّل إن احتجت، وأكّد الأرقام قبل الإرسال النهائي</p>
            </div>
            <div className="how-step">
              <div className="num">03</div>
              <h3>شارك البيانات بكل سهولة و امان</h3>
              <p>تُرسل الدفعة كاملة إلى منصة التكامل وتُؤرشف لديك بنسخة قابلة للتدقيق</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="brand">
            <UrwahLogo variant="mark" width={28} />
          </div>
          <div className="links">
            <a href="#features">الميزات</a>
            <button type="button" onClick={openContact}>تواصل معنا</button>
            <Link to="/faq">الأسئلة الشائعة</Link>
          </div>
          <div className="copy">© 2026 عروة. جميع الحقوق محفوظة.</div>
        </div>
      </footer>

      {/* Contact modal */}
      {isContactOpen && (
        <div
          className="modal-overlay open"
          onClick={(e) => { if (e.target === e.currentTarget) closeContact() }}
        >
          <div className="modal">
            <button type="button" className="close-btn" onClick={closeContact} aria-label="إغلاق">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <h3>تواصل مع فريق المبيعات الآن</h3>
            <p>اتصل بنا مباشرة أو راسلنا عبر البريد الإلكتروني</p>
            <div className="actions">
              {PRESALES.map((p, i) => (
                <a key={i} href={`tel:${p.number.replace(/\s/g, '')}`} className="btn btn-primary">
                  <PhoneIcon /> الخط {i + 1} — {p.number}
                </a>
              ))}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-ghost">
                <MailIcon /> {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
