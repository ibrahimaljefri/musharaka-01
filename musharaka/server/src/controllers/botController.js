/**
 * botController — handles Telegram and WhatsApp webhook payloads
 */
const { processMessage } = require('../services/botService')

// Per-chat rate limiting: max 5 messages/min
const ratemap = new Map()
function isRateLimited(chatId) {
  const now   = Date.now()
  const entry = ratemap.get(chatId) || { count: 0, reset: now + 60_000 }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60_000 }
  entry.count++
  ratemap.set(chatId, entry)
  return entry.count > 5
}

/**
 * POST /api/bot/telegram
 * Telegram sends JSON: { message: { chat: { id }, text } }
 */
async function handleTelegram(req, res) {
  res.sendStatus(200) // ACK immediately — Telegram won't retry if we respond fast

  const msg = req.body?.message
  if (!msg?.text || !msg?.chat?.id) return

  const chatId = String(msg.chat.id)
  const text   = msg.text.trim()
  if (isRateLimited(chatId)) return

  const reply = await processMessage('telegram', chatId, text).catch(() =>
    'حدث خطأ داخلي. يرجى المحاولة لاحقاً.'
  )

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text: reply }),
  }).catch(err => console.error('[bot/telegram] send error:', err))
}

/**
 * POST /api/bot/whatsapp
 * Twilio sends form-encoded: { From: 'whatsapp:+966...', Body: '...' }
 */
async function handleWhatsApp(req, res) {
  const from = (req.body?.From || '').replace('whatsapp:', '')
  const text = (req.body?.Body || '').trim()

  if (!from || !text || isRateLimited(from)) {
    return res.type('text/xml').send('<Response></Response>')
  }

  const reply = await processMessage('whatsapp', from, text).catch(() =>
    'حدث خطأ داخلي. يرجى المحاولة لاحقاً.'
  )

  res.type('text/xml').send(`<Response><Message>${reply}</Message></Response>`)
}

module.exports = { handleTelegram, handleWhatsApp }
