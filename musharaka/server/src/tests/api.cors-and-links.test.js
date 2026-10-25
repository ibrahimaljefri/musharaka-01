/**
 * Integration tests — host configuration end to end:
 *   - CORS allows only the origins listed in CLIENT_ORIGIN
 *   - password-reset e-mail and bot guide links use the public URL, not the raw list
 */
import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createRequire } from 'module'
import request from 'supertest'

const _require = createRequire(import.meta.url)

const NEW_HOST = 'https://musharakah.urrwah.com'
const OTHER    = 'https://dev.urrwah.com'

let app
let pool
let auth

beforeAll(() => {
  process.env.CLIENT_ORIGIN = `${NEW_HOST}, ${OTHER}`
  // Blank (not deleted) so a developer's local .env cannot override them via dotenv.
  process.env.APP_URL   = ''
  process.env.SMTP_USER = ''
  app  = _require('../index.js')
  pool = _require('../config/db.js').pool
  auth = _require('../services/authService.js')
})

afterEach(() => { vi.restoreAllMocks() })

describe('CORS', () => {
  it('allows the new Musharakah host with credentials', async () => {
    const res = await request(app).get('/api/health').set('Origin', NEW_HOST)
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe(NEW_HOST)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('allows every origin in the comma list', async () => {
    const res = await request(app).get('/api/health').set('Origin', OTHER)
    expect(res.headers['access-control-allow-origin']).toBe(OTHER)
  })

  it('does not echo the legacy apex or unknown origins', async () => {
    for (const origin of ['https://urrwah.com', 'https://evil.example', 'https://www.dev.urrwah.com']) {
      const res = await request(app).get('/api/health').set('Origin', origin)
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    }
  })
})

describe('e-mail and bot links', () => {
  it('builds the password-reset link from the first origin when APP_URL is unset', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ id: 'u1', full_name: 'Test' }] })
    vi.spyOn(auth, 'issuePasswordResetToken').mockResolvedValue('tok123')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'a@b.co' })
    expect(res.status).toBe(200)

    const mail = log.mock.calls.map(c => String(c[0])).join('\n')
    expect(mail).toContain(`${NEW_HOST}/reset-password?token=tok123`)
    expect(mail).not.toContain('undefined/reset-password')
    expect(mail).not.toContain(`${NEW_HOST},`)
  })

  it('uses APP_URL for the reset link when it is set', async () => {
    process.env.APP_URL = 'https://app.example.org/'
    try {
      vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ id: 'u1', full_name: 'Test' }] })
      vi.spyOn(auth, 'issuePasswordResetToken').mockResolvedValue('tok9')
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})

      await request(app).post('/api/auth/forgot-password').send({ email: 'a@b.co' })
      const mail = log.mock.calls.map(c => String(c[0])).join('\n')
      expect(mail).toContain('https://app.example.org/reset-password?token=tok9')
    } finally {
      process.env.APP_URL = ''
    }
  })

  it('bot guide link is a single clean URL', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [{ id: 's1', tenant_id: 't1' }] })
    const { processMessage } = _require('../services/botService.js')
    const text = await processMessage('telegram', '1', 'دليل')
    expect(text).toContain(`${NEW_HOST}/user-guide.html`)
    expect(text).not.toContain(`${NEW_HOST},`)
  })
})
