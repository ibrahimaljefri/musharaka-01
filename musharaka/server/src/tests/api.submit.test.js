/**
 * Integration tests — POST /api/submit (submitInvoices)
 *
 * Mocking strategy
 * ----------------
 * - ../config/supabase        → mock auth (from/rpc not called — seinomyApiService is mocked)
 * - ../services/seinomyApiService → mock submit()
 * - ../config/queue           → stub BullMQ
 * - ioredis                   → stub Redis constructor
 */

import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createRequire } from 'module'
import request from 'supertest'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../config/supabase.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from:  vi.fn(),
    rpc:   vi.fn(),
  },
}))

vi.mock('../services/seinomyApiService.js', () => ({
  seinomyApiService: {
    submit: vi.fn(),
  },
}))

vi.mock('../config/queue.js', () => ({
  saleImportQueue: { add: vi.fn().mockResolvedValue({}) },
  connection:       {},
}))

vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({
    on:         vi.fn(),
    connect:    vi.fn(),
    disconnect: vi.fn(),
    quit:       vi.fn(),
  }))
  return { default: Redis }
})

// ── Load app after mocks ─────────────────────────────────────────────────────

const _require = createRequire(import.meta.url)

let app
let supabase
let seinomyApiService

beforeAll(() => {
  app               = _require('../index.js')
  supabase          = _require('../config/supabase.js').supabase
  seinomyApiService = _require('../services/seinomyApiService.js').seinomyApiService
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TOKEN  = 'valid-jwt-token'
const VALID_BRANCH = '123e4567-e89b-12d3-a456-426614174000'

function mockAuthOk() {
  supabase.auth.getUser.mockResolvedValue({
    data:  { user: { id: 'test-user-id' } },
    error: null,
  })
}

const VALID_BODY = {
  branch_id: VALID_BRANCH,
  month:     1,
  year:      2026,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/submit', () => {

  // ── Authentication ──────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app)
        .post('/api/submit')
        .send(VALID_BODY)
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('غير مصرح')
    })

    it('returns 401 when the token is invalid', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data:  { user: null },
        error: { message: 'invalid jwt' },
      })
      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', 'Bearer bad-token')
        .send(VALID_BODY)
      expect(res.status).toBe(401)
    })
  })

  // ── Body validation ─────────────────────────────────────────────────────────

  describe('request body validation', () => {
    beforeEach(mockAuthOk)

    it('returns 422 when branch_id is missing', async () => {
      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ month: 1, year: 2026 })
      expect(res.status).toBe(422)
      expect(res.body.error).toMatch(/فرع/)
    })

    it('returns 422 when month is missing', async () => {
      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ branch_id: VALID_BRANCH, year: 2026 })
      expect(res.status).toBe(422)
      expect(res.body.error).toMatch(/شهر/)
    })

    it('returns 422 when year is missing', async () => {
      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ branch_id: VALID_BRANCH, month: 1 })
      expect(res.status).toBe(422)
      expect(res.body.error).toMatch(/سنة/)
    })
  })

  // ── Successful submission ───────────────────────────────────────────────────

  describe('successful submission', () => {
    beforeEach(mockAuthOk)

    it('returns 200 with message and submission object on success', async () => {
      seinomyApiService.submit.mockResolvedValue({
        success:    true,
        submission: {
          id:            'sub-uuid-001',
          invoice_count: 5,
          total_amount:  1000,
        },
      })

      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(VALID_BODY)

      expect(res.status).toBe(200)
      expect(res.body.message).toMatch(/سينومي/)
      expect(res.body.submission).toMatchObject({
        id:            'sub-uuid-001',
        invoice_count: 5,
        total_amount:  1000,
      })
    })

    it('calls seinomyApiService.submit with branch_id, month, year', async () => {
      seinomyApiService.submit.mockResolvedValue({ success: true, submission: { id: 'x' } })

      await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(VALID_BODY)

      expect(seinomyApiService.submit).toHaveBeenCalledOnce()
      expect(seinomyApiService.submit).toHaveBeenCalledWith(VALID_BRANCH, 1, 2026)
    })
  })

  // ── Service-level failures ──────────────────────────────────────────────────

  describe('service error responses', () => {
    beforeEach(mockAuthOk)

    it('returns 400 when the period was already submitted', async () => {
      seinomyApiService.submit.mockResolvedValue({
        success: false,
        error:   'تم إرسال هذه الفترة مسبقاً',
      })

      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(VALID_BODY)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('تم إرسال هذه الفترة مسبقاً')
    })

    it('returns 400 when there are no pending invoices', async () => {
      seinomyApiService.submit.mockResolvedValue({
        success: false,
        error:   'لا توجد فواتير معلقة',
      })

      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(VALID_BODY)

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/فواتير معلقة/)
    })

    it('returns 400 for any generic service failure', async () => {
      seinomyApiService.submit.mockResolvedValue({
        success: false,
        error:   'الفرع غير موجود',
      })

      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(VALID_BODY)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('الفرع غير موجود')
    })
  })

  // ── Forwarded errors ────────────────────────────────────────────────────────

  describe('unexpected errors', () => {
    beforeEach(mockAuthOk)

    it('returns 500 when seinomyApiService.submit throws unexpectedly', async () => {
      seinomyApiService.submit.mockRejectedValue(new Error('network timeout'))

      const res = await request(app)
        .post('/api/submit')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(VALID_BODY)

      // errorHandler maps uncaught errors to 500
      expect(res.status).toBe(500)
    })
  })
})
