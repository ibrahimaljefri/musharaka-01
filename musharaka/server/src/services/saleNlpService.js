/**
 * saleNlpService — Arabic natural language → structured sale data
 * Pure regex parser — zero cost, zero external API dependencies.
 *
 * Supported formats:
 *   "مبيعات اليوم 4500"
 *   "مبيعات اليوم 4,500"
 *   "مبيعات شهر مارس 80000"
 *   "مبيعات شهر مارس 2025 80000"
 *   "مبيعات من 1 أبريل إلى 15 أبريل 25000"
 *   "مبيعات من 2025-04-01 إلى 2025-04-15 25000"
 *   "فرع جدة: مبيعات اليوم 5000"   (branch prefix stripped by botService)
 *
 * Output: { input_type, amount, sale_date?, month?, year?, period_start_date?, period_end_date? }
 */

// ── Arabic month name → number ────────────────────────────────────────────────
const MONTH_MAP = {
  'يناير': 1,  'يناير': 1,
  'فبراير': 2, 'فبراير': 2,
  'مارس': 3,
  'أبريل': 4,  'ابريل': 4,
  'مايو': 5,
  'يونيو': 6,
  'يوليو': 7,
  'أغسطس': 8,  'اغسطس': 8,
  'سبتمبر': 9,
  'أكتوبر': 10, 'اكتوبر': 10,
  'نوفمبر': 11,
  'ديسمبر': 12,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse an Arabic number string — strips commas, converts Arabic-Indic digits
 * (٠١٢٣٤٥٦٧٨٩) to Western digits, then returns a float.
 */
function parseAmount(raw) {
  if (!raw) return null
  const western = raw
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660)
    .replace(/,/g, '')
    .trim()
  const n = parseFloat(western)
  return isNaN(n) || n <= 0 ? null : n
}

/**
 * Extract the numeric amount from anywhere in a message.
 * Looks for the LAST number in the message (so "فرع 12345: مبيعات 800" → 800).
 */
function extractAmount(msg) {
  // Match sequences of digits (with optional Arabic-Indic), commas, and dots
  const matches = [...msg.matchAll(/[\d٠-٩][٠-٩\d,.]*/g)]
  if (!matches.length) return null
  // Return the last match (most likely the sale amount, not a branch code/year)
  for (let i = matches.length - 1; i >= 0; i--) {
    const n = parseAmount(matches[i][0])
    if (n !== null && n > 0) return n
  }
  return null
}

/**
 * Build a YYYY-MM-DD string, zero-padding month and day.
 */
function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * Parse an Arabic sales message into structured sale data.
 * @param {string}  message
 * @param {string}  todayISO — current date as YYYY-MM-DD (injected for testability)
 * @returns {Promise<object>}  always resolves (never rejects)
 */
async function parseSaleMessage(message, todayISO = new Date().toISOString().split('T')[0]) {
  const msg  = message.trim()
  const now  = new Date(todayISO)
  const thisYear = now.getFullYear()
  const todayMonth = now.getMonth() + 1
  const todayDay   = now.getDate()

  // ── 1. RANGE  "من X إلى Y"  ─────────────────────────────────────────────

  // ISO date range: "من 2025-04-01 إلى 2025-04-15"
  const isoRange = msg.match(
    /من\s+(\d{4}-\d{2}-\d{2})\s+إلى\s+(\d{4}-\d{2}-\d{2})/
  )
  if (isoRange) {
    const amount = extractAmount(msg)
    if (amount) {
      return {
        input_type:        'range',
        amount,
        sale_date:          null,
        month:              null,
        year:               null,
        period_start_date:  isoRange[1],
        period_end_date:    isoRange[2],
      }
    }
  }

  // Arabic date range: "من 1 أبريل إلى 15 أبريل"
  const monthNames = Object.keys(MONTH_MAP).join('|')
  const arRange = msg.match(
    new RegExp(`من\\s+(\\d+)\\s+(${monthNames})(?:\\s+(\\d{4}))?\\s+إلى\\s+(\\d+)\\s+(${monthNames})(?:\\s+(\\d{4}))?`)
  )
  if (arRange) {
    const startDay   = parseInt(arRange[1], 10)
    const startMonth = MONTH_MAP[arRange[2]]
    const startYear  = arRange[3] ? parseInt(arRange[3], 10) : thisYear
    const endDay     = parseInt(arRange[4], 10)
    const endMonth   = MONTH_MAP[arRange[5]]
    const endYear    = arRange[6] ? parseInt(arRange[6], 10) : startYear
    const amount     = extractAmount(msg)

    if (startMonth && endMonth && amount) {
      return {
        input_type:        'range',
        amount,
        sale_date:          null,
        month:              null,
        year:               null,
        period_start_date:  isoDate(startYear, startMonth, startDay),
        period_end_date:    isoDate(endYear,   endMonth,   endDay),
      }
    }
  }

  // ── 2. MONTHLY  "شهر مارس" / "شهر مارس 2025"  ────────────────────────────

  const monthlyMatch = msg.match(
    new RegExp(`شهر\\s+(${monthNames})(?:\\s+(\\d{4}))?`)
  )
  if (monthlyMatch) {
    const month  = MONTH_MAP[monthlyMatch[1]]
    const year   = monthlyMatch[2] ? parseInt(monthlyMatch[2], 10) : thisYear
    const amount = extractAmount(msg)

    if (month && amount) {
      return {
        input_type:        'monthly',
        amount,
        sale_date:          null,
        month,
        year,
        period_start_date:  null,
        period_end_date:    null,
      }
    }
  }

  // ── 3. DAILY with explicit ISO date  "مبيعات 2025-04-17 5000"  ───────────

  const isoDay = msg.match(/(\d{4}-\d{2}-\d{2})/)
  if (isoDay) {
    const amount = extractAmount(msg)
    if (amount) {
      return {
        input_type: 'daily',
        amount,
        sale_date:  isoDay[1],
        month: null, year: null,
        period_start_date: null, period_end_date: null,
      }
    }
  }

  // ── 4. DAILY with explicit Arabic date  "17 أبريل" / "17 أبريل 2025"  ────

  const arDay = msg.match(
    new RegExp(`(\\d+)\\s+(${monthNames})(?:\\s+(\\d{4}))?`)
  )
  if (arDay) {
    const day    = parseInt(arDay[1], 10)
    const month  = MONTH_MAP[arDay[2]]
    const year   = arDay[3] ? parseInt(arDay[3], 10) : thisYear
    const amount = extractAmount(msg)

    if (month && day >= 1 && day <= 31 && amount) {
      return {
        input_type: 'daily',
        amount,
        sale_date:  isoDate(year, month, day),
        month: null, year: null,
        period_start_date: null, period_end_date: null,
      }
    }
  }

  // ── 5. DAILY — "اليوم" or no date indicator → today  ────────────────────

  const amount = extractAmount(msg)
  if (amount) {
    return {
      input_type: 'daily',
      amount,
      sale_date:  todayISO,
      month: null, year: null,
      period_start_date: null, period_end_date: null,
    }
  }

  // ── 6. Nothing matched — throw so caller shows user-friendly error  ────────

  throw new Error(`لم يتمكن المحلل من استخراج البيانات من: "${msg}"`)
}

module.exports = { parseSaleMessage }
