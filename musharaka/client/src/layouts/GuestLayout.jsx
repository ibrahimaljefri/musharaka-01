import { Outlet } from 'react-router-dom'
import UrwahLogo from '../components/UrwahLogo'

export default function GuestLayout() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      dir="rtl"
      style={{
        background: '#080E1A',
        backgroundImage: [
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.18) 0%, transparent 60%)',
          'radial-gradient(ellipse 40% 40% at 80% 80%, rgba(139,92,246,0.10) 0%, transparent 50%)',
          'radial-gradient(ellipse 50% 30% at 20% 20%, rgba(245,158,11,0.06) 0%, transparent 50%)',
        ].join(', '),
      }}
    >
      {/* Ambient glow layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'rgba(245,158,11,0.08)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'rgba(139,92,246,0.06)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-3xl"
          style={{ background: 'rgba(245,158,11,0.04)' }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(245,158,11,0.07) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative w-full max-w-md px-4">
        {/* Brand header — full calligraphic logo on glass card */}
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer ambient halo */}
            <div style={{
              position: 'absolute',
              inset: -12,
              borderRadius: 28,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.18)',
              boxShadow: '0 0 50px rgba(245,158,11,0.18), 0 0 100px rgba(245,158,11,0.08)',
            }} />
            {/* Glass card */}
            <div style={{
              position: 'relative',
              padding: '16px 28px',
              borderRadius: 20,
              background: 'rgba(10,18,32,0.60)',
              backdropFilter: 'blur(20px) saturate(130%)',
              WebkitBackdropFilter: 'blur(20px) saturate(130%)',
              border: '1px solid rgba(245,158,11,0.20)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.50)',
            }}>
              {/* Gold rim top edge */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                background: 'linear-gradient(90deg,transparent,rgba(245,158,11,0.60),rgba(251,191,36,0.40),rgba(245,158,11,0.60),transparent)',
              }} />
              <UrwahLogo width={160} id="guest-full" variant="full" glow />
            </div>
          </div>

          {/* Subtitle only — logo already contains the brand name */}
          <div
            className="text-sm font-arabic mt-1"
            style={{ color: 'rgba(255,255,255,0.40)', letterSpacing: '0.03em' }}
          >
            نظام إدارة المبيعات الاحترافي
          </div>
        </div>

        {/* Card — liquid glass */}
        <div
          style={{
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
          }}
        >
          {/* Glass layers */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              borderRadius: 24,
            }}
          />
          {/* Gold rim top edge */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.60), rgba(251,191,36,0.40), rgba(245,158,11,0.60), transparent)',
            }}
          />
          {/* Inner shadow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.20)',
            }}
          />
          {/* Border */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24,
              border: '1px solid rgba(245,158,11,0.20)',
              pointerEvents: 'none',
            }}
          />
          {/* Outer glow */}
          <div
            style={{
              position: 'absolute',
              inset: -1,
              borderRadius: 25,
              boxShadow: '0 8px 40px rgba(0,0,0,0.50), 0 0 60px rgba(245,158,11,0.08)',
              pointerEvents: 'none',
            }}
          />
          {/* Card content */}
          <div style={{ position: 'relative', zIndex: 1, padding: '32px 32px 28px' }}>
            <Outlet />
          </div>
        </div>

        {/* Footer note */}
        <p
          className="text-center text-xs font-arabic mt-6"
          style={{ color: 'rgba(255,255,255,0.22)' }}
        >
          © 2026 عروة — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
