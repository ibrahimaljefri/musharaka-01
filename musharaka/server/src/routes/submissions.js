/**
 * GET /api/submissions — list submission history for current tenant
 *
 * Query params: branch_id, status, limit, offset
 */
const express = require('express')
const router  = express.Router()
const { authMiddleware }   = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')
const { pool }             = require('../db/query')
const { standardLimiter }  = require('../middleware/rateLimiter')
const { applyBranchScope } = require('../utils/branchScope')

router.use(standardLimiter, authMiddleware, tenantMiddleware)

router.get('/', async (req, res, next) => {
  try {
    const { branch_id, status } = req.query
    const limit  = Math.min(parseInt(req.query.limit)  || 500, 1000)
    const offset = Math.max(parseInt(req.query.offset) || 0, 0)

    const where = ['s.tenant_id = $1']
    const params = [req.tenantId]
    if (branch_id) { params.push(branch_id);     where.push(`s.branch_id = $${params.length}`) }
    if (status)    { params.push(status);        where.push(`s.status = $${params.length}`) }
    applyBranchScope(req, where, params, 's.branch_id')

    const whereSql = 'WHERE ' + where.join(' AND ')

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT count(*)::int AS n FROM submissions s ${whereSql}`, params),
      (() => {
        const p = [...params, limit, offset]
        return pool.query(
          `SELECT s.*, b.code AS branch_code, b.name AS branch_name
           FROM submissions s
           LEFT JOIN branches b ON b.id = s.branch_id
           ${whereSql}
           ORDER BY s.created_at DESC
           LIMIT $${p.length - 1} OFFSET $${p.length}`,
          p
        )
      })(),
    ])

    res.json({
      total:       countRes.rows[0].n,
      limit,
      offset,
      submissions: dataRes.rows,
    })
  } catch (err) { next(err) }
})

module.exports = router
