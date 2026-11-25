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

type BookingSelection = { serviceId: string; addonId: string }

function isBookingSelection(value: unknown): value is BookingSelection {
  if (!isRecord(value)) return false
  return (
    typeof value.serviceId === 'string' &&
    value.serviceId.length > 0 &&
    value.serviceId.length <= 120 &&
    typeof value.addonId === 'string' &&
    value.addonId.length > 0 &&
    value.addonId.length <= 120
  )
}

function parseBookingSelections(value: unknown): BookingSelection[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null

  const selections: BookingSelection[] = []
  for (const item of value) {
    if (!isBookingSelection(item)) return null
    selections.push(item)
  }

  const selectionKeys = selections.map((item) => `${item.serviceId}\u0000${item.addonId}`)
  return new Set(selectionKeys).size === selections.length ? selections : null
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
    items: submittedItems,
    clientName,
    clientPhone,
    clientEmail,
    clientNotes,
    appointmentDate,
    appointmentTime,
  } = body
  const items = parseBookingSelections(submittedItems)

  if (
    !items ||
    typeof slug !== 'string' || slug.length > 120 ||
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

  const { data: platformSettings, error: settingsError } = await supabase
    .from('platform_settings')
    .select('booking_deposit_percent, maintenance_mode')
    .eq('singleton', true)
    .maybeSingle()
  if (settingsError || !platformSettings) {
    return Response.json({ error: 'Platform checkout settings are unavailable.' }, { status: 503 })
  }
  if (platformSettings.maintenance_mode) {
    return Response.json({ error: 'Booking payments are temporarily paused. Please try again later.' }, { status: 503 })
  }
  const depositPercent = Number(platformSettings.booking_deposit_percent)
  if (!Number.isFinite(depositPercent) || depositPercent < 1 || depositPercent > 100) {
    return Response.json({ error: 'Booking deposit settings are invalid.' }, { status: 503 })
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('business_id, currency, lifecycle_status')
    .eq('slug', slug)
    .maybeSingle()
  if (businessError) {
    return Response.json({ error: 'Could not load the business for payment.' }, { status: 500 })
  }
  if (!business) {
    return Response.json({ error: 'This business could not be found.' }, { status: 404 })
  }
  if (business.lifecycle_status !== 'active') {
    return Response.json({ error: 'This studio is currently suspended and cannot accept bookings.' }, { status: 409 })
  }
  if (!business.currency.startsWith('NGN')) {
    return Response.json({ error: 'Paystack checkout currently supports NGN bookings only.' }, { status: 400 })
  }

  const categoryIds = [...new Set(items.map((item) => item.serviceId))]
  const addonIds = [...new Set(items.map((item) => item.addonId))]
  const { data: activeCategories, error: categoriesError } = await supabase
    .from('services')
    .select('id')
    .eq('business_id', business.business_id)
    .in('id', categoryIds)
    .eq('is_active', true)
  if (categoriesError) {
    return Response.json({ error: 'Could not load the selected categories.' }, { status: 500 })
  }
  if ((activeCategories ?? []).length !== categoryIds.length) {
    return Response.json({ error: 'One or more selected categories are no longer available.' }, { status: 400 })
  }

  const { data: availableAddons, error: addonsError } = await supabase
    .from('service_addons')
    .select('id, service_id, name, price, duration_minutes')
    .eq('business_id', business.business_id)
    .in('service_id', categoryIds)
    .in('id', addonIds)
    .eq('is_active', true)
    .gt('price', 0)
  if (addonsError) {
    return Response.json({ error: 'Could not load the selected bookable items.' }, { status: 500 })
  }
  const availableAddonsByKey = new Map(
    (availableAddons ?? []).map((addon) => [`${addon.service_id}\u0000${addon.id}`, addon])
  )
  const selectedAddons = items.map((item) =>
    availableAddonsByKey.get(`${item.serviceId}\u0000${item.addonId}`)
  ).filter((addon): addon is NonNullable<typeof addon> => addon !== undefined)
  if (selectedAddons.length !== items.length) {
    return Response.json({ error: 'One or more selected items are no longer available.' }, { status: 400 })
  }

  const totalPrice = selectedAddons.reduce((total, addon) => total + addon.price, 0)
  const depositPaidKobo = Math.round(totalPrice * depositPercent)
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
            items: items.map((item) => ({
              service_id: item.serviceId,
              addon_id: item.addonId,
            })),
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            client_email: clientEmail.trim(),
            client_notes: clientNotes.trim(),
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            deposit_paid_kobo: depositPaidKobo,
            deposit_percent: depositPercent,
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
