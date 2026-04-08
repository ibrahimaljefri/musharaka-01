const express = require('express')
const router  = express.Router()
const { authMiddleware } = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')
const { createSale } = require('../controllers/saleController')
const { standardLimiter, strictLimiter } = require('../middleware/rateLimiter')

router.post('/', standardLimiter, strictLimiter, authMiddleware, tenantMiddleware, createSale)

module.exports = router
