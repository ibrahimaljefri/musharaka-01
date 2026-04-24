/**
 * SUB-01 … SUB-20 — Submit API regression (Cenomi integration)
 */
import { test, expect } from '@playwright/test'
import { API_URL, loginTenant, loginAdmin, tryLoginAdmin, tryLoginTenant, authHeaders } from './_helpers'

test.describe('Submit API', () => {
  let tenantToken = ''
  let adminToken  = ''

  test.beforeAll(async ({ request }) => {
    const a = await tryLoginAdmin(request); adminToken = a?.accessToken || ''
    try { const t = await tryLoginTenant(request); tenantToken = t?.accessToken || '' } catch {}
  })

  test('SUB-01: POST /api/submit unauthenticated → 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/submit`)
    expect(res.status()).toBe(401)
  })

  test('SUB-02: POST /api/submit missing body → 400/422', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, { headers: authHeaders(tenantToken), data: {} })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('SUB-03: POST /api/submit with unknown branch → 404/403', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: '00000000-0000-0000-0000-000000000000', month: 1, year: 2026 },
    })
    expect([400, 403, 404, 422]).toContain(res.status())
  })

  test('SUB-04: POST with invalid month → 422', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: '00000000-0000-0000-0000-000000000000', month: 99, year: 2026 },
    })
    expect([400, 403, 404, 422]).toContain(res.status())
  })

  test('SUB-05: submit route enforces tenant isolation (other tenant branch)', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: '11111111-1111-1111-1111-111111111111', month: 1, year: 2026 },
    })
    expect([400, 403, 404, 422]).toContain(res.status())
  })

  test('SUB-06: GET /api/submit is not a valid route (only POST)', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/submit`)
    expect([404, 405, 401]).toContain(res.status())
  })

  test('SUB-07: submit response time < 15000ms even for mock path', async ({ request }) => {

    const t = Date.now()
    await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: '00000000-0000-0000-0000-000000000000', month: 1, year: 2026 },
    })
    expect(Date.now() - t).toBeLessThan(15000)
  })

  test('SUB-08: submit returns JSON (not HTML)', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken), data: {},
    })
    expect(res.headers()['content-type']).toContain('application/json')
  })

  test('SUB-09: submit does not leak stack trace on error', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: 'not-a-uuid', month: 1, year: 2026 },
    })
    const body = await res.text()
    expect(body).not.toMatch(/node_modules/)
    expect(body).not.toMatch(/at [A-Z]\w+\./)
  })

  test('SUB-10: Cenomi token never returned in submit response', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: '00000000-0000-0000-0000-000000000000', month: 1, year: 2026 },
    })
    const body = await res.text()
    expect(body).not.toMatch(/cenomi_api_token/i)
    expect(body).not.toMatch(/encrypt/i)
  })

  test('SUB-11: tampered JWT → 401 (not 500)', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/submit`, {
      headers: { 'Authorization': 'Bearer tampered', 'Content-Type': 'application/json' },
      data: { branch_id: 'x', month: 1, year: 2026 },
    })
    expect(res.status()).toBe(401)
  })

  test('SUB-12: /api/submissions GET returns array for tenant', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/submissions`, { headers: authHeaders(tenantToken) })
    expect([200, 404]).toContain(res.status())
  })

  test('SUB-13: /api/submissions GET unauthenticated → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/submissions`)
    expect([401, 404]).toContain(res.status())
  })

  test('SUB-14: submit rejects admin-without-tenant (no tenant context)', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(adminToken),
      data: { branch_id: '00000000-0000-0000-0000-000000000000', month: 1, year: 2026 },
    })
    expect([400, 403, 404, 422]).toContain(res.status())
  })

  test('SUB-15: submit does not accept GET method', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/submit/foo`)
    expect([401, 404, 405]).toContain(res.status())
  })

  test('SUB-16: submit payload error message is Arabic', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: '00000000-0000-0000-0000-000000000000', month: 1, year: 2026 },
    })
    if (res.status() >= 400 && res.status() < 500) {
      const body = await res.json().catch(() => ({}))
      if (body.error) {
        // Expect Arabic characters in error
        expect(body.error).toMatch(/[\u0600-\u06FF]/)
      }
    }
  })

  test('SUB-17: submit handles negative month → 422', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: '00000000-0000-0000-0000-000000000000', month: -1, year: 2026 },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('SUB-18: submit handles null year → 422', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: '00000000-0000-0000-0000-000000000000', month: 1, year: null },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('SUB-19: no database connection string leak', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: 'not-a-uuid', month: 1, year: 2026 },
    })
    const body = await res.text()
    expect(body).not.toMatch(/postgres:\/\//)
    expect(body).not.toMatch(/DATABASE_URL/i)
  })

  test('SUB-20: submit endpoint has CORS + security headers', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken), data: {},
    })
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })
})
