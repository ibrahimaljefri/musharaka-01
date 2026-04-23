import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout from './layouts/AppLayout'
import GuestLayout from './layouts/GuestLayout'
import ToastProvider from './components/ToastProvider'

// Public pages
const LandingPage      = lazy(() => import('./pages/LandingPage'))
const Login            = lazy(() => import('./pages/Login'))
const Register         = lazy(() => import('./pages/Register'))
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword'))
const ChangePassword   = lazy(() => import('./pages/ChangePassword'))

// Protected pages
const Dashboard        = lazy(() => import('./pages/Dashboard'))
const SaleCreate       = lazy(() => import('./pages/SaleCreate'))
const SaleImport       = lazy(() => import('./pages/SaleImport'))
const Reports          = lazy(() => import('./pages/Reports'))
const Branches         = lazy(() => import('./pages/Branches'))
const BranchCreate     = lazy(() => import('./pages/BranchCreate'))
const BranchEdit       = lazy(() => import('./pages/BranchEdit'))
const Submit           = lazy(() => import('./pages/Submit'))
const Submissions      = lazy(() => import('./pages/Submissions'))
const TicketCreate     = lazy(() => import('./pages/TicketCreate'))
const TicketSuccess    = lazy(() => import('./pages/TicketSuccess'))
const FaqPage          = lazy(() => import('./pages/FaqPage'))

// Admin pages
const Tenants           = lazy(() => import('./pages/admin/Tenants'))
const TenantForm        = lazy(() => import('./pages/admin/TenantForm'))
const ApiKeys           = lazy(() => import('./pages/admin/ApiKeys'))
const AdminUsers        = lazy(() => import('./pages/admin/Users'))
const BotSubscribers    = lazy(() => import('./pages/admin/BotSubscribers'))
const BotSubscriberForm = lazy(() => import('./pages/admin/BotSubscriberForm'))
const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminTickets      = lazy(() => import('./pages/admin/Tickets'))
const AdminTicketDetail = lazy(() => import('./pages/admin/TicketDetail'))

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
    <div className="text-yellow-500 font-arabic text-sm animate-pulse">جاري التحميل...</div>
  </div>
)

function ProtectedRoute({ children }) {
  const session = useAuthStore(s => s.session)
  const loading = useAuthStore(s => s.loading)
  if (loading) return <PageLoader />
  if (!session) {
    // Synchronous redirect — updates URL before React Router's <Navigate>
    // would, so typing /dashboard while unauthenticated moves to /login
    // immediately instead of flashing the protected layout.
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.replace('/login')
      return null
    }
    return <Navigate to="/login" replace />
  }
  return children
}

function GuestRoute({ children }) {
  const session = useAuthStore(s => s.session)
  if (session) return <Navigate to="/dashboard" replace />
  return children
}

function FeatureRoute({ flag, children }) {
  const allowed      = useAuthStore(s => s[flag])
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin)
  if (isSuperAdmin || allowed) return children
  return <Navigate to="/dashboard" replace />
}

function AdminRoute({ children }) {
  const session      = useAuthStore(s => s.session)
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin)
  const loading      = useAuthStore(s => s.loading)
  if (loading) return <PageLoader />
  if (!session) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.replace('/login')
      return null
    }
    return <Navigate to="/login" replace />
  }
  if (!isSuperAdmin) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
      window.location.replace('/dashboard')
      return null
    }
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function SuperAdminDashboardRoute() {
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin)
  if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />
  return <Dashboard />
}

export default function App() {
  const loading = useAuthStore(s => s.loading)
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Tajawal,sans-serif', color:'#B8860B', fontSize:'1.2rem' }}>
      جاري التحميل…
    </div>
  )

  return (
    <>
      <ToastProvider />
    <Suspense fallback={<PageLoader />}>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Guest routes */}
          <Route element={<GuestLayout />}>
            <Route path="/login"            element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register"         element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/forgot-password"  element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          </Route>

          {/* Force password change — authenticated but outside AppLayout */}
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword forced /></ProtectedRoute>} />

          {/* Authenticated app routes */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            {/* Tenant pages */}
            <Route path="/dashboard"         element={<SuperAdminDashboardRoute />} />
            <Route path="/sales/create"      element={<SaleCreate />} />
            <Route path="/sales/import"      element={<FeatureRoute flag="allowImport"><SaleImport /></FeatureRoute>} />
            <Route path="/reports"           element={<FeatureRoute flag="allowReports"><Reports /></FeatureRoute>} />
            <Route path="/branches"          element={<Branches />} />
            <Route path="/branches/create"   element={<BranchCreate />} />
            <Route path="/branches/:id/edit" element={<BranchEdit />} />
            <Route path="/submit"            element={<Submit />} />
            <Route path="/submissions"       element={<Submissions />} />
            <Route path="/tickets/create"    element={<TicketCreate />} />
            <Route path="/tickets/success"   element={<TicketSuccess />} />
            <Route path="/faq"               element={<FaqPage />} />

            {/* Super-admin pages */}
            <Route path="/admin/dashboard"                        element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/tenants"                        element={<AdminRoute><Tenants /></AdminRoute>} />
            <Route path="/admin/tenants/create"               element={<AdminRoute><TenantForm mode="create" /></AdminRoute>} />
            <Route path="/admin/tenants/:id/edit"             element={<AdminRoute><TenantForm mode="edit" /></AdminRoute>} />
            <Route path="/admin/tenants/:id/api-keys"         element={<AdminRoute><ApiKeys /></AdminRoute>} />
            <Route path="/admin/users"                        element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/bot-subscribers"              element={<AdminRoute><BotSubscribers /></AdminRoute>} />
            <Route path="/admin/bot-subscribers/create"       element={<AdminRoute><BotSubscriberForm mode="create" /></AdminRoute>} />
            <Route path="/admin/bot-subscribers/:id/edit"     element={<AdminRoute><BotSubscriberForm mode="edit" /></AdminRoute>} />
            <Route path="/admin/tickets"                      element={<AdminRoute><AdminTickets /></AdminRoute>} />
            <Route path="/admin/tickets/:id"                  element={<AdminRoute><AdminTicketDetail /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
    </>
  )
}
