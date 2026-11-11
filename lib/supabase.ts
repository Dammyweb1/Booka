import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error('Supabase URL and publishable key must be configured.')
  }

  if (typeof window === 'undefined') {
    return createClient(url, publishableKey)
  }

  if (!browserClient) {
    // Keep browser auth sessions out of request cookies to avoid oversized Vercel headers.
    browserClient = createClient(url, publishableKey)
  }

  return browserClient
}