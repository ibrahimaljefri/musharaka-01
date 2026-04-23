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
const { supabase }         = require('../config/supabase')
const { standardLimiter }  = require('../middleware/rateLimiter')

router.use(standardLimiter, authMiddleware, tenantMiddleware)

// ── GET /api/branches ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('name')
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    next(err)
  }
})

// ── GET /api/branches/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single()
    if (error || !data) return res.status(404).json({ error: 'الفرع غير موجود' })
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/branches ─────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { code, name, contract_number, brand_name, unit_number, location, address } = req.body
    // token intentionally excluded — Cenomi token is now on the tenant, not the branch

    if (!code?.trim()) return res.status(422).json({ error: 'كود الفرع مطلوب' })
    if (!name?.trim()) return res.status(422).json({ error: 'اسم الفرع مطلوب' })

    // Enforce max_branches limit (server-side — cannot be bypassed)
    const [{ count: currentCount }, { data: tenant }] = await Promise.all([
      supabase
        .from('branches')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', req.tenantId),
      supabase
        .from('tenants')
        .select('max_branches')
        .eq('id', req.tenantId)
        .single(),
    ])

    const maxBranches = tenant?.max_branches
    if (maxBranches != null && currentCount >= maxBranches) {
      return res.status(422).json({
        error: `وصلت إلى الحد الأقصى للفروع المسموح بها (${maxBranches} فروع). تواصل مع الإدارة للترقية.`,
      })
    }

    const { data, error } = await supabase
      .from('branches')
      .insert({
        tenant_id:       req.tenantId,
        code:            code.trim(),
        name:            name.trim(),
        contract_number: contract_number || null,
        brand_name:      brand_name      || null,
        unit_number:     unit_number     || null,
        location:        location        || null,
        address:         address         || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'كود الفرع مستخدم مسبقاً. يرجى اختيار كود آخر.' })
      throw error
    }

    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/branches/:id ──────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { code, name, contract_number, brand_name, unit_number, location, address } = req.body
    // token intentionally excluded — Cenomi token is now on the tenant, not the branch

    if (!code?.trim()) return res.status(422).json({ error: 'كود الفرع مطلوب' })
    if (!name?.trim()) return res.status(422).json({ error: 'اسم الفرع مطلوب' })

    // Ownership check — only update branches belonging to this tenant
    const { data, error } = await supabase
      .from('branches')
      .update({
        code:            code.trim(),
        name:            name.trim(),
        contract_number: contract_number || null,
        brand_name:      brand_name      || null,
        unit_number:     unit_number     || null,
        location:        location        || null,
        address:         address         || null,
      })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)   // ownership guard
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'كود الفرع مستخدم مسبقاً. يرجى اختيار كود آخر.' })
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'الفرع غير موجود' })
      throw error
    }

    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/branches/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    // Block deletion if branch has sales records
    const { count } = await supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', req.params.id)

    if (count > 0) {
      return res.status(422).json({ error: 'لا يمكن حذف الفرع لأن لديه سجلات مبيعات مرتبطة به.' })
    }

    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)   // ownership guard

    if (error) throw error
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

module.exports = router
