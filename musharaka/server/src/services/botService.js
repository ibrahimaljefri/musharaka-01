/**
 * botService — core bot message processing
 *
 * Flow:
 * 1. Look up subscriber by platform + chat_id
 * 2. Handle instruction keywords (/start, مساعدة, help)
 * 3. If awaiting branch reply → match branch, process pending message
 * 4. Extract branch from message text (inline "فرع X" or "عقد X")
 * 5. If no branch found → fetch tenant branches
 *    - 1 branch: use automatically
 *    - Multiple: store pending message, ask subscriber to specify
 * 6. Parse sales message, expand into rows, insert into DB
 * 7. Return Arabic confirmation
 */
const { supabase }        = require('../config/supabase')
const { parseSaleMessage }        = require('./saleNlpService')
const { expandSale }      = require('./saleDistributionService')

const MONTHS_AR = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function formatCurrency(n) {
  return Number(n).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── In-memory conversation state (TTL: 5 minutes) ───────────────────────────
const _pending = new Map() // key: `${platform}:${chatId}` → { message, expiresAt }

// Periodic sweep to evict expired entries and prevent unbounded growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of _pending) {
    if (now > entry.expiresAt) _pending.delete(key)
  }
}, 60 * 1000)

function _stateKey(platform, chatId) { return `${platform}:${chatId}` }

function savePending(platform, chatId, message) {
  _pending.set(_stateKey(platform, chatId), {
    message,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })
}

function getPending(platform, chatId) {
  const entry = _pending.get(_stateKey(platform, chatId))
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { _pending.delete(_stateKey(platform, chatId)); return null }
  return entry.message
}

function clearPending(platform, chatId) {
  _pending.delete(_stateKey(platform, chatId))
}

// ── Instruction keywords ─────────────────────────────────────────────────────
const INSTRUCTION_TRIGGERS = ['/start', 'help', 'مساعدة', 'مساعده', 'تعليمات', 'تعليمات؟']

function isInstruction(message) {
  const m = message.trim().toLowerCase()
  return INSTRUCTION_TRIGGERS.some(t => m === t || m.startsWith(t + ' '))
}

function instructionMessage() {
  return [
    'مرحباً! 👋',
    'لتسجيل مبيعاتك، أرسل رسالة بإحدى الطرق التالية:',
    '',
    '1️⃣ مع ذكر اسم الفرع:',
    '   "فرع جدة: مبيعات اليوم 5000"',
    '',
    '2️⃣ مع ذكر رقم العقد:',
    '   "عقد 12345: مبيعات اليوم 5000"',
    '',
    '3️⃣ بدون ذكر الفرع (سنسألك عنه):',
    '   "مبيعات اليوم 5000"',
    '',
    '📅 يمكنك تحديد الفترة:',
    '   "مبيعات شهر مارس 80000"',
    '   "مبيعات من 1 أبريل إلى 15 أبريل: 25000"',
    '',
    'اكتب "مساعدة" في أي وقت لعرض هذه التعليمات.',
  ].join('\n')
}

// ── Branch extraction from message text ──────────────────────────────────────
function extractBranchHint(message) {
  // "فرع جدة: ..." or "فرع جدة - ..."
  const byName = message.match(/فرع\s+([^\s:،\-،؛]+)/i)
  if (byName) return { type: 'name', value: byName[1].trim() }

  // "عقد 12345: ..."
  const byContract = message.match(/عقد\s+([^\s:،\-،؛]+)/i)
  if (byContract) return { type: 'contract', value: byContract[1].trim() }

  return null
}

// ── Branch lookup from tenant ─────────────────────────────────────────────────
async function fetchTenantBranches(tenantId) {
  const { data } = await supabase
    .from('branches')
    .select('id, name, code, contract_number')
    .eq('tenant_id', tenantId)
    .order('name')
  return data || []
}

function matchBranch(branches, text) {
  const q = text.trim().toLowerCase()
  return (
    branches.find(b => b.contract_number?.toLowerCase() === q) ||
    branches.find(b => b.code?.toLowerCase() === q) ||
    branches.find(b => b.name?.toLowerCase() === q) ||
    branches.find(b => b.name?.toLowerCase().includes(q) || q.includes(b.name?.toLowerCase()))
  ) || null
}

