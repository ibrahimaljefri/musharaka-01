/**
 * Cenomi (Seinomy) submission service — aligned to Cenomi UAT v1 spec.
 *
 * Wire format (confirmed by Cenomi 2026-04-30):
 *   POST  <tenant.cenomi_api_url>           ← per-tenant endpoint
 *   x-api-key: <decrypted token>            ← NOT x-api-token
 *   Body: JSON array, one entry per period:
 *     [{ "lease_code", "sales_period_start", "sales_period_end", "sales_amt" }]
 *
 * Mode (per-tenant, tenants.cenomi_post_mode):
 *   - monthly  → single entry covering the full calendar month
 *   - daily    → array, one entry per sale day (period_start === period_end)
 *
 * Every attempt — success OR failure — writes a row to cenomi_logs with the
 * x-api-key value redacted to "***". Used by /admin/cenomi-logs.
 */
const axios = require('axios')
const { pool, selectOne } = require('../db/query')
const seinomyCfg  = require('../config/seinomy')
const { decrypt } = require('../utils/crypto')

const REDACTED = '***'

/**
 * Build the Cenomi request body. In daily mode each sale-day with non-zero
 * sales becomes its own row. In monthly mode it's one aggregated row.
 */
function buildPayload({ leaseCode, mode, periodStart, periodEnd, sales }) {
  if (mode === 'daily') {
    // Group sales by sale_date, sum amount per day
    const byDay = new Map()
    for (const s of sales) {
      const day = s.sale_date instanceof Date
        ? s.sale_date.toISOString().split('T')[0]
        : String(s.sale_date).split('T')[0]
      byDay.set(day, (byDay.get(day) || 0) + parseFloat(s.amount || 0))
    }
    return [...byDay.entries()]
      .filter(([, amt]) => amt > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amt]) => ({
        lease_code:         leaseCode,
        sales_period_start: day,
        sales_period_end:   day,
        sales_amt:          Number(amt.toFixed(2)),
      }))
  }
  // Monthly — single aggregated row
  const total = sales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
  return [{
    lease_code:         leaseCode,
    sales_period_start: periodStart,
    sales_period_end:   periodEnd,
    sales_amt:          Number(total.toFixed(2)),
  }]
}

/** Append-only audit log. Always writes — success and failure. */
async function writeAuditLog({
  tenantId, branchId, submissionId,
  url, headers, body,
  responseStatus, responseBody, errorMessage,
}) {
  const safeHeaders = { ...headers }
  if ('x-api-key'   in safeHeaders) safeHeaders['x-api-key']   = REDACTED
  if ('x-api-token' in safeHeaders) safeHeaders['x-api-token'] = REDACTED   // legacy guard
  try {
    await pool.query(
      `INSERT INTO cenomi_logs
         (tenant_id, branch_id, submission_id, request_url, request_headers,
          request_body, response_status, response_body, error_message)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9)`,
      [
        tenantId, branchId, submissionId,
        url,
        JSON.stringify(safeHeaders),
        JSON.stringify(body),
        responseStatus,
        responseBody == null ? null : JSON.stringify(responseBody),
        errorMessage,
      ]
    )
  } catch (logErr) {
    // Never let audit logging break the user flow — surface in server logs only
    console.error('[cenomi audit] failed to write log:', logErr.message)
  }
}

/**
 * Submit pending sales for a branch over a date range to Cenomi.
 *
 * @param {object} args
 * @param {string} args.branchId
 * @param {string} args.tenantId
 * @param {string} args.periodStart  YYYY-MM-DD inclusive
 * @param {string} args.periodEnd    YYYY-MM-DD inclusive
 * @param {string} args.mode         'daily' | 'monthly' — overrides tenant default if provided
 * @returns {Promise<{success: boolean, submission?: object, error?: string, cenomiStatus?: number}>}
 */
