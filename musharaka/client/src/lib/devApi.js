/**
 * Dev-mode API handler — mimics the Node.js Express API locally using
 * the same sale distribution logic but running entirely in the browser.
 * Used when VITE_SUPABASE_URL contains 'placeholder'.
 */

import { devSupabase as db } from './devSupabase'

function genId() {
  return 'dev-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now()
}

function getDaysInRange(start, end) {
  const days = []
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const cur = new Date(sy, sm - 1, sd, 12)
  const fin = new Date(ey, em - 1, ed, 12)
  while (cur <= fin) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function getDaysInMonth(month, year) {
  const last = new Date(year, month, 0).getDate()
  const mm   = String(month).padStart(2, '0')
  return getDaysInRange(`${year}-${mm}-01`, `${year}-${mm}-${String(last).padStart(2,'0')}`)
}

function expandSale(data) {
  const { branch_id, input_type, amount, sale_date, month, year,
          period_start_date, period_end_date, invoice_number, notes } = data
  let days = []
  if (input_type === 'daily')   days = [sale_date]
  if (input_type === 'monthly') days = getDaysInMonth(month, year)
  if (input_type === 'range')   days = getDaysInRange(period_start_date, period_end_date)
  if (!days.length) throw new Error('لا توجد أيام في الفترة المحددة')

  const totalFils = Math.round(amount * 100)
  const baseFils  = Math.floor(totalFils / days.length)
  const remainder = totalFils - baseFils * days.length

  return days.map((date, idx) => ({
    id: genId(),
    branch_id,
    input_type,
    sale_date: date,
    month:  month || parseInt(date.split('-')[1]),
    year:   year  || parseInt(date.split('-')[0]),
    period_start_date: input_type === 'range' ? period_start_date : null,
    period_end_date:   input_type === 'range' ? period_end_date   : null,
    amount:         (baseFils + (idx < remainder ? 1 : 0)) / 100,
    invoice_number: invoice_number || null,
    notes:          notes || null,
    status:         'pending',
    submission_id:  null,
    created_at:     new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  }))
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handlePostSales(body) {
  const { branch_id, input_type, amount } = body
  if (!branch_id)  return { status: 422, data: { error: 'يرجى اختيار الفرع' } }
  if (!input_type) return { status: 422, data: { error: 'نوع الإدخال مطلوب' } }
  if (!amount || amount <= 0) return { status: 422, data: { error: 'يرجى إدخال مبلغ صحيح أكبر من صفر' } }

  try {
    const rows = expandSale(body)
    const { error } = await db.from('sales').insert(rows)
    if (error) return { status: 400, data: { error: error.message } }
    return { status: 201, data: { message: `تم إضافة ${rows.length} سجل مبيعات بنجاح`, count: rows.length } }
  } catch (e) {
    return { status: 422, data: { error: e.message } }
  }
}

async function handlePostSubmit(body) {
  const { branch_id, month, year } = body
  if (!branch_id) return { status: 422, data: { error: 'يرجى اختيار الفرع' } }
  if (!month)     return { status: 422, data: { error: 'يرجى اختيار الشهر' } }
  if (!year)      return { status: 422, data: { error: 'يرجى اختيار السنة' } }

  const m = parseInt(month), y = parseInt(year)
  const mm = String(m).padStart(2, '0')

  const { data: sales } = await db.from('sales')
    .select('*').eq('branch_id', branch_id).eq('status', 'pending')
    .gte('sale_date', `${y}-${mm}-01`).lte('sale_date', `${y}-${mm}-31`)

  if (!sales || sales.length === 0)
    return { status: 400, data: { error: 'لا توجد فواتير معلقة لهذه الفترة' } }

  const totalAmount  = sales.reduce((s, r) => s + parseFloat(r.amount), 0)
  const invoiceCount = sales.length

  const { data: rpc } = await db.rpc('submit_to_seinomy', {
    p_branch_id: branch_id, p_month: m, p_year: y,
    p_invoice_count: invoiceCount, p_total_amount: totalAmount,
  })

  if (rpc && !rpc.success) return { status: 400, data: { error: rpc.error } }

  return {
    status: 200,
    data: {
      message: 'تم إرسال الفواتير إلى سينومي بنجاح',
      submission: { id: rpc.submission_id, branch_id, month: m, year: y, invoice_count: invoiceCount, total_amount: totalAmount },
    },
  }
}

// ── Admin handlers ────────────────────────────────────────────────────────────

function getTable(name) {
  try { return JSON.parse(localStorage.getItem(`dev_${name}`) || '[]') } catch { return [] }
}
function saveTable(name, rows) { localStorage.setItem(`dev_${name}`, JSON.stringify(rows)) }
function newId() { return 'dev-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now() }

// GET /admin/tenants
function handleGetTenants() {
  const tenants = getTable('tenants')
  const tuRows  = getTable('tenant_users')
  const result  = tenants.map(t => ({
    ...t,
    tenant_users: tuRows.filter(u => u.tenant_id === t.id),
  }))
  return { status: 200, data: result }
}

// GET /admin/tenants/:id
function handleGetTenant(id) {
  const tenants = getTable('tenants')
  const t = tenants.find(x => x.id === id)
  if (!t) return { status: 404, data: { error: 'المستأجر غير موجود' } }
  const tuRows = getTable('tenant_users')
  return { status: 200, data: { ...t, tenant_users: tuRows.filter(u => u.tenant_id === id) } }
}

// POST /admin/tenants
function handleCreateTenant(body) {
  const { name, slug, plan = 'basic', activated_at, expires_at, notes,
          allowed_input_types = ['daily'], allow_advanced_dashboard = false,
          allow_import = false, allow_reports = false,
          user_email, user_password, user_name } = body
  if (!name || !slug) return { status: 422, data: { error: 'اسم المستأجر والرمز المختصر مطلوبان' } }

  const tenants = getTable('tenants')
  if (tenants.find(t => t.slug === slug))
    return { status: 409, data: { error: 'الرمز المختصر مستخدم مسبقاً' } }

  const tenant = {
    id: newId(), name, slug, plan, status: 'active',
    activated_at: activated_at || new Date().toISOString(),
    expires_at: expires_at || null,
    notes: notes || null,
    allowed_input_types,
    allow_advanced_dashboard,
    allow_import,
    allow_reports,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  saveTable('tenants', [...tenants, tenant])

  let createdUser = null
  if (user_email) {
    const userId = 'dev-tenant-user-' + Math.random().toString(36).slice(2, 8)
    const userMeta = { full_name: user_name || name }
    createdUser = { id: userId, email: user_email, user_metadata: userMeta }

    // Save to tenant_users for data access
    const tuRows = getTable('tenant_users')
    saveTable('tenant_users', [...tuRows, {
      id: newId(), tenant_id: tenant.id, user_id: userId, role: 'admin',
      created_at: new Date().toISOString(),
    }])

    // Save credentials to dev_auth_users so the user can log in
    if (user_password) {
      const authUsers = getTable('auth_users')
      if (!authUsers.find(u => u.email === user_email)) {
        saveTable('auth_users', [...authUsers, {
          id: userId, email: user_email, password: user_password,
          user_metadata: userMeta, must_change_password: true,
        }])
      }
    }
  }
  return { status: 201, data: { tenant, user: createdUser } }
}

// PUT /admin/tenants/:id
function handleUpdateTenant(id, body) {
  const tenants = getTable('tenants')
  const idx = tenants.findIndex(t => t.id === id)
  if (idx === -1) return { status: 404, data: { error: 'المستأجر غير موجود' } }
  const updated = { ...tenants[idx], ...body, updated_at: new Date().toISOString() }
  tenants[idx] = updated
  saveTable('tenants', tenants)
  return { status: 200, data: updated }
}

// DELETE /admin/tenants/:id
function handleDeleteTenant(id) {
  const tenants = getTable('tenants').filter(t => t.id !== id)
  saveTable('tenants', tenants)
  const tuRows = getTable('tenant_users').filter(u => u.tenant_id !== id)
  saveTable('tenant_users', tuRows)
  const keys = getTable('api_keys').filter(k => k.tenant_id !== id)
  saveTable('api_keys', keys)
  return { status: 200, data: { message: 'تم الحذف بنجاح' } }
}

// GET /admin/tenants/:id/api-keys
function handleGetApiKeys(tenantId) {
  const keys = getTable('api_keys').filter(k => k.tenant_id === tenantId)
  const ALL_FIELDS = ['contract_number','branch_code','branch_name','brand_name','unit_number',
    'location','invoice_number','input_type','period_from_date','period_to_date',
    'sale_date','month','year','amount','status']
  return { status: 200, data: { keys, all_fields: ALL_FIELDS } }
}

// POST /admin/tenants/:id/api-keys
function handleCreateApiKey(tenantId, body) {
  const { label, allowed_fields, expires_at } = body
  if (!label) return { status: 422, data: { error: 'اسم المفتاح مطلوب' } }
  const rawKey   = 'msk_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2] || '0').join('')
  const prefix   = rawKey.slice(0, 12)
  const key = {
    id: newId(), tenant_id: tenantId, label,
    key_prefix: prefix,
    key_hash: 'dev-hash-' + prefix,   // not real SHA-256 in dev
    allowed_fields: allowed_fields || ['contract_number','period_from_date','period_to_date','amount'],
    is_active: true, last_used_at: null,
    expires_at: expires_at || null,
    created_at: new Date().toISOString(),
  }
  const keys = getTable('api_keys')
  saveTable('api_keys', [...keys, key])
  return { status: 201, data: { ...key, raw_key: rawKey, all_fields: [] } }
}

// PUT /admin/api-keys/:keyId
function handleUpdateApiKey(keyId, body) {
  const keys = getTable('api_keys')
  const idx  = keys.findIndex(k => k.id === keyId)
  if (idx === -1) return { status: 404, data: { error: 'المفتاح غير موجود' } }
  keys[idx] = { ...keys[idx], ...body }
  saveTable('api_keys', keys)
  return { status: 200, data: keys[idx] }
}

// DELETE /admin/api-keys/:keyId
function handleDeleteApiKey(keyId) {
  saveTable('api_keys', getTable('api_keys').filter(k => k.id !== keyId))
  return { status: 200, data: { message: 'تم الحذف' } }
}

// ── Admin — Users ─────────────────────────────────────────────────────────────

// GET /admin/users — list all registered users with tenant info
function handleGetUsers() {
  const authUsers = getTable('auth_users')
  const tuRows    = getTable('tenant_users')
  const tenants   = getTable('tenants')

  const result = authUsers.map(u => {
    const membership = tuRows.find(t => t.user_id === u.id)
    const tenant     = membership ? tenants.find(t => t.id === membership.tenant_id) : null
    return {
      id:           u.id,
      email:        u.email,
      full_name:    u.user_metadata?.full_name || '',
      status:       u.status || 'pending',
      registered_at: u.registered_at || u.created_at || null,
      tenant_id:    tenant?.id   || null,
      tenant_name:  tenant?.name || null,
      role:         membership?.role || null,
    }
  })
  return { status: 200, data: result }
}

// POST /admin/users — admin creates a new user directly
function handleCreateUser(body) {
  const { email, password, full_name } = body
  if (!email || !password) return { status: 422, data: { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' } }

  const authUsers = getTable('auth_users')
  if (authUsers.find(u => u.email === email))
    return { status: 409, data: { error: 'البريد الإلكتروني مسجل مسبقاً' } }

  const userId = 'dev-admin-user-' + Math.random().toString(36).slice(2, 10)
  const newUser = {
    id: userId, email, password,
    user_metadata: { full_name: full_name || '' },
    status: 'pending',
    must_change_password: true,
    registered_at: new Date().toISOString(),
  }
  saveTable('auth_users', [...authUsers, newUser])
  return { status: 201, data: { id: userId, email, full_name: full_name || '' } }
}

// POST /admin/users/:userId/assign — assign user to a tenant
function handleAssignUser(userId, body) {
  const { tenant_id, role = 'user' } = body
  if (!tenant_id) return { status: 422, data: { error: 'يرجى اختيار المستأجر' } }

  const tenants = getTable('tenants')
  if (!tenants.find(t => t.id === tenant_id))
    return { status: 404, data: { error: 'المستأجر غير موجود' } }

  const tuRows = getTable('tenant_users')
  if (tuRows.find(t => t.user_id === userId))
    return { status: 409, data: { error: 'المستخدم مرتبط بمستأجر بالفعل' } }

  saveTable('tenant_users', [...tuRows, {
    id: newId(), tenant_id, user_id: userId, role,
    created_at: new Date().toISOString(),
  }])

  // Mark user as assigned
  const authUsers = getTable('auth_users')
  const idx = authUsers.findIndex(u => u.id === userId)
  if (idx !== -1) {
    authUsers[idx] = { ...authUsers[idx], status: 'assigned' }
    saveTable('auth_users', authUsers)
  }

  return { status: 200, data: { message: 'تم تعيين المستخدم بنجاح' } }
}

// DELETE /admin/users/:userId
function handleDeleteUser(userId) {
  saveTable('auth_users', getTable('auth_users').filter(u => u.id !== userId))
  saveTable('tenant_users', getTable('tenant_users').filter(u => u.user_id !== userId))
  return { status: 200, data: { message: 'تم حذف المستخدم' } }
}

// PUT /admin/users/:userId
function handleUpdateUser(userId, body) {
  const { full_name, new_password, tenant_id, role } = body
  const authUsers = getTable('auth_users')
  const idx = authUsers.findIndex(u => u.id === userId)
  if (idx === -1) return { status: 404, data: { error: 'المستخدم غير موجود' } }

  const user = { ...authUsers[idx] }
  if (full_name !== undefined) user.full_name = full_name
  if (new_password) user.password = new_password
  authUsers[idx] = user
  saveTable('auth_users', authUsers)

  if (tenant_id !== undefined) {
    const tuRows = getTable('tenant_users').filter(r => r.user_id !== userId)
    if (tenant_id) {
      tuRows.push({ id: newId(), tenant_id, user_id: userId, role: role || 'user', created_at: new Date().toISOString() })
      authUsers[idx] = { ...authUsers[idx], status: 'assigned' }
    } else {
      authUsers[idx] = { ...authUsers[idx], status: 'pending' }
    }
    saveTable('auth_users', authUsers)
    saveTable('tenant_users', tuRows)
  } else if (role !== undefined) {
    const tuRows = getTable('tenant_users')
    const tuIdx  = tuRows.findIndex(r => r.user_id === userId)
    if (tuIdx !== -1) { tuRows[tuIdx] = { ...tuRows[tuIdx], role }; saveTable('tenant_users', tuRows) }
  }

  return { status: 200, data: { message: 'تم تحديث المستخدم' } }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function devApiCall(method, url, data) {
  const path = url.replace(/^\/api/, '')

  // ── Sales & Submit ───────────────────────────────────────────
  if (method === 'post' && path === '/sales')
    return handlePostSales(data)
  if (method === 'post' && path === '/submit')
    return handlePostSubmit(data)
  if (method === 'post' && path === '/sales/import/preview')
    return { status: 200, data: { rows: [], total: 0 } }
  if (method === 'post' && path === '/sales/import')
    return { status: 200, data: { message: 'تم إضافة 0 سجل', queued: 0, warnings: [], errors: [], total: 0 } }

  // ── Admin — Tenants ──────────────────────────────────────────
  if (method === 'get'    && path === '/admin/tenants')
    return handleGetTenants()
  if (method === 'post'   && path === '/admin/tenants')
    return handleCreateTenant(data)

  // /admin/tenants/:id
  const tenantMatch = path.match(/^\/admin\/tenants\/([^/]+)$/)
  if (tenantMatch) {
    const id = tenantMatch[1]
    if (method === 'get')    return handleGetTenant(id)
    if (method === 'put')    return handleUpdateTenant(id, data)
    if (method === 'delete') return handleDeleteTenant(id)
  }

  // /admin/tenants/:id/api-keys
  const apiKeysMatch = path.match(/^\/admin\/tenants\/([^/]+)\/api-keys$/)
  if (apiKeysMatch) {
    const tenantId = apiKeysMatch[1]
    if (method === 'get')  return handleGetApiKeys(tenantId)
    if (method === 'post') return handleCreateApiKey(tenantId, data)
  }

  // /admin/api-keys/:keyId
  const keyMatch = path.match(/^\/admin\/api-keys\/([^/]+)$/)
  if (keyMatch) {
    const keyId = keyMatch[1]
    if (method === 'put')    return handleUpdateApiKey(keyId, data)
    if (method === 'delete') return handleDeleteApiKey(keyId)
  }

  // ── Admin — Users ────────────────────────────────────────────
  if (method === 'get'  && path === '/admin/users') return handleGetUsers()
  if (method === 'post' && path === '/admin/users') return handleCreateUser(data)

  // /admin/users/:userId/assign
  const assignMatch = path.match(/^\/admin\/users\/([^/]+)\/assign$/)
  if (assignMatch && method === 'post') return handleAssignUser(assignMatch[1], data)

  // /admin/users/:userId
  const userMatch = path.match(/^\/admin\/users\/([^/]+)$/)
  if (userMatch && method === 'delete') return handleDeleteUser(userMatch[1])
  if (userMatch && method === 'put')    return handleUpdateUser(userMatch[1], data)

  // ── Admin — Bot Subscribers ──────────────────────────────────
  if (method === 'get' && path === '/admin/bot-subscribers')
    return { status: 200, data: getTable('bot_subscribers') }

  if (method === 'post' && path === '/admin/bot-subscribers') {
    const { tenant_id, platform, chat_id, contact_name, tenant_name } = data || {}
    if (!tenant_id)   return { status: 422, data: { error: 'يرجى اختيار المستأجر' } }
    if (!platform)    return { status: 422, data: { error: 'يرجى اختيار المنصة' } }
    if (!chat_id)     return { status: 422, data: { error: 'معرّف المحادثة مطلوب' } }
    if (!tenant_name) return { status: 422, data: { error: 'اسم المستأجر مطلوب' } }
    const subs = getTable('bot_subscribers')
    if (subs.find(s => s.platform === platform && s.chat_id === chat_id))
      return { status: 409, data: { error: 'هذا المشترك مسجّل مسبقاً على نفس المنصة' } }
    const sub = { id: newId(), tenant_id, tenant_name, platform, chat_id,
      contact_name: contact_name || null, is_active: true,
      last_message_at: null, created_at: new Date().toISOString() }
    saveTable('bot_subscribers', [...subs, sub])
    return { status: 201, data: sub }
  }

  const botSubMatch = path.match(/^\/admin\/bot-subscribers\/([^/]+)$/)
  if (botSubMatch) {
    const id   = botSubMatch[1]
    const subs = getTable('bot_subscribers')
    if (method === 'get') {
      const s = subs.find(x => x.id === id)
      return s ? { status: 200, data: s } : { status: 404, data: { error: 'المشترك غير موجود' } }
    }
    if (method === 'put') {
      const idx = subs.findIndex(x => x.id === id)
      if (idx === -1) return { status: 404, data: { error: 'المشترك غير موجود' } }
      subs[idx] = { ...subs[idx], ...data }
      saveTable('bot_subscribers', subs)
      return { status: 200, data: subs[idx] }
    }
    if (method === 'delete') {
      saveTable('bot_subscribers', subs.filter(x => x.id !== id))
      return { status: 200, data: { message: 'تم الحذف' } }
    }
  }

  // /admin/tenants/:id/branches
  const tenantBranchesMatch = path.match(/^\/admin\/tenants\/([^/]+)\/branches$/)
  if (tenantBranchesMatch && method === 'get') {
    const tenantId = tenantBranchesMatch[1]
    const branches = getTable('branches').filter(b => b.tenant_id === tenantId)
    return { status: 200, data: branches }
  }

  // ── Tickets ──────────────────────────────────────────────────
  if (method === 'post' && path === '/tickets') {
    const { submitter_name, submitter_email, title, category, description, steps } = data instanceof FormData
      ? Object.fromEntries(data.entries())
      : data || {}
    if (!submitter_name)  return { status: 422, data: { error: 'الاسم مطلوب' } }
    if (!submitter_email) return { status: 422, data: { error: 'البريد الإلكتروني مطلوب' } }
    if (!title)           return { status: 422, data: { error: 'عنوان المشكلة مطلوب' } }
    if (!category)        return { status: 422, data: { error: 'يرجى اختيار تصنيف صحيح' } }
    if (!description)     return { status: 422, data: { error: 'وصف المشكلة مطلوب' } }

    // Auto-resolve tenant from current session (mirrors server tenantMiddleware)
    let tenant_id = null
    let tenant_name = ''
    try {
      const session = JSON.parse(localStorage.getItem('musharaka_dev_session') || 'null')
      const userId = session?.user?.id
      if (userId) {
        const tuRows = getTable('tenant_users')
        const membership = tuRows.find(r => r.user_id === userId)
        if (membership) {
          const tenant = getTable('tenants').find(t => t.id === membership.tenant_id)
          tenant_id   = tenant?.id   || null
          tenant_name = tenant?.name || ''
        }
      }
    } catch {}

    const num = 1001 + getTable('dev_tickets').length
    const ticket = {
      id: newId(), ticket_number: `SUP-${num}`,
      tenant_id, tenant_name,
      submitter_name, submitter_email,
      title, category, description,
      steps: steps || null,
      status: 'new', admin_comment: null,
      created_at: new Date().toISOString(),
    }
    saveTable('dev_tickets', [...getTable('dev_tickets'), ticket])
    return { status: 201, data: { id: ticket.id, ticket_number: ticket.ticket_number } }
  }

  if (method === 'get' && path === '/admin/tickets')
    return { status: 200, data: getTable('dev_tickets') }

  const ticketMatch = path.match(/^\/admin\/tickets\/([^/]+)$/)
  if (ticketMatch) {
    const id = ticketMatch[1]
    const tickets = getTable('dev_tickets')
    if (method === 'get') {
      const t = tickets.find(x => x.id === id)
      if (!t) return { status: 404, data: { error: 'التذكرة غير موجودة' } }
      // Enrich with tenant phone + branch count
      let tenant_phone = null
      let branch_count = null
      if (t.tenant_id) {
        const tenant = getTable('tenants').find(x => x.id === t.tenant_id)
        tenant_phone = tenant?.primary_phone || null
        branch_count = getTable('branches').filter(b => b.tenant_id === t.tenant_id).length
      }
      return { status: 200, data: { ...t, tenant_phone, branch_count } }
    }
    if (method === 'put') {
      const idx = tickets.findIndex(x => x.id === id)
      if (idx === -1) return { status: 404, data: { error: 'التذكرة غير موجودة' } }
      tickets[idx] = { ...tickets[idx], ...data, updated_at: new Date().toISOString() }
      saveTable('dev_tickets', tickets)
      return { status: 200, data: tickets[idx] }
    }
  }

  return { status: 404, data: { error: 'المسار غير موجود' } }
}
