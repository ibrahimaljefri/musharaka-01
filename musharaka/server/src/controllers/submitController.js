const { seinomyApiService } = require('../services/seinomyApiService')

/**
 * Translate a body into a Cenomi submit call.
 *
 * Two body shapes are accepted:
 *
 *   Monthly (back-compat):
 *     { branch_id, month, year }
 *
 *   Daily / range (new):
 *     { branch_id, period_start, period_end }
 *
 * The mode actually used is taken from tenant.cenomi_post_mode unless the
 * client explicitly overrides via { mode: 'daily' | 'monthly' }.
 */
async function submitInvoices(req, res, next) {
  try {
    const { branch_id, month, year, period_start, period_end, mode } = req.body

    if (!branch_id) return res.status(422).json({ error: 'يرجى اختيار الفرع' })

    let periodStart = null
    let periodEnd   = null

    if (period_start && period_end) {
      periodStart = period_start
      periodEnd   = period_end
    } else if (month && year) {
      const m = parseInt(month, 10)
      const y = parseInt(year, 10)
      const lastDay = new Date(y, m, 0).getDate()
      const mm = String(m).padStart(2, '0')
      periodStart = `${y}-${mm}-01`
      periodEnd   = `${y}-${mm}-${String(lastDay).padStart(2, '0')}`
    } else {
      return res.status(422).json({ error: 'يرجى تحديد الفترة (الشهر/السنة أو نطاق التواريخ)' })
    }

    if (periodStart > periodEnd) {
      return res.status(422).json({ error: 'تاريخ بداية الفترة يجب أن يسبق تاريخ النهاية' })
    }

    const result = await seinomyApiService.submit({
      branchId:    branch_id,
      tenantId:    req.tenantId,
      periodStart, periodEnd,
      mode:        mode || req.tenantCenomiMode || 'monthly',
    })

    if (!result.success) {
      console.warn('[submit] rejected', {
        user:   req.user?.id,
        tenant: req.tenantId,
        branch: branch_id,
        period: `${periodStart}..${periodEnd}`,
        reason: result.error,
        cenomiStatus: result.cenomiStatus ?? null,
      })
      return res.status(400).json({ error: result.error, cenomi_status: result.cenomiStatus ?? null })
    }

    const invoiceCount = result.submission?.invoice_count || 0
    const totalAmount  = Number(result.submission?.total_amount || 0)
    const totalFmt     = totalAmount.toLocaleString('ar-SA', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    })
    res.json({
      message:       `✅ تم تسليم ${invoiceCount} فاتورة إلى المركز التجاري بنجاح بإجمالي ${totalFmt} ر.س`,
      submission:    result.submission,
      cenomi_status: result.cenomiStatus,           // tenant proof-of-delivery
      cenomi_confirmation: result.cenomiConfirmation, // e.g. "Success"
      cenomi_at:     new Date().toISOString(),
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { submitInvoices }
