import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Server-only Supabase client with full access. Used exclusively by the
// Paystack callback and webhook to record verified transactions. Never import
// this in client components or expose the secret/service role key to the browser.
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
