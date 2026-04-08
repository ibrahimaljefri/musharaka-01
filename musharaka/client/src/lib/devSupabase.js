/**
 * localStorage-backed Supabase mock for dev mode (no real Supabase project needed).
 * Supports the chainable query builder pattern used across all pages.
 */

// ── Storage helpers ───────────────────────────────────────────────────────────

function getTable(name) {
  try { return JSON.parse(localStorage.getItem(`dev_${name}`) || '[]') }
  catch { return [] }
}

function saveTable(name, rows) {
  localStorage.setItem(`dev_${name}`, JSON.stringify(rows))
}

function genId() {
  return 'dev-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now()
}

// ── Query Builder ─────────────────────────────────────────────────────────────

class QueryBuilder {
  constructor(table) {
    this._table    = table
    this._ops      = []        // [{type, col, val}]
    this._orderCol = null
    this._orderAsc = true
    this._single   = false
    this._head     = false
    this._countReq = false
    this._selectCols = '*'
    this._limit    = null
    this._action   = 'select'  // select | insert | update | delete | upsert
    this._payload  = null
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  eq(col, val)  { this._ops.push({ type: 'eq',  col, val }); return this }
  neq(col, val) { this._ops.push({ type: 'neq', col, val }); return this }
  gte(col, val) { this._ops.push({ type: 'gte', col, val }); return this }
  lte(col, val) { this._ops.push({ type: 'lte', col, val }); return this }
  in(col, vals) { this._ops.push({ type: 'in',  col, val: vals }); return this }

  order(col, opts = {}) {
    this._orderCol = col
    this._orderAsc = opts.ascending !== false
    return this
  }
  limit(n)  { this._limit = n; return this }
  single()  { this._single = true; return this }

  select(cols = '*', opts = {}) {
    this._selectCols = cols
    if (opts.count === 'exact') this._countReq = true
    if (opts.head)              this._head = true
    return this
  }

  insert(payload) { this._action = 'insert'; this._payload = payload; return this }
  update(payload) { this._action = 'update'; this._payload = payload; return this }
  delete()        { this._action = 'delete'; return this }
  upsert(payload) { this._action = 'upsert'; this._payload = payload; return this }

  // ── Apply filter ops ─────────────────────────────────────────────────────
  _filter(rows) {
    return rows.filter(row => this._ops.every(op => {
      const v = row[op.col]
      if (op.type === 'eq')  return v === op.val
      if (op.type === 'neq') return v !== op.val
      if (op.type === 'gte') return v >= op.val
      if (op.type === 'lte') return v <= op.val
      if (op.type === 'in')  return op.val.includes(v)
      return true
    }))
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  then(resolve, reject) {
    try {
      const result = this._execute()
      resolve(result)
    } catch (e) {
      reject(e)
    }
  }

  maybeSingle() { this._single = true; this._maybeSingle = true; return this }

  range(from, to) { this._rangeFrom = from; this._rangeTo = to; return this }

  _execute() {
    const tbl = this._table

    if (this._action === 'insert') {
      const rows   = getTable(tbl)
      const items  = Array.isArray(this._payload) ? this._payload : [this._payload]
      const now    = new Date().toISOString()
      const newRows = items.map(item => ({
        id: genId(), created_at: now, updated_at: now, ...item,
      }))
      // Unique constraints
      if (tbl === 'branches') {
        for (const nr of newRows) {
          if (rows.find(r => r.code === nr.code)) {
            return { data: null, error: { code: '23505', message: 'كود الفرع مستخدم مسبقاً.' } }
          }
        }
      }
      if (tbl === 'submissions') {
        for (const nr of newRows) {
          if (rows.find(r => r.branch_id === nr.branch_id && r.month === nr.month && r.year === nr.year)) {
            return { data: null, error: { code: '23505', message: 'تم إرسال هذه الفترة مسبقاً.' } }
          }
        }
      }
      if (tbl === 'tenants') {
        for (const nr of newRows) {
          if (rows.find(r => r.slug === nr.slug)) {
            return { data: null, error: { code: '23505', message: 'الرمز المختصر مستخدم مسبقاً.' } }
          }
        }
      }
      saveTable(tbl, [...rows, ...newRows])
      if (this._single || this._maybeSingle) return { data: newRows[0] || null, error: null }
      return { data: newRows, error: null }
    }

    if (this._action === 'update') {
      const rows    = getTable(tbl)
      const updated = []
      const newRows = rows.map(r => {
        const match = this._filter([r]).length > 0
        if (match) {
          const u = { ...r, ...this._payload, updated_at: new Date().toISOString() }
          updated.push(u)
          return u
        }
        return r
      })
      saveTable(tbl, newRows)
      return { data: updated, error: null }
    }

    if (this._action === 'delete') {
      const rows    = getTable(tbl)
      const kept    = rows.filter(r => this._filter([r]).length === 0)
      saveTable(tbl, kept)
      return { data: null, error: null }
    }

    // SELECT
    let rows = getTable(tbl)
    rows = this._filter(rows)

    // Resolve simple FK joins (e.g., tenant_users → tenants, branches → on sales)
    if (tbl === 'tenant_users' && this._selectCols.includes('tenants(')) {
      const tenants = getTable('tenants')
      rows = rows.map(r => ({
        ...r,
        tenants: tenants.find(t => t.id === r.tenant_id) || null,
      }))
    }
    if (tbl === 'sales' && this._selectCols.includes('branches(')) {
      const branches = getTable('branches')
      rows = rows.map(r => ({
        ...r,
        branches: branches.find(b => b.id === r.branch_id) || null,
      }))
    }
    if (tbl === 'submissions' && this._selectCols.includes('branches(')) {
      const branches = getTable('branches')
      rows = rows.map(r => ({
        ...r,
        branches: branches.find(b => b.id === r.branch_id) || null,
      }))
    }
    if (tbl === 'tenants' && this._selectCols.includes('tenant_users(')) {
      const tuRows = getTable('tenant_users')
      rows = rows.map(r => ({
        ...r,
        tenant_users: tuRows.filter(u => u.tenant_id === r.id),
      }))
    }
    if (tbl === 'api_keys') {
      // No joins needed
    }

    if (this._orderCol) {
      const col = this._orderCol
      rows = [...rows].sort((a, b) => {
        if (a[col] < b[col]) return this._orderAsc ? -1 : 1
        if (a[col] > b[col]) return this._orderAsc ? 1 : -1
        return 0
      })
    }

    if (this._limit) rows = rows.slice(0, this._limit)

    if (this._countReq) {
      return { count: rows.length, data: this._head ? null : rows, error: null }
    }

    if (this._single || this._maybeSingle) {
      if (rows.length > 0) return { data: rows[0], error: null }
      if (this._maybeSingle) return { data: null, error: null }
      return { data: null, error: { code: 'PGRST116', message: 'Row not found' } }
    }

    return { data: rows, error: null }
  }

}

// ── RPC mock ──────────────────────────────────────────────────────────────────

function rpc(fnName, params) {
  if (fnName === 'submit_to_seinomy') {
    const { p_branch_id, p_month, p_year, p_invoice_count, p_total_amount } = params
    // Create submission record
    const submissions = getTable('submissions')
    const existing = submissions.find(
      s => s.branch_id === p_branch_id && s.month === p_month && s.year === p_year
    )
    if (existing) {
      return Promise.resolve({ data: { success: false, error: 'تم إرسال هذه الفترة مسبقاً.' }, error: null })
    }
    const id = genId()
    submissions.push({
      id, branch_id: p_branch_id, month: p_month, year: p_year,
      invoice_count: p_invoice_count, total_amount: p_total_amount,
      status: 'sent', submitted_at: new Date().toISOString(), created_at: new Date().toISOString(),
    })
    saveTable('submissions', submissions)
    // Update sales status to sent
    const sales = getTable('sales')
    const mm = String(p_month).padStart(2, '0')
    const updated = sales.map(s => {
      if (s.branch_id === p_branch_id && s.status === 'pending' &&
          s.sale_date >= `${p_year}-${mm}-01` && s.sale_date <= `${p_year}-${mm}-31`) {
        return { ...s, status: 'sent', submission_id: id }
      }
      return s
    })
    saveTable('sales', updated)
    return Promise.resolve({ data: { success: true, submission_id: id }, error: null })
  }
  return Promise.resolve({ data: null, error: { message: `RPC ${fnName} not mocked` } })
}

// ── Export ─────────────────────────────────────────────────────────────────────

export const devSupabase = {
  from: (table) => new QueryBuilder(table),
  rpc,
  auth: null, // handled separately by devAuth
}
