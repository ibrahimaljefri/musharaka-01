/**
 * Integration tests — Admin tenant routes
 * GET    /api/admin/tenants
 * POST   /api/admin/tenants
 * GET    /api/admin/tenants/:id
 * PUT    /api/admin/tenants/:id
 * DELETE /api/admin/tenants/:id
 *
 * All routes require x-test-super-admin: true (tenantMiddleware test bypass).
 */
import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createRequire } from 'module'
import request from 'supertest'

const _require = createRequire(import.meta.url)

let app
let supabase

beforeAll(() => {
  app      = _require('../index.js')
  supabase = _require('../config/supabase.js').supabase
})

/** Reset mocks to safe no-op defaults after every test. */
afterEach(() => {
  supabase._setFrom(() => {
    const noop = () => Promise.resolve({ data: [], error: null })
    const q = {
      select: () => q, eq: () => q, neq: () => q, order: () => q, limit: () => q,
      insert: () => q, update: () => q, delete: () => q, upsert: () => q,
      single: noop, maybeSingle: noop,
      then: (r) => r({ data: [], error: null }),
    }
    return q
  })
  supabase._setAuthAdmin({
    listUsers:      () => Promise.resolve({ data: { users: [] }, error: null }),
    createUser:     () => Promise.resolve({ data: { user: null }, error: null }),
    updateUserById: () => Promise.resolve({ data: { user: null }, error: null }),
    deleteUser:     () => Promise.resolve({ data: {}, error: null }),
  })
})

const AUTH_HEADERS    = { 'x-test-user-id': 'test-user-id' }
const SA_HEADERS      = { 'x-test-user-id': 'test-user-id', 'x-test-super-admin': 'true' }

// ── Helper to build a chainable that always resolves to a fixed result ────────
// All builder methods return q so that multi-step chains (e.g. delete().eq())
// stay chainable. Termination via single(), maybeSingle(), or then() (await).
function makeChain(result) {
  const q = {
    select: () => q, eq: () => q, neq: () => q, order: () => q, limit: () => q,
    insert: () => q, update: () => q, delete: () => q, upsert: () => q,
    single:      () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve) => resolve(result),
  }
  return q
}

// ── 401 guards ────────────────────────────────────────────────────────────────

describe('401 guards — no auth header', () => {
  it('GET /api/admin/tenants → 401', async () => {
    const res = await request(app).get('/api/admin/tenants')
    expect(res.status).toBe(401)
  })

  it('POST /api/admin/tenants → 401', async () => {
    const res = await request(app).post('/api/admin/tenants').send({ name: 'X', slug: 'x' })
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/tenants/:id → 401', async () => {
    const res = await request(app).get('/api/admin/tenants/some-id')
    expect(res.status).toBe(401)
  })

  it('PUT /api/admin/tenants/:id → 401', async () => {
    const res = await request(app).put('/api/admin/tenants/some-id').send({ name: 'Updated' })
    expect(res.status).toBe(401)
  })

  it('DELETE /api/admin/tenants/:id → 401', async () => {
    const res = await request(app).delete('/api/admin/tenants/some-id')
    expect(res.status).toBe(401)
  })
})

// ── 403 guards — authenticated but not super-admin ────────────────────────────

describe('403 guards — non-super-admin', () => {
  it('GET /api/admin/tenants → 403 for regular user', async () => {
    const res = await request(app).get('/api/admin/tenants').set(AUTH_HEADERS)
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/tenants → 403 for regular user', async () => {
    const res = await request(app).post('/api/admin/tenants').set(AUTH_HEADERS)
      .send({ name: 'X', slug: 'x' })
    expect(res.status).toBe(403)
  })

  it('DELETE /api/admin/tenants/:id → 403 for regular user', async () => {
    const res = await request(app).delete('/api/admin/tenants/some-id').set(AUTH_HEADERS)
    expect(res.status).toBe(403)
  })
})

// ── GET /api/admin/tenants ────────────────────────────────────────────────────

describe('GET /api/admin/tenants', () => {
  it('returns 200 + array for super-admin', async () => {
    const mockTenants = [
      { id: 't1', name: 'Tenant Alpha', slug: 'alpha', status: 'active' },
      { id: 't2', name: 'Tenant Beta',  slug: 'beta',  status: 'active' },
    ]
    supabase._setFrom(() => makeChain({ data: mockTenants, error: null }))

    const res = await request(app).get('/api/admin/tenants').set(SA_HEADERS)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].name).toBe('Tenant Alpha')
  })
})

// ── POST /api/admin/tenants ───────────────────────────────────────────────────

