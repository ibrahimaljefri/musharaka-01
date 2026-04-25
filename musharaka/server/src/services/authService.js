const bcrypt   = require('bcrypt')
const jwt      = require('jsonwebtoken')
const crypto   = require('crypto')
const { pool } = require('../config/db')

const SALT_ROUNDS    = 12
const ACCESS_TTL     = '15m'
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000   // 30 days

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

async function verifyPassword(plain, hash) {
  if (hash === 'NEEDS_RESET') return false   // migrated user must reset first
  return bcrypt.compare(plain, hash)
}

function buildAccessToken(user, tenantRow) {
  return jwt.sign(
    {
      sub:         user.id,
      email:       user.email,
      isSuperAdmin: user.is_super_admin || false,
      tenantId:    tenantRow?.tenant_id  || null,
      role:        tenantRow?.role       || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  )
}

async function issueRefreshToken(userId, { userAgent = '', ip = '' } = {}) {
  const raw      = crypto.randomBytes(40).toString('hex')
  const hash     = hashToken(raw)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)
  await pool.query(
    `INSERT INTO app_sessions (user_id, refresh_token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hash, expiresAt, userAgent, ip]
  )
  return raw
}

async function loadUserWithContext(userId) {
  const { rows } = await pool.query(
    `SELECT
       u.*,
       EXISTS(SELECT 1 FROM super_admins WHERE user_id = u.id) AS is_super_admin,
       tu.tenant_id,
       tu.role,
       t.status        AS tenant_status,
       t.expires_at    AS tenant_expires_at,
       t.allowed_input_types,
       t.allow_advanced_dashboard,
       t.allow_import,
       t.allow_reports,
       t.max_branches,
       t.max_users,
       t.activated_at  AS tenant_activated_at,
       t.plan          AS tenant_plan,
       (SELECT count(*)::int FROM tenant_users tu2 WHERE tu2.tenant_id = tu.tenant_id) AS user_count
     FROM app_users u
     LEFT JOIN tenant_users tu ON tu.user_id = u.id
     LEFT JOIN tenants      t  ON t.id = tu.tenant_id
     WHERE u.id = $1`,
    [userId]
  )
  return rows[0] || null
}

async function rotateRefreshToken(rawToken, meta = {}) {
  const hash = hashToken(rawToken)
  const { rows } = await pool.query(
    `SELECT * FROM app_sessions
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()`,
    [hash]
  )
  if (!rows.length) return null

  const session = rows[0]
  await pool.query(
    `UPDATE app_sessions SET revoked_at = now() WHERE id = $1`,
    [session.id]
  )

  const user = await loadUserWithContext(session.user_id)
  if (!user) return null

  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(buildAccessToken(user, { tenant_id: user.tenant_id, role: user.role })),
    issueRefreshToken(session.user_id, meta),
  ])
  return { accessToken, refreshToken, user }
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) return
  const hash = hashToken(rawToken)
  await pool.query(
    `UPDATE app_sessions SET revoked_at = now() WHERE refresh_token_hash = $1`,
    [hash]
  )
}

async function issuePasswordResetToken(userId) {
  const raw  = crypto.randomBytes(32).toString('hex')
  const hash = hashToken(raw)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)   // 1 hour
  await pool.query(
    `INSERT INTO app_password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (token_hash) DO NOTHING`,
    [userId, hash, expiresAt]
  )
  return raw
}

async function consumePasswordResetToken(rawToken) {
  const hash = hashToken(rawToken)
  const { rows } = await pool.query(
    `UPDATE app_password_resets
     SET used_at = now()
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > now()
     RETURNING user_id`,
    [hash]
  )
  return rows[0]?.user_id || null
}

module.exports = {
  hashPassword,
  verifyPassword,
  buildAccessToken,
  issueRefreshToken,
  loadUserWithContext,
  rotateRefreshToken,
  revokeRefreshToken,
  issuePasswordResetToken,
  consumePasswordResetToken,
}
