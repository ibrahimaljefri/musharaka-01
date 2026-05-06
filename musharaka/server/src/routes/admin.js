/**
 * Admin routes — super-admin only
 */

const express  = require('express')
const crypto   = require('crypto')
const router   = express.Router()
const { pool, selectOne, selectMany, insertOne, updateOne, deleteWhere } = require('../db/query')
const { hashPassword } = require('../services/authService')
const { encrypt }      = require('../utils/crypto')

// True iff the token is already encrypted (matches "iv-hex:cipher-hex")
const ENCRYPTED_RE = /^[0-9a-f]+:[0-9a-f]+$/i
function maybeEncryptToken(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return null
  if (ENCRYPTED_RE.test(value)) return value          // already encrypted
  return encrypt(value)
}
const { authMiddleware } = require('../middleware/auth')
const { tenantMiddleware, superAdminOnly } = require('../middleware/tenantMiddleware')
const { standardLimiter, adminWriteOnly } = require('../middleware/rateLimiter')

router.use(standardLimiter, adminWriteOnly, authMiddleware, tenantMiddleware, superAdminOnly)

// ── PLATFORM STATS ────────────────────────────────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const now  = new Date()
    const in3  = new Date(now); in3.setMonth(in3.getMonth() + 3)
    const in6  = new Date(now); in6.setMonth(in6.getMonth() + 6)
    const in11 = new Date(now); in11.setMonth(in11.getMonth() + 11)

    const [tenantCountQ, tenantsQ, branchCountQ, tenantUserCountQ, authUsersQ, tuWithTenantQ, branchesWithTenantQ] = await Promise.all([
      pool.query(`SELECT count(*)::int AS n FROM tenants`),
      pool.query(`SELECT id, name, status, expires_at FROM tenants`),
      pool.query(`SELECT count(*)::int AS n FROM branches`),
      pool.query(`SELECT count(*)::int AS n FROM tenant_users`),
      pool.query(`SELECT id FROM app_users`),
      pool.query(`SELECT tu.user_id, t.id AS tenant_id, t.name AS tenant_name
                  FROM tenant_users tu LEFT JOIN tenants t ON t.id = tu.tenant_id`),
      pool.query(`SELECT b.tenant_id, t.name AS tenant_name
                  FROM branches b LEFT JOIN tenants t ON t.id = b.tenant_id`),
    ])

    const totalTenants     = tenantCountQ.rows[0].n
    const tenants          = tenantsQ.rows
    const totalBranches    = branchCountQ.rows[0].n
    const totalTenantUsers = tenantUserCountQ.rows[0].n
    const authUsersCount   = authUsersQ.rows.length
    const tuRows           = tuWithTenantQ.rows
    const branchRows       = branchesWithTenantQ.rows

    const active   = tenants.filter(t => t.status === 'active')
    const exp3     = active.filter(t => t.expires_at && new Date(t.expires_at) <= in3)
    const exp6     = active.filter(t => t.expires_at && new Date(t.expires_at) > in3  && new Date(t.expires_at) <= in6)
    const exp11    = active.filter(t => t.expires_at && new Date(t.expires_at) > in6  && new Date(t.expires_at) <= in11)
    const exp12p   = active.filter(t => t.expires_at && new Date(t.expires_at) > in11)
    const noExpiry = active.filter(t => !t.expires_at)

    const usersPerTenant = {}
    for (const row of tuRows) {
      const key = row.tenant_name || row.user_id
      usersPerTenant[key] = (usersPerTenant[key] || 0) + 1
    }

    const branchesPerTenant = {}
    for (const row of branchRows) {
      const key = row.tenant_name || row.tenant_id
      branchesPerTenant[key] = (branchesPerTenant[key] || 0) + 1
    }

    res.json({
      totals: {
        tenants:       totalTenants,
        branches:      totalBranches,
        tenant_users:  totalTenantUsers,
        auth_users:    authUsersCount,
        pending_users: Math.max(0, authUsersCount - totalTenantUsers),
      },
      subscriptions: {
        expiring_3m:       exp3.length,
        expiring_6m:       exp6.length,
        expiring_11m:      exp11.length,
        expiring_12m_plus: exp12p.length,
        no_expiry:         noExpiry.length,
      },
      users_per_tenant:    usersPerTenant,
      branches_per_tenant: branchesPerTenant,
    })
  } catch (err) { next(err) }
})

