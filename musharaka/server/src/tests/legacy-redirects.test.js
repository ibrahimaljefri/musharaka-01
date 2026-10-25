/**
 * Guard for docs/legacy-redirects.htaccess — the 301 snippet S1 installs on the
 * apex (urrwah.com) docroot so old Musharakah URLs keep working after the move
 * to musharakah.urrwah.com.
 *
 * The snippet is derived from client/src/App.jsx and client/public; these
 * tests fail when a route or public file is added without a matching rule.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT     = path.resolve(__dirname, '../../../..')
const SNIPPET  = path.join(ROOT, 'docs/legacy-redirects.htaccess')
const APP_JSX  = path.join(ROOT, 'musharaka/client/src/App.jsx')
const PUBLIC   = path.join(ROOT, 'musharaka/client/public')
const NEW_HOST = 'https://musharakah.urrwah.com'

const snippet = fs.readFileSync(SNIPPET, 'utf8')
const lines   = snippet.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))

const rules = lines
  .filter(l => l.startsWith('RewriteRule '))
  .map(l => {
    const m = l.match(/^RewriteRule\s+(\S+)\s+(\S+)\s+\[([^\]]*)\]$/)
    if (!m) throw new Error(`unparsable RewriteRule: ${l}`)
    return { pattern: new RegExp(m[1], 'i'), target: m[2], flags: m[3].split(',') }
  })

// .htaccess RewriteRule patterns see the path WITHOUT the leading slash.
const redirectsFor = (urlPath) => {
  const rel = urlPath.replace(/^\//, '')
  return rules.filter(r => r.pattern.test(rel))
}

function appRoutes() {
  const src = fs.readFileSync(APP_JSX, 'utf8')
  return [...src.matchAll(/<Route\s[^>]*\bpath="([^"]+)"/g)]
    .map(m => m[1])
    .filter(p => p !== '*' && p !== '/')
}

const sample = (route) => route.replace(/:[A-Za-z]+/g, 'a1b2c3')

describe('legacy redirect snippet — structure', () => {
  it('scopes every rule to the apex hosts and sends only to the new host', () => {
    expect(lines).toContain('RewriteCond %{HTTP_HOST} ^(www\\.)?urrwah\\.com$ [NC]')
    expect(rules.length).toBeGreaterThan(0)
    for (const r of rules) {
      expect(r.target.startsWith(`${NEW_HOST}/`)).toBe(true)
      expect(r.flags).toContain('R=301')
      expect(r.flags).toContain('L')
    }
  })

  it('does not redirect the apex home page (the Partner public site owns it)', () => {
    expect(redirectsFor('/')).toHaveLength(0)
  })

  it('cannot loop: no pattern is reachable on the new host', () => {
    // The host condition restricts rules to urrwah.com / www.urrwah.com.
    expect(snippet).not.toMatch(/HTTP_HOST[^\n]*musharakah/i)
  })
})

describe('legacy redirect snippet — coverage', () => {
  const routes = appRoutes()

  it('derives a non-trivial route list from App.jsx', () => {
    expect(routes.length).toBeGreaterThan(20)
    expect(routes).toContain('/dashboard')
    expect(routes).toContain('/terms')
  })

  it.each(routes)('301s the SPA route %s', (route) => {
    const hits = redirectsFor(sample(route))
    expect(hits.length, `no rule matches ${route}`).toBeGreaterThan(0)
  })

  it('301s trailing-slash variants of a route', () => {
    expect(redirectsFor('/dashboard/')).not.toHaveLength(0)
    expect(redirectsFor('/branches/abc/edit/')).not.toHaveLength(0)
  })

  it('301s every /api and /assets path', () => {
    for (const p of ['/api/health', '/api/version', '/api/auth/refresh', '/assets/index-abc123.js']) {
      expect(redirectsFor(p), p).not.toHaveLength(0)
    }
  })

  it('301s every public static file shipped by the client', () => {
    const files = fs.readdirSync(PUBLIC).filter(f => !f.startsWith('_') && !f.startsWith('.'))
    expect(files.length).toBeGreaterThan(5)
    for (const f of files) {
      expect(redirectsFor(`/${f}`), f).not.toHaveLength(0)
    }
  })

  it('does not capture unrelated paths (Partner public pages, .well-known)', () => {
    for (const p of ['/services/consulting', '/about', '/request-a-call', '/.well-known/acme-challenge/x', '/robots.txt', '/sitemap.xml']) {
      expect(redirectsFor(p), p).toHaveLength(0)
    }
  })
})
