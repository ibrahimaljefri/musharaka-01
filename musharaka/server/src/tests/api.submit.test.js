/**
 * Integration tests — POST /api/submit (submitInvoices)
 *
 * Mocking strategy
 * ----------------
 * Uses the same createRequire + _set* pattern as api.sales.test.js so that
 * mocks reliably intercept CJS require() calls inside the Express app.
 *
 * seinomyApiService exports a test stub (when NODE_ENV=test) with:
 *   _setSubmit(fn)  — replace the submit function for a test
 *   _reset()        — restore default stub after each test
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createRequire } from 'module'
import request from 'supertest'

const _require = createRequire(import.meta.url)

let app
let seinomyApiService

beforeAll(() => {
  app              = _require('../index.js')
  seinomyApiService = _require('../services/seinomyApiService.js').seinomyApiService
})

afterEach(() => {
  seinomyApiService._reset()
})

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_BRANCH = '123e4567-e89b-12d3-a456-426614174000'
const AUTH_HEADERS = { 'x-test-user-id': 'test-user-id' }
const VALID_BODY   = { branch_id: VALID_BRANCH, month: 1, year: 2026 }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/submit', () => {

  describe('authentication', () => {
    it('returns 401 when no auth header is provided', async () => {
      const res = await request(app).post('/api/submit').send(VALID_BODY)
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('غير مصرح')
    })
  })

  describe('request body validation', () => {
    it('returns 422 when branch_id is missing', async () => {
      const res = await request(app).post('/api/submit').set(AUTH_HEADERS)
        .send({ month: 1, year: 2026 })
      expect(res.status).toBe(422)
    })

    it('returns 422 when month is missing', async () => {
      const res = await request(app).post('/api/submit').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, year: 2026 })
      expect(res.status).toBe(422)
    })

    it('returns 422 when year is missing', async () => {
      const res = await request(app).post('/api/submit').set(AUTH_HEADERS)
        .send({ branch_id: VALID_BRANCH, month: 1 })
      expect(res.status).toBe(422)
    })
  })

  describe('successful submission', () => {
    it('returns 200 with message and submission on success', async () => {
      seinomyApiService._setSubmit(async () => ({
        success: true,
        submission: { id: 'sub-uuid-001', invoice_count: 5, total_amount: 1000 },
      }))
      const res = await request(app).post('/api/submit').set(AUTH_HEADERS).send(VALID_BODY)
      expect(res.status).toBe(200)
      expect(res.body.submission).toMatchObject({ id: 'sub-uuid-001', invoice_count: 5 })
    })

    it('calls submit with branch_id, month, year', async () => {
      const calls = []
      seinomyApiService._setSubmit(async (branchId, month, year) => {
        calls.push({ branchId, month, year })
        return { success: true, submission: { id: 'x' } }
      })
      await request(app).post('/api/submit').set(AUTH_HEADERS).send(VALID_BODY)
      expect(calls).toHaveLength(1)
      expect(calls[0]).toEqual({ branchId: VALID_BRANCH, month: 1, year: 2026 })
    })
  })

  describe('service error responses', () => {
    it('returns 400 when service returns success:false', async () => {
      seinomyApiService._setSubmit(async () => ({ success: false, error: 'already submitted' }))
      const res = await request(app).post('/api/submit').set(AUTH_HEADERS).send(VALID_BODY)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('already submitted')
    })

    it('returns 400 for no pending invoices', async () => {
      seinomyApiService._setSubmit(async () => ({ success: false, error: 'no pending' }))
      const res = await request(app).post('/api/submit').set(AUTH_HEADERS).send(VALID_BODY)
      expect(res.status).toBe(400)
    })
  })

  describe('unexpected errors', () => {
    it('returns 500 when submit throws', async () => {
      seinomyApiService._setSubmit(async () => { throw new Error('network timeout') })
      const res = await request(app).post('/api/submit').set(AUTH_HEADERS).send(VALID_BODY)
      expect(res.status).toBe(500)
    })
  })
})
