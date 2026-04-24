/**
 * schema-apply.js — run once to create all tables on a fresh cPanel Postgres DB.
 *
 * Usage:
 *   DATABASE_URL="postgres://stepupyo_musharaka:PASSWORD@localhost:5432/stepupyo_musharaka" \
 *   node schema-apply.js
 *
 * Idempotent: all statements use IF NOT EXISTS / OR REPLACE.
 */

const { Pool } = require('pg')
const fs   = require('fs')
const path = require('path')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
})

async function run() {
  const schemaDir = path.join(__dirname, 'src', 'schema')
  const files = fs.readdirSync(schemaDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const client = await pool.connect()
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(schemaDir, file), 'utf8')
      console.log(`▶ ${file}`)
      await client.query(sql)
      console.log(`  ✓ done`)
    }
    console.log('\nAll schema files applied successfully.')
  } catch (err) {
    console.error('\nSchema apply FAILED:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
