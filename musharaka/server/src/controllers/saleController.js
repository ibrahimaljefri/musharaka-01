const { saleDistributionService } = require('../services/saleDistributionService')
const { supabase } = require('../config/supabase')
const { saleSchema } = require('../schemas/saleSchemas')

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