// ── SUBSCRIPTION PLANS ────────────────────────────────────────────────────────

router.get('/plans', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name_ar, name_en, price_sar, billing_period, max_users, max_branches,
              extra_branch_sar, extra_user_sar
       FROM subscription_plans WHERE is_active = true ORDER BY price_sar ASC`
    )
    const plans = rows.map(p => ({
      ...p,
      monthly_sar: p.billing_period === 'annual'
        ? Math.round(p.price_sar / 12)
        : p.price_sar,
    }))
    res.json(plans)
  } catch (err) { next(err) }
})

// ── TENANTS ───────────────────────────────────────────────────────────────────

router.get('/tenants', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*,
              (SELECT count(*)::int FROM tenant_users tu WHERE tu.tenant_id = t.id) AS user_count,
              (SELECT count(*)::int FROM branches b WHERE b.tenant_id = t.id) AS branch_count
       FROM tenants t ORDER BY t.created_at DESC`
    )
    res.json(rows)
  } catch (err) { next(err) }
})

router.post('/tenants', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const {
      name, slug, plan = 'basic', activated_at, expires_at, data_entry_from, notes,
      allowed_input_types = ['daily'],
      user_email, user_password, user_name,
      cenomi_api_token, cenomi_api_url, cenomi_post_mode,
    } = req.body

    if (!name || !slug) {
      return res.status(422).json({ error: 'اسم المستأجر والرمز المختصر مطلوبان' })
    }

    await client.query('BEGIN')

    // Create tenant
    let tenant
    try {
      const { rows } = await client.query(
        `INSERT INTO tenants (name, slug, plan, activated_at, expires_at, data_entry_from, notes,
                              allowed_input_types, cenomi_api_token,
                              cenomi_api_url, cenomi_post_mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
         RETURNING *`,
        [
          name, slug, plan,
          activated_at || new Date().toISOString(),
          expires_at || null,
          data_entry_from || null,
          notes || null,
          JSON.stringify(allowed_input_types),
          maybeEncryptToken(cenomi_api_token),         // encrypt-at-write
          cenomi_api_url || null,
          cenomi_post_mode || 'monthly',
        ]
      )
      tenant = rows[0]
    } catch (e) {
      await client.query('ROLLBACK')
      if (e.code === '23505') return res.status(409).json({ error: 'الرمز المختصر مستخدم مسبقاً' })
      throw e
    }

    // Optionally create user
    let createdUser = null
    if (user_email && user_password) {
      try {
        const passwordHash = await hashPassword(user_password)
        const { rows: uRows } = await client.query(
          `INSERT INTO app_users (email, password_hash, full_name, email_confirmed_at, created_by_admin)
           VALUES ($1, $2, $3, now(), TRUE) RETURNING id, email`,
          [user_email, passwordHash, user_name || name]
        )
        createdUser = uRows[0]

        await client.query(
          `INSERT INTO tenant_users (tenant_id, user_id, role) VALUES ($1, $2, 'admin')`,
          [tenant.id, createdUser.id]
        )
      } catch (e) {
        await client.query('ROLLBACK')
        if (e.code === '23505') return res.status(422).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' })
        throw e
      }
    }

    await client.query('COMMIT')
    res.status(201).json({ tenant, user: createdUser })
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    next(err)
  } finally {
    client.release()
  }
})

