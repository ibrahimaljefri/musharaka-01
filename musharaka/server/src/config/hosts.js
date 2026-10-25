/**
 * Public host configuration.
 *
 *   CLIENT_ORIGIN  comma list of browser origins allowed by CORS
 *                  (production: https://musharakah.urrwah.com)
 *   APP_URL        origin used in links we send out (e-mail, bot); optional,
 *                  defaults to the first CLIENT_ORIGIN entry
 *
 * Both are read on every call so tests and deploys never see a stale value.
 * In production a missing CLIENT_ORIGIN is a startup error, not a silent
 * fallback to localhost.
 */

const DEV_DEFAULT = 'http://localhost:5173'

// Scheme + host[:port] only: no path, query, fragment or wildcard.
const ORIGIN_RE = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/

function normalise(value) {
  return value.trim().replace(/\/+$/, '')
}

function assertOrigin(value, name) {
  if (!ORIGIN_RE.test(value)) {
    throw new Error(`${name} contains an invalid origin: "${value}" (expected https://host[:port])`)
  }
  return value
}

function getAllowedOrigins(env = process.env) {
  const entries = String(env.CLIENT_ORIGIN || '')
    .split(',')
    .map(normalise)
    .filter(Boolean)

  if (entries.length === 0) {
    if (env.NODE_ENV === 'production') {
      throw new Error('CLIENT_ORIGIN must be set in production (e.g. https://musharakah.urrwah.com)')
    }
    return [DEV_DEFAULT]
  }
  return [...new Set(entries.map(o => assertOrigin(o, 'CLIENT_ORIGIN')))]
}

function getPublicUrl(env = process.env) {
  const appUrl = normalise(String(env.APP_URL || ''))
  if (appUrl) return assertOrigin(appUrl, 'APP_URL')
  return getAllowedOrigins(env)[0]
}

module.exports = { getAllowedOrigins, getPublicUrl }
