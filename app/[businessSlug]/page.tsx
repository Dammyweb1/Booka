import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BookaApp from '@/components/booka-app'
import { createSupabasePublicClient } from '@/lib/supabase/public'

type BusinessLandingPageProps = {
  params: Promise<{ businessSlug: string }>
}

// Runs without the owner's cookies so a signed-in owner can still view other
// public pages, and so anonymous visitors only read the public booking-page columns.
const getBusinessBySlug = cache(async (slug: string) => {
  const supabase = createSupabasePublicClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('businesses')
    .select('id, slug, name, business_type, city, address, phone')
    .eq('slug', slug.toLowerCase())
    .maybeSingle()

  if (error) {
    console.error('Supabase public business lookup failed:', error.message)
    return null
  }

  return data
})

const getServices = cache(async (businessId: string) => {
  const supabase = createSupabasePublicClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Supabase public services lookup failed:', error.message)
    return []
  }

  return data ?? []
})

export async function generateMetadata({ params }: BusinessLandingPageProps): Promise<Metadata> {
  const { businessSlug } = await params
  const business = await getBusinessBySlug(businessSlug)
  if (!business) return {}

  return {
    title: `${business.name} — Book on Booka`,
    description: `Book an appointment at ${business.name} in ${business.city}.`,
  }
}

export default async function BusinessLandingPage({ params }: BusinessLandingPageProps) {
  const { businessSlug } = await params
  const business = await getBusinessBySlug(businessSlug)
  if (!business) notFound()

  const services = await getServices(business.id)

  return (
    <BookaApp
      initialView="landing"
      showPrototypeNav={false}
      businessId={business.id}
      businessName={business.name}
      businessSlug={business.slug}
      businessCategory={business.business_type}
      businessCity={business.city}
      businessAddress={business.address}
      businessPhone={business.phone}
      initialServices={services}
    />
  )
}
