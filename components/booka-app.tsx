'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerBusiness, requestPasswordReset, signInOwner, signOutOwner, updateOwnerPassword } from '@/app/onboarding/actions'
import { createPublicBooking, startPublicPayment } from '@/app/booking/actions'
import Backoffice from '@/components/backoffice'
import Logo from '@/components/logo'
import Footer from '@/components/footer'
import { serviceImageFor } from '@/lib/service-images'
import { formatNaira, type BookaBooking, type BookaPaymentRecord, type BookaService, type BusinessCategory } from '@/lib/booka-types'
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  HeartPulse,
  MapPin,
  Menu,
  Phone,
  Scissors,
  Sparkles,
  X,
} from 'lucide-react'

type LandingService = { id?: string; name: string; duration: string; price: string; amountNaira: number; tone: 'gold' | 'teal' | 'rose'; image_path?: string | null }

const defaultServiceMenu: LandingService[] = [
  { name: 'Spa', duration: '20 min', price: '₦15,000', amountNaira: 15000, tone: 'teal', image_path: '68c55238-cb59-4b46-b33c-d5f0ea7beabb/18a88a39-88ed-4cbe-bb8a-7f0270dbd26b.jpg' },
  { name: 'Barbing', duration: '30 min', price: '₦8,000', amountNaira: 8000, tone: 'gold', image_path: '68c55238-cb59-4b46-b33c-d5f0ea7beabb/16261d19-8fa3-495d-98ad-21535180597b.jpg' },
  { name: 'Hairdressing', duration: '30 min', price: '₦10,000', amountNaira: 10000, tone: 'rose', image_path: '68c55238-cb59-4b46-b33c-d5f0ea7beabb/8c050354-324b-4220-aca9-8360d0a35ab3.jpg' },
]

const landingCopy: Record<BusinessCategory, {
  label: string
  headingStart: string
  headingEm: string
  body: string
  captionFirst: string
  captionSecond: string
}> = {
  Barbing: {
    label: 'Barbershop',
    headingStart: 'Fresh cuts,',
    headingEm: 'every time.',
    body: 'Precision cuts, beard care, and a chair that always feels like yours.',
    captionFirst: 'Sharp looks.',
    captionSecond: 'Easy booking.',
  },
  Hairdressing: {
    label: 'Hair studio',
    headingStart: 'Good hair days,',
    headingEm: 'made simple.',
    body: 'Considered styling, healthy hair care, and finishing touches from a team that listens.',
    captionFirst: 'Your hair.',
    captionSecond: 'Your moment.',
  },
  Spa: {
    label: 'Wellness studio',
    headingStart: 'Make space for',
    headingEm: 'you.',
    body: 'A considered menu of restorative treatments, quiet rituals, and unhurried care.',
    captionFirst: 'Slow down.',
    captionSecond: 'Feel more.',
  },
}

const businessTypes = [
  { name: 'Barbing', icon: Scissors },
  { name: 'Hairdressing', icon: Sparkles },
  { name: 'Spa', icon: HeartPulse },
]

type BookaView = 'onboarding' | 'landing' | 'backoffice' | 'reset'

type AuthMode = 'register' | 'signin' | 'forgot'

type AuthFeedback = { success: boolean; message: string }

type BookaAppProps = {
  initialView?: BookaView
  initialStep?: number
  showPrototypeNav?: boolean
  businessId?: string
  businessName?: string
  businessSlug?: string
  businessCategory?: BusinessCategory
  businessCity?: string
  businessAddress?: string
  businessPhone?: string
  ownerFirstName?: string
  ownerLastName?: string
  ownerName?: string
  initialServices?: BookaService[]
  initialBookings?: BookaBooking[]
  initialPayments?: BookaPaymentRecord[]
  initialFeedback?: AuthFeedback | null
}

