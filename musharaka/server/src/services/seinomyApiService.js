const axios  = require('axios')
const { pool, selectOne } = require('../db/query')
const seinomyCfg   = require('../config/seinomy')
const { decrypt }  = require('../utils/crypto')

/**
 * Submit pending invoices for a branch/month/year to the Seinomy platform.
 * Uses the submit_to_seinomy() Postgres function for atomic DB update.
 */
async function submit(branchId, month, year, tenantId) {
  // 1. Fetch branch and tenant in parallel
  const [branch, tenant] = await Promise.all([
    selectOne('branches', { id: branchId }),
    selectOne('tenants',  { id: tenantId }),
  ])
  if (!branch) return { success: false, error: 'الفرع غير موجود' }
  if (!tenant) return { success: false, error: 'المستأجر غير موجود' }

  // 2. Fetch pending sales for this period
  const mm      = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const periodStart = `${year}-${mm}-01`
  const periodEnd   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

  const { rows: sales } = await pool.query(
    `SELECT * FROM sales
     WHERE branch_id = $1 AND status = 'pending'
       AND sale_date >= $2 AND sale_date <= $3`,
    [branchId, periodStart, periodEnd]
  )

  if (!sales || sales.length === 0) return { success: false, error: 'لا توجد فواتير معلقة لهذه الفترة' }

  const totalAmount  = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0)
  const invoiceCount = sales.length

  if (!branch.contract_number) return { success: false, error: 'لم يتم تعيين رقم العقد للفرع' }

  // Cenomi API payload: array with one entry per lease/period
  const payload = [{
    lease_id:           branch.contract_number,   // Cenomi spec key (was: lease_code)
    sales_period_start: periodStart,
    sales_period_end:   periodEnd,
    sales_amt:          totalAmount,
  }]

  // 3. Mock mode — skip external API call
  if (seinomyCfg.mock) {
    console.log(`[SEINOMY MOCK] Would POST to ${seinomyCfg.baseUrl}/sales-data`)
    console.log('[SEINOMY MOCK] Payload:', JSON.stringify(payload))
  } else {
    // 4. Real API call — Cenomi Direct Share spec (v1.2)
    let token
    try { token = tenant.cenomi_api_token ? decrypt(tenant.cenomi_api_token) : null }
    catch { return { success: false, error: 'فشل في فك تشفير توكن سينومي للمستأجر' } }

    if (!token) return { success: false, error: 'لم يتم تعيين توكن سينومي للمستأجر' }

    try {
      await axios.post(
        `${seinomyCfg.baseUrl}/sales-data`,
        payload,
        {
          headers: {
            'x-api-token': token,
            'Content-Type': 'application/json',
          },
          timeout: seinomyCfg.timeout,
        }
      )
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'فشل الاتصال بسينومي'
      return { success: false, error: `فشل إرسال الفواتير: ${msg}` }
    }
  }

  // 5. Atomic DB update via Postgres function
  try {
    const { rows } = await pool.query(
      `SELECT submit_to_seinomy($1::uuid, $2::smallint, $3::smallint, $4::int, $5::numeric) AS result`,
      [branchId, month, year, invoiceCount, totalAmount]
    )
    const rpcResult = rows[0]?.result
    if (rpcResult && !rpcResult.success) return { success: false, error: rpcResult.error }

    return {
      success: true,
      submission: {
        id:            rpcResult?.submission_id,
        branch_id:     branchId,
        month,
        year,
        invoice_count: invoiceCount,
        total_amount:  totalAmount,
      },
    }
  } catch (rpcErr) {
    return { success: false, error: `فشل تحديث قاعدة البيانات: ${rpcErr.message}` }
  }
}

// In test mode expose a controllable stub
if (process.env.NODE_ENV === 'test') {
  const stub = {
    submit:     async () => ({ success: false, error: 'test-not-configured' }),
    _setSubmit: (fn)  => { stub.submit = fn },
    _reset:     ()    => { stub.submit = async () => ({ success: false, error: 'test-not-configured' }) },
  }
  module.exports = { seinomyApiService: stub }
} else {
  module.exports = { seinomyApiService: { submit } }
}
