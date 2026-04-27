import { create } from 'zustand'
import api, { TOKEN_KEY } from '../lib/axiosClient'

function applyUser(u) {
  const isExpired = u.tenant_expires_at && new Date(u.tenant_expires_at) < new Date()
  return {
    session:               u,   // truthy = logged in (ProtectedRoute checks this)
    user:                  { id: u.id, email: u.email, full_name: u.full_name, phone: u.phone },
    isSuperAdmin:          u.isSuperAdmin           || false,
    tenantId:              u.tenantId               || null,
    role:                  u.role                   || null,
    tenantStatus:          isExpired ? 'expired' : (u.tenant_status || null),
    allowedInputTypes:     u.allowed_input_types     || ['daily'],
    allowAdvancedDashboard: u.allow_advanced_dashboard || false,
    allowImport:           u.allow_import            || false,
    allowReports:          u.allow_reports           || false,
    activatedAt:           u.activated_at            || null,
    expiresAt:             u.tenant_expires_at       || null,
    planName:              u.plan                    || null,
    maxBranches:           u.max_branches            ?? null,
    userCount:             u.user_count              ?? null,
    mustChangePassword:    u.mustChangePassword      || false,
  }
}

const CLEAR = {
  session: null, user: null,
  isSuperAdmin: false, tenantId: null, role: null, tenantStatus: null,
  allowedInputTypes: ['daily'], allowAdvancedDashboard: false,
  allowImport: false, allowReports: false, mustChangePassword: false,
  activatedAt: null, expiresAt: null, planName: null, maxBranches: null,
  userCount: null,
}

export const useAuthStore = create((set, get) => ({
  ...CLEAR,
  loading: true,

  init: async () => {
    // Watch for token removal in another tab (concurrent logout, DevTools clear)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', e => {
        if (e.key === TOKEN_KEY && !e.newValue) {
          set({ ...CLEAR })
          window.location.replace('/login')
        }
      })
    }

    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      set({ loading: false, ...CLEAR })
      return
    }

    try {
      const { data } = await api.get('/auth/me')
      set({ loading: false, ...applyUser(data) })
    } catch {
      // axiosClient handles 401 → refresh → redirect; catch remaining errors
      set({ loading: false, ...CLEAR })
    }
  },

  signOut: async () => {
    try { await api.post('/auth/logout') } catch { /* ignore errors on logout */ }
    localStorage.removeItem(TOKEN_KEY)
    set({ ...CLEAR, loading: false })
    // Caller must navigate via React Router (e.g. navigate('/login', { replace: true })).
    // Doing a hard window.location redirect here would reload the whole app and
    // produce a visible flash; the soft navigate keeps the layout transition smooth.
  },
}))
