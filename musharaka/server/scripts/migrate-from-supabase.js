#!/usr/bin/env node
/**
 * migrate-from-supabase.js
 *
 * Migrates all live data from Supabase Postgres → cPanel Postgres.
 * Run ONCE during the maintenance window after schema-apply.js has
 * already created all 15 tables on cPanel.
 *
 * Usage:
 *   DATABASE_URL="postgres://user:pass@127.0.0.1:5432/db" \
 *   SUPABASE_URL="https://xxx.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
 *   node scripts/migrate-from-supabase.js
 *
 * Options:
 *   --dry-run   Print row counts only; no writes to cPanel
 *   --tables    Comma-separated list of tables to migrate (default: all)
 */

'use strict'

const { Pool } = require('pg')
const { createClient } = require('@supabase/supabase-js')

// ─── Parse CLI flags ────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const TABLE_FILTER = (() => {
  const t = args.find(a => a.startsWith('--tables='))
  return t ? t.replace('--tables=', '').split(',') : null
})()

// ─── Validate env ────────────────────────────────────────────────────────────
const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing env var: ${key}`)
    process.exit(1)
  }
}

// ─── Clients ─────────────────────────────────────────────────────────────────
const cpanel = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 5,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Helpers ─────────────────────────────────────────────────────────────────
const BATCH = 500

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`) }
function warn(msg) { console.warn(`[WARN] ${msg}`) }
function err(msg)  { console.error(`[ERROR] ${msg}`) }

/** Insert rows into cPanel in batches of BATCH. */
async function insertBatch(client, table, rows, columns) {
  if (!rows.length) return 0
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const placeholders = batch.map(
      (_, ri) => `(${columns.map((_, ci) => `$${ri * columns.length + ci + 1}`).join(', ')})`
    ).join(', ')
    const values = batch.flatMap(row => columns.map(col => row[col] ?? null))
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values
    )
    inserted += batch.length
    log(`  ${table}: inserted ${inserted}/${rows.length}`)
  }
  return inserted
}

