const { getDaysInRange } = require('../utils/dateUtils')

/**
 * Expand a sale entry into sale row(s) ready for DB insert.
 * - daily:   one row for the given date
 * - monthly: one row for the whole month (sale_date = first of month)
 * - range:   one row per calendar day in the range, amount split evenly
 *
 * @param {Object} data - Validated sale data from request body
 * @param {string} data.branch_id
 * @param {string} data.input_type - 'daily' | 'monthly' | 'range'
 * @param {number} data.amount - Total amount in SAR (decimal)
 * @param {string} [data.sale_date] - YYYY-MM-DD for daily
 * @param {number} [data.month] - 1-12 for monthly
 * @param {number} [data.year] - e.g. 2026 for monthly
 * @param {string} [data.period_start_date] - YYYY-MM-DD for range
 * @param {string} [data.period_end_date] - YYYY-MM-DD for range
 * @param {string} [data.invoice_number]
 * @param {string} [data.notes]
 * @returns {Array<Object>} Array of sale row objects ready for Supabase insert
 */
function expand(data) {
  const {
    branch_id, input_type, amount,
    sale_date, month, year,
    period_start_date, period_end_date,
    invoice_number, notes,
  } = data

  let days = []

  if (input_type === 'daily') {
    if (!sale_date) throw new Error('sale_date مطلوب للإدخال اليومي')
    days = [sale_date]
  } else if (input_type === 'monthly') {
    if (!month || !year) throw new Error('الشهر والسنة مطلوبان للإدخال الشهري')
    // Monthly mode: one single row for the whole month (sale_date = first of month)
    const mm   = String(month).padStart(2, '0')
    const singleDate = `${year}-${mm}-01`
    return [{
      branch_id,
      input_type,
      sale_date:         singleDate,
      month,
      year,
      period_start_date: null,
      period_end_date:   null,
      amount,
      invoice_number:    invoice_number || null,
      notes:             notes || null,
      status:            'pending',
    }]
  } else if (input_type === 'range') {
    if (!period_start_date || !period_end_date) throw new Error('تاريخ البداية والنهاية مطلوبان للفترة المخصصة')
    if (period_start_date > period_end_date) throw new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية')
    days = getDaysInRange(period_start_date, period_end_date)
  } else {
    throw new Error('نوع الإدخال غير صالح')
  }

  if (days.length === 0) throw new Error('لا توجد أيام في الفترة المحددة')

  // Integer arithmetic in fils (1/100 of SAR) to avoid floating point
  const totalFils = Math.round(amount * 100)
  const baseFils  = Math.floor(totalFils / days.length)
  const remainder = totalFils - baseFils * days.length

  return days.map((date, idx) => {
    // Distribute remainder to the first N days
    const fils      = baseFils + (idx < remainder ? 1 : 0)
    const dayAmount = fils / 100

    return {
      branch_id,
      input_type,
      sale_date:         date,
      month:             month || parseInt(date.split('-')[1]),
      year:              year  || parseInt(date.split('-')[0]),
      period_start_date: input_type === 'range' ? period_start_date : null,
      period_end_date:   input_type === 'range' ? period_end_date   : null,
      amount:            dayAmount,
      invoice_number:    invoice_number || null,
      notes:             notes || null,
      status:            'pending',
    }
  })
}

module.exports = { saleDistributionService: { expand } }
