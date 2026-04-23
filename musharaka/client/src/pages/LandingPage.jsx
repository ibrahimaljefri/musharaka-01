import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LogoMark from '../components/LogoMark'
import UrwahLogo from '../components/UrwahLogo'

const TOKENS = {
  gold: '#F59E0B',
  goldLight: '#FBBF24',
  goldDark: '#D97706',
  bg: '#080E1A',
  bg2: '#0A1220',
  glass: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.09)',
  goldGlass: 'rgba(245,158,11,0.12)',
  goldBorder: 'rgba(245,158,11,0.35)',
  text: '#F8FAFC',
  textSec: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  green: '#10B981',
  purple: '#8B5CF6',
}

const FEATURES = [
  {
    icon: '🏢',
    title: 'إدارة مبيعات متعددة الفروع',
    desc: 'تحكم كامل في مبيعات جميع فروعك من لوحة واحدة — بصلاحيات دقيقة لكل مستخدم.',
    tint: 'rgba(245,158,11,0.18)',
  },
  {
    icon: '🔗',
    title: 'تكامل كامل مع المنصات',
    desc: 'أرسل الفواتير إلى منصات الدفع بنقرة واحدة — متزامن، مؤرشف، وآمن.',
    tint: 'rgba(16,185,129,0.18)',
  },
  {
    icon: '💬',
    title: 'بوت واتساب و تيليجرام',
    desc: 'استلم وأرسل المبيعات عبر المحادثة — البوت يفهم اللغة العربية بطلاقة.',
    tint: 'rgba(139,92,246,0.18)',
  },
  {
    icon: '📊',
    title: 'استيراد Excel بضغطة',
    desc: 'ارفع ملفات Excel الجاهزة من أنظمة POS الخاصة بك — استيراد ذكي بدون أخطاء.',
    tint: 'rgba(59,130,246,0.18)',
  },
  {
    icon: '📈',
    title: 'تقارير ولوحة تحكم',
    desc: 'رسوم بيانية حية، تقارير يومية/شهرية، وتنبيهات لحظية لكل فرع.',
    tint: 'rgba(236,72,153,0.18)',
  },
  {
    icon: '👥',
    title: 'إدارة المستخدمين',
    desc: 'أنشئ حسابات لمشرفي الفروع والمحاسبين — كل صلاحية في مكانها.',
    tint: 'rgba(245,158,11,0.18)',
  },
]

const STATS = [
  { value: 500, suffix: '+', label: 'فرع نشط' },
  { value: 10000, suffix: '+', label: 'فاتورة شهرياً' },
  { value: 99.9, suffix: '%', label: 'وقت التشغيل', decimals: 1 },
  { value: 24, suffix: '/7', label: 'دعم عربي' },
]

const STEPS = [
  {
    num: '01',
    title: 'مشاركة مبيعات بكل سلاسة',
    desc: 'يدوياً، أو عبر استيراد Excel، أو مباشرة من البوت — المرونة الكاملة.',
    icon: '📝',
  },
  {
    num: '02',
    title: 'راجع الفواتير',
    desc: 'تحقق من كل فاتورة، عدّل إن احتجت، وأكد الأرقام قبل الإرسال.',
    icon: '✓',
  },
  {
    num: '03',
    title: 'أرسل الدفعة',
    desc: 'بنقرة واحدة تُرسل الدفعة كاملة إلى المنصة وتُؤرشف لديك.',
    icon: '🚀',
  },
]

const PRICING = [
  {
    name: 'أساسي',
    annual: 999,
    monthly: 83,
    branches: '3 فروع',
    users: '1 مستخدم',
    features: [
      'إدارة 3 فروع',
      'مستخدم واحد',
      'تكامل أساسي مع المنصات',
      'بوت واتساب/تيليجرام',
      'استيراد Excel',
      'تقارير شهرية',
      'دعم عبر البريد',
    ],
    cta: 'ابدأ الآن',
    highlight: false,
  },
  {
    name: 'متوسط',
    annual: 1999,
    monthly: 167,
    branches: '8 فروع',
    users: '1 مستخدم',
    features: [
      'إدارة 8 فروع',
      'مستخدم واحد',
      'تكامل كامل مع المنصات',
      'بوت متقدم مع الذكاء الاصطناعي',
      'استيراد Excel ذكي',
      'تقارير يومية + لوحة تحكم حية',
      'دعم ذو أولوية عبر واتساب',
      'تصدير PDF للفواتير',
    ],
    cta: 'الخطة الأكثر طلباً',
    highlight: true,
    badge: '⭐ الأكثر طلباً',
  },
  {
    name: 'متقدم',
    annual: 3999,
    monthly: 333,
    branches: '15 فرع',
    users: '1 مستخدم',
    features: [
      'إدارة 15 فرع',
      'مستخدم واحد',
      'جميع ميزات الخطة المتوسطة',
      'تحليلات AI للمبيعات',
      'تقارير مخصصة',
      'API خاص بالدمج',
      'مدير حساب مخصص',
      'دعم 24/7 هاتفي',
    ],
    cta: 'تواصل معنا',
    highlight: false,
  },
]

