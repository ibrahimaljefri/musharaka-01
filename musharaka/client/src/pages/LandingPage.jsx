import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, Building2, MessageSquare, TrendingUp } from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart2,
    title: 'إدارة المبيعات',
    desc: 'تتبع المبيعات اليومية والشهرية بدقة وسهولة',
  },
  {
    icon: Building2,
    title: 'إدارة الفروع',
    desc: 'إدارة متعددة الفروع من مكان واحد',
  },
  {
    icon: MessageSquare,
    title: 'بوت واتساب وتيليجرام',
    desc: 'إشعارات آلية فورية عبر قنوات التواصل',
  },
  {
    icon: TrendingUp,
    title: 'تقارير وإحصاءات',
    desc: 'تحليلات فورية وتقارير شاملة لدعم القرار',
  },
]

function FeatureCard({ icon: Icon, title, desc }) {
  const cardRef = useRef(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('lp-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      className="lp-feature-card"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(245,158,11,0.3)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: 0,
        transform: 'translateY(32px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'rgba(245,158,11,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(245,158,11,0.25)',
        }}
      >
        <Icon size={24} color="#F59E0B" />
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#fff',
          fontFamily: 'Tajawal, sans-serif',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: '0.9rem',
          color: 'rgba(253,230,138,0.7)',
          fontFamily: 'Tajawal, sans-serif',
          lineHeight: 1.7,
        }}
      >
        {desc}
      </p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', background: '#080E1A', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        .lp-feature-card.lp-visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .lp-cta-btn-primary:hover {
          background: #D97706 !important;
          box-shadow: 0 0 30px rgba(245,158,11,0.5) !important;
        }
        .lp-cta-btn-ghost:hover {
          background: rgba(245,158,11,0.1) !important;
          border-color: #F59E0B !important;
        }
        .lp-login-btn:hover {
          background: rgba(245,158,11,0.15) !important;
        }
        .lp-bounce {
          animation: bounceSlow 2s ease-in-out infinite;
        }
        .lp-hero-content {
          animation: heroFadeUp 0.8s ease-out both;
        }
        .lp-navbar {
          animation: slideDown 0.5s ease-out;
        }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        className="lp-navbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(8,14,26,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(245,158,11,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          height: '64px',
        }}
      >
        {/* Brand — right side in RTL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/urwah-logo.png" alt="عروة" style={{ height: '32px', objectFit: 'contain' }} />
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#F59E0B',
              letterSpacing: '-0.02em',
            }}
          >
            عروة
          </span>
        </div>

        {/* Login — left side in RTL */}
        <Link
          to="/login"
          className="lp-login-btn"
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(245,158,11,0.4)',
            color: '#FDE68A',
            fontSize: '0.9rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background 0.2s ease, border-color 0.2s ease',
            fontFamily: 'Tajawal, sans-serif',
          }}
        >
          تسجيل الدخول
        </Link>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          background: '#080E1A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
          padding: '80px 24px 120px',
        }}
      >
        {/* Ambient glow blobs */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(245,158,11,0.05) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* Hero content */}
        <div className="lp-hero-content" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', maxWidth: '720px' }}>
          <img
            src="/urwah-logo.png"
            alt="عروة"
            style={{
              maxWidth: '280px',
              width: '100%',
              filter: 'drop-shadow(0 0 30px rgba(245,158,11,0.5))',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: '#fff',
                fontFamily: 'Tajawal, sans-serif',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              نظام إدارة المبيعات
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                color: 'rgba(253,230,138,0.8)',
                fontFamily: 'Tajawal, sans-serif',
                fontWeight: 400,
              }}
            >
              إدارة متكاملة للمبيعات والفروع — بالعربية
            </p>
          </div>

          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '14px 40px',
              borderRadius: '10px',
              background: '#F59E0B',
              color: '#080E1A',
              fontSize: '1.05rem',
              fontWeight: 800,
              textDecoration: 'none',
              fontFamily: 'Tajawal, sans-serif',
              boxShadow: '0 0 20px rgba(245,158,11,0.4)',
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
              animation: 'goldPulse 3s ease-in-out infinite',
            }}
            className="lp-cta-btn-primary"
          >
            ابدأ الآن
          </Link>
        </div>

        {/* Scroll arrow */}
        <div
          className="lp-bounce"
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(245,158,11,0.5)',
            fontSize: '1.5rem',
            zIndex: 1,
          }}
        >
          ↓
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(180deg, #080E1A 0%, #0a1220 100%)',
          padding: '80px 24px',
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'Tajawal, sans-serif',
              }}
            >
              كل ما تحتاجه في مكان واحد
            </h2>
            <p
              style={{
                marginTop: '12px',
                color: 'rgba(253,230,138,0.6)',
                fontFamily: 'Tajawal, sans-serif',
                fontSize: '1rem',
              }}
            >
              أدوات متكاملة مصممة للسوق العربي
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #1a0a00 100%)',
          padding: '100px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 800,
              fontFamily: 'Tajawal, sans-serif',
              background: 'linear-gradient(90deg, #F59E0B 0%, #FDE68A 50%, #F59E0B 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmerGold 4s linear infinite',
            }}
          >
            انضم إلى عروة اليوم
          </h2>
          <p
            style={{
              margin: 0,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'Tajawal, sans-serif',
              fontSize: '1rem',
              lineHeight: 1.8,
            }}
          >
            ابدأ رحلتك نحو إدارة مبيعات احترافية وفعّالة
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to="/login"
              className="lp-cta-btn-primary"
              style={{
                padding: '14px 36px',
                borderRadius: '10px',
                background: '#F59E0B',
                color: '#080E1A',
                fontSize: '1rem',
                fontWeight: 800,
                textDecoration: 'none',
                fontFamily: 'Tajawal, sans-serif',
                boxShadow: '0 0 20px rgba(245,158,11,0.35)',
                transition: 'background 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              ابدأ مجاناً
            </Link>
            <Link
              to="/login"
              className="lp-cta-btn-ghost"
              style={{
                padding: '14px 36px',
                borderRadius: '10px',
                border: '1px solid rgba(245,158,11,0.4)',
                color: '#FDE68A',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: 'Tajawal, sans-serif',
                transition: 'background 0.2s ease, border-color 0.2s ease',
              }}
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: '#030810',
          padding: '32px 24px',
          borderTop: '1px solid rgba(245,158,11,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/urwah-logo.png" alt="عروة" style={{ height: '28px', objectFit: 'contain' }} />
            <span
              style={{
                color: 'rgba(253,230,138,0.5)',
                fontSize: '0.85rem',
                fontFamily: 'Tajawal, sans-serif',
              }}
            >
              © 2025 عروة — جميع الحقوق محفوظة
            </span>
          </div>

          <a
            href="/user-guide.html"
            style={{
              color: 'rgba(245,158,11,0.6)',
              fontSize: '0.85rem',
              textDecoration: 'none',
              fontFamily: 'Tajawal, sans-serif',
              transition: 'color 0.2s ease',
            }}
          >
            دليل المستخدم
          </a>
        </div>
      </footer>
    </div>
  )
}
