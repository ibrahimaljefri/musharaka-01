#!/usr/bin/env node
/**
 * One-shot backfill — encrypt any plaintext Cenomi tokens in the tenants table.
 *
 * Why: admin.js used to store raw cenomi_api_token unencrypted. The server's
 * decrypt() expected `iv:cipher` format and would have failed on every read.
 * This script scans tenants for tokens that don't match the encrypted regex
 * and encrypts them in place.
 *
 * Idempotent — re-running is safe. Tokens already in `iv:cipher` form are skipped.
 *
 * Usage:
 *   cd musharaka/server
 *   node scripts/encrypt-cenomi-tokens.js
 *   # or via deploy.sh after migrations:
 *   #   node ~/public_html/musharaka/server/server/scripts/encrypt-cenomi-tokens.js
 */

require('dotenv').config()
const { pool }    = require('../src/db/query')
const { encrypt } = require('../src/utils/crypto')

const ENCRYPTED_RE = /^[0-9a-f]+:[0-9a-f]+$/i

async function main() {
  console.log('[encrypt-cenomi-tokens] Scanning tenants for plaintext Cenomi tokens…')

  const { rows } = await pool.query(
    `SELECT id, name, slug, cenomi_api_token
     FROM tenants
     WHERE cenomi_api_token IS NOT NULL AND cenomi_api_token <> ''`
  )

  let scanned = 0, encrypted = 0, skipped = 0
  for (const t of rows) {
    scanned++
    if (ENCRYPTED_RE.test(t.cenomi_api_token)) {
      skipped++
      console.log(`  ⏭  ${t.slug || t.id} — already encrypted`)
      continue
    }
    const enc = encrypt(t.cenomi_api_token)
    await pool.query(`UPDATE tenants SET cenomi_api_token = $1 WHERE id = $2`, [enc, t.id])
    encrypted++
    console.log(`  🔒 ${t.slug || t.id} — encrypted in place`)
  }

  console.log(`[encrypt-cenomi-tokens] Done. scanned=${scanned} encrypted=${encrypted} skipped=${skipped}`)
  await pool.end()
}

main().catch(err => {
  console.error('[encrypt-cenomi-tokens] FATAL:', err)
  process.exit(1)
})
