const rateLimit = require('express-rate-limit')

// Standard API limiter — 60 requests per minute per IP
const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً' },
})

// Strict limiter for auth-adjacent endpoints — 10 requests per minute per IP
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تجاوزت الحد المسموح به من المحاولات، يرجى الانتظار دقيقة' },
})

module.exports = { standardLimiter, strictLimiter }
