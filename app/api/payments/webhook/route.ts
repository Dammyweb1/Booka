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
      processing_status: 'processing',
      attempt_count: 1,
      last_attempt_at: new Date().toISOString(),
    })
  if (eventError) {
    if (eventError.code === '23505') {
      const { data: previousEvent, error: previousEventError } = await supabase
        .from('platform_webhook_events')
        .select('processing_status, attempt_count')
        .eq('event_id', eventId)
        .maybeSingle()
      if (previousEventError) {
        console.error('Could not inspect duplicate Paystack webhook:', previousEventError.message)
        return Response.json({ error: 'Could not process webhook.' }, { status: 500 })
      }
      if (previousEvent?.processing_status === 'processed') {
        return Response.json({ received: true, duplicate: true })
      }
      const { error: retryError } = await supabase
        .from('platform_webhook_events')
        .update({
          processing_status: 'processing',
          error_message: null,
          attempt_count: (previousEvent?.attempt_count ?? 0) + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
      if (retryError) {
        console.error('Could not retry Paystack webhook:', retryError.message)
        return Response.json({ error: 'Could not retry webhook.' }, { status: 500 })
      }
    } else {
      console.error('Could not persist Paystack webhook:', eventError.message)
      return Response.json({ error: 'Could not process webhook.' }, { status: 500 })
    }
  }

  try {
  if (event.event === 'charge.success' && data) {
    const reference = typeof data.reference === 'string' ? data.reference : null
    if (reference) {
      const { error } = await supabase
        .from('appointments')
        .update({ payment_status: 'paid' })
        .eq('paystack_reference', reference)
      if (error) throw error
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
    if (event.event === 'refund.reversed' || data.status === 'reversed') refundStatus = 'reversed'

    let refundQuery = supabase.from('platform_refund_records').select('id, booking_id').limit(1)
    if (refundReference) refundQuery = refundQuery.eq('paystack_refund_reference', refundReference)
    else if (transactionReference) refundQuery = refundQuery.eq('paystack_reference', transactionReference)

    const { data: refundRows, error: refundLookupError } = await refundQuery
    if (refundLookupError) throw refundLookupError
    const refundRow = Array.isArray(refundRows) ? refundRows[0] : null
    const bookingId = refundRow?.booking_id
      ? String(refundRow.booking_id)
      : null

    if (!bookingId || !refundRow) throw new Error('Refund webhook does not match a refund record.')
    {
      const { error } = await supabase
        .from('platform_refund_records')
        .update({
          status: refundStatus,
          failure_reason: data.status === 'failed' && typeof data.gateway_response === 'string'
            ? data.gateway_response
            : null,
          completed_at: refundStatus === 'successful' || refundStatus === 'failed' || refundStatus === 'reversed'
            ? new Date().toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', refundRow.id)
      if (error) throw error

        const { data: refundRowsForBooking, error: refundTotalsError } = await supabase
          .from('platform_refund_records')
          .select('amount_kobo, status')
          .eq('booking_id', bookingId)
        if (refundTotalsError) throw refundTotalsError
        const { data: booking, error: bookingLookupError } = await supabase
          .from('appointments')
          .select('deposit_paid_kobo, payment_outcome, payment_outcome_note')
          .eq('id', bookingId)
          .maybeSingle()
        if (bookingLookupError) throw bookingLookupError
        if (!booking || typeof booking.deposit_paid_kobo !== 'number') {
          throw new Error('Refund webhook booking could not be reconciled.')
        }

        const successfulRefundAmount = (refundRowsForBooking ?? [])
          .filter((refund) => refund.status === 'successful')
          .reduce((total, refund) => total + refund.amount_kobo, 0)
        const hasPendingRefund = (refundRowsForBooking ?? [])
          .some((refund) => refund.status === 'pending' || refund.status === 'processing')
        const refundOutcome = successfulRefundAmount >= booking.deposit_paid_kobo && booking.deposit_paid_kobo > 0
          ? 'refunded'
          : hasPendingRefund
            ? 'refund_pending'
            : 'normal'
        const preserveManualOutcome = booking.payment_outcome === 'disputed' || booking.payment_outcome === 'chargeback'
        const paymentOutcome = preserveManualOutcome && refundOutcome !== 'refunded'
          ? booking.payment_outcome
          : refundOutcome
        const paymentOutcomeNote = preserveManualOutcome && refundOutcome !== 'refunded'
          ? booking.payment_outcome_note
          : paymentOutcome === 'refunded'
          ? 'Full refund confirmed by Paystack.'
          : hasPendingRefund
            ? 'A Paystack refund is still processing.'
            : successfulRefundAmount > 0
              ? 'Partial refund confirmed by Paystack.'
              : refundStatus === 'reversed'
                ? 'Paystack reversed the refund.'
                : 'Paystack refund failed.'

      const { error: bookingUpdateError } = await supabase
        .from('appointments')
        .update({
            payment_outcome: paymentOutcome,
            payment_outcome_note: paymentOutcomeNote,
          payment_outcome_updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
      if (bookingUpdateError) throw bookingUpdateError
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

    if (typeof businessId === 'string' && typeof data.amount === 'number' && typeof data.transfer_code === 'string') {
      let payoutStatus: 'processing' | 'successful' | 'failed' | 'reversed' = 'processing'
      if (event.event === 'transfer.success') payoutStatus = 'successful'
      if (event.event === 'transfer.failed') payoutStatus = 'failed'
      if (event.event === 'transfer.reversed') payoutStatus = 'reversed'

      const { error } = await supabase
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
      if (error) throw error
    } else if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event.event)) {
      throw new Error('Transfer event could not be matched to a payout record.')
    }
  }

    const { error: processedError } = await supabase
      .from('platform_webhook_events')
      .update({ processing_status: 'processed', error_message: null })
      .eq('event_id', eventId)
    if (processedError) throw processedError
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.'
    const { error: statusError } = await supabase
      .from('platform_webhook_events')
      .update({ processing_status: 'failed', error_message: message })
      .eq('event_id', eventId)
    if (statusError) console.error('Could not save Paystack webhook failure:', statusError.message)
    console.error('Paystack webhook processing failed:', message)
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }

  return Response.json({ received: true })
}
