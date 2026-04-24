/**
 * Shared helpers for API regression tests.
 * Tests use Playwright's `request` fixture (APIRequestContext).
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

/** Log in and return access token + user.
 *  Retries on 429 (rate-limited) with exponential backoff up to ~70s total
 *  to survive the rate-limit window after AUTH-05's brute-force test. */
export async function login(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthTokens> {
  const waits = [0, 5000, 10000, 15000, 20000, 20000]  // ~70s total
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
    if (lastStatus !== 429) break   // non-rate-limit errors don't benefit from retry
  }
  expect.soft(false, `login failed for ${email}: ${lastStatus} ${lastBody}`).toBeTruthy()
  throw new Error(`login failed for ${email}: ${lastStatus}`)
}

export async function loginAdmin(request: APIRequestContext): Promise<AuthTokens> {
  return login(
    request,
    process.env.TEST_ADMIN_EMAIL || 'admin@admin.com',
    process.env.TEST_ADMIN_PASSWORD || 'admin123'
  )
}

export async function loginTenant(request: APIRequestContext): Promise<AuthTokens> {
  return login(
    request,
    process.env.TEST_USER_EMAIL || 'ibrahimaljefri@yahoo.com',
    process.env.TEST_USER_PASSWORD || '123456'
  )
}

/** Non-throwing login helpers for beforeAll — return null on any failure so
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
