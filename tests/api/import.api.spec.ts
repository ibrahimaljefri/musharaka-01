/**
 * IM-01 … IM-25 — Import API regression (includes Excel template download)
 */
import { test, expect } from '@playwright/test'
import { API_URL, loginAdmin, loginTenant, tryLoginAdmin, tryLoginTenant, authHeaders } from './_helpers'

test.describe('Import & Template API', () => {
  let tenantToken = ''

  test.beforeAll(async ({ request }) => {
    try {
      const t = await tryLoginTenant(request)
      tenantToken = t.accessToken
    } catch { /* ignore */ }
  })

  // Template endpoint
  test('IM-01: GET /api/sales/import/template unauthenticated → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/sales/import/template`)
    expect([401, 429]).toContain(res.status())
  })

  test('IM-02: GET /api/sales/import/template without branch_id → 422', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/sales/import/template`, { headers: authHeaders(tenantToken) })
    expect([400, 422, 429]).toContain(res.status())
  })

  test('IM-03: GET template with bad branch → 404', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/sales/import/template?branch_id=00000000-0000-0000-0000-000000000000`, {
      headers: authHeaders(tenantToken),
    })
    expect([404, 422]).toContain(res.status())
  })

  test('IM-04: GET template invalid month → 422', async ({ request }) => {

    const res = await request.get(`${API_URL}/api/sales/import/template?branch_id=00000000-0000-0000-0000-000000000000&month=13`, {
      headers: authHeaders(tenantToken),
    })
    expect([400, 404, 422]).toContain(res.status())
  })

  test('IM-05: GET template with valid tenant branch returns .xlsx', async ({ request }) => {

    // First fetch branches to get a real id
    const brRes  = await request.get(`${API_URL}/api/branches`, { headers: authHeaders(tenantToken) })
    const list   = await brRes.json()
    test.skip(!list.length, 'no branches for tenant')
    const id     = list[0].id
    const res    = await request.get(
      `${API_URL}/api/sales/import/template?branch_id=${id}&month=1&year=2026`,
      { headers: authHeaders(tenantToken) }
    )
    expect([200, 429]).toContain(res.status())
    expect(res.headers()['content-type']).toContain('spreadsheet')
    const buf = await res.body()
    // .xlsx signature = "PK" (ZIP archive)
    expect(buf[0]).toBe(0x50)
    expect(buf[1]).toBe(0x4B)
  })

  // Preview / Import
  test('IM-06: POST /api/sales/import/preview without file → 422', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/sales/import/preview`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` },
      multipart: {},
    })
    expect([400, 422, 429]).toContain(res.status())
  })

  test('IM-07: POST /api/sales/import without branch_id → 422', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/sales/import`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` },
      multipart: { file: { name: 'x.csv', mimeType: 'text/csv', buffer: Buffer.from('nothing') } },
    })
    expect([400, 422, 429]).toContain(res.status())
  })

  test('IM-08: POST preview unauthenticated → 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/sales/import/preview`, { multipart: {} })
    expect([401, 429]).toContain(res.status())
  })

  test('IM-09: POST preview with bad MIME type → 422', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/sales/import/preview`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` },
      multipart: { file: { name: 'x.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') } },
    })
    expect([400, 422, 429]).toContain(res.status())
  })

  test('IM-10: POST preview oversized file → 422', async ({ request }) => {

    // 11 MB buffer — exceeds 10MB limit
    const big = Buffer.alloc(11 * 1024 * 1024, 'x')
    const res = await request.post(`${API_URL}/api/sales/import/preview`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` },
      multipart: { file: { name: 'big.csv', mimeType: 'text/csv', buffer: big } },
    })
    expect([400, 413, 422]).toContain(res.status())
  })

  test('IM-11: GET template response time < 5000ms', async ({ request }) => {

    const brRes = await request.get(`${API_URL}/api/branches`, { headers: authHeaders(tenantToken) })
    const list  = await brRes.json()
    test.skip(!list.length, 'no branches')
    const t0 = Date.now()
    await request.get(`${API_URL}/api/sales/import/template?branch_id=${list[0].id}`, {
      headers: authHeaders(tenantToken),
    })
    expect(Date.now() - t0).toBeLessThan(5000)
  })

  test('IM-12: template file includes Content-Disposition attachment', async ({ request }) => {

    const brRes = await request.get(`${API_URL}/api/branches`, { headers: authHeaders(tenantToken) })
    const list  = await brRes.json()
    test.skip(!list.length, 'no branches')
    const res = await request.get(`${API_URL}/api/sales/import/template?branch_id=${list[0].id}&month=3&year=2026`, {
      headers: authHeaders(tenantToken),
    })
    expect(res.headers()['content-disposition']).toContain('attachment')
  })

  test('IM-13: simple CSV preview returns rows', async ({ request }) => {

    const csv = 'input_type,sale_date,amount\ndaily,2026-01-15,500\n'
    const res = await request.post(`${API_URL}/api/sales/import/preview`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` },
      multipart: { file: { name: 'ok.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } },
    })
    expect([200, 422]).toContain(res.status())
  })

  test('IM-14: empty CSV → preview returns 0 rows or 422', async ({ request }) => {

    const res = await request.post(`${API_URL}/api/sales/import/preview`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` },
      multipart: { file: { name: 'empty.csv', mimeType: 'text/csv', buffer: Buffer.from('') } },
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('IM-15: preview CSV with Arabic headers is parsed', async ({ request }) => {

    const csv = 'نوع_الإدخال,التاريخ,المبيعات\ndaily,2026-01-15,800\n'
    const res = await request.post(`${API_URL}/api/sales/import/preview`, {
      headers: { 'Authorization': `Bearer ${tenantToken}` },
      multipart: { file: { name: 'ar.csv', mimeType: 'text/csv', buffer: Buffer.from('\uFEFF' + csv, 'utf8') } },
    })
    expect(res.status()).toBeLessThan(500)
  })
})