router.get('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = await selectOne('tenants', { id: req.params.id })
    if (!tenant) return res.status(404).json({ error: 'المستأجر غير موجود' })

    const { rows: users } = await pool.query(
      `SELECT id, user_id, role FROM tenant_users WHERE tenant_id = $1`,
      [req.params.id]
    )
    res.json({ ...tenant, tenant_users: users })
  } catch (err) { next(err) }
})

router.put('/tenants/:id', async (req, res, next) => {
  try {
    const allowed = [
      'name','slug','plan','status','activated_at','expires_at','data_entry_from',
      'notes','allowed_input_types','allow_advanced_dashboard',
      'allow_import','allow_reports',
      'commercial_registration','primary_phone','account_number',
      'cenomi_api_token','cenomi_api_url','cenomi_post_mode',
    ]
    const patch = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === 'allowed_input_types')      patch[k] = JSON.stringify(req.body[k])
        else if (k === 'cenomi_api_token')    patch[k] = maybeEncryptToken(req.body[k])  // encrypt-at-write
        else                                  patch[k] = req.body[k]
      }
    }
    if (req.body.max_branches !== undefined) patch.max_branches = parseInt(req.body.max_branches) || 5
    if (req.body.plan_id !== undefined)      patch.plan_id      = req.body.plan_id || null

    if (!Object.keys(patch).length) return res.status(422).json({ error: 'لا توجد تحديثات' })

    const data = await updateOne('tenants', { id: req.params.id }, patch)
    if (!data) return res.status(404).json({ error: 'المستأجر غير موجود' })
    res.json(data)
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'الرمز المختصر مستخدم مسبقاً' })
    next(err)
  }
})

router.delete('/tenants/:id', async (req, res, next) => {
  try {
    const n = await deleteWhere('tenants', { id: req.params.id })
    if (!n) return res.status(404).json({ error: 'المستأجر غير موجود' })
    res.json({ message: 'تم حذف المستأجر بنجاح' })
  } catch (err) { next(err) }
})

// ── API KEYS ─────────────────────────────────────────────────────────────────

const ALL_FIELDS = [
  'contract_number','branch_code','branch_name','brand_name','unit_number',
  'location','invoice_number','input_type','period_from_date','period_to_date',
  'sale_date','month','year','amount','status',
]

router.get('/tenants/:id/api-keys', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, tenant_id, label, key_prefix, allowed_fields, is_active,
              last_used_at, expires_at, created_at
       FROM api_keys WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    )
    res.json({ keys: rows, all_fields: ALL_FIELDS })
  } catch (err) { next(err) }
})

router.post('/tenants/:id/api-keys', async (req, res, next) => {
  try {
    const { label, allowed_fields, expires_at } = req.body
    if (!label) return res.status(422).json({ error: 'اسم المفتاح مطلوب' })

    const rawKey  = 'msk_' + crypto.randomBytes(20).toString('hex')
    const prefix  = rawKey.slice(0, 12)
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

    const { rows } = await pool.query(
      `INSERT INTO api_keys
         (tenant_id, label, key_prefix, key_hash, allowed_fields, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, true, $6)
       RETURNING id, tenant_id, label, key_prefix, allowed_fields, is_active, expires_at, created_at`,
      [
        req.params.id, label, prefix, keyHash,
        JSON.stringify(allowed_fields || ['contract_number','period_from_date','period_to_date','amount']),
        expires_at || null,
      ]
    )
    res.status(201).json({ ...rows[0], raw_key: rawKey, all_fields: ALL_FIELDS })
  } catch (err) { next(err) }
})

router.put('/api-keys/:keyId', async (req, res, next) => {
  try {
    const allowed = ['label','allowed_fields','is_active','expires_at']
    const patch = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        patch[k] = k === 'allowed_fields' ? JSON.stringify(req.body[k]) : req.body[k]
      }
    }
    if (!Object.keys(patch).length) return res.status(422).json({ error: 'لا توجد تحديثات' })

    const data = await updateOne(
      'api_keys',
      { id: req.params.keyId },
      patch,
      'id, tenant_id, label, key_prefix, allowed_fields, is_active, expires_at, created_at'
    )
    if (!data) return res.status(404).json({ error: 'المفتاح غير موجود' })
    res.json(data)
  } catch (err) { next(err) }
})

