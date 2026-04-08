/**
 * Integration tests — POST /api/sales/import/preview  &  POST /api/sales/import
 *
 * Mocking strategy
 * ----------------
 * - ../config/supabase  → mock auth + from()
 * - ../services/importService → mock preview() and import()
 * - ../config/queue      → stub BullMQ queue so no Redis connection is made
 * - ioredis              → stub Redis constructor
 *
 * File uploads are sent with supertest's .attach() which sets the correct
 * Content-Type multipart boundary.  The MIME type is supplied explicitly so
 * that Multer's fileFilter can accept or reject the file.
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

vi.mock('../services/importService.js', () => ({
  importService: {
    preview: vi.fn(),
    import:  vi.fn(),
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
let importService

beforeAll(() => {
  app           = _require('../index.js')
  supabase      = _require('../config/supabase.js').supabase
  importService = _require('../services/importService.js').importService
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TOKEN  = 'valid-jwt-token'
const VALID_BRANCH = '123e4567-e89b-12d3-a456-426614174000'

// Minimal valid xlsx-like buffer (content doesn't matter — importService is mocked)
const XLSX_BUFFER = Buffer.from('PK fake xlsx content bytes')
// A small PDF buffer for MIME-rejection tests
const PDF_BUFFER  = Buffer.from('%PDF-1.4 fake pdf content')

function mockAuthOk() {
  supabase.auth.getUser.mockResolvedValue({
    data:  { user: { id: 'test-user-id' } },
    error: null,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── /api/sales/import/preview ─────────────────────────────────────────────────

describe('POST /api/sales/import/preview', () => {

  it('returns 401 when no Authorization header', async () => {
    const res = await request(app)
      .post('/api/sales/import/preview')
      .attach('file', XLSX_BUFFER, { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('غير مصرح')
  })

  it('returns 422 when no file is attached', async () => {
    mockAuthOk()
    const res = await request(app)
      .post('/api/sales/import/preview')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({})
    expect(res.status).toBe(422)
  })

  it('returns 200 with { rows, total } on a valid xlsx file', async () => {
    mockAuthOk()
    const fakeRows = [
      { input_type: 'daily', sale_date: '2026-01-01', amount: 100 },
      { input_type: 'daily', sale_date: '2026-01-02', amount: 200 },
    ]
    importService.preview.mockReturnValue(fakeRows)

    const res = await request(app)
      .post('/api/sales/import/preview')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .attach('file', XLSX_BUFFER, {
        filename:    'sales.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

    expect(res.status).toBe(200)
    expect(res.body.rows).toEqual(fakeRows)
    expect(res.body.total).toBe(2)
  })

  it('calls importService.preview with the file buffer', async () => {
    mockAuthOk()
    importService.preview.mockReturnValue([])

    await request(app)
      .post('/api/sales/import/preview')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .attach('file', XLSX_BUFFER, {
        filename:    'sales.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

    expect(importService.preview).toHaveBeenCalledOnce()
    expect(importService.preview).toHaveBeenCalledWith(expect.any(Buffer))
  })
})

// ── /api/sales/import ─────────────────────────────────────────────────────────

describe('POST /api/sales/import', () => {

  it('returns 401 when no Authorization header', async () => {
    const res = await request(app)
      .post('/api/sales/import')
      .attach('file', XLSX_BUFFER, { filename: 'data.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('غير مصرح')
  })

  it('returns 422 when a PDF file is uploaded (wrong MIME + extension)', async () => {
    mockAuthOk()
    const res = await request(app)
      .post('/api/sales/import')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .field('branch_id', VALID_BRANCH)
      .attach('file', PDF_BUFFER, {
        filename:    'report.pdf',
        contentType: 'application/pdf',
      })
    expect(res.status).toBe(422)
  })

  it('returns 422 when file exceeds 10 MB limit', async () => {
    mockAuthOk()
    // 11 MB buffer
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'A')
    const res = await request(app)
      .post('/api/sales/import')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .field('branch_id', VALID_BRANCH)
      .attach('file', bigBuffer, {
        filename:    'big.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    expect(res.status).toBe(422)
    // Arabic error about file size limit
    expect(res.body.error).toMatch(/حجم|ميجا/i)
  })

  it('returns 422 when no file is attached', async () => {
    mockAuthOk()
    const res = await request(app)
      .post('/api/sales/import')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ branch_id: VALID_BRANCH })
    expect(res.status).toBe(422)
  })

  it('returns 422 when file is valid but branch_id is missing', async () => {
    mockAuthOk()
    const res = await request(app)
      .post('/api/sales/import')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .attach('file', XLSX_BUFFER, {
        filename:    'sales.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/فرع/)
  })

  it('returns 200 with queued count on a valid file + branch_id', async () => {
    mockAuthOk()
    importService.import.mockResolvedValue({
      queued:   5,
      warnings: [],
      errors:   [],
      total:    5,
    })

    const res = await request(app)
      .post('/api/sales/import')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .field('branch_id', VALID_BRANCH)
      .attach('file', XLSX_BUFFER, {
        filename:    'sales.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

    expect(res.status).toBe(200)
    expect(res.body.queued).toBe(5)
    expect(res.body.warnings).toEqual([])
    expect(res.body.errors).toEqual([])
    expect(res.body.total).toBe(5)
  })

  it('calls importService.import with buffer and branch_id', async () => {
    mockAuthOk()
    importService.import.mockResolvedValue({ queued: 0, warnings: [], errors: [], total: 0 })

    await request(app)
      .post('/api/sales/import')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .field('branch_id', VALID_BRANCH)
      .attach('file', XLSX_BUFFER, {
        filename:    'sales.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

    expect(importService.import).toHaveBeenCalledOnce()
    expect(importService.import).toHaveBeenCalledWith(expect.any(Buffer), VALID_BRANCH)
  })

  it('returns 422 when file has a .pdf extension even with xlsx MIME (double-extension guard)', async () => {
    mockAuthOk()
    // The fileFilter rejects when the LAST extension is not in ALLOWED_EXTS
    const res = await request(app)
      .post('/api/sales/import')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .field('branch_id', VALID_BRANCH)
      .attach('file', PDF_BUFFER, {
        filename:    'malware.xlsx.pdf',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    expect(res.status).toBe(422)
  })
})
