const express = require('express')
const router  = express.Router()
const multer  = require('multer')
const XLSX    = require('xlsx')
const { authMiddleware }   = require('../middleware/auth')
const { tenantMiddleware } = require('../middleware/tenantMiddleware')
const { pool } = require('../db/query')
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
    if (parts.length < 2) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'نوع الملف غير مدعوم. يرجى رفع ملف .xlsx أو .xls أو .csv'))
    }
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

// ── GET /api/sales/import/template ─────────────────────────────────────────────
// Generates a pre-filled Excel template for the given branch + month/year.
// Query params:
//   branch_id (required)
//   month     (optional, 1-12; if omitted current month is used)
//   year      (optional; if omitted current year is used)
router.get('/import/template', standardLimiter, authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const { branch_id, month, year } = req.query

    if (!branch_id) return res.status(422).json({ error: 'يرجى تحديد الفرع' })

    // Ownership check
    const { rows: branchRows } = await pool.query(
      `SELECT id, code, name, contract_number FROM branches WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [branch_id, req.tenantId]
    )
    const branch = branchRows[0]
    if (!branch) return res.status(404).json({ error: 'الفرع غير موجود' })

    const now         = new Date()
    const selMonth    = parseInt(month) || (now.getMonth() + 1)
    const selYear     = parseInt(year)  || now.getFullYear()
    if (selMonth < 1 || selMonth > 12) return res.status(422).json({ error: 'الشهر غير صالح' })

    const daysInMonth = new Date(selYear, selMonth, 0).getDate()
    const mm          = String(selMonth).padStart(2, '0')

    // Build rows: one per day in the selected month.
    // Headers in Arabic; users fill المبيعات column.
    const rows = [
      ['نوع_الإدخال', 'التاريخ', 'المبيعات', 'ملاحظات']  // header row
    ]
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0')
      rows.push(['daily', `${selYear}-${mm}-${dd}`, '', ''])
    }

    // Build workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Column widths
    ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 24 }]

    // RTL worksheet direction
    ws['!rtl'] = true

    // Sheet name: branch + period
    const sheetName = `${branch.code}-${mm}-${selYear}`.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // A second "Instructions" sheet in Arabic
    const instructions = [
      ['تعليمات تعبئة نموذج المبيعات'],
      [''],
      [`الفرع: ${branch.name} (${branch.code})`],
      [`الفترة: ${selYear}/${mm}`],
      [''],
      ['1. أدخل قيمة المبيعات لكل يوم في عمود "المبيعات".'],
      ['2. اترك الأيام التي لا يوجد فيها مبيعات فارغة أو احذف صفها.'],
      ['3. لا تُعدّل عمود "نوع_الإدخال" — يجب أن يبقى "daily".'],
      ['4. التاريخ بصيغة YYYY-MM-DD.'],
      ['5. العملة: ريال سعودي (لا تكتب رمز العملة في الخلية).'],
      ['6. ارجع إلى صفحة استيراد Excel وارفع الملف المعبّأ.'],
    ]
    const wsInst = XLSX.utils.aoa_to_sheet(instructions)
    wsInst['!cols'] = [{ wch: 60 }]
    wsInst['!rtl'] = true
    XLSX.utils.book_append_sheet(wb, wsInst, 'تعليمات')

    // Write to buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="template-${branch.code}-${selYear}-${mm}.xlsx"`)
    res.send(buf)
  } catch (err) { next(err) }
})

router.post('/import/preview', standardLimiter, authMiddleware, tenantMiddleware, upload.single('file'), handleMulterError, previewImport)
router.post('/import',         strictLimiter,   authMiddleware, tenantMiddleware, upload.single('file'), handleMulterError, processImport)

module.exports = router
