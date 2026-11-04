'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type BusinessType = 'Barbing' | 'Hairdressing' | 'Spa'

type BusinessRegistration = {
  businessName: string
  businessType: BusinessType
  firstName: string
  lastName: string
  address: string
  city: string
  phone: string
  email: string
  password: string
}

type ActionResult = {
  success: boolean
  message: string
  authenticated?: boolean
  pendingConfirmation?: boolean
}

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function validateRegistration(value: unknown): { data?: BusinessRegistration; error?: string } {
  if (!isRecord(value)) return { error: 'Please complete the onboarding form.' }

  const fields = ['businessName', 'firstName', 'lastName', 'address', 'city', 'phone', 'email', 'password']
  if (fields.some((field) => typeof value[field] !== 'string')) {
    return { error: 'Please complete all required fields.' }
  }

  const businessName = (value.businessName as string).trim()
  const firstName = (value.firstName as string).trim()
  const lastName = (value.lastName as string).trim()
  const address = (value.address as string).trim()
  const city = (value.city as string).trim()
  const phone = (value.phone as string).trim()
  const email = (value.email as string).trim().toLowerCase()
  const password = value.password as string
  const businessType = value.businessType

  if (typeof businessType !== 'string' || !['Barbing', 'Hairdressing', 'Spa'].includes(businessType)) {
    return { error: 'Choose a valid business type.' }
  }
  if (businessName.length < 2 || businessName.length > 120) return { error: 'Business name must be between 2 and 120 characters.' }
  if (!firstName || !lastName || !address || !city || !phone) return { error: 'Please complete all owner and business contact fields.' }
  if (firstName.length > 80 || lastName.length > 80 || address.length > 200 || city.length > 100 || phone.length > 32) {
    return { error: 'One or more contact details are too long.' }
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' }
  if (password.length < 8 || password.length > 128) return { error: 'Password must be between 8 and 128 characters.' }

  return {
    data: {
      businessName,
      businessType: businessType as BusinessType,
      firstName,
      lastName,
      address,
      city,
      phone,
      email,
      password,
    },
  }
}

function getSupabaseSetupError(): ActionResult {
  return {
    success: false,
    message: 'Supabase is not configured. Add your project URL and publishable key to .env.local, then restart the dev server.',
  }
}

function getMissingSchemaMessage(action: 'create' | 'profile'): string {
  return action === 'create'
    ? 'Your account could not be created because the Booka database schema is missing. Run the Supabase migration and try again.'
    : 'Your account was created, but your business profile could not be saved because the Booka database tables are missing. Run the Supabase migration, then sign in to finish setup.'
}

function isMissingSchemaError(code: string | undefined, message: string): boolean {
  return code === 'PGRST205' || code === '42P01' || /schema cache|does not exist/i.test(message)
}

// Supabase needs an absolute URL to send owners back to after they confirm
// their email. Prefer an explicit setting, then fall back to the request.
async function getSiteUrl(): Promise<string | undefined> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  const headerStore = await headers()
  const origin = headerStore.get('origin')
  if (origin) return origin

  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  if (!host) return undefined
  const protocol = headerStore.get('x-forwarded-proto') ?? 'http'
  return `${protocol}://${host}`
}

async function saveBusinessProfile(supabase: SupabaseClient, payload: BusinessRegistration, ownerId: string): Promise<string | null> {
  const { error } = await supabase
    .from('businesses')
    .upsert(
      {
        owner_id: ownerId,
        name: payload.businessName,
        business_type: payload.businessType,
        owner_first_name: payload.firstName,
        owner_last_name: payload.lastName,
        address: payload.address,
        city: payload.city,
        phone: payload.phone,
      },
      { onConflict: 'owner_id' },
    )
    .select('id')
    .single()

  if (error) {
    console.error('Supabase business profile write failed:', error.message, error.code)
    if (isMissingSchemaError(error.code, error.message)) return getMissingSchemaMessage('profile')
    return 'Your account was created, but we could not save your business profile. Please try again in a moment.'
  }

  return null
}

function getSignUpErrorMessage(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'An account with this email already exists. Sign in instead.'
  }
  if (normalized.includes('database error') || normalized.includes('schema')) {
    return getMissingSchemaMessage('create')
  }
  return 'We could not create your account. Check your details or sign in if you already have an account.'
}

