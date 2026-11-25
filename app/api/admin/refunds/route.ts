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
    typeof body.bookingId !== 'string' ||
    body.bookingId.length < 1 ||
    body.bookingId.length > 120
  ) {
    return Response.json({ error: 'A valid booking is required.' }, { status: 400 })
  }

  const partialAmount = body.amountKobo
  if (
    partialAmount !== undefined &&
    (!Number.isInteger(partialAmount) || partialAmount <= 0)
  ) {
    return Response.json({ error: 'Refund amount must be a positive whole number in kobo.' }, { status: 400 })
  }

  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY

  if (!accessToken || !supabaseUrl || !publishableKey || !serviceRoleKey || !paystackSecret) {
    return Response.json({ error: 'Refund processing is not configured.' }, { status: 503 })
  }
  if (!paystackSecret.startsWith('sk_test_')) {
    return Response.json({ error: 'Only Paystack sandbox refunds are enabled.' }, { status: 503 })
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: bookingRows, error: bookingError } = await userClient.rpc(
    'admin_get_refund_booking',
    { p_booking_id: body.bookingId }
  )
  if (bookingError) {
    return Response.json({ error: 'You are not authorized to process refunds.' }, { status: 403 })
  }
  const booking = Array.isArray(bookingRows) ? bookingRows[0] as Record<string, unknown> | undefined : undefined
  if (!booking) {
    return Response.json({ error: 'Paid Paystack booking not found.' }, { status: 404 })
  }

  const paystackReference = booking.paystack_reference
  const availableAmount = booking.amount_kobo
  if (
    typeof paystackReference !== 'string' ||
    !Number.isInteger(availableAmount) ||
    typeof availableAmount !== 'number'
  ) {
    return Response.json({ error: 'Booking refund details are invalid.' }, { status: 400 })
  }

  const refundAmount = partialAmount === undefined ? availableAmount : partialAmount
  if (refundAmount > availableAmount) {
    return Response.json({ error: 'Refund amount exceeds the original deposit.' }, { status: 400 })
  }

  let paystackResponse: Response
  try {
    paystackResponse = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: paystackReference,
        amount: refundAmount,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return Response.json({ error: 'Could not connect to Paystack.' }, { status: 502 })
  }

  let result: unknown
  try {
    result = await paystackResponse.json()
  } catch {
    return Response.json({ error: 'Paystack returned an invalid refund response.' }, { status: 502 })
  }

  if (!paystackResponse.ok || !isRecord(result) || result.status !== true) {
    const message = isRecord(result) && typeof result.message === 'string'
      ? result.message
      : 'Paystack could not initiate the refund.'
    return Response.json({ error: message }, { status: 502 })
  }

  const refundData = isRecord(result.data) ? result.data : null
  const refundReference = refundData && typeof refundData.reference === 'string'
    ? refundData.reference
    : null

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  await adminSupabase.from('platform_refund_records').insert({
    booking_id: body.bookingId,
    paystack_reference: paystackReference,
    paystack_refund_reference: refundReference,
    amount_kobo: refundAmount,
    status: 'processing',
    requested_by: authData.user.id,
  })

  await userClient.rpc('admin_update_payment_outcome', {
    p_booking_id: body.bookingId,
    p_outcome: 'refund_pending',
    p_note: partialAmount === undefined
      ? 'Full sandbox refund submitted through Paystack.'
      : `Partial sandbox refund submitted through Paystack: ${refundAmount} kobo.`,
  })

  return Response.json({
    status: 'refund_pending',
    paystackReference,
    paystackRefundReference: refundReference,
  })
}
