const express = require('express')
const router  = express.Router()
const multer  = require('multer')
const { authMiddleware } = require('../middleware/auth')
const { previewImport, processImport } = require('../controllers/importController')
const { standardLimiter, strictLimiter } = require('../middleware/rateLimiter')

const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
]
const ALLOWED_EXTS = ['.xlsx', '.xls', '.csv']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const parts = file.originalname.split('.')
    // Reject files with no extension at all (single segment, no dot)
    if (parts.length < 2) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'نوع الملف غير مدعوم. يرجى رفع ملف .xlsx أو .xls أو .csv'))
    }
    // Take only the LAST extension — neutralises double extensions like malware.pdf.xlsx
    const ext = '.' + parts.pop().toLowerCase()
    if (ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) {
      cb(null, true)
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'نوع الملف غير مدعوم. يرجى رفع ملف .xlsx أو .xls أو .csv'))
    }
  },
})

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(422).json({ error: 'حجم الملف يتجاوز الحد المسموح به (10 ميجابايت)' })
    return res.status(422).json({ error: err.field || 'خطأ في رفع الملف' })
  }
  next(err)
}

router.post('/import/preview', standardLimiter, authMiddleware, upload.single('file'), handleMulterError, previewImport)
router.post('/import',         strictLimiter,   authMiddleware, upload.single('file'), handleMulterError, processImport)

module.exports = router
