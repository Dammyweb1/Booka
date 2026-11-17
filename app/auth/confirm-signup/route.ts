import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const CONFIRMATION_WINDOW_MS = 15 * 60 * 1000

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const email = url.searchParams.get('email')?.trim().toLowerCase()

  if (!tokenHash || tokenHash.length > 2048 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return redirectTo(request, '/confirmation-expired')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    console.error('Signup confirmation is not configured.')
    return redirectTo(request, '/confirmation-expired')
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: pendingConfirmation, error: lookupError } = await adminClient
    .from('signup_confirmation_links')
    .select('sent_at')
    .eq('email', email)
    .maybeSingle()

  if (lookupError) {
    console.error('Signup confirmation expiry lookup failed:', lookupError)
    return redirectTo(request, '/confirmation-expired')
  }

  const sentAt = pendingConfirmation ? Date.parse(pendingConfirmation.sent_at) : NaN
  if (!Number.isFinite(sentAt) || Date.now() - sentAt >= CONFIRMATION_WINDOW_MS) {
    return redirectTo(request, '/confirmation-expired')
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: confirmationError } = await authClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  })

  if (confirmationError) {
    return redirectTo(request, '/confirmation-expired')
  }

  return redirectTo(request, '/login')
}