router.delete('/api-keys/:keyId', async (req, res, next) => {
  try {
    const n = await deleteWhere('api_keys', { id: req.params.keyId })
    if (!n) return res.status(404).json({ error: 'المفتاح غير موجود' })
    res.json({ message: 'تم حذف المفتاح بنجاح' })
  } catch (err) { next(err) }
})

// ── TENANT BRANCHES ──────────────────────────────────────────────────────────

router.get('/tenants/:id/branches', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, code, name, brand_name FROM branches
       WHERE tenant_id = $1 ORDER BY code ASC`,
      [req.params.id]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// ── USER MANAGEMENT ───────────────────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         u.id, u.email, u.full_name, u.phone, u.created_at AS registered_at,
         tu.role,
         t.id   AS tenant_id,
         t.name AS tenant_name,
         EXISTS(SELECT 1 FROM super_admins sa WHERE sa.user_id = u.id) AS is_super_admin
       FROM app_users u
       LEFT JOIN tenant_users tu ON tu.user_id = u.id
       LEFT JOIN tenants t       ON t.id = tu.tenant_id`
    )

    const result = rows
      .filter(u => !u.is_super_admin)
      .map(u => ({
        id:            u.id,
        email:         u.email,
        full_name:     u.full_name || null,
        phone:         u.phone || null,
        status:        u.tenant_id ? 'assigned' : 'pending',
        tenant_id:     u.tenant_id   || null,
        tenant_name:   u.tenant_name || null,
        role:          u.role        || null,
        registered_at: u.registered_at,
      }))

    res.json(result)
  } catch (err) { next(err) }
})

router.post('/users', async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body
    if (!email)    return res.status(422).json({ error: 'البريد الإلكتروني مطلوب' })
    if (!password) return res.status(422).json({ error: 'كلمة المرور مطلوبة' })

    const passwordHash = await hashPassword(password)
    const { rows } = await pool.query(
      `INSERT INTO app_users (email, password_hash, full_name, phone, email_confirmed_at, created_by_admin)
       VALUES ($1, $2, $3, $4, now(), TRUE) RETURNING id, email`,
      [email, passwordHash, full_name || '', phone || '']
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(422).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' })
    next(err)
  }
})

