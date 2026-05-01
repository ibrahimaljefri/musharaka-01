import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import UrwahLogo from '../components/UrwahLogo'
import {
  LayoutDashboard, PlusCircle, Upload, BarChart2, GitBranch, Send, FileText,
  LifeBuoy, HelpCircle, Building2, Users, MessageCircle,
  Menu, ChevronRight, Moon, Sun, LogOut, ShieldCheck, Clock, AlertTriangle, BookOpen,
  KeyRound,
} from 'lucide-react'
import './app-shell.css'

const tenantNav = [
  { to: '/dashboard',      label: 'لوحة التحكم',     icon: LayoutDashboard },
  { to: '/sales/create',   label: 'إضافة مبيعات',     icon: PlusCircle },
  { to: '/sales/import',   label: 'استيراد Excel',    icon: Upload, flag: 'allowImport' },
  { to: '/reports',        label: 'التقارير',         icon: BarChart2, flag: 'allowReports' },
  { to: '/branches',       label: 'الفروع',           icon: GitBranch },
  { to: '/submit',         label: 'إرسال الفواتير',    icon: Send },
  { to: '/submissions',    label: 'تقرير الإرسالات',   icon: FileText },
  { to: '/users/scopes',   label: 'إدارة الصلاحيات',  icon: KeyRound, requireScope: 'multiUserAdmin' },
  { to: '/tickets/create', label: 'رفع تذكرة دعم',    icon: LifeBuoy },
  { to: '/faq',            label: 'الأسئلة الشائعة',   icon: HelpCircle },
]

const adminNav = [
  { to: '/admin/dashboard',       label: 'لوحة المشرف',       icon: LayoutDashboard },
  { to: '/admin/tenants',         label: 'إدارة المستأجرين',  icon: Building2 },
  { to: '/admin/users',           label: 'إدارة المستخدمين',  icon: Users },
  { to: '/admin/bot-subscribers', label: 'مشتركو الروبوت',    icon: MessageCircle },
  { to: '/admin/tickets',         label: 'تذاكر الدعم',       icon: LifeBuoy },
]

function SubscriptionBanner({ status }) {
  if (status === 'active' || !status) return null
  const msg = status === 'expired'
    ? 'انتهت صلاحية الاشتراك — يرجى التجديد للمتابعة'
    : 'تم تعليق الحساب — يرجى التواصل مع الدعم'
  return (
    <div className="subscription-banner">
      <AlertTriangle size={13} />
      <span>{msg}</span>
    </div>
  )
}

export default function AppLayout() {
  const {
    session, user, signOut, init, loading, isSuperAdmin,
    tenantStatus, mustChangePassword, allowImport, allowReports,
    role, userCount,
  } = useAuthStore()
  const { dark, toggle: toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { init() }, [])
  useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', String(collapsed)) } catch {}
  }, [collapsed])

  // Keep-alive ping — prevents cPanel Node.js from going cold between interactions
  useEffect(() => {
    const ping = () => fetch('/api/health').catch(() => {})
    const id = setInterval(ping, 90_000)
    return () => clearInterval(id)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#FAFAF9' }}>
        <div style={{ color: '#B8860B', fontFamily: 'Tajawal, sans-serif', fontSize: 18 }}>
          جاري التحميل...
        </div>
      </div>
    )
  }

  if (mustChangePassword) return <Navigate to="/change-password" replace />

  const flags = { allowImport, allowReports }
  const scopes = {
    // Phase C visibility rule: only show "إدارة الصلاحيات" to managers
    // of multi-user tenants. Single-user tenants don't need it.
    multiUserAdmin: role === 'admin' && (userCount ?? 0) > 1,
  }
  const visibleTenantNav = tenantNav.filter(item => {
    if (item.flag         && !flags[item.flag])         return false
    if (item.requireScope && !scopes[item.requireScope]) return false
    return true
  })
  const navItems = isSuperAdmin ? adminNav : visibleTenantNav

  const activeItem = navItems.find(n => location.pathname.startsWith(n.to))
  const pageTitle = activeItem?.label || (isSuperAdmin ? 'لوحة المشرف' : 'لوحة التحكم')

  const initial = (user?.full_name || user?.email || 'U')[0].toUpperCase()
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'مستخدم'

  const showPending = !isSuperAdmin && tenantStatus === null

  return (
    <div className={`app-root ${dark ? 'dark' : ''}`}>
      <div className={`app-shell${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        <aside className="app-sidebar" data-testid="sidebar">
          <div className="brand">
            <UrwahLogo variant="mark" width={30} id="sidebar-brand" />
          </div>

          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-tip={item.label}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `side-item${isActive ? ' active' : ''}`}
              >
                <Icon size={18} />
                <span className="label">{item.label}</span>
              </NavLink>
            )
          })}

          {!isSuperAdmin && (
            <a
              href="/user-guide.html"
              target="_blank"
              rel="noreferrer"
              className="side-item"
              data-tip="دليل المستخدم"
            >
              <BookOpen size={18} />
              <span className="label">دليل المستخدم</span>
            </a>
          )}

          {isSuperAdmin && !collapsed && (
            <div style={{
              marginTop: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--brand-soft)', color: 'var(--brand-ink)',
              borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 600,
            }}>
              <ShieldCheck size={13} />
              <span>مشرف عام</span>
            </div>
          )}

          <button
            className="collapse-toggle"
            onClick={() => setCollapsed(c => !c)}
            type="button"
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            <ChevronRight size={14} />
          </button>
        </aside>

        <div className="app-main">
          {tenantStatus && tenantStatus !== 'active' && (
            <SubscriptionBanner status={tenantStatus} />
          )}

          <header className="app-topbar">
            <button
              className="hamburger"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="القائمة"
              type="button"
              data-testid="hamburger"
            >
              <Menu size={18} />
            </button>

            <div className="crumbs">
              <span>{pageTitle}</span>
            </div>

            <div className="topbar-actions">
              <button
                className="theme-btn"
                onClick={toggleTheme}
                aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
                type="button"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <div className="user-chip">
                <span className="avatar">{initial}</span>
                <span>{displayName}</span>
              </div>

              <button
                className="signout-btn"
                onClick={handleSignOut}
                aria-label="تسجيل الخروج"
                type="button"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          <main className="app-content">
            {showPending ? (
              <div style={{
                minHeight: '60vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--brand-soft)', border: '2px solid var(--brand)',
                  display: 'grid', placeItems: 'center', marginBottom: 20,
                }}>
                  <Clock size={32} style={{ color: 'var(--brand)' }} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>في انتظار تفعيل الحساب</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 360, marginBottom: 24 }}>
                  تم تسجيل حسابك بنجاح. يرجى التواصل مع المشرف لربط حسابك بالنظام والحصول على صلاحية الوصول.
                </p>
                <button
                  onClick={handleSignOut}
                  type="button"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 'var(--r-md)',
                    fontSize: 14, fontWeight: 500, color: 'var(--error)',
                    border: '1px solid var(--error)', background: 'transparent', cursor: 'pointer',
                  }}
                >
                  <LogOut size={15} /> تسجيل الخروج
                </button>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
