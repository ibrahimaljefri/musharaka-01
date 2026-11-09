/**
 * F2 (domain contract) — every cookie the API sets must be HOST-ONLY.
 *
 * A `Domain=.urrwah.com` attribute would leak the session to the Partner
 * Portal, Hartna and every other product on a sibling subdomain. These tests
 * pin the cookie attributes of every endpoint that sets or clears a cookie,
 * and guard the source so a `domain` option cannot be added unnoticed.
 */
import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import request from 'supertest'

const _require = createRequire(import.meta.url)

let app
let pool
let auth

const USER = {
  id: 'u1', email: 'a@b.co', full_name: 'Test', tenant_id: 't1', role: 'admin',
  password_hash: 'hash', terms_accepted_at: new Date().toISOString(),
}

beforeAll(() => {
  process.env.CLIENT_ORIGIN = 'https://musharakah.urrwah.com'
  process.env.NODE_ENV      = 'test'
  app  = _require('../index.js')
  pool = _require('../config/db.js').pool
  auth = _require('../services/authService.js')
})

afterEach(() => { vi.restoreAllMocks() })

function mockAuth() {
  vi.spyOn(auth, 'verifyPassword').mockResolvedValue(true)
  vi.spyOn(auth, 'hashPassword').mockResolvedValue('hash')
  vi.spyOn(auth, 'loadUserWithContext').mockResolvedValue(USER)
  vi.spyOn(auth, 'buildAccessToken').mockReturnValue('access-token')
  vi.spyOn(auth, 'issueRefreshToken').mockResolvedValue('refresh-token-value')
  vi.spyOn(auth, 'rotateRefreshToken').mockResolvedValue({
    refreshToken: 'rotated-refresh-token', accessToken: 'access-token', user: USER,
  })
  vi.spyOn(auth, 'revokeRefreshToken').mockResolvedValue(undefined)
}

function setCookies(res) {
  const raw = res.headers['set-cookie']
  return Array.isArray(raw) ? raw : raw ? [raw] : []
}

function expectHostOnly(cookie) {
  expect(cookie).not.toMatch(/;\s*domain=/i)
  expect(cookie).toMatch(/;\s*path=\//i)
  expect(cookie).toMatch(/;\s*httponly/i)
  expect(cookie).toMatch(/;\s*samesite=lax/i)
}

describe('F2 — refresh_token cookie is host-only', () => {
  it('login: no Domain, HttpOnly, SameSite=Lax', async () => {
    mockAuth()
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [USER] })
    const res = await request(app).post('/api/auth/login').send({ email: USER.email, password: 'secret123' })
    expect(res.status).toBe(200)
    const cookies = setCookies(res)
    expect(cookies).toHaveLength(1)
    expect(cookies[0]).toMatch(/^refresh_token=/)
    expectHostOnly(cookies[0])
  })

  it('signup: no Domain, HttpOnly, SameSite=Lax', async () => {
    mockAuth()
    const query = vi.spyOn(pool, 'query')
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: USER.id }] })
    const res = await request(app).post('/api/auth/signup').send({
      email: 'new@b.co', password: 'secret123', terms_accepted: true,
    })
    expect(res.status).toBe(201)
    expect(query).toHaveBeenCalledTimes(2)
    const cookies = setCookies(res)
    expect(cookies).toHaveLength(1)
    expectHostOnly(cookies[0])
  })

  it('refresh: rotated cookie has no Domain', async () => {
    mockAuth()
    const res = await request(app).post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=old-token').send({})
    expect(res.status).toBe(200)
    const cookies = setCookies(res)
    expect(cookies).toHaveLength(1)
    expect(cookies[0]).toMatch(/^refresh_token=rotated-refresh-token/)
    expectHostOnly(cookies[0])
  })

  it('logout: the clearing Set-Cookie has no Domain either', async () => {
    mockAuth()
    const res = await request(app).post('/api/auth/logout')
      .set('Cookie', 'refresh_token=old-token').send({})
    expect(res.status).toBe(200)
    const cookies = setCookies(res)
    expect(cookies).toHaveLength(1)
    expect(cookies[0]).toMatch(/^refresh_token=;/)
    expect(cookies[0]).toMatch(/expires=Thu, 01 Jan 1970/i)
    expect(cookies[0]).not.toMatch(/;\s*domain=/i)
  })

  it('sets Secure in production and omits it elsewhere', async () => {
    mockAuth()
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [USER] })
    const creds = { email: USER.email, password: 'secret123' }

    const dev = await request(app).post('/api/auth/login').send(creds)
    expect(setCookies(dev)[0]).not.toMatch(/;\s*secure/i)

    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const prod = await request(app).post('/api/auth/login').send(creds)
      expect(setCookies(prod)[0]).toMatch(/;\s*secure/i)
      expect(setCookies(prod)[0]).not.toMatch(/;\s*domain=/i)
    } finally {
      process.env.NODE_ENV = prev
    }
  })

  it('does not set any cookie on unauthenticated or failed requests', async () => {
    mockAuth()
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] })
    const res = await request(app).post('/api/auth/login').send({ email: 'x@y.z', password: 'wrongpass1' })
    expect(res.status).toBe(401)
    expect(setCookies(res)).toHaveLength(0)
  })
})

describe('F2 — source guard', () => {
  function jsFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) return e.name === 'tests' ? [] : jsFiles(p)
      return e.name.endsWith('.js') ? [p] : []
    })
  }

  it('no server code passes a cookie `domain` option or Domain= attribute', () => {
    const root = path.join(__dirname, '..')
    const offenders = jsFiles(root).filter(f => {
      const src = fs.readFileSync(f, 'utf8')
      const usesCookies = /\bres\.(cookie|clearCookie)\(|\bcookieOpts\b|\bset-cookie\b/i.test(src)
      return usesCookies && /\bdomain\s*:|Domain=/i.test(src)
    })
    expect(offenders).toEqual([])
  })
})
