const { importService } = require('../services/importService')

async function previewImport(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({ error: 'يرجى رفع ملف صالح (.xlsx, .xls, .csv)' })
    }
    const rows = importService.preview(req.file.buffer)
    res.json({ rows, total: rows.length })
  } catch (err) {
    next(Object.assign(err, { status: 422 }))
  }
}

async function processImport(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({ error: 'يرجى رفع ملف صالح (.xlsx, .xls, .csv)' })
    }
    const branchId = req.body.branch_id
    if (!branchId) {
      return res.status(422).json({ error: 'يرجى اختيار الفرع' })
    }
    const result = await importService.import(req.file.buffer, branchId)
    res.json({
      message:  `تم إضافة ${result.queued} سجل إلى قائمة المعالجة`,
      queued:   result.queued,
      warnings: result.warnings,
      errors:   result.errors,
      total:    result.total,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { previewImport, processImport }
