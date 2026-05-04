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
 * Translate a Cenomi error response into a friendly Arabic message that
 * tells the tenant what to fix. Cenomi returns either:
 *   { errors: [{ code, message }], success: false }
 * or, less often, { message } / { error } / a plain string.
 *
 * Returns the Arabic string to display in the toast / banner.
 */
function buildFriendlyCenomiError(status, body) {
  // Walk the response shape to find the raw English message Cenomi sent
  let raw = ''
  if (typeof body === 'string') {
    raw = body
  } else if (body && typeof body === 'object') {
    if (Array.isArray(body.errors) && body.errors[0]) {
      raw = body.errors[0].message || body.errors[0].error || ''
    }
    if (!raw) raw = body.message || body.error || ''
  }
  raw = String(raw || '').trim()
  const lower = raw.toLowerCase()

  // Known patterns → actionable Arabic guidance with proposed fix
  if (lower.includes('lease not found') || lower.includes('contract not found') ||
      lower.includes('invalid lease')   || lower.includes('invalid contract')) {
    return 'رقم العقد غير مسجل صحيح. الحل المقترح: تأكد من صحة رقم العقد.'
  }
  if (status === 401 || lower.includes('unauthorized') || lower.includes('invalid token') || lower.includes('invalid api key')) {
    return 'فشل التحقق. الحل المقترح: تواصل مع الإدارة للتحقق من توكن واجهة API الخاص بحسابك.'
  }
  if (status === 403 || lower.includes('forbidden')) {
    return 'لا تملك صلاحية الإرسال لهذه الفترة أو الفرع. الحل المقترح: تواصل مع المركز التجاري للتأكد من صلاحيات حسابك.'
  }
  if (status === 404) {
    return 'لم يتم العثور على المسار المطلوب. الحل المقترح: تواصل مع الإدارة للتحقق من رابط API.'
  }
  if (status === 422 || lower.includes('validation')) {
    // Translate well-known validation messages; otherwise echo the raw text
    if (lower.includes('amount') && (lower.includes('positive') || lower.includes('greater'))) {
      return 'بيانات غير صحيحة: لابد من ايكون المبلغ موجبا'
    }
    if (lower.includes('amount') && lower.includes('negative')) {
      return 'بيانات غير صحيحة: لابد من ايكون المبلغ موجبا'
    }
    return raw
      ? `بيانات غير صحيحة: ${raw}`
      : 'بيانات غير صحيحة. الحل المقترح: راجع المبالغ والتواريخ ثم أعد المحاولة.'
  }
  if (status >= 500) {
    return 'خلل مؤقت في الخادم. الحل المقترح: حاول الإرسال مجدداً بعد بضع دقائق.'
  }
  if (status === 400) {
    return 'رفض الإرسال: الحل المقترح: راجع بيانات الفرع (رقم العقد) والمبالغ ثم أعد المحاولة.'
  }
  // Fallback — show what Cenomi said + generic hint
  return raw
    ? `فشل الإرسال: ${raw}`
    : `فشل الإرسال (HTTP ${status}).`
}

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
      // HTTP non-2xx → friendly error
      if (resp.status < 200 || resp.status >= 300) {
        const friendly = buildFriendlyCenomiError(resp.status, resp.data)
        errorMessage = friendly
        await writeAuditLog({
          tenantId, branchId, submissionId: null,
          url: apiUrl, headers, body: payload,
          responseStatus: cenomiStatus, responseBody: cenomiBody,
          errorMessage: friendly,
        })
        return { success: false, error: friendly, cenomiStatus }
      }
      // HTTP 2xx but Cenomi flagged the request as failed at the app layer
      // (e.g. { success: false, errors: [...] } returned with status 200)
      if (resp.data && typeof resp.data === 'object' && resp.data.success === false) {
        const friendly = buildFriendlyCenomiError(resp.status, resp.data)
        errorMessage = friendly
        await writeAuditLog({
          tenantId, branchId, submissionId: null,
          url: apiUrl, headers, body: payload,
          responseStatus: cenomiStatus, responseBody: cenomiBody,
          errorMessage: `Cenomi returned 2xx with success=false: ${friendly}`,
        })
        return { success: false, error: friendly, cenomiStatus }
      }
    } catch (err) {
      // Network / timeout / DNS failure — never reached the Cenomi server.
      const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')
      const friendly = isTimeout
        ? 'انتهت مهلة الاتصال بالخادم. الحل المقترح: تحقق من اتصال الإنترنت ثم أعد المحاولة.'
        : 'تعذّر الاتصال بالخادم. الحل المقترح: تأكد من صحة رابط API ثم أعد المحاولة.'
      errorMessage = `${friendly} (${err.message || 'unknown'})`
      await writeAuditLog({
        tenantId, branchId, submissionId: null,
        url: apiUrl, headers, body: payload,
        responseStatus: null, responseBody: null,
        errorMessage,
      })
      return { success: false, error: friendly, cenomiStatus: null }
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

  // Capture Cenomi's confirmation payload (e.g. { data: 'Success', success: true })
  // so the UI can show that the merchant-side actually accepted the data.
  const cenomiConfirmation = (cenomiBody && typeof cenomiBody === 'object')
    ? (cenomiBody.data || cenomiBody.message || null)
    : null

  return {
    success: true,
    cenomiStatus,
    cenomiConfirmation,
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
  module.exports = { seinomyApiService: stub, _internals: { buildPayload, buildFriendlyCenomiError } }
} else {
  module.exports = { seinomyApiService: { submit }, _internals: { buildPayload, buildFriendlyCenomiError } }
}
