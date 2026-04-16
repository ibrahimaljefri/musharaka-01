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

// ── PLATFORM STATS ────────────────────────────────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const now  = new Date()
    const in3  = new Date(now); in3.setMonth(in3.getMonth() + 3)
    const in6  = new Date(now); in6.setMonth(in6.getMonth() + 6)
    const in11 = new Date(now); in11.setMonth(in11.getMonth() + 11)

    const [r0, r1, r2, r3, r4, r5, r6] = await Promise.all([
      supabase.from('tenants').select('*', { count: 'exact', head: true }),
      supabase.from('tenants').select('id, name, status, expires_at'),
      supabase.from('branches').select('*', { count: 'exact', head: true }),
      supabase.from('tenant_users').select('*', { count: 'exact', head: true }),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from('tenant_users').select('user_id, tenants(id, name)'),
      supabase.from('branches').select('tenant_id, tenants(name)'),
    ])

    if (r0.error) throw r0.error
    if (r1.error) throw r1.error
    if (r2.error) throw r2.error
    if (r3.error) throw r3.error
    if (r4.error) throw r4.error
    if (r5.error) throw r5.error
    if (r6.error) throw r6.error

    const totalTenants     = r0.count     || 0
    const tenants          = r1.data      || []
    const totalBranches    = r2.count     || 0
    const totalTenantUsers = r3.count     || 0
    const authUsers        = r4.data?.users || []
    const tuRows           = r5.data      || []
    const branchRows       = r6.data      || []

    const active   = tenants.filter(t => t.status === 'active')
    const exp3     = active.filter(t => t.expires_at && new Date(t.expires_at) <= in3)
    const exp6     = active.filter(t => t.expires_at && new Date(t.expires_at) > in3  && new Date(t.expires_at) <= in6)
    const exp11    = active.filter(t => t.expires_at && new Date(t.expires_at) > in6  && new Date(t.expires_at) <= in11)
    const exp12p   = active.filter(t => t.expires_at && new Date(t.expires_at) > in11)
    const noExpiry = active.filter(t => !t.expires_at)

    const usersPerTenant = {}
    for (const row of tuRows || []) {
      const key = row.tenants?.name || row.user_id
      usersPerTenant[key] = (usersPerTenant[key] || 0) + 1
    }

    const branchesPerTenant = {}
    for (const row of branchRows || []) {
      const key = row.tenants?.name || row.tenant_id
      branchesPerTenant[key] = (branchesPerTenant[key] || 0) + 1
    }

    res.json({
      totals: {
        tenants:       totalTenants,
        branches:      totalBranches,
        tenant_users:  totalTenantUsers,
        auth_users:    authUsers.length,
        pending_users: Math.max(0, authUsers.length - totalTenantUsers),
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

// List ALL registered users (assigned + pending)
router.get('/users', async (req, res, next) => {
  try {
    const { data: usersData, error: authErr } = await supabase.auth.admin.listUsers()
    if (authErr) throw authErr
    const authUsers = usersData?.users || []

    const { data: tenantUsers, error: tuErr } = await supabase
      .from('tenant_users')
      .select('user_id, role, tenants(id, name)')
    if (tuErr) throw tuErr

    const assignmentMap = {}
    for (const tu of tenantUsers || []) {
      assignmentMap[tu.user_id] = {
        tenant_id:   tu.tenants?.id,
        tenant_name: tu.tenants?.name,
        role:        tu.role,
      }
    }

    const result = authUsers.map(u => {
      const a = assignmentMap[u.id] || null
      return {
        id:            u.id,
        email:         u.email,
        full_name:     u.user_metadata?.full_name || u.user_metadata?.name || null,
        status:        a ? 'assigned' : 'pending',
        tenant_id:     a?.tenant_id   || null,
        tenant_name:   a?.tenant_name || null,
        role:          a?.role        || null,
        registered_at: u.created_at,
      }
    })

    res.json(result)
  } catch (err) { next(err) }
})

// Create user (by admin — email auto-confirmed)
router.post('/users', async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body
    if (!email)    return res.status(422).json({ error: 'البريد الإلكتروني مطلوب' })
    if (!password) return res.status(422).json({ error: 'كلمة المرور مطلوبة' })

    const { data, error } = await supabase.auth.admin.createUser({
      email, password,
      user_metadata: { full_name: full_name || '' },
      email_confirm: true,
    })
    if (error) throw error
    res.status(201).json({ id: data.user.id, email: data.user.email })
  } catch (err) { next(err) }
})

// Assign user to tenant
router.post('/users/:id/assign', async (req, res, next) => {
  try {
    const { tenant_id, role } = req.body
    if (!tenant_id) return res.status(422).json({ error: 'يرجى اختيار المستأجر' })

    // Remove any existing assignment first, then insert the new one.
    // Using delete+insert avoids the ON CONFLICT constraint requirement.
    const { error: delErr } = await supabase
      .from('tenant_users')
      .delete()
      .eq('user_id', req.params.id)
    if (delErr) throw delErr

    const { error: insErr } = await supabase
      .from('tenant_users')
      .insert({ user_id: req.params.id, tenant_id, role: role || 'member' })
    if (insErr) throw insErr

    res.json({ message: 'تم تعيين المستخدم بنجاح' })
  } catch (err) { next(err) }
})

// Update user (name, password, tenant assignment, role)
router.put('/users/:id', async (req, res, next) => {
  try {
    const { full_name, new_password, tenant_id, role } = req.body

    const updates = { user_metadata: { full_name: full_name || '' } }
    if (new_password) updates.password = new_password

    const { error: authErr } = await supabase.auth.admin.updateUserById(req.params.id, updates)
    if (authErr) throw authErr

    if (tenant_id) {
      // delete+insert to avoid ON CONFLICT constraint requirement
      const { error: delErr } = await supabase
        .from('tenant_users')
        .delete()
        .eq('user_id', req.params.id)
      if (delErr) throw delErr

      const { error: tuErr } = await supabase
        .from('tenant_users')
        .insert({ user_id: req.params.id, tenant_id, role: role || 'member' })
      if (tuErr) throw tuErr
    } else {
      await supabase.from('tenant_users').delete().eq('user_id', req.params.id)
    }

    res.json({ message: 'تم تحديث المستخدم بنجاح' })
  } catch (err) { next(err) }
})

// Delete user
router.delete('/users/:id', async (req, res, next) => {
  try {
    await supabase.from('tenant_users').delete().eq('user_id', req.params.id)
    const { error } = await supabase.auth.admin.deleteUser(req.params.id)
    if (error) throw error
    res.json({ message: 'تم حذف المستخدم' })
  } catch (err) { next(err) }
})

// ── BOT SUBSCRIBERS ───────────────────────────────────────────────────────────

// List all bot subscribers
router.get('/bot-subscribers', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('bot_subscribers')
      .select('id,tenant_id,tenant_name,platform,chat_id,contact_name,is_active,last_message_at,created_at')
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
    const { tenant_id, platform, chat_id, contact_name, tenant_name } = req.body
    if (!tenant_id)   return res.status(422).json({ error: 'يرجى اختيار المستأجر' })
    if (!platform)    return res.status(422).json({ error: 'يرجى اختيار المنصة' })
    if (!chat_id)     return res.status(422).json({ error: 'معرّف المحادثة مطلوب' })
    if (!tenant_name) return res.status(422).json({ error: 'اسم المستأجر مطلوب' })

    const { data, error } = await supabase
      .from('bot_subscribers')
      .insert({ tenant_id, platform, chat_id, contact_name: contact_name || null, tenant_name })
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
    const allowed = ['platform', 'chat_id', 'contact_name', 'is_active', 'tenant_name']
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

// ── SUPPORT TICKETS ────────────────────────────────────────────────────────

// List all tickets
router.get('/tickets', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id,ticket_number,tenant_id,tenant_name,submitter_name,submitter_email,title,category,status,created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

// Get single ticket (enriched with tenant phone + branch count)
router.get('/tickets/:id', async (req, res, next) => {
  try {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) return res.status(404).json({ error: 'التذكرة غير موجودة' })

    // Enrich with tenant phone and branch count if tenant_id is known
    let tenant_phone = null
    let branch_count = null
    if (ticket.tenant_id) {
      const [{ data: tenant }, { count }] = await Promise.all([
        supabase.from('tenants').select('primary_phone').eq('id', ticket.tenant_id).single(),
        supabase.from('branches').select('id', { count: 'exact', head: true }).eq('tenant_id', ticket.tenant_id),
      ])
      tenant_phone = tenant?.primary_phone || null
      branch_count = count ?? null
    }

    res.json({ ...ticket, tenant_phone, branch_count })
  } catch (err) { next(err) }
})

// Update ticket (status, admin_comment)
router.put('/tickets/:id', async (req, res, next) => {
  try {
    const allowed = ['status', 'admin_comment']
    const updates = { updated_at: new Date().toISOString() }
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }
    if (updates.status && !['new', 'in_progress', 'resolved'].includes(updates.status)) {
      return res.status(422).json({ error: 'حالة غير صحيحة' })
    }
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router
