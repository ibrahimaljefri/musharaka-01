const { saleDistributionService } = require('../services/saleDistributionService')
const { supabase } = require('../config/supabase')
const { saleSchema } = require('../schemas/saleSchemas')

/**
 * Validate that the sale dates fall within the tenant's license window
 * and are not in the future.
 *
 * @param {object} req  - Express request (needs tenantActivatedAt, tenantExpiresAt)
 * @param {object} data - Parsed Zod data from saleSchema
 * @returns {string|null}  Arabic error message, or null if valid
 */
function validateLicenseDates(req, data) {
  const today      = new Date(); today.setHours(0, 0, 0, 0)
  const activatedAt = req.tenantActivatedAt ? new Date(req.tenantActivatedAt) : null
  const expiresAt   = req.tenantExpiresAt   ? new Date(req.tenantExpiresAt)   : null

  // Helper: check a single date (string 'YYYY-MM-DD') against the license window
  function checkDate(dateStr) {
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
    if (d > today)
      return 'لا يمكن إدخال مبيعات لتاريخ مستقبلي.'
    if (activatedAt && d < activatedAt)
      return 'التاريخ المحدد قبل تاريخ بداية الترخيص.'
    if (expiresAt && d > expiresAt)
      return 'التاريخ المحدد بعد تاريخ انتهاء الترخيص.'
    return null
  }

  if (data.input_type === 'daily') {
    if (!data.sale_date) return null // schema-level miss, let Zod handle
    return checkDate(data.sale_date)
  }

  if (data.input_type === 'monthly') {
    const now = new Date()
    const currentYear  = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-based

    // Block future month/year
    if (data.year > currentYear || (data.year === currentYear && data.month > currentMonth))
      return 'لا يمكن إدخال مبيعات لشهر مستقبلي. الحد الأقصى المسموح هو الشهر الحالي.'

    // Check against license window using the first day of the selected month
    const firstOfMonth = new Date(data.year, data.month - 1, 1)
    firstOfMonth.setHours(0, 0, 0, 0)
    if (activatedAt) {
      const firstOfActivated = new Date(activatedAt.getFullYear(), activatedAt.getMonth(), 1)
      if (firstOfMonth < firstOfActivated)
        return 'التاريخ المحدد قبل تاريخ بداية الترخيص.'
    }
    if (expiresAt) {
      const firstOfExpiry = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), 1)
      if (firstOfMonth > firstOfExpiry)
        return 'التاريخ المحدد بعد تاريخ انتهاء الترخيص.'
    }
    return null
  }

  if (data.input_type === 'range') {
    if (!data.period_start_date || !data.period_end_date) return null
    // End date must not exceed the last day of the current month
    const now = new Date()
    const lastOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    lastOfCurrentMonth.setHours(0, 0, 0, 0)
    const endDate = new Date(data.period_end_date); endDate.setHours(0, 0, 0, 0)
    if (endDate > lastOfCurrentMonth)
      return 'لا يمكن إدخال مبيعات لشهر مستقبلي. الحد الأقصى المسموح هو الشهر الحالي.'
    return checkDate(data.period_start_date) || checkDate(data.period_end_date)
  }

  return null
}

async function createSale(req, res, next) {
  try {
    const parsed = saleSchema.safeParse({
      ...req.body,
      amount: parseFloat(req.body.amount),
      month:  req.body.month  ? parseInt(req.body.month)  : undefined,
      year:   req.body.year   ? parseInt(req.body.year)   : undefined,
    })
    if (!parsed.success) {
      const msg = parsed.error.issues.map(e => e.message).join(', ')
      return res.status(422).json({ error: msg })
    }

    // Validate the input_type is allowed for this tenant
    const allowedTypes = req.allowedInputTypes || ['daily']
    if (!allowedTypes.includes(parsed.data.input_type)) {
      return res.status(403).json({
        error: `نوع الإدخال "${parsed.data.input_type}" غير مصرح به لهذا الحساب`,
      })
    }

    // Validate dates against license window (server-side — cannot be bypassed)
    const dateError = validateLicenseDates(req, parsed.data)
    if (dateError) {
      return res.status(422).json({ error: dateError })
    }

    const rows = saleDistributionService.expand(parsed.data)

    // Inject tenant_id on every row (server uses service-role, bypasses RLS)
    const tenantId = req.tenantId
    const rowsWithTenant = tenantId
      ? rows.map(r => ({ ...r, tenant_id: tenantId }))
      : rows  // super-admin edge case (should not normally create sales)

    const { error } = await supabase.from('sales').insert(rowsWithTenant)
    if (error) return res.status(400).json({ error: error.message })

    res.status(201).json({
      message: `تم إضافة ${rows.length} سجل مبيعات بنجاح`,
      count:   rows.length,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { createSale }
