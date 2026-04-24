/**
 * Public Contracts API
 * GET /api/contracts
 *
 * Authentication (one of):
 *   1. Bearer JWT
 *   2. X-API-Key header OR ?api_key= query param
 */

const express = require('express')
const crypto  = require('crypto')
const router  = express.Router()
const { pool } = require('../db/query')
const { standardLimiter } = require('../middleware/rateLimiter')
const { authMiddleware }  = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')

const IS_DEV = !process.env.DATABASE_URL

const ALL_FIELDS = [
  'id','contract_number','branch_code','branch_name','brand_name',
  'unit_number','location','invoice_number','input_type',
  'period_from_date','period_to_date','sale_date','month','year',
  'amount','status',
]

// ── Auth resolver: JWT user OR API key ────────────────────────────────────────
async function resolveAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key

  if (apiKey) {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const { rows } = await pool.query(
      `SELECT id, tenant_id, is_active, expires_at, allowed_fields
       FROM api_keys WHERE key_hash = $1 LIMIT 1`,
      [keyHash]
    )
    const keyRecord = rows[0]

    if (!keyRecord || !keyRecord.is_active) {
      return res.status(401).json({ error: 'مفتاح API غير صالح أو معطّل' })
    }
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return res.status(401).json({ error: 'مفتاح API منتهي الصلاحية' })
    }

    // Update last_used_at (fire and forget)
    pool.query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [keyRecord.id])
      .catch(err => console.error('[contracts] last_used_at update failed:', err.message))

    req.tenantId      = keyRecord.tenant_id
    req.allowedFields = keyRecord.allowed_fields
    req.isSuperAdmin  = false
    return next()
  }

  // Fall back to JWT auth + tenant middleware
  authMiddleware(req, res, () => {
    tenantMiddleware(req, res, () => {
      req.allowedFields = ALL_FIELDS
      next()
    })
  })
}

// ── Dev mode mock data ─────────────────────────────────────────────────────────
router.get('/', standardLimiter, async (req, res, next) => {
  if (!IS_DEV) return next()

  const apiKey = req.headers['x-api-key'] || req.query.api_key
  if (!apiKey) return res.status(401).json({ error: 'يرجى توفير مفتاح API' })

  const { from, to, status, limit = 100, offset = 0 } = req.query
  const safeLimit  = Math.min(parseInt(limit) || 100, 1000)
  const safeOffset = Math.max(parseInt(offset) || 0, 0)

  const today = new Date().toISOString().split('T')[0]
  const samples = [
    { id: 'dev-1', contract_number: 'CNT-001', branch_code: 'BR-001', branch_name: 'فرع الرياض',
      brand_name: 'مشاركة', unit_number: 'U-01', location: 'الرياض', invoice_number: 'INV-2026-001',
      input_type: 'daily', period_from_date: today, period_to_date: today,
      sale_date: today, month: new Date().getMonth() + 1, year: new Date().getFullYear(),
      amount: 5000.00, status: 'pending' },
  ]

  let records = samples
  if (status) records = records.filter(r => r.status === status)
  if (from)   records = records.filter(r => r.sale_date >= from)
  if (to)     records = records.filter(r => r.sale_date <= to)

  const total = records.length
  const paged = records.slice(safeOffset, safeOffset + safeLimit)

  return res.json({ total, limit: safeLimit, offset: safeOffset, records: paged, _dev: true })
})

// ── GET /api/contracts ────────────────────────────────────────────────────────
router.get('/', standardLimiter, resolveAuth, async (req, res, next) => {
  try {
    const { branch_id, from, to, status, limit = 500, offset = 0 } = req.query

    const safeLimit  = Math.min(parseInt(limit)  || 500, 1000)
    const safeOffset = Math.max(parseInt(offset) || 0, 0)

    const where = []
    const params = []
    if (req.tenantId) { params.push(req.tenantId);   where.push(`s.tenant_id = $${params.length}`) }
    if (branch_id)    { params.push(branch_id);       where.push(`s.branch_id = $${params.length}`) }
    if (status)       { params.push(status);          where.push(`s.status = $${params.length}`) }
    if (from)         { params.push(from);            where.push(`s.sale_date >= $${params.length}`) }
    if (to)           { params.push(to);              where.push(`s.sale_date <= $${params.length}`) }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

    // Count query
    const countRes = await pool.query(
      `SELECT count(*)::int AS n FROM sales s ${whereSql}`,
      params
    )
    const total = countRes.rows[0].n

    // Data query with branch join
    params.push(safeLimit, safeOffset)
    const dataSql = `
      SELECT
        s.id, s.invoice_number, s.input_type, s.sale_date,
        s.period_start_date, s.period_end_date, s.month, s.year, s.amount, s.status,
        b.code AS branch_code, b.name AS branch_name, b.contract_number,
        b.brand_name, b.unit_number, b.location
      FROM sales s
      LEFT JOIN branches b ON b.id = s.branch_id
      ${whereSql}
      ORDER BY s.sale_date DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `
    const { rows: data } = await pool.query(dataSql, params)

    const fullRecords = data.map(row => ({
      id:               row.id,
      contract_number:  row.contract_number || null,
      branch_code:      row.branch_code     || null,
      branch_name:      row.branch_name     || null,
      brand_name:       row.brand_name      || null,
      unit_number:      row.unit_number     || null,
      location:         row.location        || null,
      invoice_number:   row.invoice_number  || null,
      input_type:       row.input_type,
      period_from_date: row.period_start_date || row.sale_date,
      period_to_date:   row.period_end_date   || row.sale_date,
      sale_date:        row.sale_date,
      month:            row.month,
      year:             row.year,
      amount:           parseFloat(row.amount),
      status:           row.status,
    }))

    const allowedFields = req.allowedFields || ALL_FIELDS
    const records = fullRecords.map(r =>
      Object.fromEntries(Object.entries(r).filter(([k]) => allowedFields.includes(k)))
    )

    res.json({ total, limit: safeLimit, offset: safeOffset, records })
  } catch (err) {
    next(err)
  }
})

module.exports = router
