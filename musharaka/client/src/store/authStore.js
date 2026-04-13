import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import { IS_DEV_AUTH, devAuth } from '../lib/devAuth'

export const useAuthStore = create((set, get) => ({
  session:               null,
  user:                  null,
  loading:               true,
  isSuperAdmin:          false,
  tenantId:              null,
  tenantStatus:          null,   // 'active' | 'suspended' | 'expired' | null
  allowedInputTypes:      ['daily'],
  allowAdvancedDashboard: false,
  allowImport:            false,
  allowReports:           false,
  mustChangePassword:     false,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, loading: false })
    if (session?.user) {
      await get()._loadTenantContext(session.user.id)
      if (IS_DEV_AUTH) set({ mustChangePassword: devAuth.getMustChangePassword(session.user.id) })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) {
        await get()._loadTenantContext(session.user.id)
        if (IS_DEV_AUTH) set({ mustChangePassword: devAuth.getMustChangePassword(session.user.id) })
      } else {
        set({ isSuperAdmin: false, tenantId: null, tenantStatus: null, allowedInputTypes: ['daily'],
              allowAdvancedDashboard: false, allowImport: false, allowReports: false, mustChangePassword: false })
      }
    })
    set({ _authSubscription: subscription })
  },

  _loadTenantContext: async (userId) => {
    // Check super admin
    const { data: sa } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (sa) {
      set({ isSuperAdmin: true, tenantId: null, tenantStatus: 'active',
            allowedInputTypes: ['daily','monthly','range'],
            allowAdvancedDashboard: true, allowImport: true, allowReports: true })
      return
    }

    // Load tenant membership
    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id, role, tenants(status, expires_at, allowed_input_types, allow_advanced_dashboard, allow_import, allow_reports)')
      .eq('user_id', userId)
      .maybeSingle()

    if (!membership) {
      set({ isSuperAdmin: false, tenantId: null, tenantStatus: null, allowedInputTypes: ['daily'] })
      return
    }

    const tenant    = membership.tenants
    const isExpired = tenant.expires_at && new Date(tenant.expires_at) < new Date()
    const status    = isExpired ? 'expired' : tenant.status

    set({
      isSuperAdmin:           false,
      tenantId:               membership.tenant_id,
      tenantStatus:           status,
      allowedInputTypes:      tenant.allowed_input_types      || ['daily'],
      allowAdvancedDashboard: tenant.allow_advanced_dashboard || false,
      allowImport:            tenant.allow_import             || false,
      allowReports:           tenant.allow_reports            || false,
    })
  },

  signOut: async () => {
    get()._authSubscription?.unsubscribe()
    await supabase.auth.signOut()
    set({ session: null, user: null, isSuperAdmin: false, tenantId: null, tenantStatus: null,
          allowedInputTypes: ['daily'], mustChangePassword: false, _authSubscription: null })
    window.location.href = '/login'
  },
}))
