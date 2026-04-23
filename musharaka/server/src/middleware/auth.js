const { supabase } = require('../config/supabase')

// Fail fast — never run with a placeholder service role key
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder-service-role-key') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] SUPABASE_SERVICE_ROLE_KEY is not configured. Exiting.')
    process.exit(1)
  }
}

async function authMiddleware(req, res, next) {
  // Test-mode bypass: integration tests set X-Test-User-Id instead of a real JWT
  if (process.env.NODE_ENV === 'test') {
    const testUserId = req.headers['x-test-user-id']
    if (testUserId) {
      req.user = { id: testUserId }
      return next()
    }
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح' })
  }
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    // Diagnostic: log the reason Supabase rejected the token so production
    // 401s can be distinguished (bad env key, expired token, wrong project).
    // The token itself is never logged — only the Supabase error and metadata.
    console.warn('[auth] getUser rejected token', {
      route:  req.originalUrl,
      reason: error?.message || 'no user returned',
      status: error?.status,
    })
    return res.status(401).json({ error: 'جلسة منتهية، يرجى تسجيل الدخول مجدداً' })
  }

  req.user = user
  next()
}

module.exports = { authMiddleware }
