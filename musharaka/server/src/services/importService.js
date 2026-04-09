const XLSX = require('xlsx')
const { z } = require('zod')
const { saleImportQueue } = require('../config/queue')
const { supabase } = require('../config/supabase')

const COLUMN_MAP = {
  'input_type':        'input_type',
  'نوع_الإدخال':      'input_type',
  'sale_date':         'sale_date',
  'التاريخ':          'sale_date',
  'month':             'month',
  'الشهر':            'month',
  'year':              'year',
  'السنة':            'year',
  'period_start_date': 'period_start_date',
  'تاريخ_البداية':   'period_start_date',
  'period_end_date':   'period_end_date',
  'تاريخ_النهاية':   'period_end_date',
  'amount':            'amount',
  'المبيعات':         'amount',
  'invoice_number':    'invoice_number',
  'رقم_الفاتورة':    'invoice_number',
  'notes':             'notes',
  'ملاحظات':          'notes',
}

const rowSchema = z.object({
  input_type:        z.enum(['daily', 'monthly', 'range'], { message: 'نوع الإدخال يجب أن يكون: daily أو monthly أو range' }),
  sale_date:         z.string().optional(),
  month:             z.coerce.number().min(1).max(12).optional(),
  year:              z.coerce.number().min(2000).max(2100).optional(),
  period_start_date: z.string().optional(),
  period_end_date:   z.string().optional(),
  amount:            z.coerce.number().positive({ message: 'المبلغ يجب أن يكون أكبر من صفر' }),
  invoice_number:    z.string().optional(),
  notes:             z.string().optional(),
})

function parseBuffer(buffer) {
  const wb    = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw   = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  // Normalize column names
  return raw.map(row => {
    const normalized = {}
    for (const [key, val] of Object.entries(row)) {
      const mapped = COLUMN_MAP[key.trim()]
      if (mapped) normalized[mapped] = typeof val === 'string' ? val.trim() : val
    }
    return normalized
  })
}

function preview(buffer) {
  const rows = parseBuffer(buffer)
  return rows.slice(0, 100)
}

async function importFile(buffer, branchId) {
  const rows     = parseBuffer(buffer)
  const errors   = []
  const warnings = []
  let queued     = 0

  // Check for existing sale_dates for this branch (duplicate detection)
  const { data: existingSales } = await supabase
    .from('sales').select('sale_date').eq('branch_id', branchId)
  const existingDates = new Set((existingSales || []).map(s => s.sale_date))

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2 // 1-indexed, row 1 is header
    const parsed = rowSchema.safeParse(rows[i])

    if (!parsed.success) {
      const msg = parsed.error.issues.map(e => e.message).join(', ')
      errors.push(`الصف ${rowNum}: ${msg}`)
      continue
    }

    const data = parsed.data

    // Duplicate date check for daily entries
    if (data.input_type === 'daily' && data.sale_date && existingDates.has(data.sale_date)) {
      warnings.push(`الصف ${rowNum}: التاريخ ${data.sale_date} موجود مسبقاً للفرع — سيتم الاستيراد مع تكرار`)
    }

    try {
      await saleImportQueue.add(
        'import-row',
        { rowData: data, branchId },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      )
      queued++
    } catch (err) {
      errors.push(`الصف ${rowNum}: فشل إضافة المهمة — ${err.message}`)
    }
  }

  return { queued, warnings, errors, total: rows.length }
}

// In test mode expose a controllable stub so integration tests
// never parse real files or touch the DB/queue.
if (process.env.NODE_ENV === 'test') {
  const stub = {
    preview:     () => [],
    import:      async () => ({ queued: 0, warnings: [], errors: [], total: 0 }),
    _setPreview: (fn) => { stub.preview = fn },
    _setImport:  (fn) => { stub.import  = fn },
    _reset:      ()   => {
      stub.preview = () => []
      stub.import  = async () => ({ queued: 0, warnings: [], errors: [], total: 0 })
    },
  }
  module.exports = { importService: stub }
} else {
  module.exports = { importService: { preview, import: importFile } }
}
