import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function signatureMatches(signature: string | null, rawBody: string, secret: string) {
  if (!signature) return false
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex')
  const supplied = Buffer.from(signature, 'hex')
  const calculated = Buffer.from(expected, 'hex')
  return supplied.length === calculated.length && timingSafeEqual(supplied, calculated)
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const secret = process.env.PAYSTACK_SECRET_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret || !supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Webhook processing is not configured.' }, { status: 503 })
  }
  if (!secret.startsWith('sk_test_')) {
    return Response.json({ error: 'Only sandbox webhooks are enabled.' }, { status: 503 })
  }
  if (!signatureMatches(request.headers.get('x-paystack-signature'), rawBody, secret)) {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid webhook payload.' }, { status: 400 })
  }
  if (!isRecord(event) || typeof event.event !== 'string') {
    return Response.json({ error: 'Invalid webhook event.' }, { status: 400 })
  }

  const data = isRecord(event.data) ? event.data : null
  const eventId = typeof event.id === 'number' || typeof event.id === 'string'
    ? String(event.id)
    : `${event.event}-${createHmac('sha256', secret).update(rawBody).digest('hex')}`

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: eventError } = await supabase
    .from('platform_webhook_events')
    .insert({
      event_id: eventId,
      event_type: event.event,
      payload: event,
    })
  if (eventError) {
    if (eventError.code === '23505') {
      return Response.json({ received: true, duplicate: true })
    }
    console.error('Could not persist Paystack webhook:', eventError.message)
    return Response.json({ error: 'Could not process webhook.' }, { status: 500 })
  }

  if (event.event === 'charge.success' && data) {
    const reference = typeof data.reference === 'string' ? data.reference : null
    if (reference) {
      await supabase
        .from('appointments')
        .update({ payment_status: 'paid' })
        .eq('paystack_reference', reference)
    }
  }

  if (
    event.event.startsWith('refund.') &&
    data
  ) {
    const refundReference = typeof data.reference === 'string'
      ? data.reference
      : null
    const transactionReference = typeof data.transaction_reference === 'string'
      ? data.transaction_reference
      : typeof data.transaction === 'object' && isRecord(data.transaction) &&
          typeof data.transaction.reference === 'string'
        ? data.transaction.reference
        : null

    let refundStatus: 'processing' | 'successful' | 'failed' | 'reversed' = 'processing'
    if (event.event === 'refund.processed' || data.status === 'processed') refundStatus = 'successful'
    if (event.event === 'refund.failed' || data.status === 'failed') refundStatus = 'failed'

    let refundQuery = supabase.from('platform_refund_records').select('booking_id').limit(1)
    if (refundReference) refundQuery = refundQuery.eq('paystack_refund_reference', refundReference)
    else if (transactionReference) refundQuery = refundQuery.eq('paystack_reference', transactionReference)

    const { data: refundRows } = await refundQuery
    const bookingId = Array.isArray(refundRows) && refundRows[0]?.booking_id
      ? String(refundRows[0].booking_id)
      : null

    if (bookingId) {
      await supabase
        .from('platform_refund_records')
        .update({
          status: refundStatus,
          failure_reason: data.status === 'failed' && typeof data.gateway_response === 'string'
            ? data.gateway_response
            : null,
          completed_at: refundStatus === 'successful' || refundStatus === 'failed'
            ? new Date().toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)

      await supabase
        .from('appointments')
        .update({
          payment_outcome: refundStatus === 'successful'
            ? 'refunded'
            : refundStatus === 'failed'
              ? 'normal'
              : 'refund_pending',
          payment_outcome_note: refundStatus === 'successful'
            ? 'Refund confirmed by Paystack.'
            : refundStatus === 'failed'
              ? 'Paystack refund failed.'
              : 'Paystack refund is processing.',
          payment_outcome_updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
    }
  }

  if (event.event.startsWith('transfer.') && data) {
    const transferReference = typeof data.reference === 'string'
      ? data.reference
      : typeof data.transfer_code === 'string'
        ? data.transfer_code
        : null
    const recipient = isRecord(data.recipient) ? data.recipient : null
    const businessId = recipient && typeof recipient.metadata === 'object' && isRecord(recipient.metadata)
      ? recipient.metadata.business_id
      : null

    if (typeof businessId === 'string' && typeof data.amount === 'number') {
      let payoutStatus: 'processing' | 'successful' | 'failed' | 'reversed' = 'processing'
      if (event.event === 'transfer.success') payoutStatus = 'successful'
      if (event.event === 'transfer.failed') payoutStatus = 'failed'
      if (event.event === 'transfer.reversed') payoutStatus = 'reversed'

      await supabase
        .from('platform_payout_records')
        .upsert({
          business_id: businessId,
          paystack_transfer_code: typeof data.transfer_code === 'string' ? data.transfer_code : null,
          paystack_reference: transferReference,
          amount_kobo: data.amount,
          status: payoutStatus,
          failure_reason: typeof data.gateway_response === 'string' ? data.gateway_response : null,
          completed_at: ['successful', 'failed', 'reversed'].includes(payoutStatus)
            ? new Date().toISOString()
            : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'paystack_transfer_code',
          ignoreDuplicates: false,
        })
    }
  }

  return Response.json({ received: true })
}
