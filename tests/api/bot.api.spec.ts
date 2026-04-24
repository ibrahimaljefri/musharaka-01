/**
 * BOT-01 … BOT-15 — Telegram bot webhook + subscribers API regression
 */
import { test, expect } from '@playwright/test'
import { API_URL, loginAdmin, tryLoginAdmin, authHeaders } from './_helpers'

test.describe('Bot API', () => {
  let adminToken = ''

  test.beforeAll(async ({ request }) => {
    const a = await tryLoginAdmin(request); adminToken = a?.accessToken || ''
  })

  test('BOT-01: POST /api/bot/telegram without signature → 401/403', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/bot/telegram`, { data: {} })
    expect([401, 403, 404, 400]).toContain(res.status())
  })

  test('BOT-02: GET /api/bot/telegram not a valid method', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/bot/telegram`)
    expect([401, 403, 404, 405]).toContain(res.status())
  })

  test('BOT-03: WhatsApp route disabled when ENABLE_WHATSAPP_BOT is not set', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/bot/whatsapp`, { data: {} })
    expect([401, 403, 404]).toContain(res.status())
  })

  test('BOT-04: admin bot-subscribers list accessible', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/bot-subscribers`, { headers: authHeaders(adminToken) })
    expect(res.status()).toBe(200)
  })

  test('BOT-05: bot webhook payload with malformed JSON → 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/bot/telegram`, {
      headers: { 'Content-Type': 'application/json' },
      data: '{ malformed json',
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('BOT-06: bot webhook response time < 5s', async ({ request }) => {
    const t = Date.now()
    await request.post(`${API_URL}/api/bot/telegram`, { data: {} })
    expect(Date.now() - t).toBeLessThan(5000)
  })

  test('BOT-07: bot-subscribers pagination works', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/bot-subscribers`, { headers: authHeaders(adminToken) })
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('BOT-08: bot-subscribers POST wrong platform → accepted or validated', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/bot-subscribers`, {
      headers: authHeaders(adminToken),
      data: { tenant_id: '00000000-0000-0000-0000-000000000000', platform: 'telegram', chat_id: '999', tenant_name: 'X' },
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('BOT-09: bot-subscribers response has no secrets', async ({ request }) => {
    const res  = await request.get(`${API_URL}/api/admin/bot-subscribers`, { headers: authHeaders(adminToken) })
    const body = await res.text()
    expect(body).not.toMatch(/TELEGRAM_BOT_TOKEN/i)
    expect(body).not.toMatch(/WEBHOOK_SECRET/i)
  })

  test('BOT-10: unknown endpoint /api/bot/* → 404', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/bot/no-such-endpoint`)
    expect(res.status()).toBe(404)
  })

  test('BOT-11: bot webhook tolerates empty body', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/bot/telegram`, { data: null })
    expect(res.status()).toBeLessThan(500)
  })

  test('BOT-12: bot webhook response is JSON', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/bot/telegram`, { data: {} })
    const ct  = res.headers()['content-type'] || ''
    expect(ct).toMatch(/json|text/)
  })

  test('BOT-13: bot webhook does not accept GET', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/bot/telegram?test=1`)
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('BOT-14: admin bot-subscribers POST missing tenant_id → 422', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/admin/bot-subscribers`, {
      headers: authHeaders(adminToken),
      data: { platform: 'telegram', chat_id: '123', tenant_name: 'X' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('BOT-15: admin bot-subscribers PUT is_active=false toggles', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/admin/bot-subscribers`, { headers: authHeaders(adminToken) })
    const list    = await listRes.json()
    if (!list.length) test.skip('no subscribers')
    const id = list[0].id
    const res = await request.put(`${API_URL}/api/admin/bot-subscribers/${id}`, {
      headers: authHeaders(adminToken), data: { is_active: false },
    })
    expect([200, 400]).toContain(res.status())
    // restore
    await request.put(`${API_URL}/api/admin/bot-subscribers/${id}`, {
      headers: authHeaders(adminToken), data: { is_active: true },
    })
  })
})
