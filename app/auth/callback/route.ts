import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Supabase sends owners here after they confirm their email or recover their
// account. The PKCE code is exchanged for a session cookie before redirecting.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next')
  const next =
    requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/backoffice'

  if (code) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(new URL(next, origin))
      console.error('Supabase auth callback failed:', error.message)
    }
  }

  return NextResponse.redirect(new URL('/onboarding/business-setup?error=confirmation', origin))
}
