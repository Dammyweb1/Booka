'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionFeedback, BookaBooking, BookaBusiness, BookaService } from '@/lib/booka-types'

const businessTypes = ['Barbing', 'Hairdressing', 'Spa'] as const
const serviceTones = ['gold', 'teal', 'rose'] as const
const bookingStatuses = ['pending', 'confirmed', 'completed', 'cancelled'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function revalidateOwner(slug?: string) {
  revalidatePath('/backoffice')
  if (slug) revalidatePath(`/${slug}`)
}

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

type OwnerContext =
  | { error: string }
  | { supabase: SupabaseServerClient; business: { id: string; slug: string }; ownerId: string }

async function requireOwner(): Promise<OwnerContext> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { error: 'Supabase is not configured.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session expired. Sign in again.' }

  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error || !business) return { error: 'Your business profile could not be found.' }

  return { supabase, business, ownerId: user.id }
}

export async function saveService(input: unknown): Promise<ActionFeedback<BookaService>> {
  if (!isRecord(input)) return { success: false, message: 'Complete the service details.' }

  const id = typeof input.id === 'string' && input.id ? input.id : null
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const duration = Number(input.duration_minutes)
  const price = Number(input.price_naira)
  const tone = typeof input.tone === 'string' ? input.tone : ''
  const active = input.active !== false
  const imagePath = input.image_path === null || typeof input.image_path === 'string' ? input.image_path : undefined

  if (name.length < 2 || name.length > 120) {
    return { success: false, message: 'Service name must be between 2 and 120 characters.' }
  }
  if (!Number.isInteger(duration) || duration < 5 || duration > 600) {
    return { success: false, message: 'Duration must be between 5 and 600 minutes.' }
  }
  if (!Number.isInteger(price) || price < 0 || price > 100_000_000) {
    return { success: false, message: 'Enter a valid price in naira.' }
  }
  if (!serviceTones.includes(tone as (typeof serviceTones)[number])) {
    return { success: false, message: 'Choose a valid service colour.' }
  }

  const context = await requireOwner()
  if ('error' in context) return { success: false, message: context.error }

  const { supabase, business } = context
  if (('image_path' in input && imagePath === undefined) || (imagePath !== undefined && imagePath !== null && (
    imagePath.length > 256
    || !imagePath.startsWith(`${context.ownerId}/`)
    || imagePath.split('/').some((part) => !part || part === '.' || part === '..')
  ))) {
    return { success: false, message: 'Choose a valid service image.' }
  }

  if (id) {
    const { data: existingService, error: existingServiceError } = await supabase
      .from('services')
      .select('image_path')
      .eq('id', id)
      .eq('business_id', business.id)
      .maybeSingle()

    if (existingServiceError) return { success: false, message: 'Could not load that service. Try again.' }
    if (!existingService) return { success: false, message: 'That service could not be found.' }

    const { data, error } = await supabase
      .from('services')
      .update({
        name,
        duration_minutes: duration,
        price_naira: price,
        tone: tone as BookaService['tone'],
        active,
        ...(imagePath === undefined ? {} : { image_path: imagePath }),
      })
      .eq('id', id)
      .eq('business_id', business.id)
      .select('*')
      .maybeSingle()

    if (error) {
      if (error.code === '23505') return { success: false, message: 'You already have a service with that name.' }
      return { success: false, message: 'Could not save that service. Try again.' }
    }
    if (!data) return { success: false, message: 'That service could not be found.' }
    if (existingService.image_path && imagePath !== undefined && existingService.image_path !== imagePath) {
      const { error: cleanupError } = await supabase.storage.from('service-images').remove([existingService.image_path])
      if (cleanupError) console.error('Replaced service image cleanup failed:', cleanupError.message)
    }
    revalidateOwner(business.slug)
    return { success: true, message: 'Service updated.', data }
  }

  const { data, error } = await supabase
    .from('services')
    .insert({ business_id: business.id, name, duration_minutes: duration, price_naira: price, tone: tone as BookaService['tone'], active, image_path: imagePath ?? null })
    .select('*')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') return { success: false, message: 'You already have a service with that name.' }
    return { success: false, message: 'Could not add that service. Try again.' }
  }
  if (!data) return { success: false, message: 'Could not add that service. Try again.' }

  revalidateOwner(business.slug)
  return { success: true, message: 'Service added.', data }
}

