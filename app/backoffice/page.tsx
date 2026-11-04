import { redirect } from 'next/navigation'
import BookaApp from '@/components/booka-app'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function isMissingSchema(error: { code?: string; message?: string }) {
  return error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(error.message ?? '')
}

export default async function BackofficePage() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/onboarding/business-setup')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/business-setup')

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, slug, name, business_type, owner_first_name, owner_last_name, address, city, phone')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (businessError) {
    if (isMissingSchema(businessError)) redirect('/onboarding/business-setup?error=schema')
    throw new Error('Unable to load your business profile.')
  }
  if (!business) redirect('/onboarding/business-setup')

  const [{ data: services, error: servicesError }, { data: bookings, error: bookingsError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('bookings')
      .select('*')
      .eq('business_id', business.id)
      .order('starts_at', { ascending: true }),
    supabase
      .from('payments')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false }),
  ])

  if (servicesError || bookingsError || paymentsError) {
    const error = servicesError ?? bookingsError ?? paymentsError
    if (error && isMissingSchema(error)) redirect('/onboarding/business-setup?error=schema')
    throw new Error('Unable to load your bookings.')
  }

  const paymentRecords = (payments ?? []).map((payment) => {
    const booking = (bookings ?? []).find((item) => item.id === payment.booking_id)
    return {
      ...payment,
      starts_at: booking?.starts_at ?? payment.created_at,
      booking_status: booking?.status ?? 'pending',
    }
  })

  return (
    <BookaApp
      initialView="backoffice"
      showPrototypeNav={false}
      businessId={business.id}
      businessName={business.name}
      businessSlug={business.slug}
      businessCategory={business.business_type}
      businessCity={business.city}
      businessAddress={business.address}
      businessPhone={business.phone}
      ownerFirstName={business.owner_first_name}
      ownerLastName={business.owner_last_name}
      ownerName={`${business.owner_first_name} ${business.owner_last_name}`}
      initialServices={services ?? []}
      initialBookings={bookings ?? []}
      initialPayments={paymentRecords}
    />
  )
}
