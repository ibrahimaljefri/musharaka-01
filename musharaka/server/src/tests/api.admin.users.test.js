/**
 * Integration tests — Admin user management routes
 *
 * GET    /api/admin/users              — list all users
 * POST   /api/admin/users              — create user
 * POST   /api/admin/users/:id/assign   — assign user to tenant
 * PUT    /api/admin/users/:id          — update user
 * DELETE /api/admin/users/:id          — delete user
 *
 * Auth model (test mode, set in tenantMiddleware.js):
 *   - No header              → 401 (authMiddleware rejects)
 *   - x-test-user-id only    → isSuperAdmin=false → superAdminOnly → 403
 *   - x-test-super-admin:true → isSuperAdmin=true  → route handler runs
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

// Reset both from() and auth.admin stubs after every test so mocks don't
// bleed between cases.
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

// Regular authenticated user (no super-admin flag)
const AUTH_HEADERS       = { 'x-test-user-id': 'test-user-id' }
// Super-admin authenticated user
const SUPER_ADMIN_HEADERS = { 'x-test-user-id': 'test-user-id', 'x-test-super-admin': 'true' }

// ── 401 GUARDS (unauthenticated) ─────────────────────────────────────────────

describe('401 guards — no auth header', () => {
  it('GET /api/admin/users returns 401', async () => {
    const res = await request(app).get('/api/admin/users')
    expect(res.status).toBe(401)
  })

  it('POST /api/admin/users returns 401', async () => {
    const res = await request(app).post('/api/admin/users').send({ email: 'a@b.com', password: 'pass' })
    expect(res.status).toBe(401)
  })

  it('POST /api/admin/users/:id/assign returns 401', async () => {
    const res = await request(app).post('/api/admin/users/abc/assign').send({ tenant_id: 'tid' })
    expect(res.status).toBe(401)
  })

  it('PUT /api/admin/users/:id returns 401', async () => {
    const res = await request(app).put('/api/admin/users/abc').send({ full_name: 'Name' })
    expect(res.status).toBe(401)
  })

  it('DELETE /api/admin/users/:id returns 401', async () => {
    const res = await request(app).delete('/api/admin/users/abc')
    expect(res.status).toBe(401)
  })
})

// ── 403 GUARDS (authenticated, not super-admin) ───────────────────────────────

describe('403 guards — authenticated but not super-admin', () => {
  it('GET /api/admin/users returns 403', async () => {
    const res = await request(app).get('/api/admin/users').set(AUTH_HEADERS)
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/users returns 403', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(AUTH_HEADERS)
      .send({ email: 'a@b.com', password: 'pass' })
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/users/:id/assign returns 403', async () => {
    const res = await request(app)
      .post('/api/admin/users/abc/assign')
      .set(AUTH_HEADERS)
      .send({ tenant_id: 'tid' })
    expect(res.status).toBe(403)
  })

  it('PUT /api/admin/users/:id returns 403', async () => {
    const res = await request(app)
      .put('/api/admin/users/abc')
      .set(AUTH_HEADERS)
      .send({ full_name: 'Name' })
    expect(res.status).toBe(403)
  })

  it('DELETE /api/admin/users/:id returns 403', async () => {
    const res = await request(app).delete('/api/admin/users/abc').set(AUTH_HEADERS)
    expect(res.status).toBe(403)
  })
})

// ── GET /api/admin/users ──────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('returns 200 with merged user array when super-admin', async () => {
    // Mock auth.admin.listUsers to return two users
    supabase._setAuthAdmin({
      listUsers: () =>
        Promise.resolve({
          data: {
            users: [
              { id: 'uid-1', email: 'alice@example.com', user_metadata: { full_name: 'Alice' }, created_at: '2026-01-01T00:00:00Z' },
              { id: 'uid-2', email: 'bob@example.com',   user_metadata: {},                      created_at: '2026-01-02T00:00:00Z' },
            ],
          },
          error: null,
        }),
    })

    // Mock from('tenant_users').select(...) to return one assignment (uid-1)
    supabase._setFrom((table) => {
      const noop = () => Promise.resolve({ data: [], error: null })
      const q = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        single: noop, maybeSingle: noop,
        insert: noop, update: noop, delete: noop, upsert: noop,
        then: (r) =>
          r({
            data: [
              {
                user_id: 'uid-1',
                role:    'admin',
                tenants: { id: 'tenant-1', name: 'Acme Corp' },
              },
            ],
            error: null,
          }),
      }
      return q
    })

    const res = await request(app).get('/api/admin/users').set(SUPER_ADMIN_HEADERS)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)

    // uid-1 should be 'assigned', uid-2 should be 'pending'
    const alice = res.body.find((u) => u.id === 'uid-1')
    const bob   = res.body.find((u) => u.id === 'uid-2')

    expect(alice.status).toBe('assigned')
    expect(alice.tenant_name).toBe('Acme Corp')
    expect(alice.role).toBe('admin')

    expect(bob.status).toBe('pending')
    expect(bob.tenant_name).toBeNull()
  })
})

// ── POST /api/admin/users ─────────────────────────────────────────────────────

describe('POST /api/admin/users', () => {
  describe('validation', () => {
    it('returns 422 with Arabic error when email is missing', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set(SUPER_ADMIN_HEADERS)
        .send({ password: 'secret123' })

      expect(res.status).toBe(422)
      expect(res.body.error).toBe('البريد الإلكتروني مطلوب')
    })

    it('returns 422 with Arabic error when password is missing', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set(SUPER_ADMIN_HEADERS)
        .send({ email: 'user@example.com' })

      expect(res.status).toBe(422)
      expect(res.body.error).toBe('كلمة المرور مطلوبة')
    })
  })

  describe('success', () => {
    it('returns 201 with user id and email when creation succeeds', async () => {
      supabase._setAuthAdmin({
        createUser: () =>
          Promise.resolve({
            data:  { user: { id: 'new-uid', email: 'test@test.com' } },
            error: null,
          }),
      })

      const res = await request(app)
        .post('/api/admin/users')
        .set(SUPER_ADMIN_HEADERS)
        .send({ email: 'test@test.com', password: 'securePass1', full_name: 'Test User' })

      expect(res.status).toBe(201)
      expect(res.body.id).toBe('new-uid')
      expect(res.body.email).toBe('test@test.com')
    })
  })
})

// ── POST /api/admin/users/:id/assign ─────────────────────────────────────────

describe('POST /api/admin/users/:id/assign', () => {
  describe('validation', () => {
    it('returns 422 with Arabic error when tenant_id is missing', async () => {
      const res = await request(app)
        .post('/api/admin/users/user-123/assign')
        .set(SUPER_ADMIN_HEADERS)
        .send({ role: 'member' }) // no tenant_id

      expect(res.status).toBe(422)
      expect(res.body.error).toBe('يرجى اختيار المستأجر')
    })
  })

  describe('success', () => {
    it('returns 200 with Arabic success message when assignment succeeds', async () => {
      // Both delete and insert must succeed.
      // delete() must return the chainable q so that .eq() can be called on it.
      // Resolution happens via q.then() when the route awaits the chain.
      supabase._setFrom(() => {
        const noop = () => Promise.resolve({ data: [], error: null })
        const q = {
          select: () => q, eq: () => q, order: () => q, limit: () => q,
          single: noop, maybeSingle: noop,
          insert: () => Promise.resolve({ error: null }),
          update: () => q, delete: () => q, upsert: () => q,
          then: (r) => r({ data: [], error: null }),
        }
        return q
      })

      const res = await request(app)
        .post('/api/admin/users/user-123/assign')
        .set(SUPER_ADMIN_HEADERS)
        .send({ tenant_id: 'tenant-abc', role: 'admin' })

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('تم تعيين المستخدم بنجاح')
    })
  })

  describe('error propagation', () => {
    it('propagates insert error (e.g. check constraint 23514) as 500', async () => {
      // Route throws insErr when insert fails — errorHandler returns 500
      supabase._setFrom(() => {
        const noop = () => Promise.resolve({ data: [], error: null })
        const q = {
          select: () => q, eq: () => q, order: () => q, limit: () => q,
          single: noop, maybeSingle: noop,
          // delete succeeds, insert violates a DB check constraint
          delete: () => Promise.resolve({ error: null }),
          insert: () =>
            Promise.resolve({
              error: { code: '23514', message: 'violates check constraint "role_check"' },
            }),
          update: noop, upsert: noop,
          then: (r) => r({ data: [], error: null }),
        }
        return q
      })

      const res = await request(app)
        .post('/api/admin/users/user-123/assign')
        .set(SUPER_ADMIN_HEADERS)
        .send({ tenant_id: 'tenant-abc', role: 'invalid_role' })

      // The route does: if (insErr) throw insErr → caught by next(err) → errorHandler → 500
      expect(res.status).toBe(500)
    })
  })
})

// ── PUT /api/admin/users/:id ──────────────────────────────────────────────────

describe('PUT /api/admin/users/:id', () => {
  it('returns 200 with Arabic success message when update succeeds', async () => {
    supabase._setAuthAdmin({
      updateUserById: () => Promise.resolve({ data: { user: {} }, error: null }),
    })

    // No tenant_id in body → route calls delete().eq() only (no insert)
    // delete() must return the chainable q, not a Promise, so .eq() works.
    supabase._setFrom(() => {
      const noop = () => Promise.resolve({ data: [], error: null })
      const q = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        single: noop, maybeSingle: noop,
        insert: () => q, update: () => q, delete: () => q, upsert: () => q,
        then: (r) => r({ data: [], error: null }),
      }
      return q
    })

    const res = await request(app)
      .put('/api/admin/users/user-456')
      .set(SUPER_ADMIN_HEADERS)
      .send({ full_name: 'Updated Name' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('تم تحديث المستخدم بنجاح')
  })

  it('returns 200 and re-assigns tenant when tenant_id is provided', async () => {
    supabase._setAuthAdmin({
      updateUserById: () => Promise.resolve({ data: { user: {} }, error: null }),
    })

    supabase._setFrom(() => {
      const noop = () => Promise.resolve({ data: [], error: null })
      const q = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        single: noop, maybeSingle: noop,
        insert: () => Promise.resolve({ error: null }),
        update: () => q, delete: () => q, upsert: () => q,
        then: (r) => r({ data: [], error: null }),
      }
      return q
    })

    const res = await request(app)
      .put('/api/admin/users/user-456')
      .set(SUPER_ADMIN_HEADERS)
      .send({ full_name: 'Updated Name', tenant_id: 'new-tenant', role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('تم تحديث المستخدم بنجاح')
  })
})

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────

describe('DELETE /api/admin/users/:id', () => {
  it('returns 200 with Arabic success message when deletion succeeds', async () => {
    supabase._setAuthAdmin({
      deleteUser: () => Promise.resolve({ data: {}, error: null }),
    })

    // tenant_users delete().eq() must succeed — delete returns chainable, not Promise
    supabase._setFrom(() => {
      const noop = () => Promise.resolve({ data: [], error: null })
      const q = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        single: noop, maybeSingle: noop,
        insert: () => q, update: () => q, delete: () => q, upsert: () => q,
        then: (r) => r({ data: [], error: null }),
      }
      return q
    })

    const res = await request(app)
      .delete('/api/admin/users/user-789')
      .set(SUPER_ADMIN_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('تم حذف المستخدم')
  })

  it('propagates auth.admin.deleteUser error as 500', async () => {
    supabase._setAuthAdmin({
      deleteUser: () =>
        Promise.resolve({ data: null, error: { message: 'User not found' } }),
    })

    const res = await request(app)
      .delete('/api/admin/users/nonexistent-id')
      .set(SUPER_ADMIN_HEADERS)

    expect(res.status).toBe(500)
  })
})
