/**
 * Admin routes — super-admin only
 *
 * Tenants:
 *   GET    /api/admin/tenants
 *   POST   /api/admin/tenants
 *   GET    /api/admin/tenants/:id
 *   PUT    /api/admin/tenants/:id
 *   DELETE /api/admin/tenants/:id
 *
 * API Keys (per tenant):
 *   GET    /api/admin/tenants/:id/api-keys
 *   POST   /api/admin/tenants/:id/api-keys
 *   PUT    /api/admin/api-keys/:keyId
 *   DELETE /api/admin/api-keys/:keyId
 */

const express  = require('express')
const crypto   = require('crypto')
const router   = express.Router()
const { supabase }       = require('../config/supabase')
const { authMiddleware } = require('../middleware/auth')
const { tenantMiddleware, superAdminOnly } = require('../middleware/tenantMiddleware')
const { standardLimiter } = require('../middleware/rateLimiter')

// All admin routes require auth + super-admin
router.use(standardLimiter, authMiddleware, tenantMiddleware, superAdminOnly)

// ── TENANTS ───────────────────────────────────────────────────────────────────

// List all tenants
router.get('/tenants', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, tenant_users(count)')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

// Create tenant + optionally create its first user
router.post('/tenants', async (req, res, next) => {
  try {
    const {
      name, slug, plan = 'basic', activated_at, expires_at, notes,
      allowed_input_types = ['daily'],
      // optional user to create
      user_email, user_password, user_name,
    } = req.body

    if (!name || !slug) {
      return res.status(422).json({ error: 'اسم المستأجر والرمز المختصر مطلوبان' })
    }

    // Create tenant
    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .insert({
        name, slug, plan,
        activated_at: activated_at || new Date().toISOString(),
        expires_at: expires_at || null,
        notes: notes || null,
        allowed_input_types,
      })
      .select()
      .single()
    if (tErr) {
      if (tErr.code === '23505') return res.status(409).json({ error: 'الرمز المختصر مستخدم مسبقاً' })
      throw tErr
    }

    // Optionally create user
    let createdUser = null
    if (user_email && user_password) {
      const { data: authData, error: uErr } = await supabase.auth.admin.createUser({
        email: user_email,
        password: user_password,
        email_confirm: true,
        user_metadata: { full_name: user_name || name },
      })
      if (uErr) {
        // Roll back tenant
        await supabase.from('tenants').delete().eq('id', tenant.id)
        return res.status(422).json({ error: `فشل إنشاء المستخدم: ${uErr.message}` })
      }
      createdUser = authData.user

      // Link user to tenant
      await supabase.from('tenant_users').insert({
        tenant_id: tenant.id,
        user_id:   createdUser.id,
        role:      'admin',
      })
    }

    res.status(201).json({ tenant, user: createdUser })
  } catch (err) { next(err) }
})

// Get single tenant
router.get('/tenants/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, tenant_users(id, user_id, role)')
      .eq('id', req.params.id)
      .single()
    if (error) return res.status(404).json({ error: 'المستأجر غير موجود' })
    res.json(data)
  } catch (err) { next(err) }
})

// Update tenant (subscription dates, status, allowed_input_types, etc.)
router.put('/tenants/:id', async (req, res, next) => {
  try {
    const allowed = [
      'name','slug','plan','status','activated_at','expires_at',
      'notes','allowed_input_types','allow_advanced_dashboard',
      'allow_import','allow_reports',
      'commercial_registration','primary_phone','account_number',
    ]
    const updates = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (err) { next(err) }
})

// Delete tenant
router.delete('/tenants/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('tenants').delete().eq('id', req.params.id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ message: 'تم حذف المستأجر بنجاح' })
  } catch (err) { next(err) }
})

// ── API KEYS ─────────────────────────────────────────────────────────────────

const ALL_FIELDS = [
  'contract_number','branch_code','branch_name','brand_name','unit_number',
  'location','invoice_number','input_type','period_from_date','period_to_date',
  'sale_date','month','year','amount','status',
]

// List API keys for a tenant
router.get('/tenants/:id/api-keys', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id,tenant_id,label,key_prefix,allowed_fields,is_active,last_used_at,expires_at,created_at')
      .eq('tenant_id', req.params.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ keys: data, all_fields: ALL_FIELDS })
  } catch (err) { next(err) }
})

