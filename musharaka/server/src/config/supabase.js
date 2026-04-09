// In test mode return a controllable stub so integration tests
// never make real network calls. Tests replace methods via testSupabase.
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
    auth: { getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'test' } }) },
    from: () => chainable(),
    rpc:  () => Promise.resolve({ data: null, error: null }),
    _setFrom: (fn) => { testSupabase.from = fn },
  }
  module.exports = { supabase: testSupabase }
} else {
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  module.exports = { supabase }
}
