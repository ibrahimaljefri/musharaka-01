const express = require('express')
const router  = express.Router()
const { authMiddleware }   = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')
const { createSale }       = require('../controllers/saleController')
const { pool }             = require('../db/query')
const { standardLimiter, strictLimiter } = require('../middleware/rateLimiter')
const { applyBranchScope, isBranchOutOfScope } = require('../utils/branchScope')

// ── GET /api/sales ──────────────────────────────────────────────────────────
// Query params: branch_id, status, from, to, month, year, limit, offset
router.get('/', standardLimiter, authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const { branch_id, status, from, to, month, year } = req.query
    const limit  = Math.min(parseInt(req.query.limit)  || 500, 1000)
    const offset = Math.max(parseInt(req.query.offset) || 0, 0)

    const where = []
    const params = []

    if (req.tenantId)    { params.push(req.tenantId);       where.push(`tenant_id = $${params.length}`) }
    if (branch_id)       { params.push(branch_id);           where.push(`branch_id = $${params.length}`) }
    applyBranchScope(req, where, params, 'branch_id')
    if (status)          { params.push(status);              where.push(`status = $${params.length}`) }
    if (from)            { params.push(from);                where.push(`sale_date >= $${params.length}`) }
    if (to)              { params.push(to);                  where.push(`sale_date <= $${params.length}`) }
    if (month)           { params.push(parseInt(month));     where.push(`month = $${params.length}`) }
    if (year)            { params.push(parseInt(year));      where.push(`year = $${params.length}`) }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT count(*)::int AS n FROM sales ${whereSql}`, params),
      (() => {
        const p = [...params, limit, offset]
        return pool.query(
          `SELECT * FROM sales ${whereSql} ORDER BY sale_date DESC
           LIMIT $${p.length - 1} OFFSET $${p.length}`,
          p
        )
      })(),
    ])

    res.json({
      total:  countRes.rows[0].n,
      limit,
      offset,
      sales:  dataRes.rows,
    })
  } catch (err) { next(err) }
})

// ── DELETE /api/sales/:id ───────────────────────────────────────────────────
router.delete('/:id', standardLimiter, authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    // Branch-scope check: fetch the sale's branch first, then 403 if out of scope
    const { rows: saleRows } = await pool.query(
      `SELECT branch_id FROM sales WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [req.params.id, req.tenantId]
    )
    if (!saleRows[0]) return res.status(404).json({ error: 'سجل المبيعات غير موجود' })
    if (isBranchOutOfScope(req, saleRows[0].branch_id)) {
      return res.status(403).json({ error: 'لا تملك صلاحية الوصول إلى هذا الفرع' })
    }

    const r = await pool.query(
      `DELETE FROM sales WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    )
    if (!r.rowCount) return res.status(404).json({ error: 'سجل المبيعات غير موجود' })
    res.status(204).end()
  } catch (err) { next(err) }
})

// Branch-scope guard for POST /sales — rejects member POSTing to a foreign branch
function ensureBranchInScope(req, res, next) {
  if (isBranchOutOfScope(req, req.body?.branch_id)) {
    return res.status(403).json({ error: 'لا تملك صلاحية الوصول إلى هذا الفرع' })
  }
  next()
}

// ── POST /api/sales ─────────────────────────────────────────────────────────
router.post('/', standardLimiter, strictLimiter, authMiddleware, tenantMiddleware, ensureBranchInScope, createSale)

module.exports = router