/** Fetch all rows from a Supabase table. */
async function fetchAll(table, selectCols = '*') {
  const PAGE = 1000
  let rows = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectCols)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Supabase fetch ${table}: ${error.message}`)
    if (!data || !data.length) break
    rows = rows.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return rows
}

/** Count rows in a cPanel table. */
async function countCpanel(table) {
  const { rows } = await cpanel.query(`SELECT count(*)::int AS n FROM ${table}`)
  return rows[0].n
}

// ─── Migration plan ───────────────────────────────────────────────────────────
// Each entry: { supabaseTable, cpanelTable, columns, transform? }
// transform(row) → transformed row (rename fields, cast types)

const MIGRATIONS = [
  // 1. app_users (from auth.users via Supabase admin API)
  {
    id: 'app_users',
    async migrate(client) {
      log('Fetching auth.users from Supabase admin API...')
      let users = []
      let page = 1
      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) throw new Error(`listUsers page ${page}: ${error.message}`)
        if (!data.users.length) break
        users = users.concat(data.users)
        if (data.users.length < 1000) break
        page++
      }
      log(`  app_users: fetched ${users.length} from Supabase auth`)
      if (DRY_RUN) return { fetched: users.length, inserted: 0 }
      const rows = users.map(u => ({
        id:                 u.id,
        email:              u.email,
        full_name:          u.user_metadata?.full_name ?? null,
        phone:              u.phone ?? null,
        password_hash:      'NEEDS_RESET',
        email_confirmed_at: u.email_confirmed_at ?? null,
        created_at:         u.created_at,
        updated_at:         u.updated_at ?? u.created_at,
      }))
      const cols = ['id','email','full_name','phone','password_hash','email_confirmed_at','created_at','updated_at']
      const inserted = await insertBatch(client, 'app_users', rows, cols)
      return { fetched: users.length, inserted }
    }
  },

  // 2. tenants
  {
    id: 'tenants',
    async migrate(client) {
      log('Fetching tenants from Supabase...')
      const rows = await fetchAll('tenants')
      log(`  tenants: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      const mapped = rows.map(r => ({
        id:                       r.id,
        name:                     r.name,
        slug:                     r.slug,
        plan:                     r.plan ?? 'basic',
        status:                   r.status ?? 'active',
        activated_at:             r.activated_at,
        expires_at:               r.expires_at ?? null,
        allowed_input_types:      JSON.stringify(r.allowed_input_types ?? ['daily']),
        allow_advanced_dashboard: r.allow_advanced_dashboard ?? false,
        allow_import:             r.allow_import ?? false,
        allow_reports:            r.allow_reports ?? false,
        commercial_registration:  r.commercial_registration ?? null,
        primary_phone:            r.primary_phone ?? null,
        account_number:           r.account_number ?? null,
        max_branches:             r.max_branches ?? 3,
        max_users:                r.max_users ?? 10,
        cenomi_api_token:         r.cenomi_api_token ?? null,
        notes:                    r.notes ?? null,
        created_at:               r.created_at,
        updated_at:               r.updated_at,
      }))
      const cols = [
        'id','name','slug','plan','status','activated_at','expires_at',
        'allowed_input_types','allow_advanced_dashboard','allow_import',
        'allow_reports','commercial_registration','primary_phone',
        'account_number','max_branches','max_users','cenomi_api_token',
        'notes','created_at','updated_at'
      ]
      const inserted = await insertBatch(client, 'tenants', mapped, cols)
      return { fetched: rows.length, inserted }
    }
  },

  // 3. super_admins
  {
    id: 'super_admins',
    async migrate(client) {
      log('Fetching super_admins from Supabase...')
      const rows = await fetchAll('super_admins')
      log(`  super_admins: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      const cols = ['user_id', 'created_at']
      const mapped = rows.map(r => ({ user_id: r.user_id, created_at: r.created_at }))
      const inserted = await insertBatch(client, 'super_admins', mapped, cols)
      return { fetched: rows.length, inserted }
    }
  },

  // 4. tenant_users
  {
    id: 'tenant_users',
    async migrate(client) {
      log('Fetching tenant_users from Supabase...')
      const rows = await fetchAll('tenant_users')
      log(`  tenant_users: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      const cols = ['id', 'tenant_id', 'user_id', 'role', 'created_at']
      const mapped = rows.map(r => ({
        id: r.id, tenant_id: r.tenant_id, user_id: r.user_id,
        role: r.role ?? 'member', created_at: r.created_at,
      }))
      const inserted = await insertBatch(client, 'tenant_users', mapped, cols)
      return { fetched: rows.length, inserted }
    }
  },

  // 5. branches
  {
    id: 'branches',
    async migrate(client) {
      log('Fetching branches from Supabase...')
      const rows = await fetchAll('branches')
      log(`  branches: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      const cols = [
        'id','code','name','contract_number','brand_name','unit_number',
        'location','address','tenant_id','created_at','updated_at'
      ]
      // Note: we intentionally drop 'token' (Phase 1: token moves to tenant)
      const mapped = rows.map(r => ({
        id: r.id, code: r.code, name: r.name,
        contract_number: r.contract_number ?? null,
        brand_name:      r.brand_name ?? null,
        unit_number:     r.unit_number ?? null,
        location:        r.location ?? null,
        address:         r.address ?? null,
        tenant_id:       r.tenant_id,
        created_at:      r.created_at,
        updated_at:      r.updated_at,
      }))
      const inserted = await insertBatch(client, 'branches', mapped, cols)
      return { fetched: rows.length, inserted }
    }
  },

  // 6. submissions
  {
    id: 'submissions',
    async migrate(client) {
      log('Fetching submissions from Supabase...')
      const rows = await fetchAll('submissions')
      log(`  submissions: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      // Get cPanel submissions columns from schema
      const { rows: cols } = await cpanel.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'submissions' ORDER BY ordinal_position
      `)
      const colNames = cols.map(c => c.column_name).filter(c => c !== 'id' || rows[0]?.id)
      // Map known fields
      const mapped = rows.map(r => {
        const obj = {}
        colNames.forEach(col => { obj[col] = r[col] ?? null })
        return obj
      })
      const inserted = await insertBatch(client, 'submissions', mapped, colNames)
      return { fetched: rows.length, inserted }
    }
  },

  // 7. sales
  {
    id: 'sales',
    async migrate(client) {
      log('Fetching sales from Supabase...')
      const rows = await fetchAll('sales')
      log(`  sales: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      const cols = [
        'id','invoice_number','branch_id','input_type','sale_date','month','year',
        'period_start_date','period_end_date','amount','notes','status',
        'submission_id','tenant_id','created_at','updated_at'
      ]
      const mapped = rows.map(r => ({
        id:                r.id,
        invoice_number:    r.invoice_number ?? null,
        branch_id:         r.branch_id,
        input_type:        r.input_type ?? 'daily',
        sale_date:         r.sale_date,
        month:             r.month ?? null,
        year:              r.year ?? null,
        period_start_date: r.period_start_date ?? null,
        period_end_date:   r.period_end_date ?? null,
        amount:            r.amount,
        notes:             r.notes ?? null,
        status:            r.status ?? 'pending',
        submission_id:     r.submission_id ?? null,
        tenant_id:         r.tenant_id,
        created_at:        r.created_at,
        updated_at:        r.updated_at,
      }))
      const inserted = await insertBatch(client, 'sales', mapped, cols)
      return { fetched: rows.length, inserted }
    }
  },

  // 8. support_tickets
  {
    id: 'support_tickets',
    async migrate(client) {
      log('Fetching support_tickets from Supabase...')
      const rows = await fetchAll('support_tickets')
      log(`  support_tickets: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      // Category: old schema had 4 values; new schema has more — map unknown → 'أخرى'
      const validCategories = new Set([
        'مبيعات','فروع','مستخدمون','ترخيص','تقني','أخرى',
        'integration','license','technical','reporting'
      ])
      const cols = [
        'id','ticket_number','tenant_id','tenant_name','submitter_name',
        'submitter_email','title','category','description','steps',
        'attachment_url','attachment_name','status','admin_comment',
        'created_at','updated_at'
      ]
      const mapped = rows.map(r => ({
        id:               r.id,
        ticket_number:    r.ticket_number,
        tenant_id:        r.tenant_id,
        tenant_name:      r.tenant_name ?? '',
        submitter_name:   r.submitter_name ?? '',
        submitter_email:  r.submitter_email ?? '',
        title:            r.title,
        category:         validCategories.has(r.category) ? r.category : 'أخرى',
        description:      r.description,
        steps:            r.steps ?? null,
        attachment_url:   r.attachment_url ?? null,
        attachment_name:  r.attachment_name ?? null,
        status:           r.status ?? 'new',
        admin_comment:    r.admin_comment ?? null,
        created_at:       r.created_at,
        updated_at:       r.updated_at,
      }))
      const inserted = await insertBatch(client, 'support_tickets', mapped, cols)
      return { fetched: rows.length, inserted }
    }
  },

  // 9. api_keys
  {
    id: 'api_keys',
    async migrate(client) {
      log('Fetching api_keys from Supabase...')
      const rows = await fetchAll('api_keys')
      log(`  api_keys: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      const { rows: cols } = await cpanel.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'api_keys' ORDER BY ordinal_position
      `)
      const colNames = cols.map(c => c.column_name)
      const mapped = rows.map(r => {
        const obj = {}
        colNames.forEach(col => { obj[col] = r[col] ?? null })
        return obj
      })
      const inserted = await insertBatch(client, 'api_keys', mapped, colNames)
      return { fetched: rows.length, inserted }
    }
  },

  // 10. bot_subscribers
  {
    id: 'bot_subscribers',
    async migrate(client) {
      log('Fetching bot_subscribers from Supabase...')
      const rows = await fetchAll('bot_subscribers')
      log(`  bot_subscribers: fetched ${rows.length}`)
      if (DRY_RUN) return { fetched: rows.length, inserted: 0 }
      const { rows: cols } = await cpanel.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'bot_subscribers' ORDER BY ordinal_position
      `)
      const colNames = cols.map(c => c.column_name)
      const mapped = rows.map(r => {
        const obj = {}
        colNames.forEach(col => { obj[col] = r[col] ?? null })
        return obj
      })
      const inserted = await insertBatch(client, 'bot_subscribers', mapped, colNames)
      return { fetched: rows.length, inserted }
    }
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('=== Musharaka: Supabase → cPanel Migration ===')
  if (DRY_RUN) log('DRY RUN — no writes to cPanel DB')

  const client = await cpanel.connect()
  const summary = []

  try {
    for (const m of MIGRATIONS) {
      if (TABLE_FILTER && !TABLE_FILTER.includes(m.id)) {
        log(`Skipping ${m.id} (not in --tables filter)`)
        continue
      }

      log(`\n── Migrating: ${m.id} ──`)
      try {
        const result = await m.migrate(client)
        const cpanelCount = DRY_RUN ? '-' : await countCpanel(m.id)
        summary.push({
          table:    m.id,
          fetched:  result.fetched,
          inserted: result.inserted,
          cPanel:   cpanelCount,
          status:   !DRY_RUN && result.fetched !== cpanelCount ? 'MISMATCH' : 'OK',
        })
        log(`  ${m.id}: fetched=${result.fetched}, inserted=${result.inserted}, cPanel=${cpanelCount}`)
      } catch (e) {
        err(`${m.id}: ${e.message}`)
        summary.push({ table: m.id, fetched: '?', inserted: '?', cPanel: '?', status: 'FAILED' })
      }
    }
  } finally {
    client.release()
    await cpanel.end()
  }

  // ── Summary report ──────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════')
  console.log('           MIGRATION SUMMARY')
  console.log('════════════════════════════════════════')
  console.log('Table                  Fetched  Inserted  cPanel   Status')
  console.log('─────────────────────────────────────────────────────────')
  for (const s of summary) {
    const status = s.status === 'OK' ? '✓' : s.status === 'FAILED' ? '✗ FAILED' : '⚠ MISMATCH'
    console.log(
      `${s.table.padEnd(22)} ${String(s.fetched).padStart(7)}  ${String(s.inserted).padStart(8)}  ${String(s.cPanel).padStart(6)}   ${status}`
    )
  }
  console.log('════════════════════════════════════════')

  const failed = summary.filter(s => s.status !== 'OK')
  if (failed.length) {
    console.error(`\n[FAIL] ${failed.length} table(s) had issues: ${failed.map(f => f.table).join(', ')}`)
    process.exit(1)
  } else {
    log('\n[SUCCESS] All tables migrated successfully.')
    if (!DRY_RUN) {
      log('Next steps:')
      log('  1. Remove SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from server .env')
      log('  2. Restart Node: kill $(pgrep -f "node src/index.js") && nohup node src/index.js > ~/musharaka.log 2>&1 &')
      log('  3. Migrate ticket attachment files: see scripts/migrate-attachments.sh')
    }
  }
}

main().catch(e => {
  err(e.message)
  process.exit(1)
})
