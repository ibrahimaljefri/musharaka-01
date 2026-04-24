/**
 * pg query helpers — thin convenience layer over pg.Pool.
 * Use these for simple CRUD. For complex queries use pool.query() directly.
 */
const { pool } = require('../config/db')

/** Fetch single row. Returns null if not found. */
async function selectOne(table, where) {
  const keys = Object.keys(where)
  const sql = `SELECT * FROM ${table} WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')} LIMIT 1`
  const { rows } = await pool.query(sql, keys.map(k => where[k]))
  return rows[0] || null
}

/** Fetch many rows. */
async function selectMany(table, where = {}, opts = {}) {
  const keys = Object.keys(where)
  let sql = `SELECT * FROM ${table}`
  const values = []
  if (keys.length) {
    sql += ' WHERE ' + keys.map((k, i) => { values.push(where[k]); return `${k} = $${values.length}` }).join(' AND ')
  }
  if (opts.orderBy) sql += ` ORDER BY ${opts.orderBy}`
  if (opts.limit)   sql += ` LIMIT ${parseInt(opts.limit)}`
  const { rows } = await pool.query(sql, values)
  return rows
}

/** Count rows. */
async function count(table, where = {}) {
  const keys = Object.keys(where)
  let sql = `SELECT count(*)::int AS n FROM ${table}`
  if (keys.length) {
    sql += ' WHERE ' + keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
  }
  const { rows } = await pool.query(sql, keys.map(k => where[k]))
  return rows[0].n
}

/** Insert one row; returns the inserted row. */
async function insertOne(table, row, returning = '*') {
  const cols = Object.keys(row)
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`
  const { rows } = await pool.query(sql, cols.map(c => row[c]))
  return rows[0]
}

/** Insert many rows in one statement. Returns inserted count. */
async function insertMany(table, rows) {
  if (!rows.length) return 0
  const cols = Object.keys(rows[0])
  const values = []
  const placeholders = rows.map((r, ri) =>
    '(' + cols.map((c, ci) => { values.push(r[c] ?? null); return `$${values.length}` }).join(', ') + ')'
  ).join(', ')
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${placeholders}`
  const res = await pool.query(sql, values)
  return res.rowCount
}

/** Update by single-column match; returns updated row. */
async function updateOne(table, where, patch, returning = '*') {
  const whereKeys = Object.keys(where)
  const patchKeys = Object.keys(patch)
  if (!patchKeys.length) return null
  const setSql = patchKeys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  const whereSql = whereKeys.map((k, i) => `${k} = $${patchKeys.length + i + 1}`).join(' AND ')
  const sql = `UPDATE ${table} SET ${setSql} WHERE ${whereSql} RETURNING ${returning}`
  const values = [...patchKeys.map(k => patch[k]), ...whereKeys.map(k => where[k])]
  const { rows } = await pool.query(sql, values)
  return rows[0] || null
}

/** Delete by where clause; returns deleted count. */
async function deleteWhere(table, where) {
  const keys = Object.keys(where)
  const sql = `DELETE FROM ${table} WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')}`
  const res = await pool.query(sql, keys.map(k => where[k]))
  return res.rowCount
}

module.exports = { pool, selectOne, selectMany, count, insertOne, insertMany, updateOne, deleteWhere }