// Create new API key for a tenant
router.post('/tenants/:id/api-keys', async (req, res, next) => {
  try {
    const { label, allowed_fields, expires_at } = req.body
    if (!label) return res.status(422).json({ error: 'اسم المفتاح مطلوب' })

    // Generate key: msk_ + 32 random hex chars
    const rawKey   = 'msk_' + crypto.randomBytes(20).toString('hex')
    const prefix   = rawKey.slice(0, 12)
    const keyHash  = crypto.createHash('sha256').update(rawKey).digest('hex')

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        tenant_id:      req.params.id,
        label,
        key_prefix:     prefix,
        key_hash:       keyHash,
        allowed_fields: allowed_fields || ['contract_number','period_from_date','period_to_date','amount'],
        is_active:      true,
        expires_at:     expires_at || null,
      })
      .select('id,tenant_id,label,key_prefix,allowed_fields,is_active,expires_at,created_at')
      .single()
    if (error) throw error

    // Return the raw key ONCE — never stored in DB
    res.status(201).json({ ...data, raw_key: rawKey, all_fields: ALL_FIELDS })
  } catch (err) { next(err) }
})

// Update API key (allowed_fields, is_active, expires_at, label)
router.put('/api-keys/:keyId', async (req, res, next) => {
  try {
    const allowed = ['label','allowed_fields','is_active','expires_at']
    const updates = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }
    const { data, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', req.params.keyId)
      .select('id,tenant_id,label,key_prefix,allowed_fields,is_active,expires_at,created_at')
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (err) { next(err) }
})

// Revoke / delete API key
router.delete('/api-keys/:keyId', async (req, res, next) => {
  try {
    const { error } = await supabase.from('api_keys').delete().eq('id', req.params.keyId)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ message: 'تم حذف المفتاح بنجاح' })
  } catch (err) { next(err) }
})

// ── TENANT BRANCHES (for BotSubscriberForm branch dropdown) ──────────────────

// List branches belonging to a tenant
router.get('/tenants/:id/branches', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, code, name, brand_name')
      .eq('tenant_id', req.params.id)
      .order('code', { ascending: true })
    if (error) throw error
    res.json(data || [])
  } catch (err) { next(err) }
})

// ── USER MANAGEMENT ───────────────────────────────────────────────────────────

// List all users with their tenant memberships
router.get('/users', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tenant_users')
      .select('id, user_id, role, created_at, tenants(id, name, slug)')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (err) { next(err) }
})

// ── BOT SUBSCRIBERS ───────────────────────────────────────────────────────────

// List all bot subscribers
router.get('/bot-subscribers', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('bot_subscribers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (err) { next(err) }
})

// Get single subscriber
router.get('/bot-subscribers/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('bot_subscribers')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) return res.status(404).json({ error: 'المشترك غير موجود' })
    res.json(data)
  } catch (err) { next(err) }
})

// Create subscriber
router.post('/bot-subscribers', async (req, res, next) => {
  try {
    const {
      tenant_id, branch_id, platform, chat_id, contact_name,
      tenant_name, contract_number, branch_code, branch_name,
    } = req.body
    if (!tenant_id)  return res.status(422).json({ error: 'يرجى اختيار المستأجر' })
    if (!branch_id)  return res.status(422).json({ error: 'يرجى اختيار الفرع' })
    if (!platform)   return res.status(422).json({ error: 'يرجى اختيار المنصة' })
    if (!chat_id)    return res.status(422).json({ error: 'معرّف المحادثة مطلوب' })

    const { data, error } = await supabase
      .from('bot_subscribers')
      .insert({ tenant_id, branch_id, platform, chat_id, contact_name: contact_name || null,
                tenant_name, contract_number: contract_number || null,
                branch_code, branch_name: branch_name || null })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'هذا المشترك مسجّل مسبقاً على نفس المنصة' })
      throw error
    }
    res.status(201).json(data)
  } catch (err) { next(err) }
})

// Update subscriber (is_active, contact_name, branch reassignment, etc.)
router.put('/bot-subscribers/:id', async (req, res, next) => {
  try {
    const allowed = [
      'branch_id','platform','chat_id','contact_name','is_active',
      'tenant_name','contract_number','branch_code','branch_name',
    ]
    const updates = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }
    const { data, error } = await supabase
      .from('bot_subscribers')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (err) { next(err) }
})

// Delete subscriber
router.delete('/bot-subscribers/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('bot_subscribers').delete().eq('id', req.params.id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ message: 'تم حذف المشترك بنجاح' })
  } catch (err) { next(err) }
})

module.exports = router
