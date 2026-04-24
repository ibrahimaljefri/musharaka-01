/**
 * Global Express error handler.
 *
 * Catches common classes of bad-input errors (malformed UUIDs, invalid dates,
 * etc.) and returns 400 instead of 500 so clients can distinguish user error
 * from a real server fault.
 */

// Patterns that indicate the CALLER sent bad input (not a server fault).
const BAD_INPUT_PATTERNS = [
  /invalid input syntax for type uuid/i,
  /invalid input syntax for type (integer|numeric|date|timestamp|boolean)/i,
  /invalid input value for enum/i,
  /date\/time field value out of range/i,
  /malformed array literal/i,
]

function isBadInputError(err) {
  const msg = String(err?.message || '')
  // pg error codes for invalid input
  if (err?.code === '22P02') return true   // invalid_text_representation
  if (err?.code === '22008') return true   // datetime_field_overflow
  if (err?.code === '22023') return true   // invalid_parameter_value
  if (err?.code === '23503') return true   // foreign_key_violation
  if (err?.code === '23514') return true   // check_violation
  if (err?.code === '23502') return true   // not_null_violation
  return BAD_INPUT_PATTERNS.some(rx => rx.test(msg))
}

function errorHandler(err, req, res, _next) {
  if (isBadInputError(err)) {
    if (!res.headersSent) res.status(400).json({ error: 'مدخلات غير صالحة' })
    return
  }

  // Known Arabic error messages from route handlers — preserve status
  if (err?.status) {
    if (!res.headersSent) res.status(err.status).json({ error: err.message || 'حدث خطأ' })
    return
  }

  // Everything else: 500
  console.error('[errorHandler]', err?.stack || err?.message || err)
  if (!res.headersSent) res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' })
}

module.exports = { errorHandler }
