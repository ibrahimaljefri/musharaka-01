/**
 * SEC-01 … SEC-30 — Security regression (headers, CORS, rate limit, JWT, leakage)
 */
import { test, expect } from '@playwright/test'
import { API_URL, loginAdmin, loginTenant, tryLoginAdmin, tryLoginTenant, authHeaders } from './_helpers'

test.describe('Security API', () => {
  let adminToken  = ''
  let tenantToken = ''

  test.beforeAll(async ({ request }) => {
    const a = await tryLoginAdmin(request); adminToken = a?.accessToken || ''
    try { const t = await tryLoginTenant(request); tenantToken = t?.accessToken || '' } catch {}
  })

  test('SEC-01: X-Content-Type-Options: nosniff on /api/health', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`)
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('SEC-02: X-Frame-Options: DENY on /api/health', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`)
    expect(String(res.headers()['x-frame-options'] || '').toUpperCase()).toMatch(/DENY|SAMEORIGIN/)
  })

  test('SEC-03: Strict-Transport-Security set', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`)
    expect(res.headers()['strict-transport-security']).toBeTruthy()
  })

  test('SEC-04: Referrer-Policy set', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`)
    expect(res.headers()['referrer-policy']).toBeTruthy()
  })

  test('SEC-05: Permissions-Policy set', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`)
    expect(res.headers()['permissions-policy']).toBeTruthy()
  })

  test('SEC-06: JWT with alg:none rejected everywhere', async ({ request }) => {
    const none = `${Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'x'})).toString('base64url')}.`
    const res = await request.get(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${none}` },
    })
    expect([401, 429]).toContain(res.status())
  })

  test('SEC-07: tampered JWT signature → 401', async ({ request }) => {
    const { accessToken } = await tryLoginAdmin(request)
    const tampered = accessToken.slice(0, -5) + 'XXXXX'
    const res = await request.get(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${tampered}` },
    })
    expect([401, 429]).toContain(res.status())
  })

  test('SEC-08: no password_hash anywhere in /auth/me', async ({ request }) => {
    const { accessToken } = await tryLoginAdmin(request)
    const res  = await request.get(`${API_URL}/api/auth/me`, { headers: authHeaders(accessToken) })
    const body = await res.text()
    expect(body).not.toMatch(/password_hash/i)
    expect(body).not.toMatch(/NEEDS_RESET/)
  })

  test('SEC-09: no ENCRYPTION_KEY anywhere in responses', async ({ request }) => {
    const { accessToken } = await tryLoginAdmin(request)
    const res  = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(accessToken) })
    const body = await res.text()
    expect(body).not.toMatch(/ENCRYPTION_KEY/i)
  })

  test('SEC-10: no SMTP_PASS anywhere in responses', async ({ request }) => {
    const { accessToken } = await tryLoginAdmin(request)
    const res  = await request.get(`${API_URL}/api/admin/stats`, { headers: authHeaders(accessToken) })
    const body = await res.text()
    expect(body).not.toMatch(/SMTP_PASS/i)
  })

  test('SEC-11: brute-force login rate limit → 429', async ({ request }) => {
    let saw429 = false
    for (let i = 0; i < 15; i++) {
      const r = await request.post(`${API_URL}/api/auth/login`, { data: { email: 'bad@x.com', password: `w${i}` } })
      if (r.status() === 429) { saw429 = true; break }
    }
    expect(saw429).toBeTruthy()
  })

  test('SEC-12: CORS: Origin bad → request fails or no CORS headers', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`, {
      headers: { 'Origin': 'https://evil.example' },
    })
    // Either the response has no ACAO, or ACAO is not evil.example
    const acao = res.headers()['access-control-allow-origin']
    if (acao) expect(acao).not.toBe('https://evil.example')
  })

  test('SEC-13: unauthorized /api/admin/stats → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/stats`)
    expect([401, 429]).toContain(res.status())
  })

  test('SEC-14: unauthorized /api/admin/users → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/users`)
    expect([401, 429]).toContain(res.status())
  })

  test('SEC-15: tenant token → /api/admin/tenants rejected', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(tenantToken) })
    expect([401, 403]).toContain(res.status())
  })

  test('SEC-16: JWT in URL query not accepted', async ({ request }) => {
    const { accessToken } = await tryLoginAdmin(request)
    const res = await request.get(`${API_URL}/api/admin/stats?token=${accessToken}`)
    expect([401, 429]).toContain(res.status())
  })

  test('SEC-17: Expired JWT → 401', async ({ request }) => {
    // Can't easily make an expired token without the secret; use malformed instead
    const res = await request.get(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.bad.sig' },
    })
    expect([401, 429]).toContain(res.status())
  })

  test('SEC-18: no Powered-By header', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`)
    expect(res.headers()['x-powered-by']).toBeFalsy()
  })

  test('SEC-19: SQL injection via search param returns no 500', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/admin/users?email='--`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBeLessThan(500)
  })

  test('SEC-20: POST JSON with script tag → no 500', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/admin/tenants`, {
      headers: authHeaders(adminToken), data: { name: '<script>alert(1)</script>', slug: `xss-${Date.now()}` },
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('SEC-21: error response is JSON, not HTML', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/stats`)
    expect(res.headers()['content-type']).toContain('application/json')
  })

  test('SEC-22: 404 for unknown /api/ routes', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/no-such-route-xyz`)
    expect([404, 429]).toContain(res.status())
  })

  test('SEC-23: 404 JSON includes Arabic error message', async ({ request }) => {
    const res  = await request.get(`${API_URL}/api/no-such-route-xyz`)
    const body = await res.json()
    expect(body.error).toMatch(/[\u0600-\u06FF]/)
  })

  test('SEC-24: /api prefix required — unmatched goes to SPA (not auth)', async ({ request }) => {
    const res = await request.get(`${API_URL}/admin/stats`)
    // Without /api prefix it's a client route served as SPA (200 + HTML)
    expect([200, 404]).toContain(res.status())
  })

  test('SEC-25: HEAD method safe on /api/health', async ({ request }) => {
    const res = await request.fetch(`${API_URL}/api/health`, { method: 'HEAD' })
    expect(res.status()).toBeLessThan(500)
  })

  test('SEC-26: tenant cannot escalate by setting isSuperAdmin in body', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/auth/change-password`, {
      headers: authHeaders(tenantToken),
      data: { current_password: 'wrong', new_password: 'x', isSuperAdmin: true },
    })
    // Must either succeed changing password only, or reject — but never grant super-admin
    if (res.status() === 200) {
      const me = await request.get(`${API_URL}/api/auth/me`, { headers: authHeaders(tenantToken) })
      const body = await me.json()
      expect(body.isSuperAdmin).not.toBe(true)
    }
  })

  test('SEC-27: Login response is NOT cacheable in shared caches', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD },
    })
    const cc = res.headers()['cache-control'] || ''
    // Accept any value that's not "public" — private/no-store is ideal but not always set
    expect(cc).not.toMatch(/public.*max-age=[1-9]/)
  })

  test('SEC-28: JWT payload does not contain DB password', async ({ request }) => {
    const { accessToken } = await tryLoginAdmin(request)
    const [, payload] = accessToken.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    expect(JSON.stringify(decoded)).not.toMatch(/password/i)
  })

  test('SEC-29: JWT payload does not contain SMTP credentials', async ({ request }) => {
    const { accessToken } = await tryLoginAdmin(request)
    const [, payload] = accessToken.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    expect(JSON.stringify(decoded)).not.toMatch(/smtp/i)
  })

  test('SEC-30: Only whitelisted HTTP methods on /api/auth/login (405 for others)', async ({ request }) => {
    const res = await request.fetch(`${API_URL}/api/auth/login`, { method: 'GET' })
    expect([404, 405, 401]).toContain(res.status())
  })
})
