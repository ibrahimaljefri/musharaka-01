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

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      connectSrc:     ["'self'", 'https://*.supabase.co', 'https://musharaka-01.onrender.com'],
      imgSrc:         ["'self'", 'data:'],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

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
app.use(express.static(path.join(__dirname, '../../client/dist')))

// SPA catch-all — React Router handles all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
})

app.use(errorHandler)

// Only start listening when run directly (not when required by tests)
if (require.main === module) {
  app.listen(PORT, () => console.log(`Musharaka API running on port ${PORT}`))
}

module.exports = app
