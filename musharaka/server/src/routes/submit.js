const express = require('express')
const router  = express.Router()
const { authMiddleware } = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')
const { submitInvoices } = require('../controllers/submitController')
const { strictLimiter } = require('../middleware/rateLimiter')

router.post('/', strictLimiter, authMiddleware, tenantMiddleware, submitInvoices)

module.exports = router
