/**
 * Tenant middleware — runs after authMiddleware.
 * Resolves req.tenantId, req.isSuperAdmin, req.userRole.
 * Returns 402 if subscription expired, 403 if suspended or not in any tenant.
 */
const { supabase } = require('../config/supabase')

// In-memory cache for super-admin lookups — avoids a DB round-trip on every request
const _saCache   = new Map()   // userId → true
const SA_TTL_MS  = 5 * 60 * 1000   // 5 minutes

function isCachedSuperAdmin(userId) {
  const entry = _saCache.get(userId)
  if (!entry) return false
  if (Date.now() - entry.at > SA_TTL_MS) { _saCache.delete(userId); return false }
  return true
}

// In-memory cache for tenant membership lookups
const _tenantCache  = new Map()   // userId → { tenantId, role, status, activated_at, expires_at, allowed_input_types, at }
const TENANT_TTL_MS = 2 * 60 * 1000   // 2 minutes

async function tenantMiddleware(req, res, next) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'غير مصرح' })

  // Test-mode bypass: skip DB queries so integration tests don't need to mock
  // the full tenant-lookup chain. Auth is already validated by authMiddleware.
  // Set x-test-super-admin: true to test super-admin routes.
  if (process.env.NODE_ENV === 'test') {
    const isSA              = req.headers['x-test-super-admin'] === 'true'
    req.isSuperAdmin        = isSA
    req.tenantId            = isSA ? null : 'test-tenant-id'
    req.userRole            = isSA ? 'super_admin' : 'admin'
    req.allowedInputTypes   = ['daily', 'monthly', 'range']
    req.tenantActivatedAt   = '2020-01-01'  // broad window so date-range tests pass
    req.tenantExpiresAt     = null          // null = no expiry enforced in tests
    return next()
  }

  // ── Super admin check (cached) ──────────────────────────────────────────
  if (isCachedSuperAdmin(userId)) {
    req.isSuperAdmin = true
    req.tenantId     = null
    req.userRole     = 'super_admin'
    return next()
  }

  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (superAdmin) {
    _saCache.set(userId, { at: Date.now() })
    req.isSuperAdmin = true
    req.tenantId     = null
    req.userRole     = 'super_admin'
    return next()
  }

  // ── Regular user — look up tenant membership (cached) ──────────────────
  const cachedTenant = _tenantCache.get(userId)
  if (cachedTenant && Date.now() - cachedTenant.at < TENANT_TTL_MS) {
    const t = cachedTenant
    if (t.status === 'suspended')
      return res.status(403).json({ error: 'تم تعليق حساب المؤسسة، يرجى التواصل مع الدعم' })
    if (t.expires_at && new Date(t.expires_at) < new Date())
      return res.status(402).json({ error: 'انتهت صلاحية الاشتراك، يرجى التجديد للمتابعة' })
    req.isSuperAdmin      = false
    req.tenantId          = t.tenantId
    req.userRole          = t.role
    req.allowedInputTypes = t.allowed_input_types || ['daily']
    req.tenantActivatedAt = t.activated_at || null
    req.tenantExpiresAt   = t.expires_at   || null
    return next()
  }

  const { data: membership, error } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, tenants(id, status, activated_at, expires_at, allowed_input_types)')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !membership) {
    return res.status(403).json({ error: 'المستخدم غير مرتبط بأي حساب مؤسسي' })
  }

  const tenant = membership.tenants

  if (tenant.status === 'suspended') {
    return res.status(403).json({ error: 'تم تعليق حساب المؤسسة، يرجى التواصل مع الدعم' })
  }
  if (tenant.expires_at && new Date(tenant.expires_at) < new Date()) {
    return res.status(402).json({ error: 'انتهت صلاحية الاشتراك، يرجى التجديد للمتابعة' })
  }

  // Cache tenant membership for 2 minutes
  _tenantCache.set(userId, {
    tenantId:             membership.tenant_id,
    role:                 membership.role,
    status:               tenant.status,
    activated_at:         tenant.activated_at,
    expires_at:           tenant.expires_at,
    allowed_input_types:  tenant.allowed_input_types,
    at:                   Date.now(),
  })

  req.isSuperAdmin         = false
  req.tenantId             = membership.tenant_id
  req.userRole             = membership.role
  req.allowedInputTypes    = tenant.allowed_input_types || ['daily']
  req.tenantActivatedAt    = tenant.activated_at   || null
  req.tenantExpiresAt      = tenant.expires_at     || null
  next()
}

function superAdminOnly(req, res, next) {
  if (!req.isSuperAdmin) {
    return res.status(403).json({ error: 'هذا المسار مخصص للمشرف العام فقط' })
  }
  next()
}

module.exports = { tenantMiddleware, superAdminOnly }