router.post('/users/:id/assign', async (req, res, next) => {
  const client = await pool.connect()
  try {
    // SECURITY: ignore any client-supplied `role` — server determines it.
    const { tenant_id } = req.body
    const branchIds = Array.isArray(req.body?.branch_ids) ? req.body.branch_ids : []
    if (!tenant_id) return res.status(422).json({ error: 'يرجى اختيار المستأجر' })

    await client.query('BEGIN')

    // Determine role: first user → admin, subsequent → member
    const { rows: existing } = await client.query(
      `SELECT count(*)::int AS n FROM tenant_users WHERE tenant_id = $1`,
      [tenant_id]
    )
    const role = existing[0].n === 0 ? 'admin' : 'member'

    // Validate branch_ids belong to this tenant (if any provided)
    if (branchIds.length) {
      const { rows: validBranches } = await client.query(
        `SELECT id FROM branches WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenant_id, branchIds]
      )
      if (validBranches.length !== branchIds.length) {
        await client.query('ROLLBACK')
        return res.status(422).json({ error: 'بعض الفروع المحددة لا تنتمي إلى المستأجر' })
      }
    }

    // Replace any existing tenant assignment for this user
    await client.query(`DELETE FROM tenant_users WHERE user_id = $1`, [req.params.id])
    await client.query(`DELETE FROM tenant_user_branches WHERE user_id = $1`, [req.params.id])
    await client.query(
      `INSERT INTO tenant_users (user_id, tenant_id, role) VALUES ($1, $2, $3)`,
      [req.params.id, tenant_id, role]
    )

    // Admin implicitly has access to every branch — skip scope rows.
    if (role === 'member' && branchIds.length) {
      await client.query(
        `INSERT INTO tenant_user_branches (tenant_id, user_id, branch_id)
         SELECT $1, $2, UNNEST($3::uuid[])`,
        [tenant_id, req.params.id, branchIds]
      )
    }

    await client.query('COMMIT')
    res.json({ message: 'تم تعيين المستخدم بنجاح', role, branch_ids: branchIds })
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    next(err)
  } finally {
    client.release()
  }
})

router.put('/users/:id', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { full_name, phone, new_password, tenant_id, role } = req.body

    await client.query('BEGIN')

    const patch = {}
    if (full_name !== undefined) patch.full_name = full_name
    if (phone !== undefined)     patch.phone = phone
    if (new_password)            patch.password_hash = await hashPassword(new_password)

    if (Object.keys(patch).length) {
      const cols = Object.keys(patch)
      const setSql = cols.map((c, i) => `${c} = $${i + 1}`).join(', ')
      await client.query(
        `UPDATE app_users SET ${setSql}, updated_at = now() WHERE id = $${cols.length + 1}`,
        [...cols.map(c => patch[c]), req.params.id]
      )
    }

    if (tenant_id) {
      await client.query(`DELETE FROM tenant_users WHERE user_id = $1`, [req.params.id])
      await client.query(
        `INSERT INTO tenant_users (user_id, tenant_id, role) VALUES ($1, $2, $3)`,
        [req.params.id, tenant_id, role || 'member']
      )
    } else {
      await client.query(`DELETE FROM tenant_users WHERE user_id = $1`, [req.params.id])
    }

    await client.query('COMMIT')
    res.json({ message: 'تم تحديث المستخدم بنجاح' })
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    next(err)
  } finally {
    client.release()
  }
})

router.delete('/users/:id', async (req, res, next) => {
  try {
    // Cascades via FK ON DELETE CASCADE on tenant_users.user_id
    const n = await deleteWhere('app_users', { id: req.params.id })
    if (!n) return res.status(404).json({ error: 'المستخدم غير موجود' })
    res.json({ message: 'تم حذف المستخدم' })
  } catch (err) { next(err) }
})

// ── BOT SUBSCRIBERS ───────────────────────────────────────────────────────────

router.get('/bot-subscribers', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, tenant_id, tenant_name, platform, chat_id, contact_name,
              is_active, last_message_at, created_at
       FROM bot_subscribers ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (err) { next(err) }
})

router.get('/bot-subscribers/:id', async (req, res, next) => {
  try {
    const sub = await selectOne('bot_subscribers', { id: req.params.id })
    if (!sub) return res.status(404).json({ error: 'المشترك غير موجود' })
    res.json(sub)
  } catch (err) { next(err) }
})

router.post('/bot-subscribers', async (req, res, next) => {
  try {
    const { tenant_id, platform, chat_id, contact_name, tenant_name } = req.body
    if (!tenant_id)   return res.status(422).json({ error: 'يرجى اختيار المستأجر' })
    if (!platform)    return res.status(422).json({ error: 'يرجى اختيار المنصة' })
    if (!chat_id)     return res.status(422).json({ error: 'معرّف المحادثة مطلوب' })
    if (!tenant_name) return res.status(422).json({ error: 'اسم المستأجر مطلوب' })

    try {
      const data = await insertOne('bot_subscribers', {
        tenant_id, platform, chat_id,
        contact_name: contact_name || null,
        tenant_name,
      })
      res.status(201).json(data)
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'هذا المشترك مسجّل مسبقاً على نفس المنصة' })
      throw e
    }
  } catch (err) { next(err) }
})

router.put('/bot-subscribers/:id', async (req, res, next) => {
  try {
    const allowed = ['platform', 'chat_id', 'contact_name', 'is_active', 'tenant_name']
    const patch = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k]
    }
    if (!Object.keys(patch).length) return res.status(422).json({ error: 'لا توجد تحديثات' })

    const data = await updateOne('bot_subscribers', { id: req.params.id }, patch)
    if (!data) return res.status(404).json({ error: 'المشترك غير موجود' })
    res.json(data)
  } catch (err) { next(err) }
})

router.delete('/bot-subscribers/:id', async (req, res, next) => {
  try {
    const n = await deleteWhere('bot_subscribers', { id: req.params.id })
    if (!n) return res.status(404).json({ error: 'المشترك غير موجود' })
    res.json({ message: 'تم حذف المشترك بنجاح' })
  } catch (err) { next(err) }
})

// ── SUPPORT TICKETS ────────────────────────────────────────────────────────

router.get('/tickets', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, ticket_number, tenant_id, tenant_name, submitter_name,
              submitter_email, title, category, status, created_at
       FROM support_tickets ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (err) { next(err) }
})

router.get('/tickets/:id', async (req, res, next) => {
  try {
    const ticket = await selectOne('support_tickets', { id: req.params.id })
    if (!ticket) return res.status(404).json({ error: 'التذكرة غير موجودة' })

    let tenant_phone = null
    let branch_count = null
    if (ticket.tenant_id) {
      const [tenantRes, branchRes] = await Promise.all([
        pool.query(`SELECT primary_phone FROM tenants WHERE id = $1`, [ticket.tenant_id]),
        pool.query(`SELECT count(*)::int AS n FROM branches WHERE tenant_id = $1`, [ticket.tenant_id]),
      ])
      tenant_phone = tenantRes.rows[0]?.primary_phone || null
      branch_count = branchRes.rows[0]?.n ?? null
    }

    res.json({ ...ticket, tenant_phone, branch_count })
  } catch (err) { next(err) }
})

router.put('/tickets/:id', async (req, res, next) => {
  try {
    const allowed = ['status', 'admin_comment']
    const patch = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k]
    }
    if (patch.status && !['new', 'in_progress', 'resolved'].includes(patch.status)) {
      return res.status(422).json({ error: 'حالة غير صحيحة' })
    }
    if (!Object.keys(patch).length) return res.status(422).json({ error: 'لا توجد تحديثات' })

    const data = await updateOne('support_tickets', { id: req.params.id }, patch)
    if (!data) return res.status(404).json({ error: 'التذكرة غير موجودة' })
    res.json(data)
  } catch (err) { next(err) }
})

// ── CENOMI: revert a submission + audit log viewer ───────────────────────────

/**
 * POST /api/admin/submissions/:id/revert
 * Marks the submission 'reverted' and returns the linked sales to 'pending'
 * with submission_id = NULL so the tenant can edit and re-send. Scope is
 * ONE submission row = ONE branch + ONE period (no cross-branch effects).
 */
router.post('/submissions/:id/revert', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT revert_seinomy_submission($1::uuid) AS result`,
      [req.params.id]
    )
    const result = rows[0]?.result
    if (!result?.success) {
      return res.status(400).json({ error: result?.error || 'تعذّر التراجع عن الإرسال' })
    }
    res.json({
      message:      'تم التراجع عن الإرسال — يمكن للمستأجر التعديل وإعادة الإرسال',
      branch_id:    result.branch_id,
      period_start: result.period_start,
      period_end:   result.period_end,
    })
  } catch (err) { next(err) }
})

/**
 * GET /api/admin/cenomi-logs
 *
 * Filterable, paginated audit-log viewer for super-admin. Supports filtering
 * by tenant_id, branch_id, and a created_at range. Tokens in request_headers
 * are stored already-redacted ("***").
 *
 * Query params (all optional):
 *   tenant_id  UUID
 *   branch_id  UUID
 *   from       ISO date (>= created_at)
 *   to         ISO date (<= created_at)
 *   limit      default 50, max 200
 *   offset     default 0
 */
router.get('/cenomi-logs', async (req, res, next) => {
  try {
    const { tenant_id, branch_id, from, to } = req.query
    const limit  = Math.min(parseInt(req.query.limit, 10)  || 50, 200)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0,  0)

    // Build the WHERE clause + filter args once, then use SEPARATE arg arrays
    // for the count and rows queries. Sharing one array between two
    // pool.query calls fails: pushing limit/offset to it after countQ is
    // built mutates the same reference, and both queries fire under
    // Promise.all with the now-bigger array — Postgres rejects the count
    // query with "bind message supplies N parameters, but prepared
    // statement requires 0".
    const where = []
    const filterArgs = []
    if (tenant_id) { filterArgs.push(tenant_id); where.push(`l.tenant_id = $${filterArgs.length}`) }
    if (branch_id) { filterArgs.push(branch_id); where.push(`l.branch_id = $${filterArgs.length}`) }
    if (from)      { filterArgs.push(from);      where.push(`l.created_at >= $${filterArgs.length}`) }
    if (to)        { filterArgs.push(to);        where.push(`l.created_at <= $${filterArgs.length}`) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countArgs = [...filterArgs]
    const rowsArgs  = [...filterArgs, limit, offset]
    const limitIdx  = filterArgs.length + 1
    const offsetIdx = filterArgs.length + 2

    const countQ = pool.query(
      `SELECT count(*)::int AS n FROM cenomi_logs l ${whereSql}`,
      countArgs
    )
    const rowsQ = pool.query(
      `SELECT l.id, l.tenant_id, l.branch_id, l.submission_id,
              l.request_url, l.request_headers, l.request_body,
              l.response_status, l.response_body, l.error_message, l.created_at,
              t.name AS tenant_name, t.slug AS tenant_slug,
              b.code AS branch_code, b.name AS branch_name
       FROM cenomi_logs l
       LEFT JOIN tenants  t ON t.id = l.tenant_id
       LEFT JOIN branches b ON b.id = l.branch_id
       ${whereSql}
       ORDER BY l.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      rowsArgs
    )

    const [{ rows: countRows }, { rows }] = await Promise.all([countQ, rowsQ])
    res.json({ total: countRows[0].n, limit, offset, rows })
  } catch (err) { next(err) }
})

/**
 * GET /api/admin/submissions
 *
 * Lists submissions with tenant + branch context for the admin "Revert" page.
 * Filters by tenant_id and status.
 */
router.get('/submissions', async (req, res, next) => {
  try {
    const { tenant_id, status } = req.query
    const where = []
    const args  = []
    if (tenant_id) { args.push(tenant_id); where.push(`s.tenant_id = $${args.length}`) }
    if (status)    { args.push(status);    where.push(`s.status    = $${args.length}`) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const limit  = Math.min(parseInt(req.query.limit, 10)  || 50, 200)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0,  0)
    args.push(limit); args.push(offset)

    const { rows } = await pool.query(
      `SELECT s.id, s.tenant_id, s.branch_id, s.month, s.year,
              s.period_start, s.period_end, s.post_mode,
              s.status, s.invoice_count, s.total_amount, s.submitted_at,
              t.name AS tenant_name, t.slug AS tenant_slug,
              b.code AS branch_code, b.name AS branch_name
       FROM submissions s
       LEFT JOIN tenants  t ON t.id = s.tenant_id
       LEFT JOIN branches b ON b.id = s.branch_id
       ${whereSql}
       ORDER BY s.submitted_at DESC
       LIMIT $${args.length - 1} OFFSET $${args.length}`,
      args
    )
    res.json(rows)
  } catch (err) { next(err) }
})

module.exports = router
