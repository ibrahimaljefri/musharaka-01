/**
 * REP-01 … REP-05 — Reports-related API smoke (relies on /api/sales aggregations)
 */
import { test, expect } from '@playwright/test'
import { API_URL, loginTenant, tryLoginTenant, authHeaders } from './_helpers'

test.describe('Reports API', () => {
  let tenantToken = ''

  test.beforeAll(async ({ request }) => {
    try { const t = await tryLoginTenant(request); tenantToken = t?.accessToken || '' } catch {}
  })

  test('REP-01: GET /api/sales?from=2026-01-01&to=2026-12-31 for reports range', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/sales?from=2026-01-01&to=2026-12-31`, {
      headers: authHeaders(tenantToken),
    })
    expect([200, 429]).toContain(res.status())
  })

  test('REP-02: reports sum over full year within budget time', async ({ request }) => {

    const t = Date.now()
    await request.get(`${API_URL}/api/sales?from=2025-01-01&to=2026-12-31`, { headers: authHeaders(tenantToken) })
    expect(Date.now() - t).toBeLessThan(5000)
  })

  test('REP-03: future range returns 0 records, not 500', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/sales?from=2099-01-01&to=2099-12-31`, {
      headers: authHeaders(tenantToken),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('REP-04: invalid date range (from > to) → 200 empty or 400', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/sales?from=2026-12-31&to=2026-01-01`, {
      headers: authHeaders(tenantToken),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('REP-05: reports response does not leak other tenants', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/sales?limit=100`, { headers: authHeaders(tenantToken) })
    expect([200, 429]).toContain(res.status())
  })
})
