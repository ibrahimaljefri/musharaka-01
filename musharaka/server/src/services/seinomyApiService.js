const axios  = require('axios')
const { supabase } = require('../config/supabase')
const seinomyCfg   = require('../config/seinomy')
const { decrypt }  = require('../utils/crypto')

/**
 * Submit pending invoices for a branch/month/year to the Seinomy platform.
 * Uses the submit_to_seinomy() Supabase RPC for atomic DB update.
 *
 * @param {string} branchId
 * @param {number} month - 1-12
 * @param {number} year
 * @param {string} tenantId - needed to fetch the tenant-level Cenomi API token
 * @returns {Promise<{success: boolean, submission?: object, error?: string}>}
 */
async function submit(branchId, month, year, tenantId) {
  // 1. Fetch branch and tenant in parallel
  const [{ data: branch, error: branchErr }, { data: tenant, error: tenantErr }] = await Promise.all([
    supabase.from('branches').select('id, code, name, contract_number').eq('id', branchId).single(),
    supabase.from('tenants').select('cenomi_api_token').eq('id', tenantId).single(),
  ])
  if (branchErr || !branch) return { success: false, error: 'الفرع غير موجود' }
  if (tenantErr || !tenant) return { success: false, error: 'المستأجر غير موجود' }

  // 2. Fetch pending sales for this period
  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'pending')
    .gte('sale_date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lte('sale_date', `${year}-${String(month).padStart(2, '0')}-31`)

  if (salesErr) return { success: false, error: 'فشل في جلب الفواتير' }
  if (!sales || sales.length === 0) return { success: false, error: 'لا توجد فواتير معلقة لهذه الفترة' }

  const totalAmount  = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0)
  const invoiceCount = sales.length

  if (!branch.contract_number) return { success: false, error: 'لم يتم تعيين رقم العقد للفرع' }

  // Build the period date range (YYYY-MM-DD) from month/year
  const mm         = String(month).padStart(2, '0')
  const lastDay    = new Date(year, month, 0).getDate()   // last day of month
  const periodStart = `${year}-${mm}-01`
  const periodEnd   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

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
    // Token lives at the tenant level; one token per Cenomi customer account.
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

  // 5. Atomic DB update via RPC
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('submit_to_seinomy', {
    p_branch_id:     branchId,
    p_month:         month,
    p_year:          year,
    p_invoice_count: invoiceCount,
    p_total_amount:  totalAmount,
  })

  if (rpcErr) return { success: false, error: `فشل تحديث قاعدة البيانات: ${rpcErr.message}` }
  if (rpcResult && !rpcResult.success) return { success: false, error: rpcResult.error }

  return {
    success: true,
    submission: {
      id:            rpcResult.submission_id,
      branch_id:     branchId,
      month,
      year,
      invoice_count: invoiceCount,
      total_amount:  totalAmount,
    },
  }
}

// In test mode expose a controllable stub so integration tests
// never make real network or DB calls.
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
