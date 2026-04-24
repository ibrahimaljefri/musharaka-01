/**
 * Shared helpers for API regression tests (Playwright APIRequestContext).
 *
 * Uses module-level token caching so we hit /api/auth/login ONCE per process.
 * This avoids cascading rate-limit failures when many spec files each call
 * loginAdmin/loginTenant in their beforeAll hook.
 */
import { APIRequestContext, expect } from '@playwright/test'

const API_URL = process.env.API_URL || 'https://apps.stepup2you.com'

export interface AuthTokens {
  accessToken: string
  user: {
    id: string
    email: string
    isSuperAdmin: boolean
    tenantId: string | null
    role: string | null
  }
}

// ── Module-level token cache ─────────────────────────────────────────────
let cachedAdmin:  AuthTokens | null = null
let cachedTenant: AuthTokens | null = null

/** Log in with short retry-on-429. Max ~9s so it fits inside the 30s
 *  test timeout even when called inside a beforeAll hook. */
async function rawLogin(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthTokens> {
  const waits = [0, 3000, 6000]    // ~9s total, 3 attempts
  let lastStatus = 0
  let lastBody   = ''
  for (const w of waits) {
    if (w) await new Promise(r => setTimeout(r, w))
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email, password },
    })
    if (res.ok()) return res.json()
    lastStatus = res.status()
    lastBody   = await res.text()
    if (lastStatus !== 429) break
  }
  throw new Error(`login failed for ${email}: ${lastStatus} ${lastBody}`)
}

/** Hits the endpoint. Fails the test if login fails. */
export async function login(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthTokens> {
  const tokens = await rawLogin(request, email, password)
  expect(tokens.accessToken, 'login must return access token').toBeTruthy()
  return tokens
}

export async function loginAdmin(request: APIRequestContext): Promise<AuthTokens> {
  if (cachedAdmin) return cachedAdmin
  cachedAdmin = await login(
    request,
    process.env.TEST_ADMIN_EMAIL || 'admin@admin.com',
    process.env.TEST_ADMIN_PASSWORD || 'admin123'
  )
  return cachedAdmin
}

export async function loginTenant(request: APIRequestContext): Promise<AuthTokens> {
  if (cachedTenant) return cachedTenant
  cachedTenant = await login(
    request,
    process.env.TEST_USER_EMAIL || 'ibrahimaljefri@yahoo.com',
    process.env.TEST_USER_PASSWORD || '123456'
  )
  return cachedTenant
}

/** Non-throwing variants for beforeAll — return null on any failure so
 *  the suite still runs tests that don't need a token. */
export async function tryLoginAdmin(request: APIRequestContext): Promise<AuthTokens | null> {
  try { return await loginAdmin(request) } catch { return null }
}
export async function tryLoginTenant(request: APIRequestContext): Promise<AuthTokens | null> {
  try { return await loginTenant(request) } catch { return null }
}

/** Build Bearer auth headers. */
export function authHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }
}

/** Tiny retry wrapper for flaky endpoints. */
export async function retry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 500 * (i + 1))) }
  }
  throw lastErr
}

export { API_URL }
