/**
 * Dev-mode auth mock — used when VITE_SUPABASE_URL is a placeholder.
 * The dev user is always a super-admin (pre-seeded in localStorage).
 */

const STORAGE_KEY    = 'musharaka_dev_session'
const DEV_USER_ID    = 'dev-user-id'
const DEV_USER_EMAIL = 'admin@musharaka.dev'
const DEV_PASSWORD   = 'admin123'

function makeSession(email, name = 'إبراهيم (مشرف)') {
  return {
    access_token: 'dev-token',
    user: {
      id:            DEV_USER_ID,
      email,
      user_metadata: { full_name: name },
    },
  }
}

function seedSuperAdmin() {
  // Ensure the dev user is always in the super_admins table
  try {
    const existing = JSON.parse(localStorage.getItem('dev_super_admins') || '[]')
    if (!existing.find(r => r.user_id === DEV_USER_ID)) {
      existing.push({ user_id: DEV_USER_ID, created_at: new Date().toISOString() })
      localStorage.setItem('dev_super_admins', JSON.stringify(existing))
    }
  } catch {}
}

// ── Dev user registry (stores tenant user credentials) ───────────────────────
function getDevUsers() {
  try { return JSON.parse(localStorage.getItem('dev_auth_users') || '[]') } catch { return [] }
}
function saveDevUsers(users) { localStorage.setItem('dev_auth_users', JSON.stringify(users)) }

// Returns the auth user record for a given userId
function findAuthUserById(id) { return getDevUsers().find(u => u.id === id) || null }

export const devAuth = {
  async signInWithPassword({ email, password }) {
    if (!email || !password) return { error: { message: 'missing credentials' } }

    // Super-admin account
    if (email === DEV_USER_EMAIL && password === DEV_PASSWORD) {
      const session = makeSession(email)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      seedSuperAdmin()
      return { data: { session }, error: null }
    }

    // Tenant user accounts (created via admin panel)
    const users = getDevUsers()
    const found = users.find(u => u.email === email && u.password === password)
    if (!found) return { error: { message: 'Invalid login credentials' } }

    const session = {
      access_token: 'dev-token-' + found.id,
      user: { id: found.id, email: found.email, user_metadata: found.user_metadata || {} },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    return { data: { session, must_change_password: !!found.must_change_password }, error: null }
  },

  async signUp({ email, password, options }) {
    if (!email || !password) return { error: { message: 'missing credentials' } }
    const name   = options?.data?.full_name || 'مستخدم'
    const userId = 'dev-reg-' + Math.random().toString(36).slice(2, 10)

    // Check for duplicate email
    const existing = getDevUsers()
    if (existing.find(u => u.email === email))
      return { error: { message: 'Email already registered' } }

    // Store credentials — status 'pending' until admin assigns a tenant
    saveDevUsers([...existing, {
      id: userId, email, password,
      user_metadata: { full_name: name },
      status: 'pending',        // visible in admin users list
      must_change_password: false,
      registered_at: new Date().toISOString(),
    }])

    const session = {
      access_token: 'dev-token-' + userId,
      user: { id: userId, email, user_metadata: { full_name: name } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    return { data: { session }, error: null }
  },

  async getSession() {
    const raw = localStorage.getItem(STORAGE_KEY)
    const session = raw ? JSON.parse(raw) : null
    // Only re-seed super-admin for the actual super-admin user
    if (session?.user?.id === DEV_USER_ID) seedSuperAdmin()
    return { data: { session } }
  },

  async getUser(token) {
    const raw = localStorage.getItem(STORAGE_KEY)
    const session = raw ? JSON.parse(raw) : null
    return session
      ? { data: { user: session.user }, error: null }
      : { data: { user: null }, error: { message: 'not authenticated' } }
  },

  async signOut() {
    localStorage.removeItem(STORAGE_KEY)
    return { error: null }
  },

  onAuthStateChange(callback) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  },

  // Change password for the currently logged-in user
  async changePassword(newPassword) {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { error: { message: 'not authenticated' } }
    const session = JSON.parse(raw)
    const userId  = session?.user?.id
    if (!userId || userId === DEV_USER_ID) return { error: { message: 'use settings to change admin password' } }
    const users = getDevUsers()
    const idx   = users.findIndex(u => u.id === userId)
    if (idx === -1) return { error: { message: 'user not found' } }
    users[idx] = { ...users[idx], password: newPassword, must_change_password: false }
    saveDevUsers(users)
    return { error: null }
  },

  // Reset password by email (dev: no email sent, just updates the record)
  async resetPassword(email, newPassword) {
    const users = getDevUsers()
    const idx   = users.findIndex(u => u.email === email)
    if (idx === -1) return { error: { message: 'البريد الإلكتروني غير مسجل' } }
    users[idx] = { ...users[idx], password: newPassword, must_change_password: false }
    saveDevUsers(users)
    return { error: null }
  },

  // Look up a user's must_change_password flag by userId
  getMustChangePassword(userId) {
    const u = findAuthUserById(userId)
    return u ? !!u.must_change_password : false
  },

  // Admin methods used by the admin panel (mocked for dev)
  admin: {
    async createUser({ email, password, email_confirm, user_metadata }) {
      const id = 'dev-tenant-user-' + Math.random().toString(36).slice(2, 10)
      const users = getDevUsers()
      if (!users.find(u => u.email === email)) {
        // must_change_password: true — forces password change on first login
        saveDevUsers([...users, { id, email, password, user_metadata: user_metadata || {}, must_change_password: true }])
      }
      return {
        data: { user: { id, email, user_metadata: user_metadata || {} } },
        error: null,
      }
    },
  },
}

export const IS_DEV_AUTH =
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
