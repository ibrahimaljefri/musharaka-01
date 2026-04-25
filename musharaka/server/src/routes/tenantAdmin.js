/**
 * Tenant-admin routes (Phase B) — mounted at /api/tenant-admin
 *
 *   GET  /users                         List members of caller's tenant
 *   GET  /users/:userId/branches        Return [branch_id, ...] for that user
 *   PUT  /users/:userId/branches        Replace scope: { branch_ids: [...] }
 *
 * Authorization: tenant admin of the SAME tenant, OR super-admin.
 * Members are forbidden (403). Super-admin must pass ?tenant_id=... when
 * acting on behalf of a tenant; otherwise we use req.tenantId.
 *
 * No POST /invite or DELETE /users — only super-admin creates/destroys users.
 */

const express = require('express')
const router  = express.Router()
const { authMiddleware }   = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')
const { pool }             = require('../db/query')
const { standardLimiter }  = require('../middleware/rateLimiter')

router.use(standardLimiter, authMiddleware, tenantMiddleware)

// Caller must be tenant admin OR super-admin. Resolves the tenant being acted
// on: super-admin uses ?tenant_id=...; tenant admin always acts on own tenant.
function requireTenantAdmin(req, res, next) {
  if (req.isSuperAdmin) {
    const t = req.query.tenant_id || req.body?.tenant_id || null
    if (!t) return res.status(422).json({ error: 'يرجى تحديد المستأجر' })
    req.scopedTenantId = t
    return next()
  }
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'هذا الإجراء مخصص لمدير الحساب فقط' })
  }
  if (!req.tenantId) {
    return res.status(403).json({ error: 'لا يوجد مستأجر مرتبط بالمستخدم' })
  }
  req.scopedTenantId = req.tenantId
  next()
}

router.use(requireTenantAdmin)

// ── GET /users ────────────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.phone, tu.role, tu.created_at
         FROM tenant_users tu
         JOIN app_users u ON u.id = tu.user_id
        WHERE tu.tenant_id = $1
        ORDER BY tu.role DESC, u.full_name NULLS LAST, u.email`,
      [req.scopedTenantId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// ── GET /users/:userId/branches ──────────────────────────────────────────────
router.get('/users/:userId/branches', async (req, res, next) => {
  try {
    // Confirm the user belongs to this tenant
    const { rows: tu } = await pool.query(
      `SELECT role FROM tenant_users WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`,
      [req.scopedTenantId, req.params.userId]
    )
    if (!tu.length) return res.status(404).json({ error: 'المستخدم غير موجود ضمن هذا المستأجر' })

    const { rows } = await pool.query(
      `SELECT branch_id FROM tenant_user_branches
        WHERE tenant_id = $1 AND user_id = $2`,
      [req.scopedTenantId, req.params.userId]
    )
    res.json({
      role:        tu[0].role,
      branch_ids:  rows.map(r => r.branch_id),
    })
  } catch (err) { next(err) }
})

// ── PUT /users/:userId/branches ──────────────────────────────────────────────
router.put('/users/:userId/branches', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const branchIds = Array.isArray(req.body?.branch_ids) ? req.body.branch_ids : null
    if (!branchIds) return res.status(422).json({ error: 'branch_ids مطلوب (مصفوفة)' })

    // Validate that user belongs to this tenant
    const { rows: tu } = await pool.query(
      `SELECT role FROM tenant_users WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`,
      [req.scopedTenantId, req.params.userId]
    )
    if (!tu.length) return res.status(404).json({ error: 'المستخدم غير موجود ضمن هذا المستأجر' })
    if (tu[0].role === 'admin') {
      return res.status(422).json({ error: 'مدير الحساب لا يحتاج إلى تخصيص فروع — لديه وصول كامل' })
    }

    // Validate every branch_id belongs to this tenant
    if (branchIds.length) {
      const { rows: validBranches } = await pool.query(
        `SELECT id FROM branches WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [req.scopedTenantId, branchIds]
      )
      if (validBranches.length !== branchIds.length) {
        return res.status(422).json({ error: 'بعض الفروع المحددة لا تنتمي إلى المستأجر' })
      }
    }

    await client.query('BEGIN')
    await client.query(
      `DELETE FROM tenant_user_branches WHERE tenant_id = $1 AND user_id = $2`,
      [req.scopedTenantId, req.params.userId]
    )
    if (branchIds.length) {
      await client.query(
        `INSERT INTO tenant_user_branches (tenant_id, user_id, branch_id)
         SELECT $1, $2, UNNEST($3::uuid[])`,
        [req.scopedTenantId, req.params.userId, branchIds]
      )
    }
    await client.query('COMMIT')

    res.json({ message: 'تم تحديث صلاحيات الفروع بنجاح', branch_ids: branchIds })
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    next(err)
  } finally {
    client.release()
  }
})

module.exports = router
