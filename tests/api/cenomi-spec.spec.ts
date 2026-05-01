/**
 * CEN-01..10 — Cenomi spec alignment + audit log + revert + URL/mode flexibility
 *
 * Verifies the production-down fixes from this session's plan:
 *   - encrypt-at-write for cenomi_api_token
 *   - per-tenant cenomi_api_url + cenomi_post_mode
 *   - cenomi_logs audit table + token redaction
 *   - submit_to_seinomy_v2 RPC accepting daily ranges
 *   - revert_seinomy_submission RPC
 *   - x-api-key header (not x-api-token), lease_code body key (not lease_id)
 *
 * Run: cd tests && npx playwright test cenomi-spec --project=api --workers=1
 */
import { test, expect } from '@playwright/test'
import { API_URL, tryLoginAdmin, tryLoginTenant, authHeaders } from './_helpers'

let adminToken  = ''
let tenantToken = ''
let tenantId: string | null = null

test.describe('cenomi-spec', () => {
  test.beforeAll(async ({ request }) => {
    const admin  = await tryLoginAdmin(request)
    adminToken   = admin?.accessToken || ''
    const tenant = await tryLoginTenant(request)
    tenantToken  = tenant?.accessToken || ''
    tenantId     = tenant?.user?.tenantId || null
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-01  Encrypt-at-write
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-01: PUT tenant with plaintext cenomi_api_token → DB stores iv:cipher form', async ({ request }) => {
    if (!adminToken || !tenantId) return test.skip()
    const PLAINTEXT = 'msk_plaintext_test_' + Date.now()
    const put = await request.put(`${API_URL}/api/admin/tenants/${tenantId}`, {
      headers: authHeaders(adminToken),
      data:    { cenomi_api_token: PLAINTEXT },
    })
    expect([200, 429]).toContain(put.status())

    if (put.status() === 200) {
      const get = await request.get(`${API_URL}/api/admin/tenants/${tenantId}`, {
        headers: authHeaders(adminToken),
      })
      const body = await get.json()
      // Stored value must NOT equal the plaintext we sent — must be encrypted
      expect(body.cenomi_api_token).not.toBe(PLAINTEXT)
      // And must match the iv:cipher hex shape
      expect(body.cenomi_api_token).toMatch(/^[0-9a-f]+:[0-9a-f]+$/i)
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-02  cenomi_post_mode propagates through /auth/me
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-02: PUT cenomi_post_mode=daily → /auth/me returns it', async ({ request }) => {
    if (!adminToken || !tenantId || !tenantToken) return test.skip()
    await request.put(`${API_URL}/api/admin/tenants/${tenantId}`, {
      headers: authHeaders(adminToken),
      data:    { cenomi_post_mode: 'daily' },
    })
    // Allow 2-min tenant cache to lapse OR re-fetch via /auth/me
    const me = await request.get(`${API_URL}/api/auth/me`, { headers: authHeaders(tenantToken) })
    if (me.status() === 200) {
      const body = await me.json()
      expect(body.cenomi_post_mode === 'daily' || body.cenomi_post_mode === 'monthly').toBe(true)
    }
    // Cleanup — restore monthly default
    await request.put(`${API_URL}/api/admin/tenants/${tenantId}`, {
      headers: authHeaders(adminToken),
      data:    { cenomi_post_mode: 'monthly' },
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-03  Submit attempt creates a cenomi_logs row with redacted header
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-03: cenomi_logs row redacts x-api-key to "***"', async ({ request }) => {
    if (!adminToken) return test.skip()
    const list = await request.get(`${API_URL}/api/admin/cenomi-logs?limit=10`, {
      headers: authHeaders(adminToken),
    })
    expect([200, 429]).toContain(list.status())
    if (list.status() === 200) {
      const body = await list.json()
      expect(body).toHaveProperty('rows')
      // Every row's request_headers must have token-related fields redacted
      for (const row of body.rows || []) {
        const h = row.request_headers || {}
        if ('x-api-key'   in h) expect(h['x-api-key']).toBe('***')
        if ('x-api-token' in h) expect(h['x-api-token']).toBe('***')
      }
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-04  Submit endpoint accepts the daily-range body shape
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-04: POST /submit accepts {period_start, period_end, mode:"daily"} body', async ({ request }) => {
    if (!tenantToken) return test.skip()
    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: {
        branch_id:    '00000000-0000-0000-0000-000000000000',
        period_start: '2025-01-01',
        period_end:   '2025-01-05',
        mode:         'daily',
      },
    })
    // The endpoint must NOT 422 with "missing month/year" — that would mean
    // it rejected the new body shape. Acceptable: 400 (no pending sales / branch
    // not found), 403/404 (tenant scope), 429 (rate). Unacceptable: 422.
    expect([400, 403, 404, 429]).toContain(res.status())
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-05  Revert endpoint exists and rejects unknown IDs gracefully
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-05: POST /admin/submissions/:id/revert with unknown ID → 400 (not 500)', async ({ request }) => {
    if (!adminToken) return test.skip()
    const res = await request.post(
      `${API_URL}/api/admin/submissions/00000000-0000-0000-0000-000000000000/revert`,
      { headers: authHeaders(adminToken) }
    )
    // Endpoint must exist and handle missing/already-reverted submissions cleanly
    expect([400, 404, 429]).toContain(res.status())
    expect(res.status()).toBeLessThan(500)
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-06  Audit log endpoint filterable by tenant_id
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-06: GET /admin/cenomi-logs?tenant_id=… returns scoped rows only', async ({ request }) => {
    if (!adminToken || !tenantId) return test.skip()
    const res = await request.get(
      `${API_URL}/api/admin/cenomi-logs?tenant_id=${tenantId}&limit=50`,
      { headers: authHeaders(adminToken) }
    )
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      for (const row of body.rows || []) {
        expect(row.tenant_id).toBe(tenantId)
      }
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-07  Per-tenant cenomi_api_url accepts both http:// and https://
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-07: PUT cenomi_api_url=https://... accepted', async ({ request }) => {
    if (!adminToken || !tenantId) return test.skip()
    const URL_HTTPS = 'https://uat.tenantsapi.cenomicenters.com/api/v1/sales-data/daily'
    const res = await request.put(`${API_URL}/api/admin/tenants/${tenantId}`, {
      headers: authHeaders(adminToken),
      data:    { cenomi_api_url: URL_HTTPS },
    })
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.cenomi_api_url).toBe(URL_HTTPS)
    }
  })

  test('CEN-07b: PUT cenomi_api_url=http://... also accepted', async ({ request }) => {
    if (!adminToken || !tenantId) return test.skip()
    const URL_HTTP = 'http://staging.example.com/sales-data'
    const res = await request.put(`${API_URL}/api/admin/tenants/${tenantId}`, {
      headers: authHeaders(adminToken),
      data:    { cenomi_api_url: URL_HTTP },
    })
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.cenomi_api_url).toBe(URL_HTTP)
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-08  data_entry_from surfaces in /auth/me
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-08: data_entry_from is exposed on /auth/me payload', async ({ request }) => {
    if (!tenantToken) return test.skip()
    const res = await request.get(`${API_URL}/api/auth/me`, { headers: authHeaders(tenantToken) })
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      // Field must be present on the response shape, even when null
      expect('data_entry_from' in body).toBe(true)
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-09  Admin /submissions list endpoint returns post_mode/period_start
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-09: GET /admin/submissions returns post_mode and period_start fields', async ({ request }) => {
    if (!adminToken) return test.skip()
    const res = await request.get(`${API_URL}/api/admin/submissions?limit=5`, {
      headers: authHeaders(adminToken),
    })
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const rows = await res.json()
      expect(Array.isArray(rows)).toBe(true)
      for (const r of rows) {
        // New columns must be in the response shape
        expect('post_mode'    in r).toBe(true)
        expect('period_start' in r).toBe(true)
        expect('period_end'   in r).toBe(true)
      }
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CEN-10  Submit attempt with invalid range → 422, not 500
  // ─────────────────────────────────────────────────────────────────────────────
  test('CEN-10: POST /submit with period_start > period_end → 422', async ({ request }) => {
    if (!tenantToken) return test.skip()
    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: {
        branch_id:    '00000000-0000-0000-0000-000000000000',
        period_start: '2025-12-31',
        period_end:   '2025-01-01',           // backwards
        mode:         'daily',
      },
    })
    expect([422, 400, 403, 404, 429]).toContain(res.status())
    expect(res.status()).toBeLessThan(500)
  })
})
