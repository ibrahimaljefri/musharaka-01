/**
 * Tenant middleware — runs after authMiddleware.
 * Resolves req.tenantId, req.isSuperAdmin, req.userRole, req.allowedInputTypes.
 *
 * For JWT-authenticated requests the payload already contains tenantId and
 * isSuperAdmin (embedded at login time). We skip the DB round-trip and use
 * those values directly unless they are absent (e.g. old tokens during rollout).
 *
 * We still do a lightweight subscription expiry check from the token for speed.
 * A full re-check from DB happens on /api/auth/me or after token refresh.
 */

const { pool } = require('../config/db')

// In-memory cache for tenant status — avoids a DB hit on every request
const _cache   = new Map()
const TTL_MS   = 2 * 60 * 1000   // 2 minutes

async function tenantMiddleware(req, res, next) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'غير مصرح' })

  // Test-mode bypass
  if (process.env.NODE_ENV === 'test') {
    const isSA           = req.headers['x-test-super-admin'] === 'true'
    req.isSuperAdmin     = isSA
    req.tenantId         = isSA ? null : 'test-tenant-id'
    req.userRole         = isSA ? 'super_admin' : 'admin'
    req.allowedInputTypes = ['daily', 'monthly', 'range']
    req.tenantActivatedAt = '2020-01-01'
    req.tenantExpiresAt   = null
    req.allowedBranchIds  = null    // wildcard in test mode
    return next()
  }

  // Fast path — JWT already has the context (set by authMiddleware)
  if (req.isSuperAdmin) {
    req.tenantId         = null
    req.userRole         = 'super_admin'
    req.allowedBranchIds = null     // wildcard
    return next()
  }

  if (req.tenantId) {
    // Use cached tenant status to avoid a DB hit
    const cached = _cache.get(req.tenantId)
    if (cached && Date.now() - cached.at < TTL_MS) {
      if (cached.status === 'suspended')
        return res.status(403).json({ error: 'تم تعليق حساب المؤسسة، يرجى التواصل مع الدعم' })
      if (cached.expires_at && new Date(cached.expires_at) < new Date())
        return res.status(402).json({ error: 'انتهت صلاحية الاشتراك، يرجى التجديد للمتابعة' })
      req.allowedInputTypes  = cached.allowed_input_types || ['daily']
      req.tenantActivatedAt  = cached.activated_at || null
      req.tenantExpiresAt    = cached.expires_at   || null
      await populateAllowedBranches(req)
      return next()
    }

    // Cache miss — fetch tenant status from DB
    const { rows } = await pool.query(
      `SELECT status, activated_at, expires_at, allowed_input_types
       FROM tenants WHERE id = $1`,
      [req.tenantId]
    )
    if (!rows.length) return res.status(403).json({ error: 'المستأجر غير موجود' })
    const t = rows[0]
    _cache.set(req.tenantId, { ...t, at: Date.now() })

    if (t.status === 'suspended')
      return res.status(403).json({ error: 'تم تعليق حساب المؤسسة، يرجى التواصل مع الدعم' })
    if (t.expires_at && new Date(t.expires_at) < new Date())
      return res.status(402).json({ error: 'انتهت صلاحية الاشتراك، يرجى التجديد للمتابعة' })

    req.allowedInputTypes  = t.allowed_input_types || ['daily']
    req.tenantActivatedAt  = t.activated_at || null
    req.tenantExpiresAt    = t.expires_at   || null
    await populateAllowedBranches(req)
    return next()
  }

  // No tenantId in token — do a full DB lookup (old token or fresh signup)
  const { rows } = await pool.query(
    `SELECT tu.tenant_id, tu.role,
            t.status, t.activated_at, t.expires_at, t.allowed_input_types,
            EXISTS(SELECT 1 FROM super_admins WHERE user_id = $1) AS is_super_admin
     FROM tenant_users tu
     JOIN tenants t ON t.id = tu.tenant_id
     WHERE tu.user_id = $1`,
    [userId]
  )

  if (!rows.length) {
    // Check super_admin fallback
    const sa = await pool.query('SELECT 1 FROM super_admins WHERE user_id = $1', [userId])
    if (sa.rows.length) {
      req.isSuperAdmin = true
      req.tenantId     = null
      req.userRole     = 'super_admin'
      return next()
    }
    return res.status(403).json({ error: 'المستخدم غير مرتبط بأي حساب مؤسسي' })
  }

  const row = rows[0]
  if (row.status === 'suspended')
    return res.status(403).json({ error: 'تم تعليق حساب المؤسسة، يرجى التواصل مع الدعم' })
  if (row.expires_at && new Date(row.expires_at) < new Date())
    return res.status(402).json({ error: 'انتهت صلاحية الاشتراك، يرجى التجديد للمتابعة' })

  req.isSuperAdmin      = false
  req.tenantId          = row.tenant_id
  req.userRole          = row.role
  req.allowedInputTypes = row.allowed_input_types || ['daily']
  req.tenantActivatedAt = row.activated_at || null
  req.tenantExpiresAt   = row.expires_at   || null
  await populateAllowedBranches(req)
  next()
}

/**
 * Phase B — populate req.allowedBranchIds from tenant_user_branches.
 *   - admin / super-admin → null (wildcard, no filter applied downstream)
 *   - member              → array of branch UUIDs (may be empty)
 *
 * Cached per (userId,tenantId) for 60s to avoid hitting the DB on every API call.
 */
const _branchCache = new Map()
const BRANCH_TTL_MS = 60 * 1000

async function populateAllowedBranches(req) {
  if (req.userRole === 'admin' || req.isSuperAdmin) {
    req.allowedBranchIds = null
    return
  }
  const key = `${req.user.id}:${req.tenantId}`
  const cached = _branchCache.get(key)
  if (cached && Date.now() - cached.at < BRANCH_TTL_MS) {
    req.allowedBranchIds = cached.ids
    return
  }
  const { rows } = await pool.query(
    `SELECT branch_id FROM tenant_user_branches
      WHERE tenant_id = $1 AND user_id = $2`,
    [req.tenantId, req.user.id]
  )
  const ids = rows.map(r => r.branch_id)
  _branchCache.set(key, { ids, at: Date.now() })
  req.allowedBranchIds = ids
}

function superAdminOnly(req, res, next) {
  if (!req.isSuperAdmin) {
    return res.status(403).json({ error: 'هذا المسار مخصص للمشرف العام فقط' })
  }
  next()
}

module.exports = { tenantMiddleware, superAdminOnly }
