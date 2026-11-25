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
    (typeof partialAmount !== 'number' || !Number.isInteger(partialAmount) || partialAmount <= 0)
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

  const { data: refundRows, error: refundPreparationError } = await userClient.rpc(
    'admin_prepare_refund',
    {
      p_booking_id: body.bookingId,
      p_amount_kobo: typeof partialAmount === 'number' ? partialAmount : null,
    }
  )
  if (refundPreparationError) {
    const message = refundPreparationError.message
    const status = message.includes('Not authorized') ? 403
      : message.includes('not found') ? 404
        : message.includes('Refund amount') ? 400
          : 500
    return Response.json({ error: message }, { status })
  }
  const refund = Array.isArray(refundRows)
    ? refundRows[0] as Record<string, unknown> | undefined
    : undefined
  if (
    !refund ||
    typeof refund.refund_id !== 'number' ||
    typeof refund.paystack_reference !== 'string' ||
    typeof refund.amount_kobo !== 'number' ||
    !Number.isInteger(refund.amount_kobo)
  ) {
    return Response.json({ error: 'Refund reservation could not be verified.' }, { status: 500 })
  }
  const refundId = refund.refund_id
  const paystackReference = refund.paystack_reference
  const refundAmount = refund.amount_kobo
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not connect to Paystack.'
    const { error: reservationError } = await adminSupabase
      .from('platform_refund_records')
      .update({ failure_reason: `Paystack request outcome is unknown: ${message}` })
      .eq('id', refundId)
    if (reservationError) {
      console.error('Could not annotate uncertain Paystack refund:', reservationError.message)
      return Response.json({
        error: 'Paystack request outcome is unknown and the refund reservation could not be annotated. Reconcile this refund in Paystack before retrying.',
      }, { status: 502 })
    }
    return Response.json({
      error: 'Paystack request outcome is unknown. Reconcile this refund in Paystack before retrying.',
    }, { status: 502 })
  }

  let result: unknown
  try {
    result = await paystackResponse.json()
  } catch {
    const { error: reservationError } = await adminSupabase
      .from('platform_refund_records')
      .update({ failure_reason: 'Paystack returned an unreadable response; initiation outcome is unknown.' })
      .eq('id', refundId)
    if (reservationError) console.error('Could not annotate unreadable Paystack refund response:', reservationError.message)
    return Response.json({ error: 'Paystack returned an invalid refund response.' }, { status: 502 })
  }

  if (!paystackResponse.ok || !isRecord(result) || result.status !== true) {
    const message = isRecord(result) && typeof result.message === 'string'
      ? result.message
      : 'Paystack could not initiate the refund.'
    const { error: refundUpdateError } = await adminSupabase
      .from('platform_refund_records')
      .update({
        status: 'failed',
        failure_reason: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', refundId)
    if (refundUpdateError) {
      console.error('Could not release failed refund reservation:', refundUpdateError.message)
      return Response.json({
        error: `${message} The refund reservation could not be updated; reconcile it before retrying.`,
      }, { status: 502 })
    }
    return Response.json({ error: message }, { status: 502 })
  }

  const refundData = isRecord(result.data) ? result.data : null
  const refundReference = refundData && typeof refundData.reference === 'string'
    ? refundData.reference
    : null

  if (!refundReference) {
    const { error: reservationError } = await adminSupabase
      .from('platform_refund_records')
      .update({ failure_reason: 'Paystack accepted the refund but returned no refund reference.' })
      .eq('id', refundId)
    if (reservationError) console.error('Could not annotate unreferenced Paystack refund:', reservationError.message)
    return Response.json({
      error: 'Paystack accepted the refund but returned no refund reference. Reconcile it before retrying.',
    }, { status: 502 })
  }

  const { error: refundUpdateError } = await adminSupabase
    .from('platform_refund_records')
    .update({
      paystack_refund_reference: refundReference,
      status: 'processing',
      failure_reason: null,
    })
    .eq('id', refundId)
  if (refundUpdateError) {
    console.error('Paystack accepted a refund but its record could not be updated:', refundUpdateError.message)
    return Response.json({
      error: 'Paystack accepted the refund, but Booka could not update its tracking record. Reconcile it before retrying.',
    }, { status: 502 })
  }

  const { error: outcomeError } = await userClient.rpc('admin_update_payment_outcome', {
    p_booking_id: body.bookingId,
    p_outcome: 'refund_pending',
    p_note: `Sandbox refund submitted through Paystack: ${refundAmount} kobo.`,
  })
  if (outcomeError) {
    console.error('Paystack accepted a refund but the booking outcome could not be updated:', outcomeError.message)
    return Response.json({
      error: 'Paystack accepted the refund, but the booking outcome could not be updated. Reconcile it before retrying.',
    }, { status: 502 })
  }

  return Response.json({
    status: 'refund_pending',
    paystackReference,
    paystackRefundReference: refundReference,
    refundId,
  })
}
