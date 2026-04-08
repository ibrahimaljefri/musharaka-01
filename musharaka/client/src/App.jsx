import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout from './layouts/AppLayout'
import GuestLayout from './layouts/GuestLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import SaleCreate from './pages/SaleCreate'
import SaleImport from './pages/SaleImport'
import Reports from './pages/Reports'
import Branches from './pages/Branches'
import BranchCreate from './pages/BranchCreate'
import BranchEdit from './pages/BranchEdit'
import Submit from './pages/Submit'
import Submissions from './pages/Submissions'
import Tenants from './pages/admin/Tenants'
import TenantForm from './pages/admin/TenantForm'
import ApiKeys from './pages/admin/ApiKeys'
import AdminUsers from './pages/admin/Users'
import BotSubscribers from './pages/admin/BotSubscribers'
import BotSubscriberForm from './pages/admin/BotSubscriberForm'

function ProtectedRoute({ children }) {
  const session = useAuthStore(s => s.session)
  if (!session) return <Navigate to="/login" replace />
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
  const session     = useAuthStore(s => s.session)
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin)
  if (!session)     return <Navigate to="/login" replace />
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const loading = useAuthStore(s => s.loading)
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Tajawal,sans-serif', color:'#B8860B', fontSize:'1.2rem' }}>
      جاري التحميل…
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="/dashboard"         element={<Dashboard />} />
          <Route path="/sales/create"      element={<SaleCreate />} />
          <Route path="/sales/import"      element={<FeatureRoute flag="allowImport"><SaleImport /></FeatureRoute>} />
          <Route path="/reports"           element={<FeatureRoute flag="allowReports"><Reports /></FeatureRoute>} />
          <Route path="/branches"          element={<Branches />} />
          <Route path="/branches/create"   element={<BranchCreate />} />
          <Route path="/branches/:id/edit" element={<BranchEdit />} />
          <Route path="/submit"            element={<Submit />} />
          <Route path="/submissions"       element={<Submissions />} />

          {/* Super-admin pages */}
          <Route path="/admin/tenants"                        element={<AdminRoute><Tenants /></AdminRoute>} />
          <Route path="/admin/tenants/create"               element={<AdminRoute><TenantForm mode="create" /></AdminRoute>} />
          <Route path="/admin/tenants/:id/edit"             element={<AdminRoute><TenantForm mode="edit" /></AdminRoute>} />
          <Route path="/admin/tenants/:id/api-keys"         element={<AdminRoute><ApiKeys /></AdminRoute>} />
          <Route path="/admin/users"                        element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/bot-subscribers"              element={<AdminRoute><BotSubscribers /></AdminRoute>} />
          <Route path="/admin/bot-subscribers/create"       element={<AdminRoute><BotSubscriberForm mode="create" /></AdminRoute>} />
          <Route path="/admin/bot-subscribers/:id/edit"     element={<AdminRoute><BotSubscriberForm mode="edit" /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
