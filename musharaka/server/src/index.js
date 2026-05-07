require('dotenv').config()
const express = require('express')
const helmet  = require('helmet')
const cors    = require('cors')
const path    = require('path')
const { errorHandler } = require('./middleware/errorHandler')

const authRoutes        = require('./routes/auth')
const salesRoutes       = require('./routes/sales')
const importRoutes      = require('./routes/import')
const submitRoutes      = require('./routes/submit')
const submissionsRoutes = require('./routes/submissions')
const contractsRoutes   = require('./routes/contracts')
const adminRoutes       = require('./routes/admin')
const botRoutes         = require('./routes/bot')
const ticketsRoutes     = require('./routes/tickets')
const branchesRoutes    = require('./routes/branches')
const tenantAdminRoutes = require('./routes/tenantAdmin')

const app  = express()
const PORT = process.env.PORT || 3001

// Trust the cPanel reverse proxy so req.ip resolves to the real client
// (not the proxy) and express-rate-limit can key per-user. Without this
// the rate limiter sees the same IP for every request and one heavy
// user could rate-limit everyone, plus express-rate-limit emits
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR ValidationError on every request.
app.set('trust proxy', 1)

// Security headers — CSP disabled: frontend may be served from this server or from cPanel.
// We strip CSP entirely so the frontend can call the Render API without browser blocks.
// Everything else (HSTS, X-Frame-Options, nosniff, Referrer-Policy) stays on.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  // HSTS: 1 year, include subdomains, preload-ready
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
}))

// Additional headers Helmet 8 doesn't set by default
app.use((_req, res, next) => {
  // Deny browser access to powerful APIs unless we explicitly opt in
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  // Belt-and-suspenders: strip any CSP re-added upstream
  res.removeHeader('Content-Security-Policy')
  res.removeHeader('X-Content-Security-Policy')
  res.removeHeader('X-WebKit-CSP')
  next()
})

// CORS — allow only the configured client origin
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim())
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`Origin ${origin} not allowed by CORS`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}))

// Body parsing with size limit (import route uses multipart — handled by Multer separately)
app.use(require('cookie-parser')())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))

// Global API timeout — if any route handler takes > 12 s, respond immediately
// instead of hanging the connection indefinitely (shared hosting safety net)
app.use('/api', (req, res, next) => {
  res.setTimeout(12000, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'انتهت مهلة الطلب، يرجى المحاولة مجدداً' })
    }
  })
  next()
})

app.use('/api/auth',        authRoutes)
app.use('/api/sales',       salesRoutes)
app.use('/api/sales',       importRoutes)
app.use('/api/submit',      submitRoutes)
app.use('/api/submissions', submissionsRoutes)
app.use('/api/contracts',   contractsRoutes)
app.use('/api/admin',         adminRoutes)
app.use('/api/tenant-admin',  tenantAdminRoutes)
app.use('/api/bot',           botRoutes)
app.use('/api/tickets',       ticketsRoutes)
app.use('/api/branches',      branchesRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// Internal shutdown — allows deploy scripts to gracefully kill this process
// without needing pkill/pgrep (both exit 255 on CloudLinux/CageFS).
// Protected by INTERNAL_KILL_KEY env var; ignored if the key is not configured.
app.post('/api/internal/shutdown', (req, res) => {
  const key = process.env.INTERNAL_KILL_KEY
  if (!key || req.headers['x-kill-key'] !== key) {
    return res.status(403).json({ error: 'forbidden' })
  }
  res.json({ bye: true })
  setTimeout(() => process.exit(0), 200)
})

// /api/version — returns the deployed git SHA + timestamp.
// deploy.sh and the GH Actions stamp step write GIT_SHA + DEPLOYED_AT to
// server/.env on each deploy.  We read the file fresh on every request so
// this works even when the Passenger-managed process has not restarted
// (e.g. on cPanel/CloudLinux where pkill/pgrep are restricted).
function readEnvKey(key) {
  try {
    const fs      = require('fs')
    const envFile = path.join(__dirname, '..', '.env')
    const content = fs.readFileSync(envFile, 'utf8')
    const match   = content.match(new RegExp(`^${key}=([^\\r\\n]+)`, 'm'))
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

app.get('/api/version', (_req, res) => res.json({
  sha:          readEnvKey('GIT_SHA')      || process.env.GIT_SHA      || 'dev',
  deployed_at:  readEnvKey('DEPLOYED_AT')  || process.env.DEPLOYED_AT  || null,
  node_env:     process.env.NODE_ENV       || 'development',
}))

// 404 for undefined /api/* routes only
app.use('/api', (_req, res) => res.status(404).json({ error: 'المسار غير موجود' }))

// Serve React build (production: client/dist must exist)
// index.html is served with no-cache so browsers never serve a stale copy with
// old CSP headers baked into the cached HTTP response.
app.use(express.static(path.join(__dirname, '../../client/dist'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) {
      res.removeHeader('Content-Security-Policy')
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
    }
  },
}))

// SPA catch-all — React Router handles all non-API routes
app.get('*', (_req, res) => {
  res.removeHeader('Content-Security-Policy')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
})

app.use(errorHandler)

// Only start listening when run directly (not when required by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    // Write PID file so deploy scripts can kill this process with `kill -9 $(cat *.pid)`.
    // pkill / pgrep exit 255 on CloudLinux / CageFS; direct kill with a known PID works.
    const fs = require('fs')
    const os = require('os')
    try {
      fs.writeFileSync(
        require('path').join(os.homedir(), 'urrwah-dev-api.pid'),
        String(process.pid)
      )
    } catch (_) { /* non-fatal — deploy falls back to ss-based PID lookup */ }
    console.log(`Urwah API running on port ${PORT}`)
  })
}

module.exports = app