export async function registerBusiness(value: unknown): Promise<ActionResult> {
  const validation = validateRegistration(value)
  if (!validation.data) return { success: false, message: validation.error ?? 'Please check the form and try again.' }

  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return getSupabaseSetupError()

    const siteUrl = await getSiteUrl()
    const { data, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
        data: {
          business_name: validation.data.businessName,
          business_type: validation.data.businessType,
          owner_first_name: validation.data.firstName,
          owner_last_name: validation.data.lastName,
          address: validation.data.address,
          city: validation.data.city,
          phone: validation.data.phone,
        },
      },
    })

    if (error) {
      console.error('Supabase business registration failed:', error.message)
      return { success: false, message: getSignUpErrorMessage(error.message) }
    }
    if (!data.user) return { success: false, message: 'Supabase did not return a new account. Please try again.' }
    if (data.user.identities?.length === 0) {
      return { success: false, message: 'An account with this email already exists. Sign in instead.' }
    }

    // The database trigger creates the business row from the signup metadata,
    // so an unconfirmed account is already persisted without a session.
    if (!data.session) {
      return {
        success: true,
        message: 'Your business profile is saved. Confirm your email address, then sign in to open your backoffice.',
        authenticated: false,
        pendingConfirmation: true,
      }
    }

    const profileError = await saveBusinessProfile(supabase, validation.data, data.user.id)
    if (profileError) {
      return { success: false, message: profileError }
    }

    return {
      success: true,
      message: 'Your account and business profile are ready.',
      authenticated: true,
    }
  } catch (error) {
    console.error('Supabase business registration request failed:', error)
    return { success: false, message: 'Could not reach Supabase. Check your project settings and try again.' }
  }
}

export async function signInOwner(emailValue: unknown, passwordValue: unknown): Promise<ActionResult> {
  if (typeof emailValue !== 'string' || typeof passwordValue !== 'string') {
    return { success: false, message: 'Enter your email and password.' }
  }

  const email = emailValue.trim().toLowerCase()
  const password = passwordValue
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 128) {
    return { success: false, message: 'Enter a valid email and password.' }
  }

  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return getSupabaseSetupError()

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('Supabase owner sign-in failed:', error.message)
      return { success: false, message: 'We could not sign you in. Check your email and password, and confirm your email address.' }
    }

    return { success: true, message: 'You are signed in.', authenticated: true }
  } catch (error) {
    console.error('Supabase owner sign-in request failed:', error)
    return { success: false, message: 'Could not reach Supabase. Check your project settings and try again.' }
  }
}

export async function requestPasswordReset(emailValue: unknown): Promise<ActionResult> {
  if (typeof emailValue !== 'string') {
    return { success: false, message: 'Enter the email you signed up with.' }
  }

  const email = emailValue.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Enter a valid email address.' }
  }

  const genericMessage = 'If an account exists for that email, a password reset link is on its way.'

  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return getSupabaseSetupError()

    const siteUrl = await getSiteUrl()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl ? `${siteUrl}/auth/callback?next=/reset-password` : undefined,
    })

    if (error) {
      console.error('Supabase password reset request failed:', error.message)
      if (/rate limit|too many/i.test(error.message)) {
        return { success: false, message: 'Too many reset requests. Wait a few minutes and try again.' }
      }
    }

    // Always return the same message so the form cannot be used to discover
    // which email addresses have a Booka account.
    return { success: true, message: genericMessage }
  } catch (error) {
    console.error('Supabase password reset request failed:', error)
    return { success: false, message: 'Could not reach Supabase. Check your project settings and try again.' }
  }
}

export async function updateOwnerPassword(passwordValue: unknown): Promise<ActionResult> {
  if (typeof passwordValue !== 'string' || passwordValue.length < 8 || passwordValue.length > 128) {
    return { success: false, message: 'Password must be between 8 and 128 characters.' }
  }

  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return getSupabaseSetupError()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'Your reset link has expired. Request a new password reset link.' }
    }

    const { error } = await supabase.auth.updateUser({ password: passwordValue })
    if (error) {
      console.error('Supabase password update failed:', error.message)
      return { success: false, message: 'We could not update your password. Request a new reset link.' }
    }

    return { success: true, message: 'Your password has been updated.', authenticated: true }
  } catch (error) {
    console.error('Supabase password update request failed:', error)
    return { success: false, message: 'Could not reach Supabase. Check your project settings and try again.' }
  }
}

export async function signOutOwner(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Supabase owner sign-out failed:', error.message)
    throw new Error('Unable to sign out. Please try again.')
  }

  redirect('/')
}
