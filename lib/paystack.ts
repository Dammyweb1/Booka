import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Database } from '@/lib/supabase/database.types'
import { createSupabaseServiceClient } from '@/lib/supabase/admin'

type PaystackVerification = {
  status: string
  amount: number
  currency?: string
  channel?: string
  id?: number | string
  paid_at?: string | null
}

type PaymentLookup = Database['public']['Tables']['payments']['Row']
type BookingLookup = Database['public']['Tables']['bookings']['Row']

export type PaystackResult =
  | { ok: true; status: 'success' | 'failed'; businessSlug: string }
  | { ok: false; reason: string; businessSlug: string }

export function paystackSignatureIsValid(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false

  const digest = createHmac('sha512', secret).update(rawBody).digest('hex')
  const expected = Buffer.from(digest, 'utf8')
  const received = Buffer.from(signature, 'utf8')

  return expected.length === received.length && timingSafeEqual(expected, received)
}

async function verifyWithPaystack(secret: string, reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })

  const body: unknown = await response.json().catch(() => null)
  const payload = typeof body === 'object' && body !== null
    ? (body as { status?: boolean; message?: string; data?: PaystackVerification })
    : null

  if (!response.ok || !payload?.status || !payload.data) {
    return { verified: false as const, message: payload?.message ?? 'Paystack could not verify the transaction.' }
  }

  return { verified: true as const, data: payload.data }
}

// Writes only Paystack-verified outcomes. Everything (amount, booking,
// reference) is rechecked server-side before the payment or booking is
// touched.
export async function recordPaystackReference(reference: string): Promise<PaystackResult> {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim()
  const supabase = createSupabaseServiceClient()
  if (!secret || !supabase) return { ok: false, reason: 'payment-not-configured', businessSlug: '' }

  if (!reference || reference.length > 255) return { ok: false, reason: 'invalid-reference', businessSlug: '' }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('paystack_reference', reference)
    .maybeSingle<PaymentLookup>()

  if (paymentError) {
    console.error('Paystack payment lookup failed:', paymentError.message)
    return { ok: false, reason: 'payment-lookup-failed', businessSlug: '' }
  }
  if (!payment) return { ok: false, reason: 'payment-not-found', businessSlug: '' }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', payment.booking_id)
    .maybeSingle<BookingLookup>()

  if (bookingError) {
    console.error('Paystack booking lookup failed:', bookingError.message)
    return { ok: false, reason: 'booking-lookup-failed', businessSlug: '' }
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('slug')
    .eq('id', payment.business_id)
    .maybeSingle()

  if (businessError) {
    console.error('Paystack business lookup failed:', businessError.message)
    return { ok: false, reason: 'business-lookup-failed', businessSlug: '' }
  }

  const businessSlug = business?.slug ?? ''
  const verification = await verifyWithPaystack(secret, reference)
  const amountMatches = verification.verified && Math.round(verification.data.amount) === payment.amount_naira * 100

  if (verification.verified && verification.data.status === 'success' && amountMatches && booking) {
    const paidAt = verification.data.paid_at && !Number.isNaN(Date.parse(verification.data.paid_at))
      ? verification.data.paid_at
      : new Date().toISOString()

    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'success',
        channel: verification.data.channel ?? null,
        transaction_id: verification.data.id == null ? null : String(verification.data.id),
        paid_at: paidAt,
      })
      .eq('id', payment.id)

    if (paymentUpdateError) {
      console.error('Paystack success update failed:', paymentUpdateError.message)
      return { ok: false, reason: 'payment-update-failed', businessSlug }
    }

    if (booking.status !== 'cancelled') {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id)
        .in('status', ['pending', 'confirmed'])

      if (bookingUpdateError) {
        console.error('Paystack booking confirmation failed:', bookingUpdateError.message)
        return { ok: false, reason: 'booking-update-failed', businessSlug }
      }
    }

    return { ok: true, status: 'success', businessSlug }
  }

  const { error: failureUpdateError } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      channel: verification.verified ? verification.data.channel ?? null : null,
      transaction_id: verification.verified && verification.data.id != null ? String(verification.data.id) : null,
    })
    .eq('id', payment.id)

  if (failureUpdateError) {
    console.error('Paystack failure update failed:', failureUpdateError.message)
    return { ok: false, reason: 'payment-update-failed', businessSlug }
  }

  return { ok: true, status: 'failed', businessSlug }
}
