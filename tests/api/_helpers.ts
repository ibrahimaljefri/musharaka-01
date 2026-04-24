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

/** Log in and return access token + user. Fails test on non-200. */
export async function login(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthTokens> {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  })
  expect(res.ok(), `login failed for ${email}: ${res.status()} ${await res.text()}`).toBeTruthy()
  return res.json()
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
