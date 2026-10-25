/**
 * Unit tests — config/hosts.js (CLIENT_ORIGIN / APP_URL resolution)
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
const { getAllowedOrigins, getPublicUrl } = _require('../config/hosts.js')

describe('getAllowedOrigins', () => {
  it('parses a comma list, trims whitespace and drops empty entries', () => {
    const env = { CLIENT_ORIGIN: ' https://musharakah.urrwah.com , https://dev.urrwah.com,, ' }
    expect(getAllowedOrigins(env)).toEqual([
      'https://musharakah.urrwah.com',
      'https://dev.urrwah.com',
    ])
  })

  it('strips trailing slashes and de-duplicates', () => {
    const env = { CLIENT_ORIGIN: 'https://musharakah.urrwah.com/,https://musharakah.urrwah.com' }
    expect(getAllowedOrigins(env)).toEqual(['https://musharakah.urrwah.com'])
  })

  it('defaults to the Vite dev server outside production', () => {
    expect(getAllowedOrigins({})).toEqual(['http://localhost:5173'])
    expect(getAllowedOrigins({ NODE_ENV: 'test', CLIENT_ORIGIN: '  ' })).toEqual(['http://localhost:5173'])
  })

  it('fails fast in production when CLIENT_ORIGIN is missing or blank', () => {
    expect(() => getAllowedOrigins({ NODE_ENV: 'production' })).toThrow(/CLIENT_ORIGIN/)
    expect(() => getAllowedOrigins({ NODE_ENV: 'production', CLIENT_ORIGIN: ' , ' })).toThrow(/CLIENT_ORIGIN/)
  })

  it('rejects wildcard and non-http(s) entries', () => {
    expect(() => getAllowedOrigins({ CLIENT_ORIGIN: '*' })).toThrow(/invalid/i)
    expect(() => getAllowedOrigins({ CLIENT_ORIGIN: 'ftp://urrwah.com' })).toThrow(/invalid/i)
    expect(() => getAllowedOrigins({ CLIENT_ORIGIN: 'https://urrwah.com/app' })).toThrow(/invalid/i)
  })
})

describe('getPublicUrl', () => {
  it('prefers APP_URL and strips the trailing slash', () => {
    const env = { APP_URL: 'https://musharakah.urrwah.com/', CLIENT_ORIGIN: 'https://other.example' }
    expect(getPublicUrl(env)).toBe('https://musharakah.urrwah.com')
  })

  it('falls back to the first CLIENT_ORIGIN entry, never the whole list', () => {
    const env = { CLIENT_ORIGIN: 'https://musharakah.urrwah.com,https://dev.urrwah.com' }
    expect(getPublicUrl(env)).toBe('https://musharakah.urrwah.com')
  })

  it('uses the dev default outside production', () => {
    expect(getPublicUrl({})).toBe('http://localhost:5173')
  })

  it('fails fast in production when neither variable is set', () => {
    expect(() => getPublicUrl({ NODE_ENV: 'production' })).toThrow(/CLIENT_ORIGIN/)
  })

  it('treats a blank APP_URL as unset', () => {
    const env = { APP_URL: '  ', CLIENT_ORIGIN: 'https://musharakah.urrwah.com' }
    expect(getPublicUrl(env)).toBe('https://musharakah.urrwah.com')
  })

  it('rejects an APP_URL that is not an http(s) origin', () => {
    expect(() => getPublicUrl({ APP_URL: 'javascript:alert(1)' })).toThrow(/APP_URL/)
    expect(() => getPublicUrl({ APP_URL: 'https://urrwah.com/x' })).toThrow(/APP_URL/)
  })
})