async function submit({ branchId, tenantId, periodStart, periodEnd, mode }) {
  // 1. Load branch + tenant
  const [branch, tenant] = await Promise.all([
    selectOne('branches', { id: branchId }),
    selectOne('tenants',  { id: tenantId }),
  ])
  if (!branch) return { success: false, error: 'الفرع غير موجود' }
  if (!tenant) return { success: false, error: 'المستأجر غير موجود' }
  if (!branch.contract_number) return { success: false, error: 'لم يتم تعيين رقم العقد للفرع' }

  const effectiveMode = mode || tenant.cenomi_post_mode || 'monthly'
  // Per-tenant URL, fall back to global env (back-compat for tenants not yet configured)
  const apiUrl = tenant.cenomi_api_url || seinomyCfg.baseUrl
  if (!apiUrl) return { success: false, error: 'لم يتم تعيين رابط Cenomi API للمستأجر' }

  // 2. Fetch pending sales in the period
  const { rows: sales } = await pool.query(
    `SELECT * FROM sales
     WHERE branch_id = $1 AND status = 'pending'
       AND sale_date >= $2 AND sale_date <= $3`,
    [branchId, periodStart, periodEnd]
  )
  if (!sales.length) return { success: false, error: 'لا توجد فواتير معلقة لهذه الفترة' }

  const payload = buildPayload({
    leaseCode: branch.contract_number,
    mode:      effectiveMode,
    periodStart, periodEnd,
    sales,
  })
  if (!payload.length) return { success: false, error: 'لا توجد مبالغ مستحقة في الفترة المحددة' }

  const totalAmount  = payload.reduce((s, p) => s + p.sales_amt, 0)
  const invoiceCount = sales.length

  // 3. Decrypt token (or fall through to mock mode)
  let token = null
  if (!seinomyCfg.mock) {
    try { token = tenant.cenomi_api_token ? decrypt(tenant.cenomi_api_token) : null }
    catch { return { success: false, error: 'فشل في فك تشفير توكن سينومي للمستأجر' } }
    if (!token) return { success: false, error: 'لم يتم تعيين توكن سينومي للمستأجر' }
  }

  const headers = {
    'x-api-key':    token || 'MOCK',
    'Content-Type': 'application/json',
  }

  // 4. POST (or mock)
  let cenomiStatus = null
  let cenomiBody   = null
  let errorMessage = null
  if (seinomyCfg.mock) {
    console.log(`[SEINOMY MOCK] Would POST ${apiUrl}`, JSON.stringify(payload))
    cenomiStatus = 200
    cenomiBody   = { mock: true }
  } else {
    try {
      const resp = await axios.post(apiUrl, payload, {
        headers,
        timeout: seinomyCfg.timeout,
        validateStatus: () => true,    // don't throw on 4xx/5xx — handle below
      })
      cenomiStatus = resp.status
      cenomiBody   = resp.data
      if (resp.status < 200 || resp.status >= 300) {
        const msg = resp.data?.message || `HTTP ${resp.status}`
        errorMessage = msg
        await writeAuditLog({
          tenantId, branchId, submissionId: null,
          url: apiUrl, headers, body: payload,
          responseStatus: cenomiStatus, responseBody: cenomiBody,
          errorMessage: msg,
        })
        return { success: false, error: `فشل إرسال الفواتير: ${msg}`, cenomiStatus }
      }
    } catch (err) {
      errorMessage = err.message || 'فشل الاتصال بسينومي'
      await writeAuditLog({
        tenantId, branchId, submissionId: null,
        url: apiUrl, headers, body: payload,
        responseStatus: null, responseBody: null,
        errorMessage,
      })
      return { success: false, error: `فشل إرسال الفواتير: ${errorMessage}`, cenomiStatus: null }
    }
  }

  // 5. Atomic DB update via v2 RPC (handles both daily and monthly)
  let submissionId = null
  try {
    const { rows } = await pool.query(
      `SELECT submit_to_seinomy_v2(
         $1::uuid, $2::date, $3::date, $4::text, $5::int, $6::numeric
       ) AS result`,
      [branchId, periodStart, periodEnd, effectiveMode, invoiceCount, totalAmount]
    )
    const rpcResult = rows[0]?.result
    if (rpcResult && !rpcResult.success) {
      // Log the success-from-Cenomi-but-DB-rejected case so we can investigate
      await writeAuditLog({
        tenantId, branchId, submissionId: null,
        url: apiUrl, headers, body: payload,
        responseStatus: cenomiStatus, responseBody: cenomiBody,
        errorMessage: `Cenomi accepted but DB rejected: ${rpcResult.error}`,
      })
      return { success: false, error: rpcResult.error, cenomiStatus }
    }
    submissionId = rpcResult?.submission_id
  } catch (rpcErr) {
    await writeAuditLog({
      tenantId, branchId, submissionId: null,
      url: apiUrl, headers, body: payload,
      responseStatus: cenomiStatus, responseBody: cenomiBody,
      errorMessage: `RPC failed: ${rpcErr.message}`,
    })
    return { success: false, error: `فشل تحديث قاعدة البيانات: ${rpcErr.message}`, cenomiStatus }
  }

  // 6. Audit log on success — link to the new submission row
  await writeAuditLog({
    tenantId, branchId, submissionId,
    url: apiUrl, headers, body: payload,
    responseStatus: cenomiStatus, responseBody: cenomiBody,
    errorMessage: null,
  })

  return {
    success: true,
    cenomiStatus,
    submission: {
      id:            submissionId,
      branch_id:     branchId,
      period_start:  periodStart,
      period_end:    periodEnd,
      post_mode:     effectiveMode,
      invoice_count: invoiceCount,
      total_amount:  totalAmount,
    },
  }
}

// In test mode expose a controllable stub
if (process.env.NODE_ENV === 'test') {
  const stub = {
    submit:     async () => ({ success: false, error: 'test-not-configured' }),
    _setSubmit: (fn)  => { stub.submit = fn },
    _reset:     ()    => { stub.submit = async () => ({ success: false, error: 'test-not-configured' }) },
  }
  module.exports = { seinomyApiService: stub, _internals: { buildPayload } }
} else {
  module.exports = { seinomyApiService: { submit }, _internals: { buildPayload } }
}
