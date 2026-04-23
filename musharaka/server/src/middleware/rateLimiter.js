const rateLimit = require('express-rate-limit')

// In test mode, use a no-op middleware so tests don't hit rate limits
const noopMiddleware = (_req, _res, next) => next()
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    standardLimiter:    noopMiddleware,
    strictLimiter:      noopMiddleware,
    authLimiter:        noopMiddleware,
    adminWriteLimiter:  noopMiddleware,
    adminWriteOnly:     noopMiddleware,
  }
  return
}

// Standard API limiter — 60 requests per minute per IP
const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً' },
})

// Strict limiter for auth-adjacent / ingest endpoints — 10 requests per minute per IP
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تجاوزت الحد المسموح به من المحاولات، يرجى الانتظار دقيقة' },
})

// Auth-sensitive endpoints (password change, token-issuing) — 5 per minute per IP.
// Defeats credential stuffing and brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة، يرجى الانتظار دقيقة قبل المحاولة مجدداً' },
})

// Admin state-changing routes (tenant/user/key create/update/delete) — 30/min per IP.
// Only applied to non-GET methods via the helper below.
const adminWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات تعديل كثيرة، يرجى الانتظار قليلاً' },
})

// Helper: apply adminWriteLimiter only on write methods; pass GETs straight through.
function adminWriteOnly(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  return adminWriteLimiter(req, res, next)
}

module.exports = { standardLimiter, strictLimiter, authLimiter, adminWriteLimiter, adminWriteOnly }
