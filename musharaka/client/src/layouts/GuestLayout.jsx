import { Outlet } from 'react-router-dom'

export default function GuestLayout() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      dir="rtl"
      style={{
        background: '#080E1A',
        backgroundImage: [
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.15) 0%, transparent 60%)',
          'radial-gradient(ellipse 40% 40% at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)',
        ].join(', '),
      }}
    >
      {/* Ambient glow layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(245,158,11,0.06)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(139,92,246,0.05)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'rgba(245,158,11,0.03)' }}
        />
      </div>

      <div className="relative w-full max-w-md px-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <img src="/urwah-logo.png" alt="عروة" className="h-20 object-contain mb-1" />
          <div className="text-sm font-arabic" style={{ color: 'rgba(255,255,255,0.45)' }}>نظام إدارة المبيعات</div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