function branchListMessage(branches) {
  const list = branches.map(b => `• ${b.name} (${b.code})`).join('\n')
  return `لأي فرع؟ يرجى إرسال اسم الفرع أو رمزه:\n${list}`
}

// ── Core sale processing ──────────────────────────────────────────────────────
async function processSale(sub, branch, message) {
  let parsed
  try {
    parsed = await parseSaleMessage(message)
  } catch {
    return 'تعذّر فهم الرسالة. يرجى إرسالها بالصيغة:\n"مبيعات اليوم 5000"\n"مبيعات شهر مارس 80000"'
  }

  if (!parsed.amount || parsed.amount <= 0) {
    return 'لم أتمكن من استخراج المبلغ. يرجى التأكد من ذكر الرقم في الرسالة.'
  }

  const rows = expandSale({
    branch_id:         branch.id,
    tenant_id:         sub.tenant_id,
    input_type:        parsed.input_type,
    amount:            parsed.amount,
    sale_date:         parsed.sale_date,
    month:             parsed.month,
    year:              parsed.year,
    period_start_date: parsed.period_start_date,
    period_end_date:   parsed.period_end_date,
  })

  const { error: insertErr } = await supabase.from('sales').insert(rows)
  if (insertErr) {
    console.error('[bot] insert error:', insertErr)
    return 'حدث خطأ أثناء حفظ المبيعات. يرجى المحاولة مجدداً أو التواصل مع الدعم.'
  }

  supabase
    .from('bot_subscribers')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sub.id)
    .then(({ error }) => { if (error) console.error('[bot] last_message_at update failed:', error.message) })

  const dateLabel = parsed.input_type === 'monthly'
    ? `${MONTHS_AR[parsed.month] || parsed.month} ${parsed.year}`
    : parsed.input_type === 'range'
    ? `${parsed.period_start_date} → ${parsed.period_end_date}`
    : parsed.sale_date

  return [
    '✅ تم تسجيل المبيعات بنجاح',
    '',
    `🏢 المستأجر: ${sub.tenant_name}`,
    branch.contract_number ? `📋 رقم العقد: ${branch.contract_number}` : null,
    `🏪 الفرع: ${branch.name} (${branch.code})`,
    `📅 الفترة: ${dateLabel}`,
    `💰 المبلغ: ${formatCurrency(parsed.amount)} ر.س`,
  ].filter(Boolean).join('\n')
}

// ── Main entry point ──────────────────────────────────────────────────────────
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

  // 2. Instruction keywords
  if (isInstruction(message)) {
    return instructionMessage()
  }

  // 3. Handle awaiting-branch state (subscriber is replying with their branch name)
  const pending = getPending(platform, chatId)
  if (pending) {
    const branches = await fetchTenantBranches(sub.tenant_id)
    const branch   = matchBranch(branches, message.trim())
    if (!branch) {
      return `لم أجد فرعاً بهذا الاسم. يرجى المحاولة مرة أخرى:\n${branches.map(b => `• ${b.name} (${b.code})`).join('\n')}`
    }
    clearPending(platform, chatId)
    return processSale(sub, branch, pending)
  }

  // 4. Try to extract branch inline from message ("فرع X" or "عقد X")
  const hint = extractBranchHint(message)
  if (hint) {
    const branches = await fetchTenantBranches(sub.tenant_id)
    const branch   = hint.type === 'contract'
      ? branches.find(b => b.contract_number?.toLowerCase() === hint.value.toLowerCase())
      : matchBranch(branches, hint.value)

    if (!branch) {
      return `لم أجد فرعاً باسم "${hint.value}". الفروع المتاحة:\n${branches.map(b => `• ${b.name} (${b.code})`).join('\n')}`
    }
    return processSale(sub, branch, message)
  }

  // 5. No branch in message — check how many branches tenant has
  const branches = await fetchTenantBranches(sub.tenant_id)

  if (branches.length === 0) {
    return 'لا توجد فروع مسجلة لحسابك. يرجى التواصل مع المشرف.'
  }

  if (branches.length === 1) {
    // Only one branch — use it automatically
    return processSale(sub, branches[0], message)
  }

  // Multiple branches — ask subscriber to specify
  savePending(platform, chatId, message)
  return branchListMessage(branches)
}

module.exports = { processMessage }