export default function BookaApp({
  initialView = 'backoffice',
  initialStep = 0,
  showPrototypeNav = true,
  businessId = '',
  businessName = 'Your business',
  businessSlug = '',
  businessCategory = 'Spa',
  businessCity = 'Lagos',
  businessAddress = '',
  businessPhone = '',
  ownerFirstName = 'there',
  ownerLastName = '',
  ownerName = 'Business owner',
  initialServices = [],
  initialBookings = [],
  initialPayments = [],
  initialFeedback = null,
}: BookaAppProps) {
  const router = useRouter()
  const landing = landingCopy[businessCategory]
  const services: LandingService[] = initialServices.length > 0
    ? initialServices
        .filter((service) => service.active)
        .map((service) => ({
          id: service.id,
          name: service.name,
          duration: `${service.duration_minutes} min`,
          price: formatNaira(service.price_naira),
          amountNaira: service.price_naira,
          tone: service.tone,
          image_path: service.image_path,
        }))
    : showPrototypeNav
      ? defaultServiceMenu
      : []
  const [view, setView] = useState<BookaView>(initialView)
  const [step, setStep] = useState(initialStep)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [businessType, setBusinessType] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [submitting, setSubmitting] = useState(false)
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback | null>(initialFeedback)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [bookingService, setBookingService] = useState<LandingService | null>(null)
  const [lastBookingId, setLastBookingId] = useState<string | null>(null)
  const [paymentStarting, setPaymentStarting] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingFeedback, setBookingFeedback] = useState<AuthFeedback | null>(null)
  const [bookingDetails, setBookingDetails] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    startsAt: '',
    notes: '',
  })
  const [ownerDetails, setOwnerDetails] = useState({
    businessName: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    password: '',
  })

  function updateOwnerDetail(field: keyof typeof ownerDetails, value: string) {
    setOwnerDetails((current) => ({ ...current, [field]: value }))
  }

  function continueToOwnerDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthFeedback(null)
    setStep(1)
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setAuthFeedback(null)
    try {
      const result = await registerBusiness({ ...ownerDetails, businessType })
      setAuthFeedback(result)
      if (result.authenticated) {
        router.push('/backoffice')
      } else if (result.success && result.pendingConfirmation) {
        setPendingEmail(ownerDetails.email)
      }
    } catch {
      setAuthFeedback({ success: false, message: 'Could not reach Supabase. Check your project settings and try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setAuthFeedback(null)
    try {
      const result = await signInOwner(ownerDetails.email, ownerDetails.password)
      setAuthFeedback(result)
      if (result.authenticated) router.push('/backoffice')
    } catch {
      setAuthFeedback({ success: false, message: 'Could not reach Supabase. Check your project settings and try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setAuthFeedback(null)
    try {
      const result = await requestPasswordReset(ownerDetails.email)
      setAuthFeedback(result)
    } catch {
      setAuthFeedback({ success: false, message: 'Could not reach Supabase. Check your project settings and try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthFeedback(null)

    if (newPassword !== confirmPassword) {
      setAuthFeedback({ success: false, message: 'Those passwords do not match. Try again.' })
      return
    }

    setSubmitting(true)
    try {
      const result = await updateOwnerPassword(newPassword)
      setAuthFeedback(result)
      if (result.authenticated) {
        setNewPassword('')
        setConfirmPassword('')
        router.push('/backoffice')
      }
    } catch {
      setAuthFeedback({ success: false, message: 'Could not reach Supabase. Check your project settings and try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  function defaultBookingTime() {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(10, 0, 0, 0)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T10:00`
  }

  function openBooking(service: LandingService) {
    setBookingService(service)
    setLastBookingId(null)
    setBookingFeedback(service.id ? null : { success: false, message: 'Online booking is not available for this service yet.' })
    setBookingDetails((current) => ({ ...current, startsAt: current.startsAt || defaultBookingTime() }))
  }

  function closeBookingModal() {
    if (bookingSubmitting) return
    setBookingService(null)
    setBookingFeedback(null)
  }

  useEffect(() => {
    if (!bookingService) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeBookingModal()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingService, bookingSubmitting])

  async function startPayment() {
    if (!lastBookingId || !bookingService) {
      setBookingFeedback({ success: false, message: 'Create the booking before paying.' })
      return
    }

    setPaymentStarting(true)
    setBookingFeedback(null)
    try {
      const result = await startPublicPayment({ booking_id: lastBookingId })
      setBookingFeedback(result.success ? null : { success: false, message: result.message })
      if (result.success && result.data?.authorization_url) {
        window.location.assign(result.data.authorization_url)
      }
    } catch {
      setBookingFeedback({ success: false, message: 'Could not open Paystack. Try again.' })
    } finally {
      setPaymentStarting(false)
    }
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!businessId || !bookingService?.id) {
      setBookingFeedback({ success: false, message: 'Online booking is not available yet. Call the business to book.' })
      return
    }

    setBookingSubmitting(true)
    setBookingFeedback(null)
    try {
      const result = await createPublicBooking({
        business_id: businessId,
        business_slug: businessSlug,
        service_id: bookingService.id,
        customer_name: bookingDetails.customerName,
        customer_email: bookingDetails.customerEmail,
        customer_phone: bookingDetails.customerPhone,
        starts_at: bookingDetails.startsAt ? new Date(bookingDetails.startsAt).toISOString() : '',
        notes: bookingDetails.notes,
      })
      setBookingFeedback(result)
      if (result.success) {
        const bookingId = result.data?.bookingId
        setLastBookingId(bookingId ?? null)
        setBookingDetails({ customerName: '', customerEmail: '', customerPhone: '', startsAt: '', notes: '' })
        if (bookingId) {
          setBookingFeedback({ success: true, message: 'Booking held. Opening secure Paystack checkout…' })
          const payment = await startPublicPayment({ booking_id: bookingId })
          if (payment.success && payment.data?.authorization_url) {
            window.location.assign(payment.data.authorization_url)
          } else {
            setBookingFeedback({ success: false, message: payment.message })
          }
        } else {
          setBookingFeedback({ success: false, message: 'Your booking was held, but we could not find its payment details. Contact the business to complete your booking.' })
        }
      }
    } catch {
      setBookingFeedback({ success: false, message: 'Could not send your booking. Try again.' })
    } finally {
      setBookingSubmitting(false)
    }
  }

  return (
    <main className={`booka-app ${view === 'onboarding' || view === 'reset' ? 'onboarding-app' : ''}`}>
      {showPrototypeNav && <>
        <nav className="prototype-nav" aria-label="Prototype screens">
          <Logo />
          <div className="prototype-tabs">
            <button className={view === 'onboarding' ? 'active' : ''} onClick={() => setView('onboarding')}>A / B onboarding</button>
            <button className={view === 'landing' ? 'active' : ''} onClick={() => setView('landing')}>E / public page</button>
            <button className={view === 'backoffice' ? 'active' : ''} onClick={() => setView('backoffice')}>C / backoffice</button>
          </div>
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setShowMobileNav(!showMobileNav)}><Menu size={18} /></button>
        </nav>
        {showMobileNav && <div className="mobile-screen-nav">{['onboarding', 'landing', 'backoffice'].map((item) => <button key={item} onClick={() => { setView(item as typeof view); setShowMobileNav(false) }}>{item}</button>)}</div>}
      </>}

      {view === 'onboarding' && (
        <section className="onboarding-screen screen-shell">
          <aside className="onboarding-rail">
            <div>
              <Logo light />
              <p className="eyebrow">A calm start for busy owners</p>
              <h1>Make every booking feel effortless.</h1>
              <p className="rail-copy">Set up your business, share one beautiful link, and let Booka handle the details.</p>
            </div>
            <div className="rail-bottom"><span>01 — 02</span><div className="progress-line"><i style={{ width: step === 0 ? '50%' : '100%' }} /></div><span>Booka / 2026</span></div>
          </aside>
          <div className="onboarding-form-area">
            <div className="form-topline"><span>{authMode === 'register' ? 'Already have an account?' : 'New to Booka?'} <button type="button" onClick={() => { setAuthMode(authMode === 'register' ? 'signin' : 'register'); setAuthFeedback(null); setPendingEmail(null) }}>{authMode === 'register' ? 'Sign in' : 'Create an account'}</button></span></div>
            {pendingEmail ? (
              <div className="form-card">
                <span className="step-kicker">One last step</span>
                <h2>Check your inbox.</h2>
                <p>We sent a confirmation link to <strong>{pendingEmail}</strong>. Open it to activate your account, then sign in to open your backoffice.</p>
                <p className="form-feedback success" role="status">{authFeedback?.message}</p>
                <button className="primary-button" type="button" onClick={() => { setPendingEmail(null); setAuthMode('signin'); setAuthFeedback(null) }}>Go to sign in <ArrowRight size={17} /></button>
              </div>
            ) : authMode === 'signin' ? (
              <div className="form-card">
                <span className="step-kicker">Owner sign in</span>
                <h2>Welcome back.</h2>
                <p>Sign in to your Booka owner account.</p>
                <form onSubmit={submitSignIn}>
                  <label>Email<input type="email" autoComplete="email" required placeholder="Enter the email you signed up with" value={ownerDetails.email} onChange={(event) => updateOwnerDetail('email', event.target.value)} /></label>
                  <label>Password<input type="password" autoComplete="current-password" required placeholder="Enter your account password" value={ownerDetails.password} onChange={(event) => updateOwnerDetail('password', event.target.value)} /></label>
                  <div className="forgot-row"><button type="button" className="text-button" onClick={() => { setAuthMode('forgot'); setAuthFeedback(null) }}>Forgot password?</button></div>
                  {authFeedback && <p className={`form-feedback ${authFeedback.success ? 'success' : 'error'}`} role={authFeedback.success ? 'status' : 'alert'}>{authFeedback.message}</p>}
                  <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button>
                </form>
              </div>
            ) : authMode === 'forgot' ? (
              <div className="form-card">
                <span className="step-kicker">Account recovery</span>
                <h2>Reset your password.</h2>
                <p>Enter the email you signed up with and we will send you a secure reset link.</p>
                <form onSubmit={submitForgotPassword}>
                  <label>Email<input type="email" required autoComplete="email" placeholder="Enter the email you signed up with" value={ownerDetails.email} onChange={(event) => updateOwnerDetail('email', event.target.value)} /></label>
                  {authFeedback && <p className={`form-feedback ${authFeedback.success ? 'success' : 'error'}`} role={authFeedback.success ? 'status' : 'alert'}>{authFeedback.message}</p>}
                  <div className="form-actions"><button type="button" className="text-button" onClick={() => { setAuthMode('signin'); setAuthFeedback(null) }}>Back to sign in</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset link'} <ArrowRight size={17} /></button></div>
                </form>
              </div>
            ) : step === 0 ? (
              <div className="form-card">
                <span className="step-kicker">Step 01 / 02</span>
                <h2>Tell us about your business.</h2>
                <p>We will shape your booking experience around what you do best.</p>
                <form onSubmit={continueToOwnerDetails}>
                  <label>Business name<input required minLength={2} maxLength={120} placeholder="e.g. Adunni Glow Studio" value={ownerDetails.businessName} onChange={(event) => updateOwnerDetail('businessName', event.target.value)} /></label>
                  <label>Business type<div className="business-type-select"><select className={`select-input ${businessType ? '' : 'placeholder'}`} required value={businessType} onChange={(event) => setBusinessType(event.target.value)}><option value="">Choose a category</option>{businessTypes.map(({ name }) => <option key={name} value={name}>{name}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></div></label>
                  <div className="category-pills">{businessTypes.map(({ name, icon: Icon }) => <button key={name} type="button" className={businessType === name ? 'selected' : ''} aria-pressed={businessType === name} onClick={() => setBusinessType(name)}><Icon size={16} />{name}</button>)}</div>
                  {authFeedback && <p className={`form-feedback ${authFeedback.success ? 'success' : 'error'}`} role={authFeedback.success ? 'status' : 'alert'}>{authFeedback.message}</p>}
                  <button className="primary-button" type="submit">Continue <ArrowRight size={17} /></button>
                </form>
              </div>
            ) : (
              <div className="form-card">
                <span className="step-kicker">Step 02 / 02</span>
                <h2>Where can we reach you?</h2>
                <p>Your contact details stay private and help customers reach the right person.</p>
                <form onSubmit={submitRegistration}>
                  <div className="field-grid"><label>First name<input required maxLength={80} autoComplete="given-name" placeholder="e.g. Adunni" value={ownerDetails.firstName} onChange={(event) => updateOwnerDetail('firstName', event.target.value)} /></label><label>Last name<input required maxLength={80} autoComplete="family-name" placeholder="e.g. Balogun" value={ownerDetails.lastName} onChange={(event) => updateOwnerDetail('lastName', event.target.value)} /></label></div>
                  <label>Business address<input required maxLength={200} autoComplete="street-address" placeholder="e.g. 24B Admiralty Way" value={ownerDetails.address} onChange={(event) => updateOwnerDetail('address', event.target.value)} /></label>
                  <div className="field-grid"><label>City<input required maxLength={100} autoComplete="address-level2" placeholder="e.g. Lekki, Lagos" value={ownerDetails.city} onChange={(event) => updateOwnerDetail('city', event.target.value)} /></label><label>Phone number<input required type="tel" maxLength={32} autoComplete="tel" placeholder="e.g. +234 802 345 6789" value={ownerDetails.phone} onChange={(event) => updateOwnerDetail('phone', event.target.value)} /></label></div>
                  <label>Email<input required type="email" maxLength={254} autoComplete="email" placeholder="e.g. hello@adunniglow.com" value={ownerDetails.email} onChange={(event) => updateOwnerDetail('email', event.target.value)} /></label>
                  <label>Password<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Create a password with 8+ characters" value={ownerDetails.password} onChange={(event) => updateOwnerDetail('password', event.target.value)} /><small className="field-hint">Mix letters, numbers, and symbols for a stronger password.</small></label>
                  {authFeedback && <p className={`form-feedback ${authFeedback.success ? 'success' : 'error'}`} role={authFeedback.success ? 'status' : 'alert'}>{authFeedback.message}</p>}
                  <div className="form-actions"><button type="button" className="text-button" onClick={() => { setAuthFeedback(null); setStep(0) }}>Back</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'} <ArrowRight size={17} /></button></div>
                </form>
              </div>
            )}
          </div>
        </section>
      )}

      {view === 'reset' && (
        <section className="onboarding-screen screen-shell">
          <aside className="onboarding-rail">
            <div>
              <Logo light />
              <p className="eyebrow">Account recovery</p>
              <h1>A fresh start, kept simple.</h1>
              <p className="rail-copy">Choose a new password and get straight back to your bookings.</p>
            </div>
            <div className="rail-bottom"><span>Booka / 2026</span></div>
          </aside>
          <div className="onboarding-form-area">
            <div className="form-card">
              <span className="step-kicker">Secure your account</span>
              <h2>Set a new password.</h2>
              <p>Your reset link has been verified. Choose a password you have not used before.</p>
              <form onSubmit={submitNewPassword}>
                <label>New password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Create a password with 8+ characters" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small className="field-hint">Use at least 8 characters.</small></label>
                <label>Confirm password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Repeat your new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
                {authFeedback && <p className={`form-feedback ${authFeedback.success ? 'success' : 'error'}`} role={authFeedback.success ? 'status' : 'alert'}>{authFeedback.message}</p>}
                <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Updating password…' : 'Update password'} <ArrowRight size={17} /></button>
              </form>
            </div>
          </div>
        </section>
      )}

      {view === 'landing' && (
        <section className="public-page screen-shell">
          <header className="public-header">
            <Logo />
            <address className="public-header-contact">
              <span><MapPin size={15} aria-hidden="true" />{businessAddress}, {businessCity},</span>
              <a href={`tel:${businessPhone.replace(/[^\d+]/g, '')}`}><Phone size={15} aria-hidden="true" />{businessPhone}</a>
            </address>
          </header>
          <div className="public-hero"><div className="hero-copy"><h1>{landing.headingStart} <em>{landing.headingEm}</em></h1><p>{landing.body}</p><a className="primary-button" href="#services">Book an appointment <ChevronDown size={17} /></a></div><div className="hero-art"><div className="hero-orb orb-one" /><div className="hero-orb orb-two" /><div className="hero-caption"><span>{businessName.toUpperCase()}</span><strong>{landing.captionFirst}<br />{landing.captionSecond}</strong></div></div></div>
          <div className="public-body" id="services">
            <div className="section-heading">
              <div>
                <h2>Browse services</h2>
                <p className="section-subheading">Book instantly.</p>
              </div>
              <span className="muted-note">All appointments include a consultation</span>
            </div>
            {services.length === 0 ? (
              <p className="empty-state">The service menu is being updated. Check back soon or contact the business directly.</p>
            ) : (
              <div className="service-grid">
                {services.map((service) => (
                  <article
                    className="public-service"
                    key={service.id ?? service.name}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open booking for ${service.name}`}
                    onClick={() => openBooking(service)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openBooking(service)
                      }
                    }}
                  >
                    <img className="public-service-image" src={serviceImageFor(service.name, businessCategory, service.image_path ?? undefined)} alt={service.name} loading="lazy" />
                    <div className="public-service-shade" />
                    <div className="public-service-content">
                      <span className="public-service-duration">{service.duration}</span>
                      <h3>{service.name}</h3>
                      <p>from {service.price}</p>
                    </div>
                    <button className="round-arrow public-service-book" type="button" aria-label={`Book ${service.name}`} onClick={(event) => { event.stopPropagation(); openBooking(service) }}>
                      <ArrowRight size={17} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
          {bookingService && (
            <div className="booking-modal-scrim" role="presentation" onClick={closeBookingModal}>
              <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" onClick={(event) => event.stopPropagation()}>
                <div className="booking-modal-media">
                  <img src={serviceImageFor(bookingService.name, businessCategory, bookingService.image_path ?? undefined)} alt={bookingService.name} />
                  <div className="booking-modal-shade" />
                  <button className="booking-modal-close" type="button" aria-label="Close booking form" disabled={bookingSubmitting} onClick={closeBookingModal}><X size={17} /></button>
                  <div className="booking-modal-title">
                    <span className="eyebrow">Book your visit</span>
                    <h2 id="booking-modal-title">{bookingService.name}</h2>
                    <p>{bookingService.duration} · {bookingService.price}</p>
                  </div>
                </div>
                <div className="booking-modal-body">
                  {lastBookingId ? (
                    <div className="booking-payment">
                      <span className="eyebrow">Booking created</span>
                      <h2>Complete your payment</h2>
                      <p>Your slot is held as pending. Pay securely with Paystack to confirm it.</p>
                      {bookingFeedback && <p className={`form-feedback ${bookingFeedback.success ? 'success' : 'error'}`} role={bookingFeedback.success ? 'status' : 'alert'}>{bookingFeedback.message}</p>}
                      <button className="primary-button paystack-button" type="button" disabled={paymentStarting} onClick={startPayment}><CreditCard size={17} />{paymentStarting ? 'Opening Paystack…' : `Pay ${formatNaira(bookingService.amountNaira)} with Paystack`}</button>
                      <button className="text-button" type="button" onClick={() => { setLastBookingId(null); setBookingFeedback(null); setBookingService(null) }}>Book another service</button>
                    </div>
                  ) : (
                    <form className="booking-form" onSubmit={submitBooking}>
                      <div className="field-grid">
                        <label>Full name<input required minLength={2} maxLength={120} autoComplete="name" placeholder="e.g. Adaeze Madu" value={bookingDetails.customerName} onChange={(event) => setBookingDetails({ ...bookingDetails, customerName: event.target.value })} /></label>
                        <label>Phone number<input required type="tel" maxLength={32} autoComplete="tel" placeholder="e.g. +234 802 345 6789" value={bookingDetails.customerPhone} onChange={(event) => setBookingDetails({ ...bookingDetails, customerPhone: event.target.value })} /></label>
                      </div>
                      <div className="field-grid">
                        <label>Email<input required type="email" maxLength={254} autoComplete="email" placeholder="e.g. adaeze@example.com" value={bookingDetails.customerEmail} onChange={(event) => setBookingDetails({ ...bookingDetails, customerEmail: event.target.value })} /></label>
                        <label>Preferred date & time<input required type="datetime-local" value={bookingDetails.startsAt} onChange={(event) => setBookingDetails({ ...bookingDetails, startsAt: event.target.value })} /></label>
                      </div>
                      <label>Anything we should know?<textarea maxLength={500} rows={3} placeholder="Optional notes for the business" value={bookingDetails.notes} onChange={(event) => setBookingDetails({ ...bookingDetails, notes: event.target.value })} /></label>
                      {bookingFeedback && <p className={`form-feedback ${bookingFeedback.success ? 'success' : 'error'}`} role={bookingFeedback.success ? 'status' : 'alert'}>{bookingFeedback.message}</p>}
                      <div className="form-actions">
                        <button className="text-button" type="button" disabled={bookingSubmitting} onClick={closeBookingModal}>Cancel</button>
                        <button className="primary-button" type="submit" disabled={bookingSubmitting || !bookingService.id}>{bookingSubmitting ? 'Opening Paystack…' : 'Book & pay with Paystack'} <CreditCard size={17} /></button>
                      </div>
                    </form>
                  )}
                </div>
              </section>
            </div>
          )}
          <Footer />
        </section>
      )}

      {view === 'backoffice' && (
        <Backoffice
          business={{
            id: businessId,
            slug: businessSlug,
            name: businessName,
            business_type: businessCategory,
            owner_first_name: ownerFirstName,
            owner_last_name: ownerLastName,
            address: businessAddress,
            city: businessCity,
            phone: businessPhone,
          }}
          initialServices={initialServices}
          initialBookings={initialBookings}
          initialPayments={initialPayments}
        />
      )}

    </main>
  )
}
