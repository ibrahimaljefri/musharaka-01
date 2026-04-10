/**
 * Bot webhook routes
 * POST /api/bot/telegram   — Telegram Bot API webhook
 * POST /api/bot/whatsapp   — Twilio WhatsApp webhook
 *
 * These endpoints authenticate via platform signatures (NOT Supabase JWT).
 * Rate limited to 5 messages/min per chat_id.
 */
const express = require('express')
const { handleTelegram, handleWhatsApp } = require('../controllers/botController')
const { verifyTelegramSecret, verifyTwilioSignature } = require('../middleware/botAuth')

const router = express.Router()

router.post('/telegram',  verifyTelegramSecret,  handleTelegram)
router.post('/whatsapp',  verifyTwilioSignature, handleWhatsApp)

module.exports = router
