/**
 * Public Contracts API
 * GET /api/contracts
 *
 * Authentication (one of):
 *   1. Bearer JWT  — standard user token (tenant-scoped automatically)
 *   2. X-API-Key header OR ?api_key= query param — hashed key looked up in api_keys table
 *
 * Query params (all optional):
 *   branch_id  — filter by branch UUID
 *   from       — ISO date "YYYY-MM-DD"  (sale_date >=)
 *   to         — ISO date "YYYY-MM-DD"  (sale_date <=)
 *   status     — "pending" | "sent"
 *   limit      — max rows (default 500, max 1000)
 *   offset     — pagination offset (default 0)
 *
 * Response fields depend on the API key's allowed_fields setting.
 */

const express = require('express')
const crypto  = require('crypto')
const router  = express.Router()
const { supabase } = require('../config/supabase')
const { standardLimiter } = require('../middleware/rateLimiter')
const { authMiddleware }  = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')

const IS_DEV = !process.env.SUPABASE_URL ||
               process.env.SUPABASE_URL.includes('placeholder')

// All possible fields in the response
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
    // Hash the provided key and look it up
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('id, tenant_id, is_active, expires_at, allowed_fields')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (!keyRecord || !keyRecord.is_active) {
      return res.status(401).json({ error: 'مفتاح API غير صالح أو معطّل' })
    }
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return res.status(401).json({ error: 'مفتاح API منتهي الصلاحية' })
    }

    // Update last_used_at (fire and forget)
    supabase.from('api_keys').update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id).then(() => {})

    req.tenantId      = keyRecord.tenant_id
    req.allowedFields = keyRecord.allowed_fields  // field-level control from key
    req.isSuperAdmin  = false
    return next()
  }

  // Fall back to JWT auth + tenant middleware
  authMiddleware(req, res, () => {
    tenantMiddleware(req, res, () => {
      // JWT users get all fields by default
      req.allowedFields = ALL_FIELDS
      next()
    })
  })
}

// ── Dev mode: return mock data without Supabase ───────────────────────────────
router.get('/', standardLimiter, async (req, res, next) => {
  if (!IS_DEV) return next()

  const apiKey = req.headers['x-api-key'] || req.query.api_key
  if (!apiKey) return res.status(401).json({ error: 'يرجى توفير مفتاح API' })

  const { from, to, status, limit = 100, offset = 0 } = req.query
  const safeLimit  = Math.min(parseInt(limit) || 100, 1000)
  const safeOffset = Math.max(parseInt(offset) || 0, 0)

  // Build sample records filtered by query params
  const today = new Date().toISOString().split('T')[0]
  const samples = [
    { id: 'dev-1', contract_number: 'CNT-001', branch_code: 'BR-001', branch_name: 'فرع الرياض',
      brand_name: 'مشاركة', unit_number: 'U-01', location: 'الرياض', invoice_number: 'INV-2026-001',
      input_type: 'daily', period_from_date: today, period_to_date: today,
      sale_date: today, month: new Date().getMonth() + 1, year: new Date().getFullYear(),
      amount: 5000.00, status: 'pending' },
    { id: 'dev-2', contract_number: 'CNT-001', branch_code: 'BR-001', branch_name: 'فرع الرياض',
      brand_name: 'مشاركة', unit_number: 'U-01', location: 'الرياض', invoice_number: 'INV-2026-002',
      input_type: 'daily', period_from_date: '2026-01-15', period_to_date: '2026-01-15',
      sale_date: '2026-01-15', month: 1, year: 2026, amount: 3200.00, status: 'sent' },
    { id: 'dev-3', contract_number: 'CNT-001', branch_code: 'BR-001', branch_name: 'فرع الرياض',
      brand_name: 'مشاركة', unit_number: 'U-01', location: 'الرياض', invoice_number: 'INV-2026-003',
      input_type: 'monthly', period_from_date: '2026-02-01', period_to_date: '2026-02-28',
      sale_date: '2026-02-01', month: 2, year: 2026, amount: 15000.00, status: 'sent' },
  ]

  let records = samples
  if (status)          records = records.filter(r => r.status === status)
  if (from)            records = records.filter(r => r.sale_date >= from)
  if (to)              records = records.filter(r => r.sale_date <= to)

  const total  = records.length
  const paged  = records.slice(safeOffset, safeOffset + safeLimit)

  return res.json({
    total,
    limit:   safeLimit,
    offset:  safeOffset,
    records: paged,
    _dev:    true,  // flag so callers know this is mock data
  })
})

// ── GET /api/contracts ────────────────────────────────────────────────────────
router.get('/', standardLimiter, resolveAuth, async (req, res, next) => {
  try {
    const {
      branch_id,
      from,
      to,
      status,
      limit  = 500,
      offset = 0,
    } = req.query

    const safeLimit  = Math.min(parseInt(limit)  || 500, 1000)
    const safeOffset = Math.max(parseInt(offset) || 0,   0)

    let q = supabase
      .from('sales')
      .select(
        `id, invoice_number, input_type, sale_date,
         period_start_date, period_end_date, month, year, amount, status,
         branches(id, code, name, contract_number, brand_name, unit_number, location)`,
        { count: 'exact' }
      )
      .order('sale_date', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1)

    // Tenant isolation — must always filter by tenant_id
    if (req.tenantId) q = q.eq('tenant_id', req.tenantId)

    if (branch_id) q = q.eq('branch_id', branch_id)
    if (status)    q = q.eq('status', status)
    if (from)      q = q.gte('sale_date', from)
    if (to)        q = q.lte('sale_date', to)

    const { data, error, count } = await q
    if (error) throw error

    // Build full record shape
    const fullRecords = (data || []).map(row => ({
      id:               row.id,
      contract_number:  row.branches?.contract_number  || null,
      branch_code:      row.branches?.code             || null,
      branch_name:      row.branches?.name             || null,
      brand_name:       row.branches?.brand_name       || null,
      unit_number:      row.branches?.unit_number      || null,
      location:         row.branches?.location         || null,
      invoice_number:   row.invoice_number             || null,
      input_type:       row.input_type,
      period_from_date: row.period_start_date || row.sale_date,
      period_to_date:   row.period_end_date   || row.sale_date,
      sale_date:        row.sale_date,
      month:            row.month,
      year:             row.year,
      amount:           parseFloat(row.amount),
      status:           row.status,
    }))

    // Apply field-level filtering (API key allowed_fields)
    const allowedFields = req.allowedFields || ALL_FIELDS
    const records = fullRecords.map(r =>
      Object.fromEntries(
        Object.entries(r).filter(([k]) => allowedFields.includes(k))
      )
    )

    res.json({
      total:   count   || 0,
      limit:   safeLimit,
      offset:  safeOffset,
      records,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
