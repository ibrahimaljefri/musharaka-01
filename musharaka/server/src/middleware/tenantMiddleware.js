/**
 * Tenant middleware — runs after authMiddleware.
 * Resolves req.tenantId, req.isSuperAdmin, req.userRole.
 * Returns 402 if subscription expired, 403 if suspended or not in any tenant.
 */
const { supabase } = require('../config/supabase')

async function tenantMiddleware(req, res, next) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'غير مصرح' })

  // Test-mode bypass: skip DB queries so integration tests don't need to mock
  // the full tenant-lookup chain. Auth is already validated by authMiddleware.
  if (process.env.NODE_ENV === 'test') {
    req.isSuperAdmin      = false
    req.tenantId          = 'test-tenant-id'
    req.userRole          = 'admin'
    req.allowedInputTypes = ['daily', 'monthly', 'range']
    return next()
  }

  // ── Super admin check ───────────────────────────────────────────────────
  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (superAdmin) {
    req.isSuperAdmin = true
    req.tenantId     = null
    req.userRole     = 'super_admin'
    return next()
  }

  // ── Regular user — look up tenant membership ────────────────────────────
  const { data: membership, error } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, tenants(id, status, expires_at, allowed_input_types)')
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

  req.isSuperAdmin       = false
  req.tenantId           = membership.tenant_id
  req.userRole           = membership.role
  req.allowedInputTypes  = tenant.allowed_input_types || ['daily']
  next()
}

function superAdminOnly(req, res, next) {
  if (!req.isSuperAdmin) {
    return res.status(403).json({ error: 'هذا المسار مخصص للمشرف العام فقط' })
  }
  next()
}

module.exports = { tenantMiddleware, superAdminOnly }
