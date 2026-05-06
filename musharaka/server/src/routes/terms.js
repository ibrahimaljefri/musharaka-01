/**
 * /api/terms — Terms & Conditions content endpoints.
 *
 *   GET /api/terms        Public — returns the current T&C body (Markdown).
 *   PUT /api/terms        Super-admin only — replaces the body.
 *
 * Storage: a single row in `terms_content` with id = 'current'. Edits do
 * NOT bump a version or re-prompt acceptors — see migration 025.
 */

const express = require('express')
const { pool } = require('../config/db')
const { authMiddleware } = require('../middleware/auth')
const { superAdminOnly } = require('../middleware/tenantMiddleware')
const { standardLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// ── GET /api/terms ─────────────────────────────────────────────────────────
// Public — landing-page footer link must work without a session.
router.get('/', standardLimiter, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.body, t.updated_at,
              u.full_name AS updated_by_name,
              u.email     AS updated_by_email
         FROM terms_content t
         LEFT JOIN app_users u ON u.id = t.updated_by
        WHERE t.id = 'current'`
    )
    if (!rows.length) {
      return res.json({ body: '', updated_at: null, updated_by_name: null, updated_by_email: null })
    }
    res.json(rows[0])
  } catch (err) { next(err) }
})

// ── PUT /api/terms ─────────────────────────────────────────────────────────
// Super-admin only — replaces the singleton row's body.
router.put('/', standardLimiter, authMiddleware, superAdminOnly, async (req, res, next) => {
  try {
    const { body } = req.body
    if (typeof body !== 'string') {
      return res.status(422).json({ error: 'محتوى الشروط مطلوب' })
    }
    await pool.query(
      `INSERT INTO terms_content (id, body, updated_at, updated_by)
       VALUES ('current', $1, now(), $2)
       ON CONFLICT (id) DO UPDATE
         SET body       = EXCLUDED.body,
             updated_at = EXCLUDED.updated_at,
             updated_by = EXCLUDED.updated_by`,
      [body, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
