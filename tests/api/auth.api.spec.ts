/**
 * AUTH-01 … AUTH-30 — Auth API regression
 * Covers: login, signup, refresh, logout, me, change-password, forgot-password, reset-password
 * Applies to BOTH tenant and admin users.
 */
import { test, expect } from '@playwright/test'
import { API_URL, login, loginAdmin, loginTenant, authHeaders } from './_helpers'

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    || 'admin@admin.com'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123'
const CLIENT_EMAIL   = process.env.TEST_USER_EMAIL    || 'ibrahimaljefri@yahoo.com'
const CLIENT_PASSWORD= process.env.TEST_USER_PASSWORD || '123456'

test.describe('Auth API', () => {
  // AUTH-01
  test('AUTH-01: valid admin credentials → 200 + access_token', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('accessToken')
    expect(body.user.isSuperAdmin).toBe(true)
  })

  // AUTH-02
  test('AUTH-02: wrong password → 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: 'WrongPass999!' },
    })
    expect(res.status()).toBe(401)
  })

  // AUTH-03
  test('AUTH-03: non-existent email → 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: 'no-such@musharaka.test', password: 'whatever' },
    })
    expect(res.status()).toBe(401)
  })

  // AUTH-04
  test('AUTH-04: missing fields → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL },
    })
    expect([400, 422]).toContain(res.status())
  })

  // AUTH-05 — Rate limit (runs LAST in this suite to avoid tripping other beforeAlls)
  // See end of file.

  // AUTH-06
  test('AUTH-06: valid tenant login → 200', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: CLIENT_EMAIL, password: CLIENT_PASSWORD },
    })
    expect([200, 403]).toContain(res.status())   // 403 if mustChangePassword
  })

  // AUTH-07
  test('AUTH-07: GET /api/auth/me with valid token → user object', async ({ request }) => {
    const { accessToken } = await loginAdmin(request)
    const res = await request.get(`${API_URL}/api/auth/me`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.email).toBe(ADMIN_EMAIL)
  })

  // AUTH-08
  test('AUTH-08: GET /api/auth/me without token → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/auth/me`)
    expect(res.status()).toBe(401)
  })

  // AUTH-09
  test('AUTH-09: GET /api/auth/me with tampered token → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer tampered.jwt.token' },
    })
    expect(res.status()).toBe(401)
  })

  // AUTH-10
  test('AUTH-10: GET /api/auth/me with alg:none token → 401', async ({ request }) => {
    // Manually crafted alg:none JWT — server must reject it
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ sub: 'any', email: 'x@x.com' })).toString('base64url')
    const none = `${header}.${payload}.`
    const res = await request.get(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${none}` },
    })
    expect(res.status()).toBe(401)
  })

  // AUTH-11 — Signup validation
  test('AUTH-11: POST /api/auth/signup missing email → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/signup`, {
      data: { password: 'Password123!' },
    })
    expect([400, 422]).toContain(res.status())
  })

  // AUTH-12
  test('AUTH-12: POST /api/auth/signup weak password → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/signup`, {
      data: { email: `tmp${Date.now()}@test.com`, password: '123' },
    })
    expect([400, 422]).toContain(res.status())
  })

  // AUTH-13
  test('AUTH-13: POST /api/auth/signup duplicate email → 409', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/signup`, {
      data: { email: ADMIN_EMAIL, password: 'Password123!' },
    })
    expect(res.status()).toBe(409)
  })

  // AUTH-14 — Change password
  test('AUTH-14: POST /api/auth/change-password wrong current → 401', async ({ request }) => {
    const { accessToken } = await loginAdmin(request)
    const res = await request.post(`${API_URL}/api/auth/change-password`, {
      headers: authHeaders(accessToken),
      data: { current_password: 'wrong!', new_password: 'NewPass123!' },
    })
    expect(res.status()).toBe(401)
  })

  // AUTH-15
  test('AUTH-15: POST /api/auth/change-password unauthenticated → 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/change-password`, {
      data: { current_password: 'x', new_password: 'y' },
    })
    expect(res.status()).toBe(401)
  })

  // AUTH-16 — Forgot password (no user enumeration)
  test('AUTH-16: forgot-password for unknown email → 200 (no enumeration)', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/forgot-password`, {
      data: { email: 'nonexistent-user@musharaka.test' },
    })
    expect(res.status()).toBe(200)
  })

  // AUTH-17
  test('AUTH-17: forgot-password missing email → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/forgot-password`, {
      data: {},
    })
    expect([400, 422]).toContain(res.status())
  })

  // AUTH-18 — Reset password
  test('AUTH-18: reset-password invalid token → 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/reset-password`, {
      data: { token: 'invalid-token', new_password: 'NewPass123!' },
    })
    expect([400, 422]).toContain(res.status())
  })

  // AUTH-19 — Refresh token
  test('AUTH-19: refresh without cookie → 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/refresh`)
    expect(res.status()).toBe(401)
  })

  // AUTH-20 — Logout
  test('AUTH-20: logout always succeeds (idempotent)', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/logout`)
    expect([200, 401]).toContain(res.status())
  })

  // AUTH-21 — Password hash never returned
  test('AUTH-21: /auth/me response does NOT include password_hash', async ({ request }) => {
    const { accessToken } = await loginAdmin(request)
    const res  = await request.get(`${API_URL}/api/auth/me`, { headers: authHeaders(accessToken) })
    const body = await res.json()
    expect(body).not.toHaveProperty('password_hash')
    expect(body).not.toHaveProperty('password')
  })

  // AUTH-22 — Login does not include password in response
  test('AUTH-22: login response does not leak password_hash', async ({ request }) => {
    const res  = await request.post(`${API_URL}/api/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
    const body = await res.json()
    expect(JSON.stringify(body)).not.toMatch(/password_hash/i)
    expect(JSON.stringify(body)).not.toMatch(/bcrypt/i)
  })

  // AUTH-23 — Admin flag in JWT is boolean true
  test('AUTH-23: admin login → user.isSuperAdmin === true', async ({ request }) => {
    const { user } = await loginAdmin(request)
    expect(user.isSuperAdmin).toBe(true)
  })

  // AUTH-24 — Cross-role token — tenant token should not have isSuperAdmin=true
  test('AUTH-24: tenant login → user.isSuperAdmin !== true', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: CLIENT_EMAIL, password: CLIENT_PASSWORD },
    })
    if (res.status() !== 200) test.skip()
    const body = await res.json()
    expect(body.user.isSuperAdmin).not.toBe(true)
  })

  // AUTH-25 — Signup flow end-to-end
  test('AUTH-25: signup new email + immediate /me works', async ({ request }) => {
    const email = `tmp-${Date.now()}@musharaka.test`
    const res   = await request.post(`${API_URL}/api/auth/signup`, {
      data: { email, password: 'GoodPass123!', full_name: 'Test User' },
    })
    // Signup may be disabled in production — accept both
    if (![200, 201].includes(res.status())) test.skip()
    const body  = await res.json()
    expect(body.accessToken).toBeTruthy()
    const me = await request.get(`${API_URL}/api/auth/me`, { headers: authHeaders(body.accessToken) })
    expect(me.status()).toBe(200)
  })

  // AUTH-26 — Case insensitive email
  test('AUTH-26: login email case-insensitive', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL.toUpperCase(), password: ADMIN_PASSWORD },
    })
    expect(res.status()).toBe(200)
  })

  // AUTH-27 — Empty body
  test('AUTH-27: empty body → 400/422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, { data: {} })
    expect([400, 422]).toContain(res.status())
  })

  // AUTH-28 — Login response includes tenant context for tenant user
  test('AUTH-28: tenant login includes tenantId in user', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: CLIENT_EMAIL, password: CLIENT_PASSWORD },
    })
    if (res.status() !== 200) test.skip()
    const body = await res.json()
    expect(body.user).toHaveProperty('tenantId')
  })

  // AUTH-29 — CORS headers present on login
  test('AUTH-29: login response has CORS/security headers', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    const headers = res.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
  })

  // AUTH-30 — No stack traces in error responses
  test('AUTH-30: error response never includes stack trace', async ({ request }) => {
    const res  = await request.post(`${API_URL}/api/auth/login`, { data: { email: 'bad', password: 'bad' } })
    const body = await res.text()
    expect(body).not.toMatch(/at Object/)
    expect(body).not.toMatch(/\.js:\d+:\d+/)
  })

  // AUTH-05 — Rate limit (runs LAST so we don't trip the limiter for other tests)
  test('AUTH-05: brute-force 12× rapid → 429 at some point', async ({ request }) => {
    test.setTimeout(60_000)
    let sawRateLimit = false
    for (let i = 0; i < 12; i++) {
      const res = await request.post(`${API_URL}/api/auth/login`, {
        data: { email: `bad-${Date.now()}-${i}@example.com`, password: 'WrongPass' + i },
      })
      if (res.status() === 429) { sawRateLimit = true; break }
    }
    expect(sawRateLimit).toBeTruthy()
  })
})
