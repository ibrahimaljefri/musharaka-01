/**
 * Custom auth routes — replaces Supabase auth.*
 *
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/auth/refresh
 *   POST /api/auth/logout
 *   POST /api/auth/change-password
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *   GET  /api/auth/me
 */

const express    = require('express')
const nodemailer = require('nodemailer')
const { pool }   = require('../config/db')
const auth       = require('../services/authService')
const { authMiddleware } = require('../middleware/auth')
const { standardLimiter, authLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// ── Mailer (cPanel SMTP) ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'localhost',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function sendMail(to, subject, html) {
  if (!process.env.SMTP_USER) {
    // Dev/staging fallback — log the email instead of sending it
    console.log(`[MAIL] To: ${to}\nSubject: ${subject}\n${html}`)
    return
  }
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || `"عروة" <${process.env.SMTP_USER}>`,
    to, subject, html,
  })
}

function cookieOpts() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000,   // 30 days
  }
}

// ── POST /api/auth/signup ───────────────────────────────────────────────────
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body
    if (!email || !password) return res.status(422).json({ error: 'البريد وكلمة المرور مطلوبان' })
    if (password.length < 8)  return res.status(422).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })

    const exists = await pool.query('SELECT id FROM app_users WHERE email = $1', [email.toLowerCase()])
    if (exists.rows.length) return res.status(409).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' })

    const password_hash = await auth.hashPassword(password)
    const { rows } = await pool.query(
      `INSERT INTO app_users (email, password_hash, full_name, phone)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [email.toLowerCase(), password_hash, full_name || null, phone || null]
    )
    const userId = rows[0].id
    const user   = await auth.loadUserWithContext(userId)

    const accessToken  = auth.buildAccessToken(user, { tenant_id: user.tenant_id, role: user.role })
    const refreshToken = await auth.issueRefreshToken(userId, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    res.cookie('refresh_token', refreshToken, cookieOpts())
    res.status(201).json({ accessToken, user: publicUser(user) })
  } catch (err) { next(err) }
})

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(422).json({ error: 'البريد وكلمة المرور مطلوبان' })

    const { rows } = await pool.query(
      'SELECT * FROM app_users WHERE email = $1',
      [email.toLowerCase()]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' })

    if (user.password_hash === 'NEEDS_RESET') {
      return res.status(403).json({ error: 'يرجى إعادة تعيين كلمة المرور عبر رابط البريد الإلكتروني' })
    }

    const ok = await auth.verifyPassword(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' })

    const full = await auth.loadUserWithContext(user.id)
    const accessToken  = auth.buildAccessToken(full, { tenant_id: full.tenant_id, role: full.role })
    const refreshToken = await auth.issueRefreshToken(user.id, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    res.cookie('refresh_token', refreshToken, cookieOpts())
    res.json({ accessToken, user: publicUser(full) })
  } catch (err) { next(err) }
})

// ── POST /api/auth/refresh ──────────────────────────────────────────────────
router.post('/refresh', standardLimiter, async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token || req.body?.refresh_token
    if (!raw) return res.status(401).json({ error: 'لا توجد جلسة نشطة' })

    const result = await auth.rotateRefreshToken(raw, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })
    if (!result) return res.status(401).json({ error: 'انتهت صلاحية الجلسة — يرجى تسجيل الدخول' })

    res.cookie('refresh_token', result.refreshToken, cookieOpts())
    res.json({ accessToken: result.accessToken, user: publicUser(result.user) })
  } catch (err) { next(err) }
})

// ── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', standardLimiter, async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token || req.body?.refresh_token
    await auth.revokeRefreshToken(raw)
    res.clearCookie('refresh_token')
    res.json({ message: 'تم تسجيل الخروج' })
  } catch (err) { next(err) }
})

// ── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', standardLimiter, authMiddleware, async (req, res, next) => {
  try {
    const user = await auth.loadUserWithContext(req.user.id)
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' })
    res.json(publicUser(user))
  } catch (err) { next(err) }
})

// ── POST /api/auth/change-password ─────────────────────────────────────────
router.post('/change-password', standardLimiter, authMiddleware, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return res.status(422).json({ error: 'الحقول مطلوبة' })
    if (new_password.length < 8) return res.status(422).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })

    const { rows } = await pool.query('SELECT password_hash FROM app_users WHERE id = $1', [req.user.id])
    const ok = await auth.verifyPassword(current_password, rows[0]?.password_hash)
    if (!ok) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' })

    const hash = await auth.hashPassword(new_password)
    await pool.query('UPDATE app_users SET password_hash = $1 WHERE id = $2', [hash, req.user.id])
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' })
  } catch (err) { next(err) }
})

// ── POST /api/auth/forgot-password ─────────────────────────────────────────
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(422).json({ error: 'البريد الإلكتروني مطلوب' })

    const { rows } = await pool.query('SELECT id, full_name FROM app_users WHERE email = $1', [email.toLowerCase()])
    // Always return 200 to avoid email enumeration
    if (!rows.length) return res.json({ message: 'إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين' })

    const user  = rows[0]
    const token = await auth.issuePasswordResetToken(user.id)
    const url   = `${process.env.APP_URL}/reset-password?token=${token}`

    await sendMail(
      email,
      'إعادة تعيين كلمة المرور — عروة',
      `<div dir="rtl" style="font-family:sans-serif">
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>مرحباً ${user.full_name || ''}،</p>
        <p>انقر على الرابط أدناه لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة.</p>
        <a href="${url}" style="background:#ca8a04;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">إعادة تعيين كلمة المرور</a>
        <p style="margin-top:16px;color:#6b7280;font-size:13px">إذا لم تطلب هذا، تجاهل الرسالة.</p>
      </div>`
    )

    res.json({ message: 'إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين' })
  } catch (err) { next(err) }
})

// ── POST /api/auth/reset-password ──────────────────────────────────────────
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, new_password } = req.body
    if (!token || !new_password) return res.status(422).json({ error: 'الحقول مطلوبة' })
    if (new_password.length < 8) return res.status(422).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })

    const userId = await auth.consumePasswordResetToken(token)
    if (!userId) return res.status(400).json({ error: 'الرابط غير صالح أو منتهي الصلاحية' })

    const hash = await auth.hashPassword(new_password)
    await pool.query('UPDATE app_users SET password_hash = $1 WHERE id = $2', [hash, userId])
    res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح' })
  } catch (err) { next(err) }
})

// ── Helpers ─────────────────────────────────────────────────────────────────
function publicUser(u) {
  return {
    id:                       u.id,
    email:                    u.email,
    full_name:                u.full_name,
    phone:                    u.phone,
    isSuperAdmin:             u.is_super_admin || false,
    tenantId:                 u.tenant_id      || null,
    role:                     u.role           || null,
    tenant_status:            u.tenant_status  || null,
    tenant_expires_at:        u.tenant_expires_at || null,
    allowed_input_types:      u.allowed_input_types || ['daily'],
    allow_advanced_dashboard: u.allow_advanced_dashboard || false,
    allow_import:             u.allow_import   || false,
    allow_reports:            u.allow_reports        || false,
    max_branches:             u.max_branches         || 3,
    max_users:                u.max_users            || 10,
    activated_at:             u.tenant_activated_at  || null,
    plan:                     u.tenant_plan          || null,
  }
}

module.exports = router
