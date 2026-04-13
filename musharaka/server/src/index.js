require('dotenv').config()
const express = require('express')
const helmet  = require('helmet')
const cors    = require('cors')
const path    = require('path')
const { errorHandler } = require('./middleware/errorHandler')

const salesRoutes     = require('./routes/sales')
const importRoutes    = require('./routes/import')
const submitRoutes    = require('./routes/submit')
const contractsRoutes = require('./routes/contracts')
const adminRoutes     = require('./routes/admin')
const botRoutes       = require('./routes/bot')
const ticketsRoutes   = require('./routes/tickets')

const app  = express()
const PORT = process.env.PORT || 3001

// Security headers — CSP disabled: frontend may be served from this server or from cPanel.
// We strip CSP entirely so the frontend can call the Render API without browser blocks.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

// Belt-and-suspenders: remove CSP even if any upstream middleware re-adds it.
app.use((_req, res, next) => {
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
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))

app.use('/api/sales',     salesRoutes)
app.use('/api/sales',     importRoutes)
app.use('/api/submit',    submitRoutes)
app.use('/api/contracts', contractsRoutes)
app.use('/api/admin',     adminRoutes)
app.use('/api/bot',       botRoutes)
app.use('/api/tickets',   ticketsRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

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
  app.listen(PORT, () => console.log(`Musharaka API running on port ${PORT}`))
}

module.exports = app
