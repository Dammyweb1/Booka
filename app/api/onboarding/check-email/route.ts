import { createClient } from '@supabase/supabase-js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (
    !isRecord(body) ||
    typeof body.email !== 'string' ||
    body.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Email verification is not configured. Please contact support.' }, { status: 503 })
  }

  const emailPattern = body.email.trim().replace(/[\\%_]/g, '\\$&')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase
    .from('businesses')
    .select('business_id')
    .ilike('email', emailPattern)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Business email availability lookup failed:', error)
    return Response.json({ error: 'Could not verify this email address. Please try again.' }, { status: 500 })
  }

  if (data) {
    return Response.json({
      available: false,
      error: 'This email is already registered. Use another email address or log in to your existing account.',
    }, { status: 409 })
  }

  return Response.json({ available: true })
}
