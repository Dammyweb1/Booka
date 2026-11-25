import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function isAuthorized(request: Request, secret: string) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const supplied = Buffer.from(token)
  const expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!cronSecret || !supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Financial report schedule is not configured.' }, { status: 503 })
  }
  if (!isAuthorized(request, cronSecret)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const reportDate = yesterday.toISOString().slice(0, 10)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.rpc('admin_generate_financial_report', {
    p_start: reportDate,
    p_end: reportDate,
  })
  if (error) {
    console.error('Scheduled financial report generation failed:', error.message)
    return Response.json({ error: 'Could not generate scheduled report.' }, { status: 500 })
  }
  return Response.json({ generated: true, period: reportDate, report: data })
}
