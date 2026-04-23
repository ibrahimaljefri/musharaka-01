const { seinomyApiService } = require('../services/seinomyApiService')

async function submitInvoices(req, res, next) {
  try {
    const { branch_id, month, year } = req.body

    if (!branch_id) return res.status(422).json({ error: 'يرجى اختيار الفرع' })
    if (!month)     return res.status(422).json({ error: 'يرجى اختيار الشهر' })
    if (!year)      return res.status(422).json({ error: 'يرجى اختيار السنة' })

    const result = await seinomyApiService.submit(
      branch_id,
      parseInt(month),
      parseInt(year),
      req.tenantId,
    )

    if (!result.success) {
      // Diagnostic: surface why the Seinomy submission was rejected so we can
      // distinguish token/contract/Cenomi/RPC failures from Render logs.
      console.warn('[submit] rejected', {
        user:     req.user?.id,
        tenant:   req.tenantId,
        branch:   branch_id,
        period:   `${year}-${String(month).padStart(2, '0')}`,
        reason:   result.error,
      })
      return res.status(400).json({ error: result.error })
    }

    res.json({
      message:    'تم إرسال الفواتير إلى سينومي بنجاح',
      submission: result.submission,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { submitInvoices }
