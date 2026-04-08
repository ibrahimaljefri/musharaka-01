/**
 * botService — core bot message processing
 *
 * Flow:
 * 1. Look up subscriber by platform + chat_id (one SELECT, denormalized)
 * 2. Parse message with Claude NLP
 * 3. Expand into sale rows via saleDistributionService
 * 4. Insert rows into Supabase
 * 5. Return Arabic confirmation text
 */
const { supabase } = require('../config/supabase')
const { parseSaleMessage } = require('./saleNlpService')
const { expandSale } = require('./saleDistributionService')

const MONTHS_AR = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function fmt(n) {
  return Number(n).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Process an incoming bot message.
 * @param {'telegram'|'whatsapp'} platform
 * @param {string} chatId
 * @param {string} message
 * @returns {Promise<string>} Arabic reply
 */
async function processMessage(platform, chatId, message) {
  // 1. Look up subscriber
  const { data: sub } = await supabase
    .from('bot_subscribers')
    .select('*')
    .eq('platform', platform)
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .maybeSingle()

  if (!sub) {
    return 'عذراً، رقمك غير مسجل في النظام. يرجى التواصل مع المشرف لتفعيل الحساب.'
  }

  // 2. Parse message
  let parsed
  try {
    parsed = await parseSaleMessage(message)
  } catch {
    return 'تعذّر فهم الرسالة. يرجى إرسالها بالصيغة:\n"مبيعات اليوم 5000"\n"مبيعات شهر مارس 80000"'
  }

  if (!parsed.amount || parsed.amount <= 0) {
    return 'لم أتمكن من استخراج المبلغ. يرجى التأكد من ذكر الرقم في الرسالة.'
  }

  // 3. Expand into sale rows
  const rows = expandSale({
    branch_id:         sub.branch_id,
    tenant_id:         sub.tenant_id,
    input_type:        parsed.input_type,
    amount:            parsed.amount,
    sale_date:         parsed.sale_date,
    month:             parsed.month,
    year:              parsed.year,
    period_start_date: parsed.period_start_date,
    period_end_date:   parsed.period_end_date,
  })

  // 4. Insert rows
  const { error: insertErr } = await supabase.from('sales').insert(rows)
  if (insertErr) {
    console.error('[bot] insert error:', insertErr)
    return 'حدث خطأ أثناء حفظ المبيعات. يرجى المحاولة مجدداً أو التواصل مع الدعم.'
  }

  // Update last_message_at
  supabase
    .from('bot_subscribers')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sub.id)
    .then(() => {})

  // 5. Confirmation reply
  const dateLabel = parsed.input_type === 'monthly'
    ? `${MONTHS_AR[parsed.month] || parsed.month} ${parsed.year}`
    : parsed.input_type === 'range'
    ? `${parsed.period_start_date} → ${parsed.period_end_date}`
    : parsed.sale_date

  return [
    '✅ تم تسجيل المبيعات بنجاح',
    '',
    `🏢 المستأجر: ${sub.tenant_name}`,
    sub.contract_number ? `📋 رقم العقد: ${sub.contract_number}` : null,
    `🏪 الفرع: ${sub.branch_name} (${sub.branch_code})`,
    `📅 الفترة: ${dateLabel}`,
    `💰 المبلغ: ${fmt(parsed.amount)} ر.س`,
  ].filter(Boolean).join('\n')
}

module.exports = { processMessage }
