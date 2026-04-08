/**
 * saleNlpService — Arabic natural language → structured sale data
 * Uses Claude claude-haiku-4-5 for fast, cheap parsing.
 *
 * Input:  Arabic message e.g. "مبيعات اليوم 4500" or "مبيعات شهر مارس 80000"
 * Output: { input_type, amount, sale_date?, month?, year?, period_start_date?, period_end_date? }
 */
const Anthropic = require('@anthropic-ai/sdk')

const SYSTEM_PROMPT = `أنت مساعد يستخرج بيانات المبيعات من الرسائل العربية.
استخرج من الرسالة المعلومات التالية وأجب بـ JSON فقط بدون أي نص إضافي:

{
  "input_type": "daily" | "monthly" | "range",
  "amount": number,
  "sale_date": "YYYY-MM-DD" | null,
  "month": number | null,
  "year": number | null,
  "period_start_date": "YYYY-MM-DD" | null,
  "period_end_date": "YYYY-MM-DD" | null
}

قواعد:
- إذا ذكر "اليوم" أو تاريخاً محدداً → input_type: "daily"
- إذا ذكر شهراً → input_type: "monthly"
- إذا ذكر فترة (من...إلى) → input_type: "range"
- إذا لم يُذكر تاريخ → افترض اليوم (daily)
- السنة الافتراضية هي السنة الحالية إذا لم تُذكر
- المبلغ دائماً رقم موجب بدون رموز العملة`

/**
 * Parse an Arabic sales message into structured sale data.
 * @param {string} message
 * @param {string} todayISO — current date as YYYY-MM-DD
 * @returns {Promise<object>}
 */
async function parseSaleMessage(message, todayISO = new Date().toISOString().split('T')[0]) {
  // Mock mode
  if (process.env.BOT_NLP_MOCK === 'true') {
    const amountMatch = message.match(/[\d,]+\.?\d*/)
    const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 1000
    return {
      input_type: 'daily',
      amount,
      sale_date: todayISO,
      month: null, year: null,
      period_start_date: null, period_end_date: null,
    }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `التاريخ اليوم: ${todayISO}\n\nالرسالة: ${message}` }
    ],
  })

  const text = response.content[0].text.trim()
  const json = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(json)
}

module.exports = { parseSaleMessage }
