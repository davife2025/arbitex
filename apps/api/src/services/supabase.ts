import { createClient } from '@supabase/supabase-js'
import { config } from '@arbitex/config'

// Server-side client (service role — never expose to browser)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
