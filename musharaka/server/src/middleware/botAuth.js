/**
 * Bot webhook authentication middleware
 * - Telegram: validates X-Telegram-Bot-Api-Secret-Token header
 * - WhatsApp (Twilio): validates X-Twilio-Signature header
 */
const crypto = require('crypto')

/**
 * Telegram webhook secret token verification.
 * Set via: POST https://api.telegram.org/bot{TOKEN}/setWebhook
 *   with secret_token = process.env.TELEGRAM_WEBHOOK_SECRET
 */
function verifyTelegramSecret(req, res, next) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) return next() // secret not configured — allow in dev/mock mode

  const provided = req.headers['x-telegram-bot-api-secret-token']
  if (!provided || provided !== secret) {
    return res.status(403).json({ error: 'Invalid Telegram webhook secret' })
  }
  next()
}

/**
 * Twilio webhook signature verification.
 * Twilio signs each request with HMAC-SHA1 of the full URL + sorted POST params.
 */
function verifyTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return next() // not configured — allow in dev/mock mode

  const signature = req.headers['x-twilio-signature']
  if (!signature) return res.status(403).json({ error: 'Missing Twilio signature' })

  // Build the string Twilio signs: URL + sorted POST params concatenated
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
  const params = req.body || {}
  const sortedKeys = Object.keys(params).sort()
  const paramString = sortedKeys.reduce((acc, key) => acc + key + params[key], '')
  const expected = crypto
    .createHmac('sha1', authToken)
    .update(url + paramString)
    .digest('base64')

  if (signature !== expected) {
    return res.status(403).json({ error: 'Invalid Twilio signature' })
  }
  next()
}

module.exports = { verifyTelegramSecret, verifyTwilioSignature }