export async function deleteService(id: unknown): Promise<ActionFeedback> {
  if (typeof id !== 'string' || !id) return { success: false, message: 'Choose a service to delete.' }

  const context = await requireOwner()
  if ('error' in context) return { success: false, message: context.error }

  const { error } = await context.supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', context.business.id)

  if (error) return { success: false, message: 'Could not delete that service. Try again.' }

  revalidateOwner(context.business.slug)
  return { success: true, message: 'Service deleted.' }
}

export async function setBookingStatus(id: unknown, status: unknown): Promise<ActionFeedback<BookaBooking>> {
  if (typeof id !== 'string' || !id) return { success: false, message: 'Choose a booking.' }
  if (typeof status !== 'string' || !bookingStatuses.includes(status as (typeof bookingStatuses)[number])) {
    return { success: false, message: 'Choose a valid booking status.' }
  }

  const context = await requireOwner()
  if ('error' in context) return { success: false, message: context.error }

  const { data, error } = await context.supabase
    .from('bookings')
    .update({ status: status as BookaBooking['status'] })
    .eq('id', id)
    .eq('business_id', context.business.id)
    .select('*')
    .maybeSingle()

  if (error) return { success: false, message: 'Could not update that booking. Try again.' }
  if (!data) return { success: false, message: 'That booking could not be found.' }

  revalidateOwner(context.business.slug)
  return { success: true, message: `Booking marked ${status}.`, data }
}

export async function deleteBooking(id: unknown): Promise<ActionFeedback> {
  if (typeof id !== 'string' || !id) return { success: false, message: 'Choose a booking to delete.' }

  const context = await requireOwner()
  if ('error' in context) return { success: false, message: context.error }

  const { data, error } = await context.supabase
    .from('bookings')
    .delete()
    .eq('id', id)
    .eq('business_id', context.business.id)
    .select('id')
    .maybeSingle()

  if (error) return { success: false, message: 'Could not delete that booking. Try again.' }
  if (!data) return { success: false, message: 'That booking could not be found.' }

  revalidateOwner(context.business.slug)
  return { success: true, message: 'Booking deleted.' }
}

export async function updateBusinessProfile(input: unknown): Promise<ActionFeedback<BookaBusiness>> {
  if (!isRecord(input)) return { success: false, message: 'Complete the business details.' }

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const businessType = typeof input.business_type === 'string' ? input.business_type : ''
  const ownerFirst = typeof input.owner_first_name === 'string' ? input.owner_first_name.trim() : ''
  const ownerLast = typeof input.owner_last_name === 'string' ? input.owner_last_name.trim() : ''
  const address = typeof input.address === 'string' ? input.address.trim() : ''
  const city = typeof input.city === 'string' ? input.city.trim() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''

  if (name.length < 2 || name.length > 120) return { success: false, message: 'Business name must be between 2 and 120 characters.' }
  if (!businessTypes.includes(businessType as (typeof businessTypes)[number])) return { success: false, message: 'Choose a valid business type.' }
  if (!ownerFirst || ownerFirst.length > 80) return { success: false, message: 'Enter the owner first name.' }
  if (!ownerLast || ownerLast.length > 80) return { success: false, message: 'Enter the owner last name.' }
  if (!address || address.length > 200) return { success: false, message: 'Enter the business address.' }
  if (!city || city.length > 100) return { success: false, message: 'Enter the city.' }
  if (!phone || phone.length > 32) return { success: false, message: 'Enter the phone number.' }

  const context = await requireOwner()
  if ('error' in context) return { success: false, message: context.error }

  const { data, error } = await context.supabase
    .from('businesses')
    .update({
      name,
      business_type: businessType as BookaBusiness['business_type'],
      owner_first_name: ownerFirst,
      owner_last_name: ownerLast,
      address,
      city,
      phone,
    })
    .eq('id', context.business.id)
    .select('id, slug, name, business_type, owner_first_name, owner_last_name, address, city, phone')
    .maybeSingle()

  if (error) return { success: false, message: 'Could not save your business details. Try again.' }
  if (!data) return { success: false, message: 'Your business profile could not be found.' }

  revalidateOwner(context.business.slug)
  return { success: true, message: 'Business details saved.', data }
}
