/**
 * Integration tests — POST /api/tickets (client-facing ticket submission)
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
      select: () => q, eq: () => q, single: noop, maybeSingle: noop,
      insert: noop, update: noop, delete: noop, upsert: noop,
      then: (r) => r({ data: [], error: null }),
    }
    return q
  })
})

const AUTH_HEADERS = { 'x-test-user-id': 'test-user-id' }

const VALID_FIELDS = {
  submitter_name:  'Ahmed Ali',
  submitter_email: 'ahmed@example.com',
  title:           'Cannot login',
  category:        'technical',
  description:     'I keep getting an error when I try to log in.',
}

// Mock supabase so that:
//   first call  → from('tenants')  → returns tenant name
//   second call → from('support_tickets') → returns created ticket
function mockSuccessfulInsert() {
  let callCount = 0
  supabase._setFrom((table) => {
    if (table === 'tenants') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { name: 'Test Tenant' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'support_tickets') {
      return {
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { id: 'ticket-1', ticket_number: 'SUP-1001' },
              error: null,
            }),
          }),
        }),
      }
    }
    const noop = () => Promise.resolve({ data: null, error: null })
    const q = { select: () => q, eq: () => q, single: noop, insert: noop }
    return q
  })
}

describe('POST /api/tickets', () => {

  describe('authentication', () => {
    it('returns 401 when no auth header', async () => {
      const res = await request(app).post('/api/tickets').field('title', 'test')
      expect(res.status).toBe(401)
    })
  })

  describe('validation', () => {
    it('returns 422 when submitter_name is missing', async () => {
      const { submitter_name, ...body } = VALID_FIELDS
      const req = request(app).post('/api/tickets').set(AUTH_HEADERS)
      for (const [k, v] of Object.entries(body)) req.field(k, v)
      const res = await req
      expect(res.status).toBe(422)
      expect(res.body.error).toBeTruthy()
    })

    it('returns 422 when submitter_email is missing', async () => {
      const { submitter_email, ...body } = VALID_FIELDS
      const req = request(app).post('/api/tickets').set(AUTH_HEADERS)
      for (const [k, v] of Object.entries(body)) req.field(k, v)
      const res = await req
      expect(res.status).toBe(422)
    })

    it('returns 422 when submitter_email has invalid format', async () => {
      const req = request(app).post('/api/tickets').set(AUTH_HEADERS)
      for (const [k, v] of Object.entries({ ...VALID_FIELDS, submitter_email: 'notanemail' })) {
        req.field(k, v)
      }
      const res = await req
      expect(res.status).toBe(422)
    })

    it('returns 422 when title is missing', async () => {
      const { title, ...body } = VALID_FIELDS
      const req = request(app).post('/api/tickets').set(AUTH_HEADERS)
      for (const [k, v] of Object.entries(body)) req.field(k, v)
      const res = await req
      expect(res.status).toBe(422)
    })

    it('returns 422 when category is missing', async () => {
      const { category, ...body } = VALID_FIELDS
      const req = request(app).post('/api/tickets').set(AUTH_HEADERS)
      for (const [k, v] of Object.entries(body)) req.field(k, v)
      const res = await req
      expect(res.status).toBe(422)
    })

    it('returns 422 when category has invalid value', async () => {
      const req = request(app).post('/api/tickets').set(AUTH_HEADERS)
      for (const [k, v] of Object.entries({ ...VALID_FIELDS, category: 'other' })) {
        req.field(k, v)
      }
      const res = await req
      expect(res.status).toBe(422)
    })

    it('returns 422 when description is missing', async () => {
      const { description, ...body } = VALID_FIELDS
      const req = request(app).post('/api/tickets').set(AUTH_HEADERS)
      for (const [k, v] of Object.entries(body)) req.field(k, v)
      const res = await req
      expect(res.status).toBe(422)
    })
  })

  describe('successful submission', () => {
    it('returns 201 with id and ticket_number on valid submission', async () => {
      mockSuccessfulInsert()
      const req = request(app).post('/api/tickets').set(AUTH_HEADERS)
      for (const [k, v] of Object.entries(VALID_FIELDS)) req.field(k, v)
      const res = await req
      expect(res.status).toBe(201)
      expect(res.body.id).toBe('ticket-1')
      expect(res.body.ticket_number).toBe('SUP-1001')
    })
  })
})
