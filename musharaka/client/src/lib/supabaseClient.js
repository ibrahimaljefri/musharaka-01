/**
 * supabaseClient.js — SAFE STUB (post-migration)
 *
 * Supabase is no longer the backend. Data lives on cPanel PostgreSQL behind
 * /api/* endpoints authenticated with our custom JWT.
 *
 * This stub exists ONLY to prevent cross-tenant data leaks while we finish
 * migrating the last `supabase.from(...)` call sites to authenticated REST
 * calls. Every query returns an empty result so no other tenant's data can
 * ever appear on the screen.
 *
 * NEW CODE MUST NOT USE THIS MODULE. Use `import api from '@/lib/axiosClient'`
 * and call `/api/*` endpoints instead.
 */

const emptyResult = Promise.resolve({ data: [], error: null, count: 0 })

function makeChainable() {
  const q = {
    select:      () => q,
    insert:      () => emptyResult,
    update:      () => q,
    upsert:      () => q,
    delete:      () => q,
    eq:          () => q,
    neq:         () => q,
    gt:          () => q,
    gte:         () => q,
    lt:          () => q,
    lte:         () => q,
    in:          () => q,
    like:        () => q,
    ilike:       () => q,
    is:          () => q,
    match:       () => q,
    or:          () => q,
    contains:    () => q,
    order:       () => q,
    limit:       () => q,
    range:       () => q,
    single:      () => Promise.resolve({ data: null, error: { message: 'supabase disabled' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    // thenable — so `const { data } = await supabase.from(..).select()` works
    then:        (resolve) => resolve({ data: [], error: null, count: 0 }),
  }
  return q
}

export const supabase = {
  from: () => makeChainable(),
  rpc:  () => Promise.resolve({ data: null, error: { message: 'supabase disabled' } }),
  storage: {
    from: () => ({
      upload:        () => Promise.resolve({ data: null, error: { message: 'supabase storage disabled' } }),
      getPublicUrl:  () => ({ data: { publicUrl: '' } }),
      createSignedUrl: () => Promise.resolve({ data: null, error: { message: 'supabase storage disabled' } }),
    }),
  },
  auth: {
    getSession:         () => Promise.resolve({ data: { session: null }, error: null }),
    getUser:            () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange:  () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut:            () => Promise.resolve({ error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'supabase disabled — use /api/auth/login' } }),
    signUp:             () => Promise.resolve({ data: null, error: { message: 'supabase disabled — use /api/auth/signup' } }),
  },
}
