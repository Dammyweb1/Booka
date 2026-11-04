'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { createSupabaseServiceClient } from '@/lib/supabase/admin'
import type { ActionFeedback } from '@/lib/booka-types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function friendlyError(message: string) {
  if (/already booked/i.test(message)) return 'That time is already booked. Choose another slot.'
  if (/not available/i.test(message)) return 'That service is no longer available. Refresh and try again.'
  if (/future date/i.test(message)) return 'Choose a future date and time.'
  if (/customer name/i.test(message)) return 'Enter the customer name.'
  if (/email address/i.test(message)) return 'Enter a valid email address.'
  if (/phone number/i.test(message)) return 'Enter a valid phone number.'
  return 'Could not send your booking request. Try again.'
}

async function siteOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (fromEnv) return fromEnv

  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const protocol = headerList.get('x-forwarded-proto') ?? 'https'
  return host ? `${protocol}://${host}` : 'http://localhost:3000'
}

export async function createPublicBooking(input: unknown): Promise<ActionFeedback<{ bookingId: string; emailSent: boolean }>> {
  if (!isRecord(input)) return { success: false, message: 'Complete the booking form.' }

  const businessId = typeof input.business_id === 'string' ? input.business_id : ''
  const businessSlug = typeof input.business_slug === 'string' ? input.business_slug : ''
  const serviceId = typeof input.service_id === 'string' ? input.service_id : ''
  const customerName = typeof input.customer_name === 'string' ? input.customer_name.trim() : ''
  const customerEmail = typeof input.customer_email === 'string' ? input.customer_email.trim() : ''
  const customerPhone = typeof input.customer_phone === 'string' ? input.customer_phone.trim() : ''
  const startsAt = typeof input.starts_at === 'string' ? input.starts_at : ''
  const notes = typeof input.notes === 'string' ? input.notes.trim() : ''

  if (!businessId || !serviceId) return { success: false, message: 'Choose a service to book.' }
  if (customerName.length < 2 || customerName.length > 120) return { success: false, message: 'Enter your full name.' }
  if (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { success: false, message: 'Enter a valid email address.' }
  }
  if (customerPhone.length < 5 || customerPhone.length > 32) return { success: false, message: 'Enter a valid phone number.' }
  if (notes.length > 500) return { success: false, message: 'Keep notes under 500 characters.' }

  const startsAtDate = new Date(startsAt)
  if (!startsAt || Number.isNaN(startsAtDate.getTime()) || startsAtDate.getTime() <= Date.now()) {
    return { success: false, message: 'Choose a future date and time.' }
  }

  const supabase = createSupabasePublicClient()
  if (!supabase) return { success: false, message: 'Booking is unavailable right now. Try again later.' }

  const { data, error } = await supabase.rpc('create_public_booking', {
    p_business_id: businessId,
    p_service_id: serviceId,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone,
    p_starts_at: startsAtDate.toISOString(),
    p_notes: notes || null,
  })

  if (error) {
    console.error('Supabase public booking failed:', error.message)
    return { success: false, message: friendlyError(error.message) }
  }

  const bookingId = typeof data === 'string' ? data : ''
  const emailSent = bookingId ? await sendBookingConfirmationEmail(bookingId).catch((error) => {
    console.error('Booking confirmation email failed:', error)
    return false
  }) : false

  if (businessSlug) revalidatePath(`/${businessSlug}`)
  revalidatePath('/backoffice')
  return {
    success: true,
    message: emailSent
      ? 'Booking held — check your inbox for the confirmation email.'
      : 'Booking held. Complete payment to confirm your visit.',
    data: { bookingId, emailSent },
  }
}

export async function startPublicPayment(input: unknown): Promise<ActionFeedback<{ authorization_url: string }>> {
  if (!isRecord(input) || typeof input.booking_id !== 'string' || !uuidPattern.test(input.booking_id)) {
    return { success: false, message: 'Choose a valid booking.' }
  }

  const secret = process.env.PAYSTACK_SECRET_KEY?.trim()
  const supabase = createSupabaseServiceClient()
  if (!secret || !supabase) {
    return { success: false, message: 'Paystack is not configured yet. Ask the owner to add the test keys.' }
  }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', input.booking_id)
    .maybeSingle()

  if (paymentError) {
    console.error('Payment lookup failed:', paymentError.message)
    return { success: false, message: 'Could not load the payment record. Try again.' }
  }
  if (!payment) return { success: false, message: 'The payment record for this booking could not be found.' }
  if (payment.status === 'success') return { success: false, message: 'This booking is already paid.' }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, business_id, status')
    .eq('id', payment.booking_id)
    .maybeSingle()

  if (bookingError) {
    console.error('Booking lookup failed:', bookingError.message)
    return { success: false, message: 'Could not load the booking. Try again.' }
  }
  if (!booking) return { success: false, message: 'The booking could not be found.' }
  if (booking.status === 'cancelled') return { success: false, message: 'This booking has been cancelled and cannot be paid.' }

  // Users can retry a cancelled or failed Paystack attempt. A new reference is
  // required once a transaction has been abandoned or declined.
  const shouldRefreshReference = payment.status === 'failed' || payment.status === 'abandoned'
  const reference = shouldRefreshReference
    ? `booka_${Date.now().toString(36)}_${randomBytes(5).toString('hex')}`
    : payment.paystack_reference

  if (shouldRefreshReference) {
    const { error: resetError } = await supabase
      .from('payments')
      .update({
        status: 'awaiting_payment',
        paystack_reference: reference,
        paystack_access_code: null,
        authorization_url: null,
        channel: null,
        transaction_id: null,
        paid_at: null,
      })
      .eq('id', payment.id)

    if (resetError) {
      console.error('Payment reset failed:', resetError.message)
      return { success: false, message: 'Could not start another payment attempt. Try again.' }
    }
  } else if (payment.status === 'initialized' && payment.authorization_url) {
    return { success: true, message: 'Opening Paystack…', data: { authorization_url: payment.authorization_url } }
  }

  const callbackUrl = `${await siteOrigin()}/api/paystack/callback`
  const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payment.customer_email,
      amount: payment.amount_naira * 100,
      reference,
      callback_url: callbackUrl,
      metadata: {
        booking_id: payment.booking_id,
        business_id: payment.business_id,
        service_name: payment.service_name,
      },
    }),
  })

  const paystackBody: unknown = await paystackResponse.json().catch(() => null)
  const paystackRecord = typeof paystackBody === 'object' && paystackBody !== null
    ? (paystackBody as { status?: boolean; message?: string; data?: { authorization_url?: string; access_code?: string } })
    : null

  if (!paystackResponse.ok || !paystackRecord?.status || !paystackRecord.data?.authorization_url) {
    console.error('Paystack initialization failed:', paystackRecord?.message ?? paystackResponse.status)
    return { success: false, message: paystackRecord?.message ?? 'Paystack could not start checkout. Try again.' }
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'initialized',
      paystack_reference: reference,
      paystack_access_code: paystackRecord.data.access_code ?? null,
      authorization_url: paystackRecord.data.authorization_url,
    })
    .eq('id', payment.id)

  if (updateError) {
    console.error('Paystack checkout persistence failed:', updateError.message)
    return { success: false, message: 'Checkout started, but the payment record could not be updated. Try again.' }
  }

  return { success: true, message: 'Opening Paystack…', data: { authorization_url: paystackRecord.data.authorization_url } }
}
