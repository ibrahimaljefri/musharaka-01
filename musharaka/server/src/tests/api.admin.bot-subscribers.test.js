/**
 * Integration tests — Admin bot-subscriber routes
 * POST   /api/admin/bot-subscribers
 * PUT    /api/admin/bot-subscribers/:id
 * DELETE /api/admin/bot-subscribers/:id
 *
 * NOTE: In test mode, tenantMiddleware always sets isSuperAdmin = false,
 * so superAdminOnly blocks ALL requests with 403. These tests verify that
 * auth and guard behaviour are correct. Where validation logic is documented
 * (422 responses), the tests confirm 403 because the super-admin guard runs
 * before route handler validation.
 */
import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createRequire } from 'module'
import request from 'supertest'

const _require = createRequire(import.meta.url)

let app
let supabase

beforeAll(() => {
  app      = _require('../index.js')
  supabase = _require('../config/supabase.js').supabase
})

afterEach(() => {
  supabase._setFrom(() => {
    const noop = () => Promise.resolve({ data: [], error: null })
    const q = {
      select: () => q, eq: () => q, order: () => q,
      single: noop, maybeSingle: noop,
      insert: noop, update: noop, delete: noop, upsert: noop,
      then: (r) => r({ data: [], error: null }),
    }
    return q
  })
})

const AUTH_HEADERS = { 'x-test-user-id': 'test-user-id' }

const VALID_SUBSCRIBER = {
  tenant_id:   'tenant-uuid-1',
  platform:    'telegram',
  chat_id:     '123456789',
  tenant_name: 'Test Corp',
}

describe('Admin bot-subscriber routes', () => {

  describe('POST /api/admin/bot-subscribers', () => {
    it('returns 401 when no auth header', async () => {
      const res = await request(app)
        .post('/api/admin/bot-subscribers')
        .send(VALID_SUBSCRIBER)
      expect(res.status).toBe(401)
    })

    it('returns 403 for authenticated non-super-admin (tenant_id missing)', async () => {
      // superAdminOnly guard fires before validation
      const { tenant_id, ...body } = VALID_SUBSCRIBER
      const res = await request(app)
        .post('/api/admin/bot-subscribers')
        .set(AUTH_HEADERS)
        .send(body)
      expect(res.status).toBe(403)
    })

    it('returns 403 for authenticated non-super-admin (platform missing)', async () => {
      const { platform, ...body } = VALID_SUBSCRIBER
      const res = await request(app)
        .post('/api/admin/bot-subscribers')
        .set(AUTH_HEADERS)
        .send(body)
      expect(res.status).toBe(403)
    })

    it('returns 403 for authenticated non-super-admin (chat_id missing)', async () => {
      const { chat_id, ...body } = VALID_SUBSCRIBER
      const res = await request(app)
        .post('/api/admin/bot-subscribers')
        .set(AUTH_HEADERS)
        .send(body)
      expect(res.status).toBe(403)
    })

    it('returns 403 for authenticated non-super-admin (tenant_name missing)', async () => {
      const { tenant_name, ...body } = VALID_SUBSCRIBER
      const res = await request(app)
        .post('/api/admin/bot-subscribers')
        .set(AUTH_HEADERS)
        .send(body)
      expect(res.status).toBe(403)
    })

    it('returns 403 for authenticated non-super-admin on valid payload', async () => {
      const res = await request(app)
        .post('/api/admin/bot-subscribers')
        .set(AUTH_HEADERS)
        .send(VALID_SUBSCRIBER)
      expect(res.status).toBe(403)
    })
  })

  describe('PUT /api/admin/bot-subscribers/:id', () => {
    it('returns 401 when no auth header', async () => {
      const res = await request(app)
        .put('/api/admin/bot-subscribers/sub-1')
        .send({ is_active: false })
      expect(res.status).toBe(401)
    })

    it('returns 403 for authenticated non-super-admin', async () => {
      const res = await request(app)
        .put('/api/admin/bot-subscribers/sub-1')
        .set(AUTH_HEADERS)
        .send({ is_active: false, contact_name: 'New Name' })
      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /api/admin/bot-subscribers/:id', () => {
    it('returns 401 when no auth header', async () => {
      const res = await request(app)
        .delete('/api/admin/bot-subscribers/sub-1')
      expect(res.status).toBe(401)
    })

    it('returns 403 for authenticated non-super-admin', async () => {
      const res = await request(app)
        .delete('/api/admin/bot-subscribers/sub-1')
        .set(AUTH_HEADERS)
      expect(res.status).toBe(403)
    })
  })
})
