import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, PlusCircle, Upload, BarChart2,
  GitBranch, Send, FileText, LogOut, Menu, X,
  ChevronLeft, ChevronRight, Building2,
  ShieldCheck, AlertTriangle, Clock, Users, MessageCircle
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    label: 'لوحة التحكم',    icon: LayoutDashboard },
  { to: '/sales/create', label: 'إضافة مبيعات',    icon: PlusCircle },
  { to: '/sales/import', label: 'استيراد Excel',   icon: Upload },
  { to: '/reports',      label: 'التقارير',        icon: BarChart2 },
  { to: '/branches',     label: 'الفروع',          icon: GitBranch },
  { to: '/submit',       label: 'إرسال الفواتير',  icon: Send },
  { to: '/submissions',  label: 'تقرير الإرسالات', icon: FileText },
]

const adminNavItems = [
  { to: '/admin/tenants',         label: 'إدارة المستأجرين', icon: Building2 },
  { to: '/admin/users',           label: 'إدارة المستخدمين', icon: Users },
  { to: '/admin/bot-subscribers', label: 'مشتركو الروبوت',   icon: MessageCircle },
]

function SubscriptionBanner({ status }) {
  if (status === 'active' || !status) return null
  const msg = status === 'expired'
    ? 'انتهت صلاحية الاشتراك — يرجى التجديد للمتابعة'
    : 'تم تعليق الحساب — يرجى التواصل مع الدعم'
  return (
    <div className="bg-red-600 text-white text-xs font-arabic text-center py-1.5 flex items-center justify-center gap-2">
      <AlertTriangle size={13} />
      {msg}
    </div>
  )
}

export default function AppLayout() {
  const { user, signOut, init, loading, isSuperAdmin, tenantStatus, mustChangePassword,
          allowImport, allowReports } = useAuthStore()
  const navigate  = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true' } catch { return false }
  })

  useEffect(() => { init() }, [])
  useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', String(collapsed)) } catch {}
  }, [collapsed])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-yellow-700 font-arabic text-lg">جاري التحميل...</div>
    </div>
  )

  if (mustChangePassword) return <Navigate to="/change-password" replace />

  const sidebarW = collapsed ? 'w-16' : 'w-64'

  const NavSection = ({ items, label, collapsed: c }) => (
    <>
      {label && !c && (
        <div className="px-3 pt-4 pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-arabic">{label}</p>
        </div>
      )}
      {label && c && <div className="border-t border-gray-100 mt-2 pt-2" />}
      {items.map(({ to, label: lbl, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          title={c ? lbl : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors font-arabic ${
              isActive
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${c ? 'justify-center' : ''}`
          }
        >
          <Icon size={18} className="shrink-0" />
          {!c && <span className="truncate">{lbl}</span>}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="flex min-h-screen" dir="rtl">

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className={`hidden lg:flex flex-col bg-white border-l border-gray-200 fixed top-0 right-0 h-full z-30 transition-all duration-300 overflow-visible ${sidebarW}`}>

        {/* Floating toggle tab — protrudes from the left edge of the sidebar */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 z-40
                     w-5 h-12 bg-white border border-l-gray-200 border-y-gray-200 border-r-0
                     flex items-center justify-center text-gray-400
                     hover:text-yellow-700 hover:bg-yellow-50
                     rounded-l-xl shadow-md transition-colors"
          title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {collapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Logo */}
        <div className={`flex items-center border-b border-yellow-100 h-14 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">م</span>
            </div>
          ) : (
            <div>
              <div className="text-lg font-bold text-yellow-700 font-arabic leading-tight">مشاركة</div>
              <div className="text-xs text-gray-400 font-arabic">نظام إدارة المبيعات</div>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {/* Regular tenant nav — hidden for pure super-admin */}
          {!isSuperAdmin && (
            <NavSection
              items={navItems.filter(item => {
                if (item.to === '/sales/import') return allowImport
                if (item.to === '/reports')      return allowReports
                return true
              })}
              collapsed={collapsed}
            />
          )}

          {/* Admin nav — only for super-admin */}
          {isSuperAdmin && (
            <NavSection
              items={adminNavItems}
              label="الإدارة"
              collapsed={collapsed}
            />
          )}
        </nav>

        {/* Super admin badge */}
        {isSuperAdmin && !collapsed && (
          <div className="px-4 py-2 mx-2 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700 font-arabic">مشرف عام</span>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="px-2 py-3 border-t border-gray-100">
          <button onClick={handleSignOut} title={collapsed ? 'تسجيل الخروج' : undefined}
            className={`flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors font-arabic ${collapsed ? 'justify-center' : ''}`}>
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile sidebar ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" dir="rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white h-full mr-auto z-50 shadow-xl">
            <div className="flex items-center justify-between px-5 border-b border-yellow-100 h-14">
              <div>
                <div className="text-lg font-bold text-yellow-700 font-arabic">مشاركة</div>
                <div className="text-xs text-gray-400 font-arabic">نظام إدارة المبيعات</div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
              {!isSuperAdmin && navItems.filter(item => {
                if (item.to === '/sales/import') return allowImport
                if (item.to === '/reports')      return allowReports
                return true
              }).map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-arabic ${isActive ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'text-gray-600 hover:bg-gray-50'}`
                  }>
                  <Icon size={18} /><span>{label}</span>
                </NavLink>
              ))}
              {isSuperAdmin && adminNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-arabic ${isActive ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'text-gray-600 hover:bg-gray-50'}`
                  }>
                  <Icon size={18} /><span>{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="px-2 py-3 border-t border-gray-100">
              <button onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors font-arabic">
                <LogOut size={18} /><span>تسجيل الخروج</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'lg:mr-16' : 'lg:mr-64'}`}>
        <SubscriptionBanner status={tenantStatus} />

        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center justify-between">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="font-arabic text-sm text-gray-600">
            أهلاً،{' '}
            <span className="font-semibold text-yellow-700">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-gray-500 font-arabic hidden sm:inline">متصل بسينومي</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {!isSuperAdmin && tenantStatus === null ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center mb-5">
                <Clock size={32} className="text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 font-arabic mb-2">في انتظار تفعيل الحساب</h2>
              <p className="text-gray-500 font-arabic text-sm max-w-sm mb-6">
                تم تسجيل حسابك بنجاح. يرجى التواصل مع المشرف لربط حسابك بالنظام والحصول على صلاحية الوصول.
              </p>
              <button onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors font-arabic">
                <LogOut size={15} /> تسجيل الخروج
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
