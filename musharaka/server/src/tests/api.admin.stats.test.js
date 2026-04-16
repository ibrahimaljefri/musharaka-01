/**
 * Integration tests — GET /api/admin/stats
 *
 * Tests the platform stats endpoint which makes 7 parallel queries and
 * returns totals, subscription bucket counts, and per-tenant breakdowns.
 *
 * NOTE: In test mode, x-test-super-admin: 'true' is required for this route.
 * Without it, superAdminOnly returns 403. Without any auth, authMiddleware
 * returns 401.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createRequire } from 'module'
import request from 'supertest'

const _require = createRequire(import.meta.url)

let app
let supabase

beforeAll(() => {
  app      = _require('../index.js')
  supabase = _require('../config/supabase.js').supabase
})

afterEach(() => {
  // Reset auth.admin overrides
  supabase._setAuthAdmin({
    listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
  })
  // Reset from() to default no-op
  supabase._setFrom(() => {
    const result = { data: [], error: null, count: 0 }
    const q = {
      select: () => q, eq: () => q, order: () => q, limit: () => q,
      single:      () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      insert:      () => Promise.resolve(result),
      update:      () => q,
      delete:      () => Promise.resolve(result),
      upsert:      () => Promise.resolve(result),
      then: (resolve) => resolve(result),
    }
    return q
  })
})

const AUTH_HEADERS      = { 'x-test-user-id': 'test-user-id' }
const SUPER_ADMIN_HEADERS = {
  'x-test-user-id':    'test-user-id',
  'x-test-super-admin': 'true',
}

describe('GET /api/admin/stats', () => {

  it('returns 401 when no auth header', async () => {
    const res = await request(app).get('/api/admin/stats')
    expect(res.status).toBe(401)
  })

  it('returns 403 for authenticated non-super-admin user', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set(AUTH_HEADERS)
    expect(res.status).toBe(403)
  })

  it('returns 200 with zero totals when all queries return empty data', async () => {
    supabase._setAuthAdmin({
      listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
    })
    supabase._setFrom(() => {
      const result = { data: [], error: null, count: 0 }
      const q = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        single:      () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        insert:      () => Promise.resolve(result),
        update:      () => q,
        delete:      () => Promise.resolve(result),
        upsert:      () => Promise.resolve(result),
        then: (resolve) => resolve(result),
      }
      return q
    })

    const res = await request(app)
      .get('/api/admin/stats')
      .set(SUPER_ADMIN_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.totals.tenants).toBe(0)
    expect(res.body.totals.branches).toBe(0)
    expect(res.body.totals.tenant_users).toBe(0)
    expect(res.body.totals.auth_users).toBe(0)
    expect(res.body.totals.pending_users).toBe(0)
    expect(res.body.subscriptions.expiring_3m).toBe(0)
    expect(res.body.subscriptions.expiring_6m).toBe(0)
    expect(res.body.subscriptions.expiring_11m).toBe(0)
    expect(res.body.subscriptions.expiring_12m_plus).toBe(0)
    expect(res.body.subscriptions.no_expiry).toBe(0)
  })

  it('returns 200 with correct subscription bucket when tenant expires within 3 months', async () => {
    // Tenant expiring in ~2 months — should land in expiring_3m bucket
    const in2Months = new Date()
    in2Months.setMonth(in2Months.getMonth() + 2)
    const in2MonthsISO = in2Months.toISOString()

    const mockTenants = [{ id: 't1', name: 'Tenant One', status: 'active', expires_at: in2MonthsISO }]

    supabase._setAuthAdmin({
      listUsers: () => Promise.resolve({
        data: { users: [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }] },
        error: null,
      }),
    })

    supabase._setFrom((tableName) => {
      // Per-table data and count overrides
      const tableData = {
        tenants:      mockTenants,
        branches:     [],
        tenant_users: [],
      }
      const tableCounts = {
        tenants:      3,
        branches:     5,
        tenant_users: 2,
      }

      const data  = tableData[tableName]  ?? []
      const count = tableCounts[tableName] ?? 0
      const result = { data, error: null, count }

      const q = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        single:      () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        insert:      () => Promise.resolve(result),
        update:      () => q,
        delete:      () => Promise.resolve(result),
        upsert:      () => Promise.resolve(result),
        then: (resolve) => resolve(result),
      }
      return q
    })

    const res = await request(app)
      .get('/api/admin/stats')
      .set(SUPER_ADMIN_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.totals.tenants).toBe(3)
    expect(res.body.totals.branches).toBe(5)
    expect(res.body.totals.tenant_users).toBe(2)
    expect(res.body.totals.auth_users).toBe(3)
    // pending = max(0, 3 auth - 2 tenant_users) = 1
    expect(res.body.totals.pending_users).toBe(1)
    // The one active tenant expires in 2 months → expiring_3m bucket
    expect(res.body.subscriptions.expiring_3m).toBe(1)
    expect(res.body.subscriptions.expiring_6m).toBe(0)
    expect(res.body.subscriptions.expiring_11m).toBe(0)
    expect(res.body.subscriptions.expiring_12m_plus).toBe(0)
    expect(res.body.subscriptions.no_expiry).toBe(0)
  })

  it('clamps pending_users to 0 when tenant_users exceed auth users', async () => {
    // 2 auth users but 5 tenant_users recorded — pending should be 0, not negative
    supabase._setAuthAdmin({
      listUsers: () => Promise.resolve({
        data: { users: [{ id: 'u1' }, { id: 'u2' }] },
        error: null,
      }),
    })

    supabase._setFrom((tableName) => {
      const tableCounts = {
        tenants:      1,
        branches:     0,
        tenant_users: 5,
      }
      const count = tableCounts[tableName] ?? 0
      const result = { data: [], error: null, count }

      const q = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        single:      () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        insert:      () => Promise.resolve(result),
        update:      () => q,
        delete:      () => Promise.resolve(result),
        upsert:      () => Promise.resolve(result),
        then: (resolve) => resolve(result),
      }
      return q
    })

    const res = await request(app)
      .get('/api/admin/stats')
      .set(SUPER_ADMIN_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.totals.auth_users).toBe(2)
    expect(res.body.totals.tenant_users).toBe(5)
    // Math.max(0, 2 - 5) = 0
    expect(res.body.totals.pending_users).toBe(0)
  })
})
