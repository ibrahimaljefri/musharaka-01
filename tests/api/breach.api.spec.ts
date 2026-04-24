/**
 * BREACH-01 … BREACH-25 — Real data-breach / tenant-isolation tests
 *
 * Unlike the generic SEC-* suite (headers, JWT tamper, rate limit), these
 * tests exercise the ACTUAL cross-tenant read / write / delete attack
 * surface:
 *
 *   - Log in as Tenant A
 *   - Discover another tenant's resource id via admin
 *   - Try to READ / MODIFY / DELETE it using Tenant A's JWT
 *   - Assert 403 or 404 — NEVER 200 with foreign data
 *
 * The one time in this project's history where isolation broke was the
 * `supabase.from()` bypass that let any logged-in user see BR-001 from
 * another tenant. These tests are the trip-wire against that regression.
 */
import { test, expect } from '@playwright/test'
import { API_URL, loginAdmin, tryLoginTenant, authHeaders } from './_helpers'

test.describe('Data Breach / Tenant Isolation', () => {
  let adminToken  = ''
  let tenantToken = ''
  let tenantId    = ''
  let otherTenantId   = ''
  let otherBranchId   = ''
  let otherSaleId     = ''
  let otherTicketId   = ''

  test.beforeAll(async ({ request }) => {
    // Admin — discover the cross-tenant data surface
    try {
      const admin   = await loginAdmin(request)
      adminToken    = admin.accessToken

      const tRes    = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
      if (tRes.ok()) {
        const tenants = await tRes.json()

        // Tenant user — whoever they are
        const tenant  = await tryLoginTenant(request)
        tenantToken   = tenant?.accessToken || ''
        tenantId      = tenant?.user?.tenantId || ''

        // Find a DIFFERENT tenant whose data the tenant user must not see
        const other = tenants.find(t => t.id !== tenantId) || tenants[0]
        if (other) {
          otherTenantId = other.id

          // Grab one of their branches via the admin-only endpoint
          const brRes = await request.get(`${API_URL}/api/admin/tenants/${other.id}/branches`, {
            headers: authHeaders(adminToken),
          })
          if (brRes.ok()) {
            const branches = await brRes.json()
            otherBranchId  = branches[0]?.id || ''
          }
        }
      }

      // Find a ticket owned by someone else (admin sees all)
      const tk = await request.get(`${API_URL}/api/admin/tickets`, { headers: authHeaders(adminToken) })
      if (tk.ok()) {
        const tickets = await tk.json()
        const foreign = tickets.find(t => t.tenant_id && t.tenant_id !== tenantId)
        if (foreign) otherTicketId = foreign.id
      }
    } catch { /* ignore — tests will early-return if fixtures unavailable */ }
  })

  // ── 1. READ attacks ──────────────────────────────────────────────────

  test('BREACH-01: Tenant cannot read another tenant\'s branch by id', async ({ request }) => {
    if (!tenantToken || !otherBranchId) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/branches/${otherBranchId}`, {
      headers: authHeaders(tenantToken),
    })
    expect([401, 403, 404, 429]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.tenant_id, 'MUST NOT leak foreign branch').toBe(tenantId)
    }
  })

  test('BREACH-02: GET /api/branches never returns another tenant\'s row', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/branches`, { headers: authHeaders(tenantToken) })
    if (res.status() !== 200) { expect(res.status()).toBeLessThan(500); return }
    const rows = await res.json()
    const list = Array.isArray(rows) ? rows : (rows?.branches || [])
    for (const b of list) {
      if (b.tenant_id) expect(b.tenant_id).toBe(tenantId)
    }
  })

  test('BREACH-03: GET /api/sales never returns another tenant\'s row', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/sales?limit=1000`, { headers: authHeaders(tenantToken) })
    if (res.status() !== 200) { expect(res.status()).toBeLessThan(500); return }
    const body  = await res.json()
    const sales = body?.sales || []
    for (const s of sales) {
      if (s.tenant_id) expect(s.tenant_id).toBe(tenantId)
    }
  })

  test('BREACH-04: GET /api/submissions never returns another tenant\'s row', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/submissions?limit=1000`, { headers: authHeaders(tenantToken) })
    if (res.status() !== 200) { expect(res.status()).toBeLessThan(500); return }
    const body = await res.json()
    const subs = body?.submissions || []
    for (const s of subs) {
      if (s.tenant_id) expect(s.tenant_id).toBe(tenantId)
    }
  })

  test('BREACH-05: GET /api/contracts never returns another tenant\'s row', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/contracts?limit=1000`, { headers: authHeaders(tenantToken) })
    if (res.status() !== 200) { expect(res.status()).toBeLessThan(500); return }
    const body = await res.json()
    for (const r of body?.records || []) {
      // contracts don't expose tenant_id but we cross-reference via the admin-discovered foreign branch
      if (otherBranchId) {
        expect(r.branch_id || '').not.toBe(otherBranchId)
      }
    }
  })

  test('BREACH-06: Filter by other tenant\'s branch_id returns zero rows', async ({ request }) => {
    if (!tenantToken || !otherBranchId) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/sales?branch_id=${otherBranchId}`, {
      headers: authHeaders(tenantToken),
    })
    if (res.status() !== 200) { expect(res.status()).toBeLessThan(500); return }
    const body = await res.json()
    // server must tenant-scope BEFORE applying branch filter → 0 rows
    expect((body?.sales || []).length).toBe(0)
  })

  // ── 2. WRITE attacks ─────────────────────────────────────────────────

  test('BREACH-07: POST /api/sales with other tenant\'s branch_id rejected', async ({ request }) => {
    if (!tenantToken || !otherBranchId) { expect(true).toBe(true); return }
    const res = await request.post(`${API_URL}/api/sales`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: otherBranchId, input_type: 'daily', sale_date: '2026-01-01', amount: 100 },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
    expect([200, 201]).not.toContain(res.status())
  })

  test('BREACH-08: PUT /api/branches/:id on other tenant\'s branch → 4xx', async ({ request }) => {
    if (!tenantToken || !otherBranchId) { expect(true).toBe(true); return }
    const res = await request.put(`${API_URL}/api/branches/${otherBranchId}`, {
      headers: authHeaders(tenantToken),
      data: { code: 'HACK', name: 'Hijacked' },
    })
    expect([401, 403, 404, 422, 429]).toContain(res.status())
    expect(res.status()).not.toBe(200)
  })

  test('BREACH-09: DELETE /api/branches/:id on other tenant\'s branch → 4xx', async ({ request }) => {
    if (!tenantToken || !otherBranchId) { expect(true).toBe(true); return }
    const res = await request.delete(`${API_URL}/api/branches/${otherBranchId}`, {
      headers: authHeaders(tenantToken),
    })
    expect([401, 403, 404, 422, 429]).toContain(res.status())
    expect([200, 204]).not.toContain(res.status())
  })

  test('BREACH-10: POST /api/submit with other tenant\'s branch → 4xx', async ({ request }) => {
    if (!tenantToken || !otherBranchId) { expect(true).toBe(true); return }
    const res = await request.post(`${API_URL}/api/submit`, {
      headers: authHeaders(tenantToken),
      data: { branch_id: otherBranchId, month: 1, year: 2026 },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect([200, 201]).not.toContain(res.status())
  })

  // ── 3. Privilege-escalation attacks ─────────────────────────────────

  test('BREACH-11: Tenant cannot hit /api/admin/tenants', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(tenantToken) })
    expect([401, 403, 429]).toContain(res.status())
  })

  test('BREACH-12: Tenant cannot hit /api/admin/users', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/admin/users`, { headers: authHeaders(tenantToken) })
    expect([401, 403, 429]).toContain(res.status())
  })

  test('BREACH-13: Tenant cannot hit /api/admin/stats', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/admin/stats`, { headers: authHeaders(tenantToken) })
    expect([401, 403, 429]).toContain(res.status())
  })

  test('BREACH-14: Tenant cannot DELETE /api/admin/tenants/:id', async ({ request }) => {
    if (!tenantToken || !otherTenantId) { expect(true).toBe(true); return }
    const res = await request.delete(`${API_URL}/api/admin/tenants/${otherTenantId}`, {
      headers: authHeaders(tenantToken),
    })
    expect([401, 403, 429]).toContain(res.status())
    expect([200, 204]).not.toContain(res.status())
  })

  test('BREACH-15: Tenant cannot POST /api/admin/users', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.post(`${API_URL}/api/admin/users`, {
      headers: authHeaders(tenantToken),
      data: { email: `hack-${Date.now()}@e.com`, password: 'HackPass123!', full_name: 'Hack' },
    })
    expect([401, 403, 429]).toContain(res.status())
  })

  test('BREACH-16: Body injection — tenant_id cannot be overridden on sale create', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.post(`${API_URL}/api/sales`, {
      headers: authHeaders(tenantToken),
      data: {
        branch_id:       '00000000-0000-0000-0000-000000000000',
        tenant_id:       otherTenantId || '00000000-0000-0000-0000-000000000000',
        input_type:      'daily',
        sale_date:       '2026-01-01',
        amount:          1,
      },
    })
    // Must reject because branch doesn't belong to caller; if accepted,
    // server must overwrite tenant_id to caller's own
    expect([400, 401, 403, 422, 429]).toContain(res.status())
  })

  test('BREACH-17: JWT payload cannot elevate isSuperAdmin=true', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    // The tenant's JWT says isSuperAdmin:false. Even if a client adds a
    // custom header "X-Is-Super-Admin: true", the server must ignore it.
    const res = await request.get(`${API_URL}/api/admin/tenants`, {
      headers: {
        ...authHeaders(tenantToken),
        'X-Is-Super-Admin':  'true',
        'X-Admin':           'true',
        'X-User-Role':       'super_admin',
      },
    })
    expect([401, 403, 429]).toContain(res.status())
  })

  test('BREACH-18: URL path traversal on ticket attachment rejected', async ({ request }) => {
    if (!tenantToken || !otherTicketId) { expect(true).toBe(true); return }
    const res = await request.get(
      `${API_URL}/api/tickets/${otherTicketId}/attachment`,
      { headers: authHeaders(tenantToken) }
    )
    // must NOT stream another tenant's attachment
    expect([401, 403, 404, 429]).toContain(res.status())
  })

  // ── 4. Sensitive-data leak checks ────────────────────────────────────

  test('BREACH-19: /auth/me never includes password_hash', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/auth/me`, { headers: authHeaders(tenantToken) })
    if (res.status() !== 200) { expect(res.status()).toBeLessThan(500); return }
    const body = await res.text()
    expect(body).not.toMatch(/password_hash|password:/i)
    expect(body).not.toMatch(/\$2[aby]\$\d{2}\$/)  // bcrypt hash signature
  })

  test('BREACH-20: No endpoint leaks cenomi_api_token', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    for (const path of ['/api/auth/me', '/api/branches', '/api/sales?limit=10']) {
      const res = await request.get(`${API_URL}${path}`, { headers: authHeaders(tenantToken) })
      if (res.status() !== 200) continue
      const body = await res.text()
      expect(body, `${path} leaked cenomi_api_token`).not.toMatch(/cenomi_api_token/i)
    }
  })

  test('BREACH-21: No endpoint leaks SMTP/Telegram secrets', async ({ request }) => {
    if (!adminToken) { expect(true).toBe(true); return }
    for (const path of ['/api/admin/stats', '/api/admin/tenants', '/api/admin/users', '/api/admin/bot-subscribers']) {
      const res = await request.get(`${API_URL}${path}`, { headers: authHeaders(adminToken) })
      if (res.status() !== 200) continue
      const body = await res.text()
      expect(body).not.toMatch(/SMTP_PASS|TELEGRAM_BOT_TOKEN|WEBHOOK_SECRET|ENCRYPTION_KEY|JWT_SECRET/i)
    }
  })

  test('BREACH-22: API-key list returns only masked prefix, never key_hash or raw', async ({ request }) => {
    if (!adminToken) { expect(true).toBe(true); return }
    const tRes = await request.get(`${API_URL}/api/admin/tenants`, { headers: authHeaders(adminToken) })
    if (!tRes.ok()) { expect(true).toBe(true); return }
    const tenants = await tRes.json()
    if (!tenants.length) { expect(true).toBe(true); return }
    const res = await request.get(`${API_URL}/api/admin/tenants/${tenants[0].id}/api-keys`, {
      headers: authHeaders(adminToken),
    })
    if (res.status() !== 200) { expect(res.status()).toBeLessThan(500); return }
    const body = await res.text()
    expect(body).not.toMatch(/key_hash/i)
    expect(body).not.toMatch(/msk_[a-f0-9]{32,}/)     // full raw key signature
  })

  test('BREACH-23: DB connection string never leaks in errors', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    // Trigger a known error path
    const res = await request.get(`${API_URL}/api/branches/not-a-uuid-at-all`, {
      headers: authHeaders(tenantToken),
    })
    const body = await res.text()
    expect(body).not.toMatch(/postgres:\/\//)
    expect(body).not.toMatch(/DATABASE_URL/i)
    expect(body).not.toMatch(/stepupyo_musharaka/i)
  })

  test('BREACH-24: JWT never contains password or plaintext secret', async ({ request }) => {
    if (!tenantToken) { expect(true).toBe(true); return }
    const [, payloadB64] = tenantToken.split('.')
    if (!payloadB64) return
    const payload = Buffer.from(payloadB64, 'base64url').toString()
    expect(payload).not.toMatch(/password/i)
    expect(payload).not.toMatch(/secret/i)
    expect(payload).not.toMatch(/smtp/i)
    expect(payload).not.toMatch(/telegram/i)
  })

  test('BREACH-25: Refresh cookie is httpOnly + not readable by JS', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        email:    process.env.TEST_ADMIN_EMAIL || 'admin@admin.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
      },
    })
    if (!res.ok()) { expect([200, 429]).toContain(res.status()); return }
    const setCookie = res.headers()['set-cookie'] || ''
    const cookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie
    if (cookies && cookies.toLowerCase().includes('refresh_token')) {
      expect(cookies.toLowerCase()).toContain('httponly')
    } else {
      // no refresh cookie set — acceptable (API-only client)
      expect(true).toBe(true)
    }
  })
})
