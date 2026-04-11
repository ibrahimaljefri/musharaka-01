import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, PlusCircle, Upload, BarChart2,
  GitBranch, Send, FileText, LogOut, Menu, X,
  ChevronRight, Building2,
  ShieldCheck, AlertTriangle, Clock, Users, MessageCircle, LifeBuoy, BookOpen,
  Sun, Moon
} from 'lucide-react'
import LogoMark from '../components/LogoMark'

const navItems = [
  { to: '/dashboard',    label: 'لوحة التحكم',    icon: LayoutDashboard },
  { to: '/sales/create', label: 'إضافة مبيعات',    icon: PlusCircle },
  { to: '/sales/import', label: 'استيراد Excel',   icon: Upload },
  { to: '/reports',      label: 'التقارير',        icon: BarChart2 },
  { to: '/branches',     label: 'الفروع',          icon: GitBranch },
  { to: '/submit',          label: 'إرسال الفواتير',  icon: Send },
  { to: '/submissions',     label: 'تقرير الإرسالات', icon: FileText },
  { to: '/tickets/create',  label: 'رفع تذكرة دعم',   icon: LifeBuoy },
]

const adminNavItems = [
  { to: '/admin/tenants',         label: 'إدارة المستأجرين', icon: Building2 },
  { to: '/admin/users',           label: 'إدارة المستخدمين', icon: Users },
  { to: '/admin/bot-subscribers', label: 'مشتركو الروبوت',   icon: MessageCircle },
  { to: '/admin/tickets',         label: 'تذاكر الدعم',      icon: LifeBuoy },
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
  const { dark, toggle: toggleTheme } = useThemeStore()
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
                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-r-2 border-r-yellow-500 dark:border-r-yellow-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
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
      <aside className={`hidden md:flex flex-col bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 fixed top-0 right-0 h-full z-30 transition-all duration-300 overflow-hidden ${sidebarW}`}>

        {/* Logo — clicking it toggles collapse */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          className={`flex items-center border-b border-gray-100 dark:border-gray-800 h-14 w-full hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors group ${collapsed ? 'justify-center px-2' : 'px-5 gap-3'}`}
        >
          <LogoMark size={32} id="sidebar" />
          {!collapsed && (
            <div className="flex-1 text-right">
              <div className="text-base font-bold text-yellow-700 font-arabic leading-tight">مشاركة</div>
              <div className="text-xs text-gray-400 font-arabic">نظام إدارة المبيعات</div>
            </div>
          )}
          {!collapsed && (
            <ChevronRight size={14} className="text-gray-300 group-hover:text-yellow-500 transition-colors shrink-0" />
          )}
        </button>

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

        {/* User guide link */}
        <div className="px-2 mb-1">
          <a
            href="/user-guide.html"
            target="_blank"
            rel="noreferrer"
            data-tooltip={collapsed ? 'دليل المستخدم' : undefined}
            className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors font-arabic ${collapsed ? 'justify-center' : ''}`}
          >
            <BookOpen size={15} className="shrink-0" />
            {!collapsed && <span>دليل المستخدم</span>}
          </a>
        </div>

        {/* User profile footer */}
        <div className="px-2 py-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          {/* Super admin badge */}
          {isSuperAdmin && !collapsed && (
            <div className="px-3 py-1.5 mb-1 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700 font-arabic">مشرف عام</span>
            </div>
          )}

          {/* User avatar + name */}
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {(user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 font-arabic truncate leading-tight">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{user?.email}</p>
              </div>
            </div>
          )}

          <button onClick={handleSignOut} data-tooltip={collapsed ? 'تسجيل الخروج' : undefined}
            className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors font-arabic ${collapsed ? 'justify-center' : ''}`}>
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile sidebar ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex" dir="rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-full sm:w-72 bg-white dark:bg-gray-950 h-full mr-auto z-50 shadow-xl">
            <div className="flex items-center justify-between px-5 border-b border-yellow-100 dark:border-yellow-900/30 h-14">
              <div className="flex items-center gap-3">
                <LogoMark size={32} id="mobile" />
                <div>
                  <div className="text-base font-bold text-yellow-700 dark:text-yellow-500 font-arabic leading-tight">مشاركة</div>
                  <div className="text-xs text-gray-400 font-arabic">نظام إدارة المبيعات</div>
                </div>
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-arabic ${isActive ? 'bg-yellow-50 text-yellow-700 border-r-2 border-r-yellow-500' : 'text-gray-600 hover:bg-gray-50'}`
                  }>
                  <Icon size={18} /><span>{label}</span>
                </NavLink>
              ))}
              {isSuperAdmin && adminNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-arabic ${isActive ? 'bg-yellow-50 text-yellow-700 border-r-2 border-r-yellow-500' : 'text-gray-600 hover:bg-gray-50'}`
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
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'md:mr-16' : 'md:mr-64'}`}>
        <SubscriptionBanner status={tenantStatus} />

        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <button className="md:hidden text-gray-500 hover:text-gray-700 shrink-0" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>

          {/* Left side: greeting */}
          <div className="font-arabic text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
            أهلاً،{' '}
            <span className="font-semibold text-yellow-700">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم'}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: status + user guide + theme toggle */}
          <div className="flex items-center gap-3">
            <a
              href="/user-guide.html"
              target="_blank"
              rel="noreferrer"
              title="دليل المستخدم"
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-arabic border border-gray-200 dark:border-gray-700 hover:border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <BookOpen size={13} />
              <span>دليل المستخدم</span>
            </a>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
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
            <div className="page-enter">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
