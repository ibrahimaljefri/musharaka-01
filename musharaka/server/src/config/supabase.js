// Supabase config — kept ONLY for legacy test files that use the inert stub.
// Production code now uses pg.Pool via src/config/db.js.
//
// In production, SUPABASE_URL/KEY are not required; this module returns a
// benign stub instead of crashing.

if (process.env.NODE_ENV === 'test') {
  const noop = () => Promise.resolve({ data: [], error: null })
  const chainable = () => {
    const q = {
      select: () => q, eq: () => q, neq: () => q,
      gte: () => q, lte: () => q, in: () => q,
      order: () => q, limit: () => q,
      single: noop, maybeSingle: noop,
      insert: noop, update: noop, delete: noop, upsert: noop,
      then: (resolve) => resolve({ data: [], error: null }),
    }
    return q
  }
  const testSupabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'test' } }),
      admin: {
        listUsers:       () => Promise.resolve({ data: { users: [] }, error: null }),
        createUser:      () => Promise.resolve({ data: { user: null }, error: null }),
        updateUserById:  () => Promise.resolve({ data: { user: null }, error: null }),
        deleteUser:      () => Promise.resolve({ data: {}, error: null }),
      },
    },
    from: () => chainable(),
    rpc:  () => Promise.resolve({ data: null, error: null }),
    _setFrom:      (fn)        => { testSupabase.from = fn },
    _setAuthAdmin: (overrides) => { testSupabase.auth.admin = { ...testSupabase.auth.admin, ...overrides } },
  }
  module.exports = { supabase: testSupabase }
} else if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Legacy: Supabase still configured (pre-migration). Safe to leave loaded.
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  module.exports = { supabase }
} else {
  // Post-migration: Supabase no longer used. Export a no-op stub that throws if accessed.
  const handler = {
    get() {
      throw new Error('Supabase client is no longer available. Use pg.Pool via config/db.js.')
    }
  }
  module.exports = { supabase: new Proxy({}, handler) }
}
