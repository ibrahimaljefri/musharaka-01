/**
 * Integration tests — POST /api/sales/import/preview  &  POST /api/sales/import
 *
 * Mocking strategy
 * ----------------
 * Uses the same createRequire + _set* pattern as api.sales.test.js so that
 * mocks reliably intercept CJS require() calls inside the Express app.
 *
 * importService exports a test stub (when NODE_ENV=test) with:
 *   _setPreview(fn)  — replace the preview function for a test
 *   _setImport(fn)   — replace the import function for a test
 *   _reset()         — restore defaults after each test
 *
 * File uploads are sent with supertest's .attach() which sets the correct
 * Content-Type multipart boundary.  The MIME type is supplied explicitly so
 * that Multer's fileFilter can accept or reject the file.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createRequire } from 'module'
import request from 'supertest'

const _require = createRequire(import.meta.url)

let app
let importService

beforeAll(() => {
  app           = _require('../index.js')
  importService = _require('../services/importService.js').importService
})

afterEach(() => {
  importService._reset()
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_BRANCH  = '123e4567-e89b-12d3-a456-426614174000'
const AUTH_HEADERS  = { 'x-test-user-id': 'test-user-id' }
const XLSX_MIME     = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const XLSX_BUFFER   = Buffer.from('PK fake xlsx content bytes')
const PDF_BUFFER    = Buffer.from('%PDF-1.4 fake pdf content')

// ── /api/sales/import/preview ─────────────────────────────────────────────────

describe('POST /api/sales/import/preview', () => {

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .post('/api/sales/import/preview')
      .attach('file', XLSX_BUFFER, { filename: 'data.xlsx', contentType: XLSX_MIME })
    expect(res.status).toBe(401)
  })

  it('returns 422 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/sales/import/preview').set(AUTH_HEADERS).send({})
    expect(res.status).toBe(422)
  })

  it('returns 200 with { rows, total } on a valid xlsx file', async () => {
    const fakeRows = [
      { input_type: 'daily', sale_date: '2026-01-01', amount: 100 },
      { input_type: 'daily', sale_date: '2026-01-02', amount: 200 },
    ]
    importService._setPreview(() => fakeRows)
    const res = await request(app)
      .post('/api/sales/import/preview').set(AUTH_HEADERS)
      .attach('file', XLSX_BUFFER, { filename: 'sales.xlsx', contentType: XLSX_MIME })
    expect(res.status).toBe(200)
    expect(res.body.rows).toEqual(fakeRows)
    expect(res.body.total).toBe(2)
  })

  it('calls importService.preview with the file buffer', async () => {
    const calls = []
    importService._setPreview((buf) => { calls.push(buf); return [] })
    await request(app)
      .post('/api/sales/import/preview').set(AUTH_HEADERS)
      .attach('file', XLSX_BUFFER, { filename: 'sales.xlsx', contentType: XLSX_MIME })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toBeInstanceOf(Buffer)
  })
})

// ── /api/sales/import ─────────────────────────────────────────────────────────

describe('POST /api/sales/import', () => {

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .post('/api/sales/import')
      .attach('file', XLSX_BUFFER, { filename: 'data.xlsx', contentType: XLSX_MIME })
    expect(res.status).toBe(401)
  })

  it('returns 422 when a PDF file is uploaded', async () => {
    const res = await request(app)
      .post('/api/sales/import').set(AUTH_HEADERS)
      .field('branch_id', VALID_BRANCH)
      .attach('file', PDF_BUFFER, { filename: 'report.pdf', contentType: 'application/pdf' })
    expect(res.status).toBe(422)
  })

  it('returns 422 when file exceeds 10 MB limit', async () => {
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'A')
    const res = await request(app)
      .post('/api/sales/import').set(AUTH_HEADERS)
      .field('branch_id', VALID_BRANCH)
      .attach('file', bigBuffer, { filename: 'big.xlsx', contentType: XLSX_MIME })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/حجم|ميجا/i)
  })

  it('returns 422 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/sales/import').set(AUTH_HEADERS)
      .send({ branch_id: VALID_BRANCH })
    expect(res.status).toBe(422)
  })

  it('returns 422 when file is valid but branch_id is missing', async () => {
    const res = await request(app)
      .post('/api/sales/import').set(AUTH_HEADERS)
      .attach('file', XLSX_BUFFER, { filename: 'sales.xlsx', contentType: XLSX_MIME })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/فرع/)
  })

  it('returns 200 with queued count on a valid file + branch_id', async () => {
    importService._setImport(async () => ({ queued: 5, warnings: [], errors: [], total: 5 }))
    const res = await request(app)
      .post('/api/sales/import').set(AUTH_HEADERS)
      .field('branch_id', VALID_BRANCH)
      .attach('file', XLSX_BUFFER, { filename: 'sales.xlsx', contentType: XLSX_MIME })
    expect(res.status).toBe(200)
    expect(res.body.queued).toBe(5)
  })

  it('calls importService.import with buffer and branch_id', async () => {
    const calls = []
    importService._setImport(async (buf, branchId) => {
      calls.push({ buf, branchId })
      return { queued: 0, warnings: [], errors: [], total: 0 }
    })
    await request(app)
      .post('/api/sales/import').set(AUTH_HEADERS)
      .field('branch_id', VALID_BRANCH)
      .attach('file', XLSX_BUFFER, { filename: 'sales.xlsx', contentType: XLSX_MIME })
    expect(calls).toHaveLength(1)
    expect(calls[0].buf).toBeInstanceOf(Buffer)
    expect(calls[0].branchId).toBe(VALID_BRANCH)
  })

  it('returns 422 when file has .pdf extension with xlsx MIME (double-extension guard)', async () => {
    const res = await request(app)
      .post('/api/sales/import').set(AUTH_HEADERS)
      .field('branch_id', VALID_BRANCH)
      .attach('file', PDF_BUFFER, { filename: 'malware.xlsx.pdf', contentType: XLSX_MIME })
    expect(res.status).toBe(422)
  })
})
