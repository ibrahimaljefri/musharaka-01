import { createClient } from '@supabase/supabase-js'
import { devSupabase } from './devSupabase'
import { devAuth } from './devAuth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const IS_DEV = !supabaseUrl || supabaseUrl.includes('placeholder')

// In dev mode, use localStorage-backed mock. In production, use real Supabase.
export const supabase = IS_DEV
  ? { ...devSupabase, auth: devAuth }
  : createClient(supabaseUrl, supabaseKey)
