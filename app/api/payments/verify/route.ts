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
    typeof body.reference !== 'string' ||
    !/^booka_[0-9a-f-]{36}$/i.test(body.reference)
  ) {
    return Response.json({ error: 'Invalid payment reference.' }, { status: 400 })
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!paystackSecret || !supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Payment verification is not configured.' }, { status: 503 })
  }
  if (!paystackSecret.startsWith('sk_test_')) {
    return Response.json({ error: 'Only Paystack sandbox test payments are enabled.' }, { status: 503 })
  }

  let paystackResponse: Response
  try {
    paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(body.reference)}`,
      {
        headers: { Authorization: `Bearer ${paystackSecret}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      }
    )
  } catch {
    return Response.json({ error: 'Could not verify the payment with Paystack. Please try again.' }, { status: 502 })
  }

  let result: unknown
  try {
    result = await paystackResponse.json()
  } catch {
    return Response.json({ error: 'Paystack returned an invalid verification response.' }, { status: 502 })
  }

  if (
    !paystackResponse.ok ||
    !isRecord(result) ||
    result.status !== true ||
    !isRecord(result.data)
  ) {
    return Response.json({ error: 'Paystack could not verify this payment.' }, { status: 502 })
  }

  const transaction = result.data
  if (
    transaction.status !== 'success' ||
    transaction.reference !== body.reference ||
    transaction.currency !== 'NGN' ||
    !Number.isInteger(transaction.amount)
  ) {
    return Response.json({ error: 'Payment was not completed successfully.' }, { status: 402 })
  }

  const metadata = isRecord(transaction.metadata) ? transaction.metadata : null
  const booking = metadata && isRecord(metadata.booka_booking) ? metadata.booka_booking : null
  if (
    !booking ||
    typeof booking.slug !== 'string' ||
    typeof booking.service_id !== 'string' ||
    typeof booking.client_name !== 'string' ||
    typeof booking.client_phone !== 'string' ||
    typeof booking.client_email !== 'string' ||
    typeof booking.client_notes !== 'string' ||
    typeof booking.appointment_date !== 'string' ||
    typeof booking.appointment_time !== 'string' ||
    !Number.isInteger(booking.deposit_paid_kobo) ||
    transaction.amount !== booking.deposit_paid_kobo
  ) {
    return Response.json({ error: 'Payment details did not match the booking.' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.rpc('create_paid_public_booking', {
    p_slug: booking.slug,
    p_service_id: booking.service_id,
    p_client_name: booking.client_name,
    p_client_phone: booking.client_phone,
    p_client_email: booking.client_email,
    p_client_notes: booking.client_notes,
    p_appointment_date: booking.appointment_date,
    p_appointment_time: booking.appointment_time,
    p_paystack_reference: body.reference,
    p_deposit_paid_kobo: booking.deposit_paid_kobo,
  })

  if (error) {
    return Response.json({ error: 'Payment succeeded, but Booka could not save the booking. Contact support with your Paystack reference.' }, { status: 500 })
  }

  return Response.json({ booking: data })
}
