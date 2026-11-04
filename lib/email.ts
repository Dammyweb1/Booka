import { createSupabaseServiceClient } from '@/lib/supabase/admin'

const fromEmail = () => process.env.RESEND_FROM_EMAIL?.trim() || 'Booka <onboarding@resend.dev>'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatBookingTime(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export async function sendBookingConfirmationEmail(bookingId: string) {
  const resendKey = process.env.RESEND_API_KEY?.trim()
  const supabase = createSupabaseServiceClient()

  if (!resendKey || !supabase) {
    console.warn('Booking confirmation email skipped: RESEND_API_KEY or a Supabase server key is missing.')
    return false
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('customer_name, customer_email, starts_at, business_id, service_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError) {
    console.error('Booking confirmation lookup failed:', bookingError.message)
    return false
  }

  if (!booking) {
    console.error('Booking confirmation lookup failed: booking not found.')
    return false
  }

  const [{ data: business, error: businessError }, { data: payment, error: paymentError }] = await Promise.all([
    supabase
      .from('businesses')
      .select('name, slug, owner_first_name, address, city, phone')
      .eq('id', booking.business_id)
      .maybeSingle(),
    supabase
      .from('payments')
      .select('service_name, amount_naira, status')
      .eq('booking_id', bookingId)
      .maybeSingle(),
  ])

  if (businessError || paymentError) {
    console.error('Booking email details lookup failed:', businessError?.message ?? paymentError?.message)
    return false
  }

  if (!business || !payment) return false

  const firstName = booking.customer_name.trim().split(/\s+/)[0] ?? booking.customer_name
  const serviceName = payment.service_name
  const bookingTime = formatBookingTime(booking.starts_at)
  const amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(payment.amount_naira)
  const businessLink = `https://booka.co/${business.slug}`

  const html = `
    <div style="background:#f8f6f1;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#10253e;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e1ddd4;border-radius:18px;overflow:hidden;">
        <div style="background:#10253e;padding:28px 30px;color:#f8f4ec;">
          <div style="font:400 25px Georgia,serif;letter-spacing:-.04em;">booka</div>
          <div style="margin-top:18px;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#d6b979;">Booking received</div>
          <h1 style="margin:10px 0 0;font:400 31px Georgia,serif;letter-spacing:-.04em;color:#f8f4ec;">Hi ${escapeHtml(firstName)}, your spot is held.</h1>
        </div>
        <div style="padding:26px 30px 30px;">
          <p style="margin:0 0 18px;line-height:1.6;">Thanks for booking with <strong>${escapeHtml(business.name)}</strong>. Here are your booking details:</p>
          <div style="background:#f4f1ea;border-radius:12px;padding:18px 18px 16px;">
            <div style="font-size:12px;color:#7f878c;text-transform:uppercase;letter-spacing:.12em;font-weight:800;">${escapeHtml(serviceName)}</div>
            <div style="margin-top:8px;font:400 21px Georgia,serif;">${escapeHtml(bookingTime)}</div>
            <div style="margin-top:12px;font-size:13px;line-height:1.7;color:#56636f;">${escapeHtml(business.address)}, ${escapeHtml(business.city)}<br />${escapeHtml(business.phone)}</div>
          </div>
          <p style="margin:20px 0 0;line-height:1.6;">Amount due: <strong>${escapeHtml(amount)}</strong>. Complete payment from the booking screen to confirm your appointment.</p>
          <p style="margin:20px 0 0;line-height:1.6;">If anything looks wrong, contact ${escapeHtml(business.name)} directly on ${escapeHtml(business.phone)}.</p>
          <p style="margin:22px 0 0;"><a href="${escapeHtml(businessLink)}" style="display:inline-block;border-radius:999px;background:#10253e;color:#fffaf1;text-decoration:none;padding:11px 18px;font-size:12px;font-weight:800;">View ${escapeHtml(business.name)} on Booka</a></p>
        </div>
      </div>
    </div>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail(),
      to: [booking.customer_email],
      subject: `Booking received — ${business.name}`,
      html,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    console.error('Resend booking confirmation failed:', response.status, details)
    return false
  }

  return true
}
