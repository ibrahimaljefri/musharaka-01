const jwt = require('jsonwebtoken')

// Fail fast in production if JWT_SECRET is missing
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[FATAL] JWT_SECRET is not configured. Exiting.')
  process.exit(1)
}

function authMiddleware(req, res, next) {
  // Test-mode bypass — integration tests set X-Test-User-Id header
  if (process.env.NODE_ENV === 'test') {
    const testUserId = req.headers['x-test-user-id']
    if (testUserId) {
      req.user = { id: testUserId, email: 'test@test.com' }
      return next()
    }
  }

  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح' })
  }

  const token = header.slice(7)
  try {
    const payload  = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-prod')
    req.user       = { id: payload.sub, email: payload.email }
    req.tenantId   = payload.tenantId   || null
    req.userRole   = payload.role       || null
    req.isSuperAdmin = payload.isSuperAdmin || false
    next()
  } catch {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً' })
  }
}

module.exports = { authMiddleware }
