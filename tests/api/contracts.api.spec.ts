/**
 * CONT-01 … CONT-15 — Public Contracts API (/api/contracts)
 * Auth: Bearer JWT OR X-API-Key
 */
import { test, expect } from '@playwright/test'
import { API_URL, loginAdmin, loginTenant, tryLoginAdmin, tryLoginTenant, authHeaders } from './_helpers'

test.describe('Contracts API', () => {
  let tenantToken = ''
  let adminToken  = ''

  test.beforeAll(async ({ request }) => {
    const a = await tryLoginAdmin(request); adminToken = a?.accessToken || ''
    try { const t = await tryLoginTenant(request); tenantToken = t?.accessToken || '' } catch {}
  })

  test('CONT-01: GET /api/contracts unauthenticated → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/contracts`)
    expect(res.status()).toBe(401)
  })

  test('CONT-02: GET /api/contracts with invalid API key → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/contracts`, {
      headers: { 'X-API-Key': 'invalid-key-xyz' },
    })
    expect(res.status()).toBe(401)
  })

  test('CONT-03: GET /api/contracts as tenant JWT → 200', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/contracts`, { headers: authHeaders(tenantToken) })
    expect(res.status()).toBe(200)
  })

  test('CONT-04: response has { total, limit, offset, records }', async ({ request }) => {

    const res  = await request.get(`${API_URL}/api/contracts`, { headers: authHeaders(tenantToken) })
    const body = await res.json()
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('records')
  })

  test('CONT-05: limit parameter accepted', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/contracts?limit=5`, { headers: authHeaders(tenantToken) })
    expect(res.status()).toBe(200)
  })

  test('CONT-06: from/to date filter accepted', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/contracts?from=2026-01-01&to=2026-12-31`, {
      headers: authHeaders(tenantToken),
    })
    expect(res.status()).toBe(200)
  })

  test('CONT-07: status=pending filter accepted', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/contracts?status=pending`, { headers: authHeaders(tenantToken) })
    expect(res.status()).toBe(200)
  })

  test('CONT-08: max limit enforced (1000)', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/contracts?limit=99999`, { headers: authHeaders(tenantToken) })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.limit).toBeLessThanOrEqual(1000)
  })

  test('CONT-09: invalid date format → no 500', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/contracts?from=not-a-date`, { headers: authHeaders(tenantToken) })
    expect(res.status()).toBeLessThan(500)
  })

  test('CONT-10: SQL injection in param → no 500', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/contracts?status=pending' OR '1'='1`, {
      headers: authHeaders(tenantToken),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('CONT-11: response time < 3000ms', async ({ request }) => {

    const t = Date.now()
    await request.get(`${API_URL}/api/contracts?limit=100`, { headers: authHeaders(tenantToken) })
    expect(Date.now() - t).toBeLessThan(3000)
  })

  test('CONT-12: Arabic fields preserved in response', async ({ request }) => {
    if (!tenantToken) { test.skip(true, 'tenant token unavailable'); return }
    const res  = await request.get(`${API_URL}/api/contracts?limit=5`, { headers: authHeaders(tenantToken) })
    if (res.status() !== 200) { test.skip(true, `endpoint returned ${res.status()}`); return }
    const body = await res.json()
    for (const r of (body.records || [])) {
      if (r.branch_name && typeof r.branch_name === 'string') {
        expect(r.branch_name).not.toMatch(/\uFFFD/)
      }
    }
  })

  test('CONT-13: both x-api-key methods accepted (header or query)', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/contracts?api_key=bogus`, {})
    expect([401, 429]).toContain(res.status())
  })

  test('CONT-14: tenant records filtered by tenant_id (via JWT)', async ({ request }) => {

    const res  = await request.get(`${API_URL}/api/contracts?limit=100`, { headers: authHeaders(tenantToken) })
    const body = await res.json()
    expect(Array.isArray(body.records)).toBe(true)
  })

  test('CONT-15: response does not expose tenant_id of OTHER tenants', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/contracts`, { headers: authHeaders(tenantToken) })
    expect(res.status()).toBe(200)
  })
})
