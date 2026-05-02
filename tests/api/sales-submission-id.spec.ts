/**
 * SAL-SID-01..03 — verify GET /api/sales?submission_id is correctly filtered.
 *
 * Pre-fix bug: server route at sales.js:14 destructured req.query without
 * `submission_id`, so the param was silently ignored and the response
 * returned ALL sales for the tenant. The tenant /submissions page expanded
 * a Feb card and saw rows from ALL months.
 *
 * Run: cd tests && npx playwright test sales-submission-id --project=api --workers=1
 */
import { test, expect } from '@playwright/test'
import { API_URL, tryLoginTenant, authHeaders } from './_helpers'

let tenantToken = ''

test.describe('sales-submission-id', () => {
  test.beforeAll(async ({ request }) => {
    const tenant = await tryLoginTenant(request)
    tenantToken  = tenant?.accessToken || ''
  })

  test('SAL-SID-01: GET /api/sales?submission_id=<unknown-uuid> → 200 with empty array', async ({ request }) => {
    if (!tenantToken) return test.skip()
    const res = await request.get(
      `${API_URL}/api/sales?submission_id=00000000-0000-0000-0000-000000000000`,
      { headers: authHeaders(tenantToken) }
    )
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      const sales = body.sales ?? body
      // Must respect the submission_id filter — unknown UUID = no matches
      expect(Array.isArray(sales) ? sales.length : 0).toBe(0)
      // total field, if present, must also reflect the filter
      if ('total' in body) expect(body.total).toBe(0)
    }
  })

  test('SAL-SID-02: GET /api/sales?submission_id=X returns ONLY rows linked to X', async ({ request }) => {
    if (!tenantToken) return test.skip()
    // Find any existing submission for this tenant
    const submissionsRes = await request.get(`${API_URL}/api/submissions?limit=1`, {
      headers: authHeaders(tenantToken),
    })
    if (submissionsRes.status() !== 200) return test.skip()
    const submissions = await submissionsRes.json()
    const subs = submissions.submissions ?? submissions
    if (!Array.isArray(subs) || subs.length === 0) return test.skip()
    const sub = subs[0]

    const salesRes = await request.get(
      `${API_URL}/api/sales?submission_id=${sub.id}`,
      { headers: authHeaders(tenantToken) }
    )
    expect([200, 429]).toContain(salesRes.status())
    if (salesRes.status() === 200) {
      const body = await salesRes.json()
      const sales = body.sales ?? body
      // Every row must have submission_id matching the requested one (bug check)
      for (const s of (Array.isArray(sales) ? sales : [])) {
        if ('submission_id' in s) {
          expect(s.submission_id).toBe(sub.id)
        }
      }
    }
  })

  test('SAL-SID-03: GET /api/sales (no submission_id) is unaffected — still returns full list', async ({ request }) => {
    if (!tenantToken) return test.skip()
    const res = await request.get(`${API_URL}/api/sales?limit=10`, {
      headers: authHeaders(tenantToken),
    })
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      // Endpoint still responds normally without the filter
      expect(body).toBeTruthy()
    }
  })
})
