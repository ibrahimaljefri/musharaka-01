/**
 * Branch routes — tenant users only
 *
 *   GET    /api/branches          List branches for the current tenant
 *   POST   /api/branches          Create branch (enforces max_branches limit)
 *   PUT    /api/branches/:id      Update branch
 *   DELETE /api/branches/:id      Delete branch (blocked if has sales)
 */

const express = require('express')
const router  = express.Router()
const { authMiddleware }   = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')
const { pool, selectOne, insertOne, updateOne } = require('../db/query')
const { standardLimiter }  = require('../middleware/rateLimiter')

router.use(standardLimiter, authMiddleware, tenantMiddleware)

// ── GET /api/branches ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM branches WHERE tenant_id = $1 ORDER BY name`,
      [req.tenantId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// ── GET /api/branches/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM branches WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [req.params.id, req.tenantId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'الفرع غير موجود' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// ── POST /api/branches ─────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { code, name, contract_number, brand_name, unit_number, location, address } = req.body

    if (!code?.trim()) return res.status(422).json({ error: 'كود الفرع مطلوب' })
    if (!name?.trim()) return res.status(422).json({ error: 'اسم الفرع مطلوب' })

    // Enforce max_branches limit
    const [countRes, tenantRes] = await Promise.all([
      pool.query(`SELECT count(*)::int AS n FROM branches WHERE tenant_id = $1`, [req.tenantId]),
      pool.query(`SELECT max_branches FROM tenants WHERE id = $1`, [req.tenantId]),
    ])
    const currentCount = countRes.rows[0].n
    const maxBranches  = tenantRes.rows[0]?.max_branches

    if (maxBranches != null && currentCount >= maxBranches) {
      return res.status(422).json({
        error: `وصلت إلى الحد الأقصى للفروع المسموح بها (${maxBranches} فروع). تواصل مع الإدارة للترقية.`,
      })
    }

    try {
      const data = await insertOne('branches', {
        tenant_id:       req.tenantId,
        code:            code.trim(),
        name:            name.trim(),
        contract_number: contract_number || null,
        brand_name:      brand_name      || null,
        unit_number:     unit_number     || null,
        location:        location        || null,
        address:         address         || null,
      })
      res.status(201).json(data)
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'كود الفرع مستخدم مسبقاً. يرجى اختيار كود آخر.' })
      throw e
    }
  } catch (err) { next(err) }
})

// ── PUT /api/branches/:id ──────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { code, name, contract_number, brand_name, unit_number, location, address } = req.body

    if (!code?.trim()) return res.status(422).json({ error: 'كود الفرع مطلوب' })
    if (!name?.trim()) return res.status(422).json({ error: 'اسم الفرع مطلوب' })

    try {
      const { rows } = await pool.query(
        `UPDATE branches
         SET code = $1, name = $2, contract_number = $3, brand_name = $4,
             unit_number = $5, location = $6, address = $7
         WHERE id = $8 AND tenant_id = $9
         RETURNING *`,
        [
          code.trim(), name.trim(),
          contract_number || null, brand_name || null,
          unit_number || null, location || null, address || null,
          req.params.id, req.tenantId,
        ]
      )
      if (!rows[0]) return res.status(404).json({ error: 'الفرع غير موجود' })
      res.json(rows[0])
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'كود الفرع مستخدم مسبقاً. يرجى اختيار كود آخر.' })
      throw e
    }
  } catch (err) { next(err) }
})

// ── DELETE /api/branches/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    // Block deletion if branch has sales records
    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS n FROM sales WHERE branch_id = $1`,
      [req.params.id]
    )
    if (countRows[0].n > 0) {
      return res.status(422).json({ error: 'لا يمكن حذف الفرع لأن لديه سجلات مبيعات مرتبطة به.' })
    }

    const res2 = await pool.query(
      `DELETE FROM branches WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    )
    if (!res2.rowCount) return res.status(404).json({ error: 'الفرع غير موجود' })
    res.status(204).end()
  } catch (err) { next(err) }
})

module.exports = router
