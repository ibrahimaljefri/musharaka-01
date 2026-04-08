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
 * @returns {Promise<{success: boolean, submission?: object, error?: string}>}
 */
async function submit(branchId, month, year) {
  // 1. Fetch branch (need token)
  const { data: branch, error: branchErr } = await supabase
    .from('branches').select('id, code, name, token').eq('id', branchId).single()
  if (branchErr || !branch) return { success: false, error: 'الفرع غير موجود' }

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

  // 3. Mock mode — skip external API call
  if (seinomyCfg.mock) {
    console.log(`[SEINOMY MOCK] Would submit ${invoiceCount} invoices for branch ${branch.code} ${month}/${year}`)
  } else {
    // 4. Real API call
    let token
    try { token = branch.token ? decrypt(branch.token) : null }
    catch { return { success: false, error: 'فشل في فك تشفير توكن الفرع' } }

    if (!token) return { success: false, error: 'لم يتم تعيين توكن للفرع' }

    try {
      await axios.post(
        `${seinomyCfg.baseUrl}/invoices/submit`,
        {
          branch_code: branch.code,
          month,
          year,
          invoices: sales.map(s => ({
            date:           s.sale_date,
            amount:         s.amount,
            invoice_number: s.invoice_number,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: seinomyCfg.timeout }
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

module.exports = { seinomyApiService: { submit } }
