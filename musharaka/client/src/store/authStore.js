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
  activatedAt:            null,  // ISO string — license start date
  expiresAt:              null,  // ISO string — license end date (null = open)
  planName:               null,  // 'basic' | 'professional' | 'enterprise' | null
  maxBranches:            null,  // number | null — null means unlimited

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
              allowAdvancedDashboard: false, allowImport: false, allowReports: false, mustChangePassword: false,
              activatedAt: null, expiresAt: null, planName: null })
      }
    })
    set({ _authSubscription: subscription })
  },

  _loadTenantContext: async (userId) => {
    try {
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

      // Load tenant membership — query only base columns that are guaranteed to exist.
      // allow_import / allow_reports are queried separately so a missing column
      // never prevents the user from logging in.
      const { data: membership, error: memberErr } = await supabase
        .from('tenant_users')
        .select('tenant_id, role, tenants(status, plan, activated_at, expires_at, allowed_input_types, allow_advanced_dashboard, allow_import, allow_reports, max_branches)')
        .eq('user_id', userId)
        .maybeSingle()

      if (memberErr) {
        console.warn('[auth] tenant_users query error (retrying without feature flags):', memberErr.message)

        // Retry with only the columns that the base migration guarantees
        const { data: fallback } = await supabase
          .from('tenant_users')
          .select('tenant_id, role, tenants(status, plan, activated_at, expires_at, allowed_input_types, allow_advanced_dashboard)')
          .eq('user_id', userId)
          .maybeSingle()

        if (!fallback) {
          set({ isSuperAdmin: false, tenantId: null, tenantStatus: null, allowedInputTypes: ['daily'] })
          return
        }

        const t = fallback.tenants
        if (!t) {
          // Has tenant_users row but can't read tenants — grant access with safe defaults
          set({ isSuperAdmin: false, tenantId: fallback.tenant_id, tenantStatus: 'active',
                allowedInputTypes: ['daily'], allowAdvancedDashboard: false,
                allowImport: false, allowReports: false })
          return
        }
        const isExpiredFallback = t.expires_at && new Date(t.expires_at) < new Date()
        set({
          isSuperAdmin:           false,
          tenantId:               fallback.tenant_id,
          tenantStatus:           isExpiredFallback ? 'expired' : t.status,
          allowedInputTypes:      t.allowed_input_types      || ['daily'],
          allowAdvancedDashboard: t.allow_advanced_dashboard || false,
          allowImport:            false,
          allowReports:           false,
          activatedAt:            t.activated_at  || null,
          expiresAt:              t.expires_at    || null,
          planName:               t.plan          || null,
          maxBranches:            t.max_branches  ?? null,
        })
        return
      }

      if (!membership) {
        set({ isSuperAdmin: false, tenantId: null, tenantStatus: null, allowedInputTypes: ['daily'] })
        return
      }

      const tenant = membership.tenants
      if (!tenant) {
        // Has tenant_users row but tenants JOIN returned null (RLS or schema issue).
        // Grant access with safe defaults so user is not permanently locked out.
        console.warn('[auth] tenants join returned null for tenant_id:', membership.tenant_id)
        set({ isSuperAdmin: false, tenantId: membership.tenant_id, tenantStatus: 'active',
              allowedInputTypes: ['daily'], allowAdvancedDashboard: false,
              allowImport: false, allowReports: false })
        return
      }

      const isExpired = tenant.expires_at && new Date(tenant.expires_at) < new Date()
      set({
        isSuperAdmin:           false,
        tenantId:               membership.tenant_id,
        tenantStatus:           isExpired ? 'expired' : tenant.status,
        allowedInputTypes:      tenant.allowed_input_types      || ['daily'],
        allowAdvancedDashboard: tenant.allow_advanced_dashboard || false,
        allowImport:            tenant.allow_import             || false,
        allowReports:           tenant.allow_reports            || false,
        activatedAt:            tenant.activated_at             || null,
        expiresAt:              tenant.expires_at               || null,
        planName:               tenant.plan                     || null,
        maxBranches:            tenant.max_branches             ?? null,
      })
    } catch (err) {
      console.error('[auth] _loadTenantContext unexpected error:', err)
      // Do not change state — avoids locking user out on transient errors
    }
  },

  signOut: async () => {
    get()._authSubscription?.unsubscribe()
    await supabase.auth.signOut()
    set({ session: null, user: null, isSuperAdmin: false, tenantId: null, tenantStatus: null,
          allowedInputTypes: ['daily'], mustChangePassword: false, _authSubscription: null,
          activatedAt: null, expiresAt: null, planName: null })
    window.location.href = '/login'
  },
}))