describe('POST /api/admin/tenants', () => {
  it('returns 422 when name is missing', async () => {
    const res = await request(app).post('/api/admin/tenants').set(SA_HEADERS)
      .send({ slug: 'no-name' })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/اسم المستأجر|الرمز/)
  })

  it('returns 422 when slug is missing', async () => {
    const res = await request(app).post('/api/admin/tenants').set(SA_HEADERS)
      .send({ name: 'Test Tenant' })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/اسم المستأجر|الرمز/)
  })

  it('returns 409 when slug is a duplicate (23505)', async () => {
    // The route does: .insert({...}).select().single() → single() returns the error
    supabase._setFrom(() => makeChain({ data: null, error: { code: '23505', message: 'unique_violation' } }))

    const res = await request(app).post('/api/admin/tenants').set(SA_HEADERS)
      .send({ name: 'Dup', slug: 'dup' })
    expect(res.status).toBe(409)
    expect(res.body.error).toContain('الرمز المختصر مستخدم مسبقاً')
  })

  it('returns 201 + {tenant, user:null} when no user credentials provided', async () => {
    const mockTenant = { id: 't-new', name: 'New Org', slug: 'new-org', plan: 'basic' }
    supabase._setFrom(() => makeChain({ data: mockTenant, error: null }))

    const res = await request(app).post('/api/admin/tenants').set(SA_HEADERS)
      .send({ name: 'New Org', slug: 'new-org' })
    expect(res.status).toBe(201)
    expect(res.body.tenant).toBeDefined()
    expect(res.body.user).toBeNull()
  })

  it('returns 201 + {tenant, user:{id,email}} when user credentials provided', async () => {
    const mockTenant  = { id: 't-new', name: 'New Org', slug: 'new-org', plan: 'basic' }
    const mockAuthUser = { id: 'u-new', email: 'admin@neworg.com' }

    supabase._setFrom(() => makeChain({ data: mockTenant, error: null }))
    supabase._setAuthAdmin({
      createUser: () => Promise.resolve({ data: { user: mockAuthUser }, error: null }),
    })

    const res = await request(app).post('/api/admin/tenants').set(SA_HEADERS)
      .send({
        name: 'New Org', slug: 'new-org',
        user_email: 'admin@neworg.com', user_password: 'SecurePass123',
      })
    expect(res.status).toBe(201)
    expect(res.body.tenant).toBeDefined()
    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe('admin@neworg.com')
  })

  it('rolls back tenant and returns 422 when user creation fails', async () => {
    const mockTenant = { id: 't-rollback', name: 'Fail Org', slug: 'fail-org' }
    // Tenant insert succeeds; createUser fails; then delete is called
    supabase._setFrom(() => makeChain({ data: mockTenant, error: null }))
    supabase._setAuthAdmin({
      createUser: () => Promise.resolve({ data: null, error: { message: 'Email already exists' } }),
    })

    const res = await request(app).post('/api/admin/tenants').set(SA_HEADERS)
      .send({
        name: 'Fail Org', slug: 'fail-org',
        user_email: 'dup@org.com', user_password: 'SecurePass123',
      })
    expect(res.status).toBe(422)
    expect(res.body.error).toContain('فشل إنشاء المستخدم')
  })
})

// ── GET /api/admin/tenants/:id ────────────────────────────────────────────────

describe('GET /api/admin/tenants/:id', () => {
  it('returns 200 + tenant data when found', async () => {
    const mockTenant = { id: 't1', name: 'Tenant Alpha', slug: 'alpha', tenant_users: [] }
    supabase._setFrom(() => makeChain({ data: mockTenant, error: null }))

    const res = await request(app).get('/api/admin/tenants/t1').set(SA_HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('t1')
  })

  it('returns 404 when tenant not found', async () => {
    supabase._setFrom(() => makeChain({ data: null, error: { message: 'PGRST116' } }))

    const res = await request(app).get('/api/admin/tenants/nonexistent').set(SA_HEADERS)
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('المستأجر غير موجود')
  })
})

// ── PUT /api/admin/tenants/:id ────────────────────────────────────────────────

describe('PUT /api/admin/tenants/:id', () => {
  it('returns 200 + updated tenant on success', async () => {
    const updated = { id: 't1', name: 'Updated Name', status: 'active' }
    supabase._setFrom(() => makeChain({ data: updated, error: null }))

    const res = await request(app).put('/api/admin/tenants/t1').set(SA_HEADERS)
      .send({ name: 'Updated Name' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated Name')
  })

  it('returns 400 on DB error', async () => {
    supabase._setFrom(() => makeChain({ data: null, error: { message: 'constraint violation' } }))

    const res = await request(app).put('/api/admin/tenants/t1').set(SA_HEADERS)
      .send({ status: 'invalid' })
    expect(res.status).toBe(400)
  })
})

// ── DELETE /api/admin/tenants/:id ─────────────────────────────────────────────

describe('DELETE /api/admin/tenants/:id', () => {
  it('returns 200 + Arabic success message on delete', async () => {
    supabase._setFrom(() => makeChain({ data: null, error: null }))

    const res = await request(app).delete('/api/admin/tenants/t1').set(SA_HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.message).toContain('تم حذف المستأجر')
  })

  it('returns 400 on DB delete error', async () => {
    // Make delete().eq() chain resolve with an error via then()
    supabase._setFrom(() => makeChain({ data: null, error: { message: 'foreign key violation' } }))

    const res = await request(app).delete('/api/admin/tenants/t1').set(SA_HEADERS)
    expect(res.status).toBe(400)
  })
})
