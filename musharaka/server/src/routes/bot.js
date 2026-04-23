/**
 * Bot webhook routes
 * POST /api/bot/telegram   — Telegram Bot API webhook
 * POST /api/bot/whatsapp   — Twilio WhatsApp webhook (feature-flagged off)
 *
 * These endpoints authenticate via platform signatures (NOT Supabase JWT).
 * Rate limited to 5 messages/min per chat_id.
 *
 * WhatsApp is disabled by default. Set ENABLE_WHATSAPP_BOT=true in the server
 * env to restore it — the route, controller, and auth middleware are all
 * preserved exactly so re-enabling is a single env-var flip.
 */
const express = require('express')
const { handleTelegram, handleWhatsApp } = require('../controllers/botController')
const { verifyTelegramSecret, verifyTwilioSignature } = require('../middleware/botAuth')

const router = express.Router()

router.post('/telegram',  verifyTelegramSecret,  handleTelegram)

if (process.env.ENABLE_WHATSAPP_BOT === 'true') {
  router.post('/whatsapp',  verifyTwilioSignature, handleWhatsApp)
} else {
  router.post('/whatsapp', (_req, res) =>
    res.status(503).json({ error: 'WhatsApp bot is not enabled on this deployment' })
  )
}

module.exports = router
