import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined
let browserAdminClient: SupabaseClient | undefined

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error('Supabase URL and publishable key must be configured.')
  }

  return { url, publishableKey }
}

export function createSupabaseClient() {
  const { url, publishableKey } = getSupabaseConfig()

  if (typeof window === 'undefined') {
    return createClient(url, publishableKey)
  }

  if (!browserClient) {
    // Keep browser auth sessions out of request cookies to avoid oversized Vercel headers.
    browserClient = createClient(url, publishableKey)
  }

  return browserClient
}

export function createAdminSupabaseClient() {
  const { url, publishableKey } = getSupabaseConfig()

  if (typeof window === 'undefined') {
    return createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  if (!browserAdminClient) {
    browserAdminClient = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: window.sessionStorage,
        storageKey: 'booka-admin-session',
      },
    })
  }

  return browserAdminClient
}