function useInView(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: options.threshold ?? 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [options.threshold])

  return [ref, inView]
}

function Counter({ target, suffix = '', decimals = 0, start }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start) return
    const duration = 1800
    const startTime = performance.now()
    let raf

    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, start])

  const display =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.floor(value).toLocaleString('en-US')

  return (
    <span className="lp-counter">
      {display}
      {suffix}
    </span>
  )
}

function LogoSeal({ size = 40 }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow halo */}
      <div style={{
        position: 'absolute',
        inset: -6,
        borderRadius: Math.round(size * 0.32),
        background: 'rgba(245,158,11,0.10)',
        border: '1px solid rgba(245,158,11,0.20)',
        boxShadow: '0 0 24px rgba(245,158,11,0.18)',
      }} />
      <LogoMark size={size} id={`seal-${size}`} />
    </div>
  )
}

function ContactModal({ open, onClose }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,8,16,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeUp .25s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg,#0F1626 0%, #0A1220 100%)',
          border: `1px solid ${TOKENS.goldBorder}`,
          borderRadius: 20,
          maxWidth: 440,
          width: '100%',
          padding: 32,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(245,158,11,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 22, color: TOKENS.gold, fontWeight: 800 }}>تواصل معنا</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: TOKENS.textSec,
              fontSize: 24,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <p style={{ color: TOKENS.textSec, fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
          فريق عروة جاهز للرد عليك خلال دقائق. اختر القناة التي تفضلها:
        </p>
        <a
          href="https://wa.me/966500000000"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 20px',
            borderRadius: 14,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.35)',
            color: TOKENS.text,
            textDecoration: 'none',
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 24 }}>💬</span>
          <div>
            <div>واتساب</div>
            <div style={{ fontSize: 13, color: TOKENS.textSec, fontWeight: 400 }}>+966 50 000 0000</div>
          </div>
        </a>
        <a
          href="mailto:info@urwah.sa"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 20px',
            borderRadius: 14,
            background: TOKENS.goldGlass,
            border: `1px solid ${TOKENS.goldBorder}`,
            color: TOKENS.text,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 24 }}>✉️</span>
          <div>
            <div>البريد الإلكتروني</div>
            <div style={{ fontSize: 13, color: TOKENS.textSec, fontWeight: 400 }}>info@urwah.sa</div>
          </div>
        </a>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false)
  const [statsRef, statsInView] = useInView({ threshold: 0.3 })

  useEffect(() => {
    const observers = []
    const revealEls = document.querySelectorAll('.lp-reveal')
    revealEls.forEach((el, idx) => {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add('lp-visible'), (idx % 6) * 100)
            obs.disconnect()
          }
        },
        { threshold: 0.12 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        background: TOKENS.bg,
        color: TOKENS.text,
        fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      <LandingStyles />

      {/* Announcement banner */}
      <div className="lp-announce">
        <div className="lp-announce-track">
          <span>🚀 عروة — نظام إدارة المبيعات الاحترافي &nbsp;|&nbsp; متاح الآن للمستأجرين في المملكة العربية السعودية &nbsp;•&nbsp;</span>
          <span>🚀 عروة — نظام إدارة المبيعات الاحترافي &nbsp;|&nbsp; متاح الآن للمستأجرين في المملكة العربية السعودية &nbsp;•&nbsp;</span>
          <span>🚀 عروة — نظام إدارة المبيعات الاحترافي &nbsp;|&nbsp; متاح الآن للمستأجرين في المملكة العربية السعودية &nbsp;•&nbsp;</span>
        </div>
      </div>

      {/* Navbar */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <span>عروة</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features">الميزات</a>
            <a href="#pricing">الأسعار</a>
            <a href="#how">كيف يعمل؟</a>
          </div>
          <div className="lp-nav-cta">
            <Link to="/login" className="lp-btn lp-btn-ghost">تسجيل الدخول</Link>
            <Link to="/register" className="lp-btn lp-btn-primary">ابدأ الآن</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-orb lp-orb-3" />
          <div className="lp-dotgrid" />
        </div>
        <div className="lp-hero-content">
          <div className="lp-hero-logo">
            {/* Liquid-glass card housing the full Urwah calligraphic mark */}
            <div style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 32px',
              borderRadius: 24,
              background: 'linear-gradient(135deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.02) 100%)',
              backdropFilter: 'blur(20px) saturate(130%)',
              WebkitBackdropFilter: 'blur(20px) saturate(130%)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 80px rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.22)',
            }}>
              {/* Gold rim top edge */}
              <div style={{
                position: 'absolute', top: 0, left: '12%', right: '12%', height: 1,
                background: 'linear-gradient(90deg,transparent,rgba(245,158,11,0.65),rgba(251,191,36,0.45),rgba(245,158,11,0.65),transparent)',
              }} />
              {/* Inner shadow */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 24,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
              }} />
              {/* Outer ambient halo */}
              <div style={{
                position: 'absolute', inset: -1, borderRadius: 25,
                boxShadow: '0 0 60px rgba(245,158,11,0.20), 0 0 120px rgba(245,158,11,0.08)',
                pointerEvents: 'none',
              }} />
              <UrwahLogo width={210} id="hero-ul" variant="full" glow />
            </div>
          </div>

          <div className="lp-hero-badge">
            <span className="lp-dot" /> جاهز للإطلاق في المملكة العربية السعودية
          </div>

          <h1 className="lp-hero-title">
            <span className="lp-gradient-gold">نظام إدارة مبيعات</span>
            <br />
            <span>الفروع الاحترافي</span>
          </h1>

          <p className="lp-hero-sub">
            ربط سلس بين فروعك والمنصات — إدارة المبيعات اليومية، التقارير، والإرسالات في مكان واحد.
          </p>

          <div className="lp-hero-ctas">
            <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">
              ابدأ تجربة مجانية
              <span className="lp-arrow">←</span>
            </Link>
            <a href="#how" className="lp-btn lp-btn-ghost lp-btn-lg">
              شاهد كيف يعمل ▶
            </a>
          </div>

          <div className="lp-hero-trust">
            <span>✓ دعم عربي كامل</span>
          </div>
        </div>

        <div className="lp-scroll-arrow">
          <span>↓</span>
        </div>
      </section>

      {/* Stats */}
      <section className="lp-stats" ref={statsRef}>
        <div className="lp-container">
          <div className="lp-stats-grid">
            {STATS.map((s) => (
              <div key={s.label} className="lp-stat">
                <div className="lp-stat-value">
                  <Counter target={s.value} suffix={s.suffix} decimals={s.decimals} start={statsInView} />
                </div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Preview */}
      <section className="lp-preview-section">
        <div className="lp-container">
          <div className="lp-section-head" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
            <div className="lp-eyebrow">معاينة المنصة</div>
            <h2 className="lp-section-title">لوحة تحكم احترافية<br /><span className="lp-gradient-gold">بتصميم عربي أصيل</span></h2>
            <p className="lp-section-sub">كل ما تحتاجه لإدارة مبيعات فروعك في مكان واحد — بيانات لحظية، تقارير فورية، وإرسال تلقائي للمنصات.</p>
          </div>

          {/* Browser chrome frame */}
          <div style={{
            maxWidth: 860, margin: '0 auto', position: 'relative',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.70), 0 0 120px rgba(245,158,11,0.08)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(245,158,11,0.06) 0%,transparent 70%)' }} />
            {/* Browser bar */}
            <div style={{ background: 'rgba(15,22,40,0.95)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#FF5F57','#FFBD2E','#28CA41'].map(c => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.08)' }}>
                apps.stepup2you.com/dashboard
              </div>
            </div>
            {/* Dashboard body */}
            <div style={{ background: '#080E1A', padding: 20 }} dir="rtl">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'inherit' }}>مشاركة — لوحة التحكم</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.30)', color: '#10b981' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  متصل بالمنصة
                </span>
              </div>
              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'إجمالي المبيعات', value: 'ر.س 125,450', color: '#34d399', bg: 'rgba(6,78,59,0.35)' },
                  { label: 'مبيعات الشهر',    value: 'ر.س 38,500',  color: '#f87171', bg: 'rgba(127,29,29,0.35)' },
                  { label: 'الفواتير المرسلة', value: '156',         color: '#c084fc', bg: 'rgba(88,28,135,0.35)' },
                  { label: 'أيام مفقودة',     value: '3 أيام',      color: '#2dd4bf', bg: 'rgba(19,78,74,0.35)' },
                ].map(k => (
                  <div key={k.label} style={{ borderRadius: 10, padding: '14px 16px', background: k.bg, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>{k.label}</div>
                    <div style={{ fontSize: 'clamp(16px,2vw,24px)', fontWeight: 900, color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>
              {/* Recent sales */}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginBottom: 10 }}>آخر المبيعات</div>
              {[
                { branch: 'فرع الرياض – يومي',  date: '2026-04-09', amount: 'ر.س 4,500' },
                { branch: 'فرع جدة – شهري',     date: '2026-04-08', amount: 'ر.س 31,200' },
                { branch: 'فرع الدمام – يومي',  date: '2026-04-08', amount: 'ر.س 2,800' },
                { branch: 'فرع مكة – فترة',     date: '2026-04-01', amount: 'ر.س 18,000' },
              ].map((r, i, arr) => (
                <div key={r.branch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.branch}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>{r.date}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FBBF24' }}>{r.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-eyebrow">الميزات</div>
            <h2 className="lp-section-title">
              كل ما تحتاجه <span className="lp-gradient-gold">لإدارة مبيعاتك</span>
            </h2>
            <p className="lp-section-sub">
              ست قدرات أساسية تم تصميمها من الصفر لسوق التجزئة السعودي، وللتكامل الكامل مع منظومات الدفع.
            </p>
          </div>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="lp-feature lp-reveal" style={{ '--delay': `${i * 80}ms` }}>
                <div className="lp-feature-icon" style={{ background: f.tint }}>
                  <span>{f.icon}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="lp-feature-shine" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="lp-section lp-section-alt" id="how">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-eyebrow">كيف يعمل</div>
            <h2 className="lp-section-title">
              من المبيعات الخام <span className="lp-gradient-gold">إلى الإرسال</span> في ثلاث خطوات
            </h2>
          </div>

          <div className="lp-steps">
            <div className="lp-steps-line" />
            {STEPS.map((s) => (
              <div key={s.num} className="lp-step lp-reveal">
                <div className="lp-step-num">{s.num}</div>
                <div className="lp-step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="lp-section lp-section-alt" id="pricing">
        <div className="lp-container">
          <div className="lp-section-head">
            <div className="lp-eyebrow">الأسعار</div>
            <h2 className="lp-section-title">
              اختر الخطة <span className="lp-gradient-gold">المناسبة لك</span>
            </h2>
            <p className="lp-section-sub">
              أسعار سنوية شفافة. فروع ومستخدمين إضافيين متاحين حسب الحاجة.
            </p>
          </div>

          <div className="lp-pricing-grid">
            {PRICING.map((p) => (
              <div key={p.name} className={`lp-price-card lp-reveal ${p.highlight ? 'lp-price-highlight' : ''}`}>
                {p.badge && <div className="lp-price-badge">{p.badge}</div>}
                <div className="lp-price-name">{p.name}</div>
                <div className="lp-price-amount">
                  <span className="lp-price-num">{p.annual.toLocaleString('en-US')}</span>
                  <span className="lp-price-cur">ر.س</span>
                </div>
                <div className="lp-price-period">سنوياً &nbsp;·&nbsp; ما يعادل {p.monthly} ر.س/شهر</div>
                <div className="lp-price-quota">
                  <span>🏢 {p.branches}</span>
                  <span>👤 {p.users}</span>
                </div>
                <ul className="lp-price-feats">
                  {p.features.map((feat) => (
                    <li key={feat}>
                      <span className="lp-check">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`lp-btn ${p.highlight ? 'lp-btn-primary' : 'lp-btn-ghost'} lp-btn-block`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="lp-extras">
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
              فروع ومستخدمين إضافيين متاحين —
            </span>
            <span className="lp-extra-val" style={{ fontSize: 14, marginRight: 6 }}>
              تواصل معنا للاستفسار
            </span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-cta">
            <div className="lp-cta-glow" />
            <h2>
              جاهز للبدء؟ <span className="lp-gradient-gold">انضم إلى عروة اليوم</span>
            </h2>
            <p>جرّب النظام مجاناً — بدون بطاقة ائتمانية، وبدون التزامات. ستشعر بالفرق من اليوم الأول.</p>
            <div className="lp-cta-btns">
              <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">
                ابدأ التجربة المجانية
              </Link>
              <button onClick={() => setContactOpen(true)} className="lp-btn lp-btn-ghost lp-btn-lg">
                تحدث مع المبيعات
              </button>
            </div>
            <div className="lp-cta-trust">
              <span>🔒 بيانات مشفّرة</span>
              <span>🇸🇦 مستضاف في المملكة</span>
              <span>⚡ إعداد خلال 5 دقائق</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div className="lp-nav-brand">
                <span>عروة</span>
              </div>
              <p>نظام إدارة المبيعات الاحترافي لإدارة فروعك وفواتيرك.</p>
            </div>
            <div>
              <h4>المنتج</h4>
              <a href="#features">الميزات</a>
              <a href="#pricing">الأسعار</a>
              <a href="#how">كيف يعمل؟</a>
            </div>
            <div>
              <h4>الشركة</h4>
              <button onClick={() => setContactOpen(true)} className="lp-footer-link-btn">تواصل معنا</button>
              <a href="#">عن عروة</a>
              <a href="#">الخصوصية</a>
            </div>
            <div>
              <h4>حسابي</h4>
              <Link to="/login">تسجيل الدخول</Link>
              <Link to="/register">إنشاء حساب</Link>
            </div>
          </div>
          <div className="lp-footer-bar">
            <span>© 2026 عروة — جميع الحقوق محفوظة</span>
            <span>صُنع بعناية في المملكة العربية السعودية 🇸🇦</span>
          </div>
        </div>
      </footer>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  )
}

function LandingStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap');

      .lp-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

      @keyframes floatOrb {
        0%,100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-30px) scale(1.05); }
      }
      @keyframes shimmerGold {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      @keyframes marqueeRTL {
        0% { transform: translateX(0); }
        100% { transform: translateX(50%); }
      }
      @keyframes bounceArrow {
        0%,100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(8px); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(32px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes counterPulse {
        0%,100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes pulseDot {
        0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
        50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
      }
      @keyframes msgIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Announce banner */
      .lp-announce {
        position: fixed; top: 0; left: 0; right: 0;
        height: 36px;
        background: linear-gradient(90deg, #D97706, #F59E0B, #FBBF24, #F59E0B, #D97706);
        background-size: 200% 100%;
        animation: shimmerGold 6s linear infinite;
        overflow: hidden;
        z-index: 1000;
        border-bottom: 1px solid rgba(0,0,0,0.2);
      }
      .lp-announce-track {
        display: flex; gap: 0;
        white-space: nowrap;
        animation: marqueeRTL 30s linear infinite;
        height: 36px;
        align-items: center;
        color: #0A1220;
        font-weight: 800;
        font-size: 13px;
      }
      .lp-announce-track span { padding: 0 28px; }

      /* Nav */
      .lp-nav {
        position: sticky; top: 36px; z-index: 900;
        background: rgba(8,14,26,0.72);
        backdrop-filter: blur(20px) saturate(150%);
        -webkit-backdrop-filter: blur(20px) saturate(150%);
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .lp-nav-inner {
        max-width: 1200px; margin: 0 auto;
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 24px;
        gap: 24px;
      }
      .lp-nav-brand {
        display: flex; align-items: center; gap: 12px;
        font-weight: 900; font-size: 22px;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
      }
      .lp-nav-links {
        display: flex; gap: 30px;
      }
      .lp-nav-links a {
        color: rgba(255,255,255,0.72);
        text-decoration: none;
        font-size: 15px; font-weight: 600;
        transition: color .2s;
        position: relative;
      }
      .lp-nav-links a::after {
        content: ''; position: absolute; bottom: -6px; right: 0;
        width: 0; height: 2px; background: #F59E0B;
        transition: width .25s;
      }
      .lp-nav-links a:hover { color: #FBBF24; }
      .lp-nav-links a:hover::after { width: 100%; }
      .lp-nav-cta { display: flex; gap: 10px; align-items: center; }

      @media (max-width: 900px) {
        .lp-nav-links { display: none; }
      }

      /* Buttons */
      .lp-btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 11px 22px; border-radius: 12px;
        font-weight: 700; font-size: 15px;
        text-decoration: none; cursor: pointer;
        border: 1px solid transparent;
        transition: transform .2s, box-shadow .25s, background .2s, border-color .2s;
        font-family: inherit;
      }
      .lp-btn-lg { padding: 15px 30px; font-size: 17px; border-radius: 14px; }
      .lp-btn-block { width: 100%; justify-content: center; }
      .lp-btn-primary {
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: #0A1220;
        box-shadow: 0 10px 30px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
      }
      .lp-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 40px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.3);
      }
      .lp-btn-ghost {
        background: rgba(255,255,255,0.04);
        color: #F8FAFC;
        border-color: rgba(245,158,11,0.35);
      }
      .lp-btn-ghost:hover {
        background: rgba(245,158,11,0.1);
        border-color: #F59E0B;
      }
      .lp-arrow { display: inline-block; transition: transform .25s; }
      .lp-btn-primary:hover .lp-arrow { transform: translateX(-4px); }

      /* Hero */
      .lp-hero {
        position: relative;
        min-height: calc(100vh - 36px);
        display: flex; align-items: center; justify-content: center;
        padding: 100px 24px 80px;
        overflow: hidden;
      }
      .lp-hero-bg {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at top, #0F1A2E 0%, #080E1A 60%);
      }
      .lp-orb {
        position: absolute; border-radius: 50%;
        filter: blur(90px); opacity: 0.55;
        animation: floatOrb 12s ease-in-out infinite;
      }
      .lp-orb-1 {
        width: 500px; height: 500px;
        background: radial-gradient(circle, #F59E0B 0%, transparent 70%);
        top: -120px; right: -100px;
      }
      .lp-orb-2 {
        width: 420px; height: 420px;
        background: radial-gradient(circle, #8B5CF6 0%, transparent 70%);
        bottom: -80px; left: -80px;
        animation-delay: -4s;
      }
      .lp-orb-3 {
        width: 320px; height: 320px;
        background: radial-gradient(circle, #FBBF24 0%, transparent 70%);
        top: 40%; left: 30%;
        animation-delay: -7s;
        opacity: 0.3;
      }
      .lp-dotgrid {
        position: absolute; inset: 0;
        background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
        background-size: 28px 28px;
        mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
        -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
      }
      .lp-hero-content {
        position: relative; z-index: 1;
        text-align: center; max-width: 880px;
        animation: fadeUp .8s ease both;
      }
      .lp-hero-logo { margin-bottom: 32px; }
      .lp-hero-badge {
        display: inline-flex; align-items: center; gap: 10px;
        padding: 8px 18px; border-radius: 999px;
        background: rgba(16,185,129,0.12);
        border: 1px solid rgba(16,185,129,0.35);
        color: #10B981;
        font-size: 13px; font-weight: 700;
        margin-bottom: 28px;
      }
      .lp-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #10B981;
        animation: pulseDot 2s ease-in-out infinite;
      }
      .lp-hero-title {
        font-size: clamp(40px, 7vw, 78px);
        font-weight: 900; line-height: 1.1;
        margin: 0 0 24px;
        letter-spacing: -0.02em;
      }
      .lp-gradient-gold {
        background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 40%, #D97706 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
      }
      .lp-hero-sub {
        font-size: clamp(16px, 2vw, 20px);
        color: rgba(255,255,255,0.7);
        max-width: 640px; margin: 0 auto 40px;
        line-height: 1.7;
      }
      .lp-hero-ctas {
        display: flex; gap: 14px; justify-content: center;
        flex-wrap: wrap; margin-bottom: 32px;
      }
      .lp-hero-trust {
        display: flex; gap: 22px; justify-content: center;
        flex-wrap: wrap;
        color: rgba(255,255,255,0.5);
        font-size: 14px;
      }
      .lp-scroll-arrow {
        position: absolute; bottom: 28px; left: 50%;
        transform: translateX(-50%);
        color: rgba(245,158,11,0.7); font-size: 24px;
        animation: bounceArrow 1.8s ease-in-out infinite;
      }

      /* Stats */
      .lp-stats {
        padding: 70px 0;
        background:
          linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.05) 50%, transparent 100%),
          #080E1A;
        border-top: 1px solid rgba(245,158,11,0.1);
        border-bottom: 1px solid rgba(245,158,11,0.1);
      }
      .lp-stats-grid {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
      }
      @media (max-width: 720px) { .lp-stats-grid { grid-template-columns: repeat(2, 1fr); } }
      .lp-stat { text-align: center; }
      .lp-stat-value {
        font-size: clamp(32px, 5vw, 52px);
        font-weight: 900;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
        margin-bottom: 4px;
        font-family: 'Cairo', sans-serif;
      }
      .lp-stat-label {
        color: rgba(255,255,255,0.55);
        font-size: 14px; font-weight: 600;
        letter-spacing: 0.02em;
      }

      /* Platform Preview */
      .lp-preview-section { padding: 100px 0 80px; position: relative; }

      /* Sections */
      .lp-section { padding: 110px 0; position: relative; }
      .lp-section-alt {
        background:
          linear-gradient(180deg, transparent 0%, #0A1220 50%, transparent 100%);
      }
      .lp-section-head { text-align: center; max-width: 720px; margin: 0 auto 64px; }
      .lp-eyebrow {
        display: inline-block;
        padding: 5px 14px; border-radius: 999px;
        background: rgba(245,158,11,0.1);
        border: 1px solid rgba(245,158,11,0.3);
        color: #FBBF24;
        font-size: 12px; font-weight: 800;
        letter-spacing: 0.08em;
        margin-bottom: 18px;
        text-transform: uppercase;
      }
      .lp-section-title {
        font-size: clamp(30px, 4.5vw, 50px);
        font-weight: 900; line-height: 1.2;
        margin: 0 0 16px;
        letter-spacing: -0.02em;
      }
      .lp-section-sub {
        color: rgba(255,255,255,0.6);
        font-size: 17px; line-height: 1.7;
        margin: 0;
      }

      /* Reveal */
      .lp-reveal {
        opacity: 0; transform: translateY(32px);
        transition: opacity .7s ease, transform .7s ease;
      }
      .lp-visible { opacity: 1; transform: translateY(0); }

      /* Features */
      .lp-features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }
      @media (max-width: 980px) { .lp-features-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 620px) { .lp-features-grid { grid-template-columns: 1fr; } }
      .lp-feature {
        position: relative;
        padding: 32px 28px;
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        overflow: hidden;
        transition: transform .35s, border-color .35s, box-shadow .35s;
      }
      .lp-feature:hover {
        transform: translateY(-4px);
        border-color: rgba(245,158,11,0.4);
        box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.15);
      }
      .lp-feature-icon {
        width: 56px; height: 56px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 28px;
        border: 1px solid rgba(255,255,255,0.1);
        margin-bottom: 22px;
      }
      .lp-feature h3 {
        font-size: 19px; font-weight: 800;
        margin: 0 0 10px; color: #F8FAFC;
      }
      .lp-feature p {
        color: rgba(255,255,255,0.58);
        font-size: 14.5px; line-height: 1.75; margin: 0;
      }
      .lp-feature-shine {
        position: absolute; top: -50%; left: -50%;
        width: 200%; height: 200%;
        background: linear-gradient(115deg, transparent 40%, rgba(245,158,11,0.08) 50%, transparent 60%);
        opacity: 0; transition: opacity .5s;
        pointer-events: none;
      }
      .lp-feature:hover .lp-feature-shine { opacity: 1; }

      /* Steps */
      .lp-steps {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 28px;
        position: relative;
      }
      .lp-steps-line {
        position: absolute; top: 36px;
        left: 15%; right: 15%; height: 2px;
        background: linear-gradient(90deg, transparent, #F59E0B 20%, #F59E0B 80%, transparent);
        opacity: 0.5;
      }
      @media (max-width: 820px) {
        .lp-steps { grid-template-columns: 1fr; }
        .lp-steps-line { display: none; }
      }
      .lp-step {
        text-align: center;
        padding: 24px 20px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        position: relative;
        backdrop-filter: blur(10px);
      }
      .lp-step-num {
        display: inline-block;
        font-family: 'Cairo', sans-serif;
        font-size: 13px; font-weight: 900;
        color: #0A1220;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        padding: 4px 12px; border-radius: 999px;
        margin-bottom: 14px;
      }
      .lp-step-icon {
        font-size: 40px; margin-bottom: 14px;
      }
      .lp-step h3 {
        font-size: 20px; font-weight: 800;
        margin: 0 0 10px;
      }
      .lp-step p {
        color: rgba(255,255,255,0.6);
        font-size: 14.5px; line-height: 1.7; margin: 0;
      }

      /* Bot */
      .lp-bot-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 48px; align-items: center;
      }
      @media (max-width: 900px) { .lp-bot-grid { grid-template-columns: 1fr; } }
      .lp-bot-badges {
        display: flex; flex-wrap: wrap; gap: 10px;
        margin-bottom: 28px;
      }
      .lp-badge-green, .lp-badge-blue, .lp-badge-gold {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 7px 14px; border-radius: 10px;
        font-size: 13px; font-weight: 700;
      }
      .lp-badge-green { background: rgba(16,185,129,0.14); color: #10B981; border: 1px solid rgba(16,185,129,0.3); }
      .lp-badge-blue { background: rgba(59,130,246,0.14); color: #60A5FA; border: 1px solid rgba(59,130,246,0.3); }
      .lp-badge-gold { background: rgba(245,158,11,0.14); color: #FBBF24; border: 1px solid rgba(245,158,11,0.3); }

      .lp-phone-frame {
        max-width: 340px; margin: 0 auto;
        background: #0F1A2E;
        border: 8px solid #1A2438;
        border-radius: 40px;
        padding: 20px 14px 18px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,158,11,0.2), 0 0 60px rgba(245,158,11,0.15);
        position: relative;
      }
      .lp-phone-notch {
        position: absolute; top: 8px; left: 50%;
        transform: translateX(-50%);
        width: 100px; height: 18px;
        background: #1A2438; border-radius: 0 0 14px 14px;
      }
      .lp-phone-header {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 6px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 14px;
      }
      .lp-phone-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; color: #0A1220; font-size: 18px;
      }
      .lp-phone-body {
        display: flex; flex-direction: column; gap: 10px;
        padding: 6px 4px;
        max-height: 360px; overflow: hidden;
      }
      .lp-msg {
        padding: 9px 13px; border-radius: 14px;
        font-size: 13.5px; line-height: 1.65;
        max-width: 85%;
        animation: msgIn .45s ease both;
      }
      .lp-msg-bot {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
        border-top-right-radius: 4px;
        align-self: flex-start;
      }
      .lp-msg-user {
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: #0A1220; font-weight: 700;
        border-top-left-radius: 4px;
        align-self: flex-end;
      }
      .lp-msg-success {
        background: rgba(16,185,129,0.12) !important;
        border: 1px solid rgba(16,185,129,0.4) !important;
        color: #10B981;
      }
      .lp-msg:nth-child(1) { animation-delay: 0s; }
      .lp-msg:nth-child(2) { animation-delay: .4s; }
      .lp-msg:nth-child(3) { animation-delay: .9s; }
      .lp-msg:nth-child(4) { animation-delay: 1.4s; }
      .lp-msg:nth-child(5) { animation-delay: 1.9s; }

      /* Pricing */
      .lp-pricing-grid {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 20px; align-items: stretch;
      }
      @media (max-width: 900px) { .lp-pricing-grid { grid-template-columns: 1fr; } }
      .lp-price-card {
        position: relative;
        padding: 36px 30px;
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.09);
        display: flex; flex-direction: column;
        transition: transform .3s, border-color .3s;
      }
      .lp-price-card:hover { transform: translateY(-4px); border-color: rgba(245,158,11,0.3); }
      .lp-price-highlight {
        border-color: #F59E0B;
        background:
          linear-gradient(180deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02));
        box-shadow: 0 20px 60px rgba(245,158,11,0.2), 0 0 0 1px rgba(245,158,11,0.4);
        transform: scale(1.03);
      }
      .lp-price-badge {
        position: absolute; top: -14px; left: 50%;
        transform: translateX(-50%);
        padding: 6px 16px; border-radius: 999px;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        color: #0A1220; font-size: 12.5px; font-weight: 900;
        white-space: nowrap;
        box-shadow: 0 8px 20px rgba(245,158,11,0.35);
      }
      .lp-price-name {
        font-size: 18px; font-weight: 800;
        color: rgba(255,255,255,0.85); margin-bottom: 10px;
      }
      .lp-price-amount {
        display: flex; align-items: baseline; gap: 6px;
        margin-bottom: 6px;
      }
      .lp-price-num {
        font-size: 48px; font-weight: 900;
        background: linear-gradient(135deg, #FBBF24, #D97706);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
        letter-spacing: -0.02em;
        font-family: 'Cairo', sans-serif;
      }
      .lp-price-cur { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.7); }
      .lp-price-period { color: rgba(255,255,255,0.5); font-size: 13.5px; margin-bottom: 20px; }
      .lp-price-quota {
        display: flex; gap: 14px;
        padding: 12px 0;
        border-top: 1px solid rgba(255,255,255,0.06);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 20px;
        font-size: 14px; color: rgba(255,255,255,0.75);
        font-weight: 600;
      }
      .lp-price-feats {
        list-style: none; padding: 0; margin: 0 0 24px;
        flex: 1;
      }
      .lp-price-feats li {
        display: flex; gap: 10px; align-items: flex-start;
        padding: 7px 0;
        color: rgba(255,255,255,0.72);
        font-size: 14.5px;
      }
      .lp-check {
        color: #10B981;
        font-weight: 900;
        flex-shrink: 0;
      }
      .lp-extras {
        display: flex; justify-content: center;
        align-items: center;
        margin-top: 40px;
        gap: 24px; flex-wrap: wrap;
      }
      .lp-extra {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 22px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
      }
      .lp-extra-label { color: rgba(255,255,255,0.55); font-size: 14px; }
      .lp-extra-val { color: #FBBF24; font-weight: 800; font-size: 15px; }
      .lp-extra-sep {
        width: 1px; height: 30px;
        background: rgba(255,255,255,0.1);
      }

      /* Testimonials */
      .lp-testi-grid {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
      }
      @media (max-width: 900px) { .lp-testi-grid { grid-template-columns: 1fr; } }
      .lp-testi {
        position: relative;
        padding: 32px 28px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        margin: 0;
      }
      .lp-testi-quote {
        font-size: 64px; line-height: 0.6;
        color: rgba(245,158,11,0.3);
        font-family: Georgia, serif;
        margin-bottom: 14px;
      }
      .lp-testi blockquote {
        margin: 0 0 22px;
        color: rgba(255,255,255,0.82);
        font-size: 15.5px; line-height: 1.85;
        font-weight: 500;
      }
      .lp-testi figcaption {
        display: flex; align-items: center; gap: 12px;
        padding-top: 18px;
        border-top: 1px solid rgba(255,255,255,0.06);
      }
      .lp-testi-avatar {
        width: 44px; height: 44px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; font-size: 18px; color: #0A1220;
      }
      .lp-testi-name { font-weight: 800; font-size: 15px; }
      .lp-testi-role { font-size: 12.5px; color: rgba(255,255,255,0.5); margin-top: 2px; }

      /* CTA */
      .lp-cta {
        position: relative;
        padding: 70px 40px;
        border-radius: 28px;
        background:
          radial-gradient(ellipse at top, rgba(245,158,11,0.12), transparent 60%),
          linear-gradient(180deg, #0F1A2E, #0A1220);
        border: 1px solid rgba(245,158,11,0.3);
        text-align: center;
        overflow: hidden;
      }
      .lp-cta::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, transparent 30%, rgba(245,158,11,0.1) 50%, transparent 70%);
        background-size: 200% 200%;
        animation: shimmerGold 8s linear infinite;
        pointer-events: none;
      }
      .lp-cta-glow {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 500px; height: 500px;
        background: radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 65%);
        filter: blur(80px);
        pointer-events: none;
      }
      .lp-cta h2 {
        position: relative; z-index: 1;
        font-size: clamp(28px, 4vw, 44px);
        font-weight: 900;
        margin: 0 0 16px;
      }
      .lp-cta p {
        position: relative; z-index: 1;
        color: rgba(255,255,255,0.7);
        font-size: 17px; line-height: 1.7;
        max-width: 560px; margin: 0 auto 30px;
      }
      .lp-cta-btns {
        position: relative; z-index: 1;
        display: flex; gap: 14px; justify-content: center;
        flex-wrap: wrap; margin-bottom: 26px;
      }
      .lp-cta-trust {
        position: relative; z-index: 1;
        display: flex; gap: 22px; justify-content: center;
        flex-wrap: wrap;
        color: rgba(255,255,255,0.5);
        font-size: 13.5px;
      }

      /* Footer */
      .lp-footer {
        padding: 60px 0 30px;
        border-top: 1px solid rgba(255,255,255,0.06);
        background: #050810;
      }
      .lp-footer-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 40px;
        padding-bottom: 40px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      @media (max-width: 820px) { .lp-footer-grid { grid-template-columns: 1fr 1fr; gap: 30px; } }
      .lp-footer-brand p {
        color: rgba(255,255,255,0.5);
        font-size: 14px; line-height: 1.7;
        margin: 16px 0 0;
        max-width: 320px;
      }
      .lp-footer h4 {
        color: #F8FAFC;
        font-size: 14px; font-weight: 800;
        margin: 0 0 14px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .lp-footer a, .lp-footer-link-btn {
        display: block;
        color: rgba(255,255,255,0.55);
        text-decoration: none;
        font-size: 14.5px; padding: 6px 0;
        transition: color .2s;
        background: none; border: none;
        font-family: inherit; cursor: pointer;
        text-align: right;
      }
      .lp-footer a:hover, .lp-footer-link-btn:hover { color: #FBBF24; }
      .lp-footer-bar {
        display: flex; justify-content: space-between;
        padding-top: 28px;
        color: rgba(255,255,255,0.4);
        font-size: 13px;
        flex-wrap: wrap; gap: 12px;
      }
    `}</style>
  )
}
