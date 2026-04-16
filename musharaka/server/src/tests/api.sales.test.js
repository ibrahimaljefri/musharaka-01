/**
 * Integration tests — POST /api/sales (createSale)
 */
import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
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
  // Reset from() to default no-op after each test
  supabase._setFrom(() => {
    const noop = () => Promise.resolve({ data: [], error: null })
    const q = { insert: noop, select: () => q, eq: () => q, then: (r) => r({ data: [], error: null }) }
    return q
  })
})

const VALID_BRANCH  = '123e4567-e89b-12d3-a456-426614174000'
const AUTH_HEADERS  = { 'x-test-user-id': 'test-user-id' }

function mockInsertOk() {
  supabase._setFrom(() => ({
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
  }))
}

function mockInsertFail(message = 'DB error') {
  supabase._setFrom(() => ({
    insert: vi.fn().mockResolvedValue({ data: null, error: { message } }),
  }))
}

describe('POST /api/sales', () => {

  describe('authentication', () => {
    it('returns 401 when no auth header', async () => {
      const res = await request(app).post('/api/sales').send({})
      expect(res.status).toBe(401)
    })
  })

  describe('request body validation', () => {
    it('returns 422 when branch_id is missing', async () => {
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ input_type: 'daily', amount: 100, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when branch_id is not a valid UUID', async () => {
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: 'not-a-uuid', input_type: 'daily', amount: 100, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when amount is 0', async () => {
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, input_type: 'daily', amount: 0, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
      expect(res.body.error).toContain('أكبر من صفر')
    })

    it('returns 422 when amount is negative', async () => {
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, input_type: 'daily', amount: -50, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when input_type is invalid', async () => {
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, input_type: 'weekly', amount: 100, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
      expect(res.body.error).toContain('نوع الإدخال غير صالح')
    })
  })

  describe('successful sale creation', () => {
    beforeEach(mockInsertOk)

    it('returns 201 with count=1 for a daily sale', async () => {
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, input_type: 'daily', amount: 500, sale_date: '2026-03-15' })
      expect(res.status).toBe(201)
      expect(res.body.count).toBe(1)
      expect(res.body.message).toMatch(/1 سجل/)
    })

    it('returns 201 with count=31 for a monthly sale (January)', async () => {
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, input_type: 'monthly', amount: 3100, month: 1, year: 2026 })
      expect(res.status).toBe(201)
      expect(res.body.count).toBe(31)
    })

    it('returns 201 with count=5 for a 5-day range sale', async () => {
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, input_type: 'range', amount: 500,
                period_start_date: '2026-03-01', period_end_date: '2026-03-05' })
      expect(res.status).toBe(201)
      expect(res.body.count).toBe(5)
    })

    it('response body includes a success message', async () => {
      const today = new Date().toISOString().split('T')[0]
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, input_type: 'daily', amount: 100, sale_date: today })
      expect(res.status).toBe(201)
      expect(typeof res.body.message).toBe('string')
    })
  })

  describe('Supabase error handling', () => {
    it('returns 400 when Supabase insert returns an error', async () => {
      mockInsertFail('duplicate key value violates unique constraint')
      const res = await request(app).post('/api/sales').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, input_type: 'daily', amount: 100, sale_date: '2026-01-01' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/duplicate key/i)
    })
  })
})
