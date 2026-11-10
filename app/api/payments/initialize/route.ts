import { createClient } from '@supabase/supabase-js'

const BOOKING_TIMES = new Set([
  '09:00 AM',
  '10:15 AM',
  '11:30 AM',
  '01:00 PM',
  '02:30 PM',
  '03:45 PM',
  '05:00 PM',
  '06:15 PM',
  '07:30 PM',
])

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

  if (!isRecord(body)) {
    return Response.json({ error: 'Invalid booking details.' }, { status: 400 })
  }

  const {
    slug,
    serviceId,
    clientName,
    clientPhone,
    clientEmail,
    clientNotes,
    appointmentDate,
    appointmentTime,
  } = body

  if (
    typeof slug !== 'string' || slug.length > 120 ||
    typeof serviceId !== 'string' || serviceId.length > 120 ||
    typeof clientName !== 'string' || clientName.trim().length < 2 || clientName.length > 120 ||
    typeof clientPhone !== 'string' || clientPhone.trim().length < 5 || clientPhone.length > 40 ||
    typeof clientEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) || clientEmail.length > 254 ||
    typeof clientNotes !== 'string' || clientNotes.length > 1000 ||
    typeof appointmentDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
    typeof appointmentTime !== 'string' || !BOOKING_TIMES.has(appointmentTime)
  ) {
    return Response.json({ error: 'Please provide valid booking details and a valid email address.' }, { status: 400 })
  }

  const appointmentDateValue = new Date(`${appointmentDate}T00:00:00.000Z`)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const latestDate = new Date(today)
  latestDate.setUTCDate(latestDate.getUTCDate() + 90)
  if (
    Number.isNaN(appointmentDateValue.getTime()) ||
    appointmentDateValue < today ||
    appointmentDateValue > latestDate
  ) {
    return Response.json({ error: 'Please select a date within the next 90 days.' }, { status: 400 })
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!paystackSecret || !supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: 'Payment processing is not configured. Please contact the business.' },
      { status: 503 }
    )
  }
  if (!paystackSecret.startsWith('sk_test_')) {
    return Response.json(
      { error: 'Booking checkout is currently configured for Paystack sandbox test mode only.' },
      { status: 503 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('business_id, currency')
    .eq('slug', slug)
    .maybeSingle()
  if (businessError) {
    return Response.json({ error: 'Could not load the business for payment.' }, { status: 500 })
  }
  if (!business) {
    return Response.json({ error: 'This business could not be found.' }, { status: 404 })
  }
  if (!business.currency.startsWith('NGN')) {
    return Response.json({ error: 'Paystack checkout currently supports NGN bookings only.' }, { status: 400 })
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('name, price')
    .eq('business_id', business.business_id)
    .eq('id', serviceId)
    .eq('is_active', true)
    .maybeSingle()
  if (serviceError) {
    return Response.json({ error: 'Could not load the selected service.' }, { status: 500 })
  }
  if (!service || !Number.isInteger(service.price) || service.price <= 0) {
    return Response.json({ error: 'This service is unavailable for online payment.' }, { status: 400 })
  }

  const depositPaidKobo = service.price * 30
  const reference = `booka_${crypto.randomUUID()}`
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, '')

  let paystackResponse: Response
  try {
    paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: clientEmail.trim(),
        amount: depositPaidKobo,
        currency: 'NGN',
        reference,
        callback_url: `${siteUrl}/${encodeURIComponent(slug)}`,
        metadata: {
          booka_booking: {
            slug,
            service_id: serviceId,
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            client_email: clientEmail.trim(),
            client_notes: clientNotes.trim(),
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            deposit_paid_kobo: depositPaidKobo,
          },
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return Response.json({ error: 'Could not connect to Paystack. Please try again.' }, { status: 502 })
  }

  let result: unknown
  try {
    result = await paystackResponse.json()
  } catch {
    return Response.json({ error: 'Paystack returned an invalid response.' }, { status: 502 })
  }
  if (
    !paystackResponse.ok ||
    !isRecord(result) ||
    result.status !== true ||
    !isRecord(result.data) ||
    typeof result.data.authorization_url !== 'string'
  ) {
    const message = isRecord(result) && typeof result.message === 'string'
      ? result.message
      : 'Could not initialize Paystack checkout.'
    return Response.json({ error: message }, { status: 502 })
  }

  return Response.json({
    authorizationUrl: result.data.authorization_url,
    reference,
  })
}
