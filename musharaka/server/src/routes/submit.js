const express = require('express')
const router  = express.Router()
const { authMiddleware } = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')
const { submitInvoices } = require('../controllers/submitController')
const { strictLimiter } = require('../middleware/rateLimiter')
const { isBranchOutOfScope } = require('../utils/branchScope')

function ensureBranchInScope(req, res, next) {
  if (isBranchOutOfScope(req, req.body?.branch_id)) {
    return res.status(403).json({ error: 'لا تملك صلاحية الوصول إلى هذا الفرع' })
  }
  next()
}

router.post('/', strictLimiter, authMiddleware, tenantMiddleware, ensureBranchInScope, submitInvoices)

module.exports = router
