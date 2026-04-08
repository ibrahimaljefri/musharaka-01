/**
 * Integration tests — POST /api/sales (createSale)
 *
 * Mocking strategy
 * ----------------
 * vi.mock() hoists to the top of the module graph, so mocks are in place
 * before the CJS app is loaded via createRequire.  We mock:
 *   - ../config/supabase   (auth + from().insert())
 *   - ../config/queue      (BullMQ — not used by this route but imported transitively)
 *   - ioredis              (Redis client created at module load time)
 */

import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createRequire } from 'module'
import request from 'supertest'

// ── Mocks (must be declared before importing app) ───────────────────────────

vi.mock('../config/supabase.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from:  vi.fn(),
    rpc:   vi.fn(),
  },
}))

// Prevent BullMQ from trying to connect to Redis during tests
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

// ── Load app after mocks are registered ─────────────────────────────────────

const _require = createRequire(import.meta.url)

let app
let supabase

beforeAll(() => {
  app      = _require('../index.js')
  supabase = _require('../config/supabase.js').supabase
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TOKEN  = 'valid-jwt-token'
const VALID_BRANCH = '123e4567-e89b-12d3-a456-426614174000'

function authHeader(token = VALID_TOKEN) {
  return { Authorization: `Bearer ${token}` }
}

function mockAuthOk() {
  supabase.auth.getUser.mockResolvedValue({
    data:  { user: { id: 'test-user-id' } },
    error: null,
  })
}

function mockAuthFail() {
  supabase.auth.getUser.mockResolvedValue({
    data:  { user: null },
    error: { message: 'invalid token' },
  })
}

function mockInsertOk() {
  supabase.from.mockReturnValue({
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
  })
}

function mockInsertFail(message = 'DB error') {
  supabase.from.mockReturnValue({
    insert: vi.fn().mockResolvedValue({ data: null, error: { message } }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Test suite ───────────────────────────────────────────────────────────────

describe('POST /api/sales', () => {

  // ── Authentication ─────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when Authorization header is absent', async () => {
      const res = await request(app).post('/api/sales').send({})
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('غير مصرح')
    })

    it('returns 401 when token is invalid (supabase returns error)', async () => {
      mockAuthFail()
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader('bad-token'))
        .send({})
      expect(res.status).toBe(401)
    })
  })

  // ── Zod validation ─────────────────────────────────────────────────────────

  describe('request body validation', () => {
    beforeEach(mockAuthOk)

    it('returns 422 when branch_id is missing', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({ input_type: 'daily', amount: 100, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when branch_id is not a valid UUID', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({ branch_id: 'not-a-uuid', input_type: 'daily', amount: 100, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
      expect(res.body.error).toMatch(/فرع|uuid/i)
    })

    it('returns 422 when amount is 0 (must be positive)', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({ branch_id: VALID_BRANCH, input_type: 'daily', amount: 0, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
      expect(res.body.error).toContain('أكبر من صفر')
    })

    it('returns 422 when amount is negative', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({ branch_id: VALID_BRANCH, input_type: 'daily', amount: -50, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when input_type is invalid', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({ branch_id: VALID_BRANCH, input_type: 'weekly', amount: 100, sale_date: '2026-01-15' })
      expect(res.status).toBe(422)
      expect(res.body.error).toContain('نوع الإدخال غير صالح')
    })
  })

  // ── Successful inserts ─────────────────────────────────────────────────────

  describe('successful sale creation', () => {
    beforeEach(() => {
      mockAuthOk()
      mockInsertOk()
    })

    it('returns 201 with count=1 for a valid daily sale', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({
          branch_id:  VALID_BRANCH,
          input_type: 'daily',
          amount:     500,
          sale_date:  '2026-03-15',
        })
      expect(res.status).toBe(201)
      expect(res.body.count).toBe(1)
      expect(res.body.message).toMatch(/1 سجل/)
    })

    it('returns 201 with count=31 for a valid monthly sale (January)', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({
          branch_id:  VALID_BRANCH,
          input_type: 'monthly',
          amount:     3100,
          month:      1,
          year:       2026,
        })
      expect(res.status).toBe(201)
      expect(res.body.count).toBe(31)
    })

    it('returns 201 with count=5 for a valid 5-day range sale', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({
          branch_id:         VALID_BRANCH,
          input_type:        'range',
          amount:            500,
          period_start_date: '2026-03-01',
          period_end_date:   '2026-03-05',
        })
      expect(res.status).toBe(201)
      expect(res.body.count).toBe(5)
    })

    it('response body includes a success message string', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({
          branch_id:  VALID_BRANCH,
          input_type: 'daily',
          amount:     100,
          sale_date:  '2026-06-01',
        })
      expect(res.status).toBe(201)
      expect(typeof res.body.message).toBe('string')
    })
  })

  // ── Supabase insert failure ────────────────────────────────────────────────

  describe('Supabase error handling', () => {
    beforeEach(mockAuthOk)

    it('returns 400 when Supabase insert returns an error', async () => {
      mockInsertFail('duplicate key value violates unique constraint')
      const res = await request(app)
        .post('/api/sales')
        .set(authHeader())
        .send({
          branch_id:  VALID_BRANCH,
          input_type: 'daily',
          amount:     100,
          sale_date:  '2026-01-01',
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/duplicate key/i)
    })
  })
})
