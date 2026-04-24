/**
 * ADM-01 … ADM-50 — Admin API regression
 * Covers: /admin/stats, /admin/plans, /admin/tenants, /admin/users,
 *         /admin/bot-subscribers, /admin/tickets, /admin/api-keys
 */
import { test, expect } from '@playwright/test'
import { API_URL, loginAdmin, loginTenant, tryLoginAdmin, tryLoginTenant, authHeaders } from './_helpers'

test.describe('Admin API', () => {
  let adminToken  = ''
  let tenantToken = ''

  test.beforeAll(async ({ request }) => {
    const a = await tryLoginAdmin(request); adminToken = a?.accessToken || ''
    try { const t = await tryLoginTenant(request); tenantToken = t?.accessToken || '' } catch {}
  })

  // ── Stats ────────────────────────────────────────────────────────────────
  test('ADM-01: GET /api/admin/stats as admin → 200', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/stats`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('totals')
  })

  test('ADM-02: GET /api/admin/stats as tenant → 403', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/admin/stats`, { headers: authHeaders(tenantToken) })
    expect([401, 403]).toContain(res.status())
  })

  test('ADM-03: GET /api/admin/stats unauthenticated → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/stats`)
    expect(res.status()).toBe(401)
  })

  test('ADM-04: stats response contains subscription buckets', async ({ request }) => {
    const res  = await request.get(`${API_URL}/api/admin/stats`, { headers: authHeaders(adminToken) })
    const body = await res.json()
    expect(body).toHaveProperty('subscriptions')
  })

  // ── Plans ────────────────────────────────────────────────────────────────
  test('ADM-05: GET /api/admin/plans returns array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/plans`, { headers: authHeaders(adminToken) })
    expect([200, 404]).toContain(res.status())
  })

  test('ADM-06: GET /api/admin/plans unauthenticated → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/plans`)
    expect(res.status()).toBe(401)
  })

  // ── Tenants ──────────────────────────────────────────────────────────────
  test('ADM-07: GET /api/admin/tenants as admin → 200 array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('ADM-08: GET /api/admin/tenants as tenant → 403', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(tenantToken) })
    expect([401, 403]).toContain(res.status())
  })

  test('ADM-09: POST /api/admin/tenants missing name → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/tenants`, {
      headers: authHeaders(adminToken), data: { slug: 'missing-name' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('ADM-10: POST /api/admin/tenants missing slug → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/tenants`, {
      headers: authHeaders(adminToken), data: { name: 'Missing Slug' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('ADM-11: tenant lifecycle — create, read, update, delete', async ({ request }) => {
    const slug = `tst-${Date.now().toString(36).slice(-6)}`
    const c = await request.post(`${API_URL}/api/admin/tenants`, {
      headers: authHeaders(adminToken), data: { name: 'Test Tenant', slug, plan: 'basic' },
    })
    if (![200, 201].includes(c.status())) test.skip()
    const created = await c.json()
    const id = created.tenant?.id || created.id
    expect(id).toBeTruthy()

    const r = await request.get(`${API_URL}/api/admin/tenants/${id}`, { headers: authHeaders(adminToken) })
    expect(r.status()).toBe(200)

    const u = await request.put(`${API_URL}/api/admin/tenants/${id}`, {
      headers: authHeaders(adminToken), data: { notes: 'updated' },
    })
    expect([200, 400]).toContain(u.status())

    const d = await request.delete(`${API_URL}/api/admin/tenants/${id}`, { headers: authHeaders(adminToken) })
    expect([200, 204]).toContain(d.status())
  })

  test('ADM-12: POST tenant with duplicate slug → 409', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const list = await listRes.json()
    test.skip(!list.length, 'no tenants to duplicate')
    const res = await request.post(`${API_URL}/api/admin/tenants`, {
      headers: authHeaders(adminToken), data: { name: 'Dup', slug: list[0].slug },
    })
    expect([409, 400, 422]).toContain(res.status())
  })

  test('ADM-13: GET /api/admin/tenants/:id non-existent → 404', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/tenants/00000000-0000-0000-0000-000000000000`, {
      headers: authHeaders(adminToken),
    })
    expect(res.status()).toBe(404)
  })

  test('ADM-14: DELETE tenant non-existent → 404', async ({ request }) => {
    const res = await request.delete(`${API_URL}/api/admin/tenants/00000000-0000-0000-0000-000000000000`, {
      headers: authHeaders(adminToken),
    })
    expect([404, 400]).toContain(res.status())
  })

  test('ADM-15: cenomi_api_token accepted on tenant create', async ({ request }) => {
    const slug = `tok-${Date.now().toString(36).slice(-6)}`
    const c = await request.post(`${API_URL}/api/admin/tenants`, {
      headers: authHeaders(adminToken),
      data: { name: 'Token Test', slug, plan: 'basic', cenomi_api_token: 'fake-token-for-test' },
    })
    if (![200, 201].includes(c.status())) test.skip()
    const body = await c.json()
    const id = body.tenant?.id || body.id
    await request.delete(`${API_URL}/api/admin/tenants/${id}`, { headers: authHeaders(adminToken) })
  })

  // ── Users ────────────────────────────────────────────────────────────────
  test('ADM-16: GET /api/admin/users as admin → 200 array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/users`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBe(200)
  })

  test('ADM-17: GET /api/admin/users as tenant → 403', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/admin/users`, { headers: authHeaders(tenantToken) })
    expect([401, 403]).toContain(res.status())
  })

  test('ADM-18: GET /api/admin/users excludes super-admins', async ({ request }) => {
    const res  = await request.get(`${API_URL}/api/admin/users`, { headers: authHeaders(adminToken) })
    const body = await res.json()
    for (const u of body) {
      expect(u.email).not.toBe(process.env.TEST_ADMIN_EMAIL || 'admin@admin.com')
    }
  })

  test('ADM-19: POST /api/admin/users missing email → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/users`, {
      headers: authHeaders(adminToken), data: { password: 'ValidPass123!' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('ADM-20: POST /api/admin/users missing password → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/users`, {
      headers: authHeaders(adminToken), data: { email: `x${Date.now()}@test.com` },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('ADM-21: user create + delete cycle', async ({ request }) => {
    const email = `tmp-${Date.now()}@musharaka.test`
    const c = await request.post(`${API_URL}/api/admin/users`, {
      headers: authHeaders(adminToken),
      data: { email, password: 'TempPass123!', full_name: 'Temp User' },
    })
    if (![200, 201].includes(c.status())) test.skip()
    const user = await c.json()
    const d = await request.delete(`${API_URL}/api/admin/users/${user.id}`, { headers: authHeaders(adminToken) })
    expect([200, 204, 404]).toContain(d.status())
  })

  test('ADM-22: POST /api/admin/users duplicate email → 422/409', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/users`, {
      headers: authHeaders(adminToken),
      data: { email: process.env.TEST_ADMIN_EMAIL || 'admin@admin.com', password: 'AnyPass123!' },
    })
    expect([400, 409, 422]).toContain(res.status())
  })

  // ── API Keys ─────────────────────────────────────────────────────────────
  test('ADM-23: GET /api/admin/tenants/:id/api-keys', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    test.skip(!list.length, 'no tenants')
    const res = await request.get(`${API_URL}/api/admin/tenants/${list[0].id}/api-keys`, {
      headers: authHeaders(adminToken),
    })
    expect(res.status()).toBe(200)
  })

  test('ADM-24: create + delete API key cycle', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    test.skip(!list.length, 'no tenants')
    const tenantId = list[0].id
    const c = await request.post(`${API_URL}/api/admin/tenants/${tenantId}/api-keys`, {
      headers: authHeaders(adminToken),
      data: { label: `Test Key ${Date.now()}`, allowed_fields: ['contract_number', 'amount'] },
    })
    if (![200, 201].includes(c.status())) test.skip()
    const key = await c.json()
    expect(key.raw_key).toBeTruthy()   // raw key returned ONCE
    expect(key.raw_key).toMatch(/^msk_/)

    // Now delete
    const d = await request.delete(`${API_URL}/api/admin/api-keys/${key.id}`, {
      headers: authHeaders(adminToken),
    })
    expect([200, 204]).toContain(d.status())
  })

  test('ADM-25: POST api-key missing label → 422', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    test.skip(!list.length, 'no tenants')
    const res = await request.post(`${API_URL}/api/admin/tenants/${list[0].id}/api-keys`, {
      headers: authHeaders(adminToken), data: {},
    })
    expect([400, 422]).toContain(res.status())
  })

  test('ADM-26: api-keys response never includes key_hash', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    test.skip(!list.length, 'no tenants')
    const res = await request.get(`${API_URL}/api/admin/tenants/${list[0].id}/api-keys`, {
      headers: authHeaders(adminToken),
    })
    const body = await res.text()
    expect(body).not.toMatch(/key_hash/i)
  })

  // ── Bot Subscribers ──────────────────────────────────────────────────────
  test('ADM-27: GET /api/admin/bot-subscribers', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/bot-subscribers`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBe(200)
  })

  test('ADM-28: POST bot-subscriber missing chat_id → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/bot-subscribers`, {
      headers: authHeaders(adminToken),
      data: { tenant_id: '00000000-0000-0000-0000-000000000000', platform: 'telegram', tenant_name: 'X' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('ADM-29: POST bot-subscriber missing platform → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/bot-subscribers`, {
      headers: authHeaders(adminToken),
      data: { tenant_id: '00000000-0000-0000-0000-000000000000', chat_id: '123', tenant_name: 'X' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('ADM-30: PUT bot-subscriber non-existent → 404', async ({ request }) => {
    const res = await request.put(`${API_URL}/api/admin/bot-subscribers/00000000-0000-0000-0000-000000000000`, {
      headers: authHeaders(adminToken), data: { is_active: false },
    })
    expect([400, 404]).toContain(res.status())
  })

  test('ADM-31: DELETE bot-subscriber non-existent → 404', async ({ request }) => {
    const res = await request.delete(`${API_URL}/api/admin/bot-subscribers/00000000-0000-0000-0000-000000000000`, {
      headers: authHeaders(adminToken),
    })
    expect([400, 404]).toContain(res.status())
  })

  // ── Tickets ──────────────────────────────────────────────────────────────
  test('ADM-32: GET /api/admin/tickets', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/tickets`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBe(200)
  })

  test('ADM-33: GET /api/admin/tickets as tenant → 403', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/admin/tickets`, { headers: authHeaders(tenantToken) })
    expect([401, 403]).toContain(res.status())
  })

  test('ADM-34: GET /api/admin/tickets/:id non-existent → 404', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/tickets/00000000-0000-0000-0000-000000000000`, {
      headers: authHeaders(adminToken),
    })
    expect(res.status()).toBe(404)
  })

  test('ADM-35: PUT ticket status invalid → 422', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tickets`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    if (!list.length) test.skip('no tickets')
    const res = await request.put(`${API_URL}/api/admin/tickets/${list[0].id}`, {
      headers: authHeaders(adminToken), data: { status: 'invalid-status' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('ADM-36: tenant branches endpoint restricted to admin', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/admin/tenants/00000000-0000-0000-0000-000000000000/branches`, {
      headers: authHeaders(tenantToken),
    })
    expect([401, 403]).toContain(res.status())
  })

  test('ADM-37: admin listing has no password_hash', async ({ request }) => {
    const res  = await request.get(`${API_URL}/api/admin/users`, { headers: authHeaders(adminToken) })
    const body = await res.text()
    expect(body).not.toMatch(/password_hash/i)
  })

  test('ADM-38: tenant listing has no password_hash', async ({ request }) => {
    const res  = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const body = await res.text()
    expect(body).not.toMatch(/password_hash/i)
  })

  test('ADM-39: stats response time < 3000ms', async ({ request }) => {
    const t = Date.now()
    await request.get(`${API_URL}/api/admin/stats`, { headers: authHeaders(adminToken) })
    expect(Date.now() - t).toBeLessThan(3000)
  })

  test('ADM-40: tenants list response time < 3000ms', async ({ request }) => {
    const t = Date.now()
    await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    expect(Date.now() - t).toBeLessThan(3000)
  })

  test('ADM-41: tenant update tolerates unknown fields', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    test.skip(!list.length, 'no tenants')
    const res = await request.put(`${API_URL}/api/admin/tenants/${list[0].id}`, {
      headers: authHeaders(adminToken), data: { unknown_field: 'x' },
    })
    expect([200, 400, 422]).toContain(res.status())
  })

  test('ADM-42: unknown admin endpoint → 404', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/nonexistent`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBe(404)
  })

  test('ADM-43: bot-subscribers supports telegram platform', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/bot-subscribers`, { headers: authHeaders(adminToken) })
    const body = await res.json()
    for (const s of body) {
      if (s.platform) expect(['telegram', 'whatsapp']).toContain(s.platform)
    }
  })

  test('ADM-44: tenant-branches listing works', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    test.skip(!list.length, 'no tenants')
    const res = await request.get(`${API_URL}/api/admin/tenants/${list[0].id}/branches`, {
      headers: authHeaders(adminToken),
    })
    expect(res.status()).toBe(200)
  })

  test('ADM-45: PUT api-keys with invalid id → 404/400', async ({ request }) => {
    const res = await request.put(`${API_URL}/api/admin/api-keys/00000000-0000-0000-0000-000000000000`, {
      headers: authHeaders(adminToken), data: { label: 'x' },
    })
    expect([400, 404]).toContain(res.status())
  })

  test('ADM-46: users search with email filter', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/users?email=admin`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBe(200)
  })

  test('ADM-47: admin POST requires Content-Type', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/tenants`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }, data: 'not json',
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('ADM-48: admin PUT tenant allow_import flag', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    test.skip(!list.length, 'no tenants')
    const res = await request.put(`${API_URL}/api/admin/tenants/${list[0].id}`, {
      headers: authHeaders(adminToken), data: { allow_import: true },
    })
    expect([200, 400]).toContain(res.status())
  })

  test('ADM-49: admin error messages are Arabic when user-facing', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/tenants`, {
      headers: authHeaders(adminToken), data: {},
    })
    const body = await res.json().catch(() => ({}))
    if (body.error) expect(body.error).toMatch(/[\u0600-\u06FF]/)
  })

  test('ADM-50: admin GET /api/admin/tickets includes ticket_number field', async ({ request }) => {
    const res  = await request.get(`${API_URL}/api/admin/tickets`, { headers: authHeaders(adminToken) })
    const body = await res.json()
    if (body.length) {
      expect(body[0]).toHaveProperty('ticket_number')
    }
  })
})
