'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Phone,
  Scissors,
  Share2,
  ShieldCheck,
  Sparkles,
  User,
  X,
  ArrowRight,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { TopNav } from '@/components/navigation/top-nav'
import { Footer } from '@/components/navigation/footer'
import { createSupabaseClient } from '@/lib/supabase'
import { Service, BusinessSettings } from '@/types'
import { cn } from '@/lib/utils'

interface ConfirmedBooking {
  id: string
  status: 'Confirmed' | 'Pending'
  client_name: string
  client_phone: string
  client_email: string
  service_name: string
  appointment_date: string
  appointment_time: string
  amount: number
  deposit_paid_kobo: number
  payment_status: 'unpaid' | 'paid'
}

export default function BusinessBookingPage() {
  const params = useParams()
  const router = useRouter()
  const rawSlug = (params?.slug as string) || ''

  // Dynamic business settings & services
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [activeSlug, setActiveSlug] = useState<string>(rawSlug)
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)

  // Booking selections
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:15 AM')

  // Guest contact info
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  // Confirmation state
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [confirmedBookingId, setConfirmedBookingId] = useState('')
  const [bookingStatus, setBookingStatus] = useState<'Confirmed' | 'Pending'>('Confirmed')
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null)

  useEffect(() => {
    let active = true
    const loadBusiness = async () => {
      setIsLoadingBusiness(true)
      setLoadError('')
      try {
        const { data, error } = await createSupabaseClient()
          .rpc('get_public_business_by_slug', { p_slug: rawSlug })
        if (error) throw error
        if (!data) {
          setLoadError('This business could not be found.')
          return
        }

        const result = data as {
          business_id: string
          slug: string
          business_name: string
          owner_name: string
          phone: string
          location: string
          logo_url: string | null
          timezone: string
          currency: string
          auto_confirm: boolean
          services: Array<{
            id: string
            name: string
            detail: string
            category: Service['category']
            duration_minutes: number
            price: number
            color: string
            icon_color: string
            is_active: boolean
          }>
        }
        const loadedServices = result.services.filter((service) => service.is_active).map((service) => ({
          id: service.id,
          name: service.name,
          detail: service.detail,
          category: service.category,
          durationMinutes: service.duration_minutes,
          price: service.price,
          color: service.color,
          iconColor: service.icon_color,
          isActive: service.is_active,
        }))
        if (!active) return
        setBusinessSettings({
          businessId: result.business_id,
          slug: result.slug,
          businessName: result.business_name,
          ownerName: result.owner_name,
          email: '',
          phone: result.phone,
          location: result.location,
          logoUrl: result.logo_url ?? undefined,
          timezone: result.timezone,
          currency: result.currency,
          autoConfirm: result.auto_confirm,
          emailAlerts: true,
          smsAlerts: true,
          cancellationWindow: '',
        })
        setServices(loadedServices)
        setSelectedServiceId(loadedServices[0]?.id ?? '')
        setActiveSlug(result.slug)
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load this business.')
      } finally {
        if (active) setIsLoadingBusiness(false)
      }
    }

    void loadBusiness()
    return () => { active = false }
  }, [rawSlug])

  useEffect(() => {
    const url = new URL(window.location.href)
    const reference = url.searchParams.get('reference') || url.searchParams.get('trxref')
    if (!reference) return

    let active = true
    setIsVerifyingPayment(true)
    setBookingError('')

    void (async () => {
      try {
        const response = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        })
        const result = await response.json() as {
          error?: string
          booking?: ConfirmedBooking
        }
        if (!response.ok || !result.booking) {
          throw new Error(result.error || 'Could not verify the Paystack payment.')
        }
        if (!active) return

        setConfirmedBooking(result.booking)
        setConfirmedBookingId(result.booking.id)
        setBookingStatus(result.booking.status)
        setCustomerName(result.booking.client_name)
        setCustomerPhone(result.booking.client_phone)
        setCustomerEmail(result.booking.client_email)
        setBookingConfirmed(true)
        url.searchParams.delete('reference')
        url.searchParams.delete('trxref')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      } catch (error) {
        if (active) {
          setBookingError(error instanceof Error ? error.message : 'Could not verify the Paystack payment.')
          url.searchParams.delete('reference')
          url.searchParams.delete('trxref')
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
        }
      } finally {
        if (active) setIsVerifyingPayment(false)
      }
    })()

    return () => { active = false }
  }, [rawSlug])

  // Generate the next 6 days starting from today
  const upcomingDays = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      index: i,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNumber: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      fullDateString: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      isoDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    }
  })

  // Available time slots grouped by period
  const timeSlots = [
    { period: 'Morning', slots: ['09:00 AM', '10:15 AM', '11:30 AM'] },
    { period: 'Afternoon', slots: ['01:00 PM', '02:30 PM', '03:45 PM'] },
    { period: 'Evening', slots: ['05:00 PM', '06:15 PM', '07:30 PM'] },
  ]

  // Filter services by category
  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category)))]
  const filteredServices =
    selectedCategory === 'All'
      ? services
      : services.filter((s) => s.category.toLowerCase() === selectedCategory.toLowerCase())

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0]
  const selectedDateObj = upcomingDays[selectedDateIndex] || upcomingDays[0]
  const depositPaidKobo = selectedService ? selectedService.price * 30 : 0
  const formatNairaKobo = (amountKobo: number) =>
    `₦${(amountKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessSettings || !customerName || !customerPhone || !customerEmail || !selectedService) return
    setBookingError('')
    setIsSubmittingBooking(true)
    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: activeSlug,
          serviceId: selectedService.id,
          clientName: customerName.trim(),
          clientPhone: customerPhone.trim(),
          clientEmail: customerEmail.trim(),
          clientNotes: customerNotes.trim(),
          appointmentDate: selectedDateObj.isoDate,
          appointmentTime: selectedTimeSlot,
        }),
      })
      const result = await response.json() as { error?: string; authorizationUrl?: string }
      if (!response.ok || !result.authorizationUrl) {
        throw new Error(result.error || 'Could not start Paystack checkout.')
      }
      window.location.assign(result.authorizationUrl)
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not submit your booking. Please try again.')
    } finally {
      setIsSubmittingBooking(false)
    }
  }

  const handleResetBooking = () => {
    setBookingConfirmed(false)
    setConfirmedBooking(null)
    setConfirmedBookingId('')
    setBookingError('')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setCustomerNotes('')
  }

  if (isLoadingBusiness) {
    return <main className="grid min-h-screen place-items-center bg-[#f8f5f0] text-sm text-[#756f69]">Loading business details…</main>
  }

  if (loadError || !businessSettings) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f5f0] px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Business unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-[#756f69]">{loadError || 'This business could not be found.'}</p>
          <Link href="/" className="mt-5 inline-flex rounded-full bg-[#1e1c1a] px-5 py-3 text-sm font-semibold text-white">Return to Booka</Link>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-[#1e1c1a] flex flex-col justify-between">
      <TopNav />

      <main className="mx-auto max-w-[1240px] px-6 py-8 md:py-12 lg:px-10 w-full flex-1">
        {/* ============================================================== */}
        {/* STUDIO PROFILE HERO WITH UNIQUE BRAND URL IDENTIFIER           */}
        {/* ============================================================== */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#211f1c] text-white p-6 sm:p-10 lg:p-12 shadow-xl border border-white/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {businessSettings.logoUrl ? (
                <img
                  src={businessSettings.logoUrl}
                  alt={businessSettings.businessName}
                  className="size-20 sm:size-24 rounded-2xl object-contain bg-white/10 p-2 border border-white/20 shadow-md"
                />
              ) : (
                <div className="grid size-20 sm:size-24 place-items-center rounded-2xl bg-[#d46b4f] text-white font-serif text-3xl font-bold shadow-md">
                  {businessSettings.businessName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#d46b4f]/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#efb49f] border border-[#d46b4f]/30">
                    Business booking page
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-0.5 font-mono text-[10px] text-white/70">
                    /{activeSlug}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl sm:text-4xl font-medium tracking-[-0.04em]">
                  {businessSettings.businessName}
                </h1>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
                  <MapPin size={13} className="text-[#efb49f] shrink-0" />
                  {businessSettings.location}
                </p>
              </div>
            </div>

            {/* Booking page details */}
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white/80">
              <Clock size={13} className="text-[#efb49f]" /> Choose an appointment time
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-[#528361] font-medium bg-[#e7f2ea]/10">
                <ShieldCheck size={13} /> 30% deposit via Paystack
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MAIN BOOKING EXPERIENCE                                        */}
        {/* ============================================================== */}
        {isVerifyingPayment ? (
          <div className="mx-auto mt-12 max-w-xl rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-8 text-center shadow-lg">
            <p className="text-sm font-semibold text-[#1e1c1a]">Verifying your Paystack payment…</p>
            <p className="mt-2 text-xs text-[#756f69]">Please keep this page open while we confirm your booking.</p>
          </div>
        ) : !bookingConfirmed ? (
          <form onSubmit={handleBookingSubmit} className="mt-10 grid gap-8 lg:grid-cols-[1.55fr_1fr]">
            {bookingError && (
              <p role="alert" className="rounded-xl bg-[#fff0eb] px-4 py-3 text-sm text-[#a9432e] lg:col-span-2">
                {bookingError}
              </p>
            )}
            {/* LEFT COLUMN: SERVICE MENU, DATE, TIME, CONTACT DETAILS */}
            <div className="space-y-8">
              {/* STEP 1: SERVICE SELECTION */}
              <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eee7df] pb-5">
                  <div>
                    <span className="eyebrow text-[#d46b4f]">Step 01 / Experience</span>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Select a Service</h2>
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-semibold transition capitalize',
                          selectedCategory.toLowerCase() === cat.toLowerCase()
                            ? 'bg-[#1e1c1a] text-white shadow-sm'
                            : 'border border-[#ded8cf] bg-[#fbfaf7] text-[#756f69] hover:text-[#1e1c1a]'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Service Cards Grid */}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {filteredServices.map((svc) => {
                    const isSelected = selectedServiceId === svc.id
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => setSelectedServiceId(svc.id)}
                        className={cn(
                          'relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all',
                          isSelected
                            ? 'border-[#d46b4f] bg-[#fff9f6] shadow-sm ring-2 ring-[#d46b4f]/20'
                            : 'border-[#eee7df] bg-[#fbfaf7] hover:border-[#caa08f] hover:bg-white'
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                svc.color,
                                svc.iconColor
                              )}
                            >
                              {svc.category}
                            </span>
                            <span
                              className={cn(
                                'grid size-5 place-items-center rounded-full border transition',
                                isSelected
                                  ? 'border-[#d46b4f] bg-[#d46b4f] text-white'
                                  : 'border-[#ded8cf] bg-white'
                              )}
                            >
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </span>
                          </div>

                          <h3 className="mt-3 font-semibold text-base text-[#1e1c1a]">{svc.name}</h3>
                          <p className="mt-1 text-xs text-[#756f69] line-clamp-2 leading-relaxed">
                            {svc.detail}
                          </p>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-[#eee7df] pt-3 text-xs">
                          <span className="flex items-center gap-1.5 text-[#8c847c]">
                            <Clock size={13} /> {svc.durationMinutes} mins
                          </span>
                          <span className="font-semibold text-sm text-[#1e1c1a]">
                            ₦{svc.price.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                  {filteredServices.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-[#ded8cf] bg-[#fbfaf7] p-5 text-sm text-[#756f69] sm:col-span-2">
                      This business has no services available to book right now. Please contact them directly.
                    </p>
                  )}
                </div>
              </div>

              {/* STEP 2: DATE & TIME SELECTION */}
              <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                <span className="eyebrow text-[#d46b4f]">Step 02 / Schedule</span>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Choose Date & Time Slot</h2>

                {/* Horizontal Date Selector */}
                <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {upcomingDays.map((day) => {
                    const isSelected = selectedDateIndex === day.index
                    return (
                      <button
                        key={day.index}
                        type="button"
                        onClick={() => setSelectedDateIndex(day.index)}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-2xl border p-3 transition text-center',
                          isSelected
                            ? 'border-[#d46b4f] bg-[#d46b4f] text-white shadow-md'
                            : 'border-[#eee7df] bg-[#fbfaf7] hover:border-[#caa08f] hover:bg-white text-[#1e1c1a]'
                        )}
                      >
                        <span className={cn('text-[11px] font-semibold uppercase tracking-wider', isSelected ? 'text-white/80' : 'text-[#8c847c]')}>
                          {day.label}
                        </span>
                        <span className="mt-1 text-xl font-bold">{day.dateNumber}</span>
                        <span className={cn('text-[10px]', isSelected ? 'text-white/80' : 'text-[#8c847c]')}>
                          {day.month}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Grouped Time Slots */}
                <div className="mt-8 space-y-5">
                  {timeSlots.map(({ period, slots }) => (
                    <div key={period}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c847c]">
                        {period} Slots
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2.5">
                        {slots.map((slot) => {
                          const isSelected = selectedTimeSlot === slot
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition',
                                isSelected
                                  ? 'bg-[#1e1c1a] text-white shadow-sm'
                                  : 'border border-[#ded8cf] bg-[#fbfaf7] text-[#1e1c1a] hover:border-[#d46b4f] hover:bg-white'
                              )}
                            >
                              <Clock size={12} className={isSelected ? 'text-[#efb49f]' : 'text-[#8c847c]'} />
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 3: CLIENT CONTACT INFO */}
              <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                <span className="eyebrow text-[#d46b4f]">Step 03 / Your Details</span>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Who is this reservation for?</h2>
                <p className="mt-1 text-xs text-[#8c847c]">
                  Your contact details will be included with the booking for the business.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="field">
                    Full name *
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. David Adeleke"
                    />
                  </label>

                  <label className="field">
                    Phone number *
                    <input
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                    />
                  </label>

                  <label className="field sm:col-span-2">
                    Email address * <span className="font-normal">Required for Paystack checkout</span>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="david@example.com"
                    />
                  </label>

                  <label className="field sm:col-span-2">
                    Special notes or preferences (optional)
                    <input
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="e.g. Low skin fade taper, beard oil preferred"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: STICKY CLASSIC RESERVATION SLIP */}
            <div>
              <div className="sticky top-24 rounded-[32px] border border-[#e5ddd4] bg-[#fffdf9] p-6 sm:p-7 shadow-lg">
                <div className="border-b border-[#eee7df] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d46b4f]">
                    Reservation Slip
                  </span>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight">{businessSettings.businessName}</h3>
                  <p className="text-xs text-[#8c847c]">{businessSettings.location}</p>
                </div>

                {/* Appointment breakdown */}
                <div className="mt-5 space-y-4 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-[#8c847c]">Service</span>
                    <span className="font-semibold text-right text-[#1e1c1a]">
                      {selectedService?.name || 'Select a service'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#8c847c]">Duration</span>
                    <span className="font-semibold text-[#1e1c1a]">
                      {selectedService?.durationMinutes || 45} minutes
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#8c847c]">Date</span>
                    <span className="font-semibold text-[#1e1c1a]">
                      {selectedDateObj.fullDateString} ({selectedDateObj.label})
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#8c847c]">Time</span>
                    <span className="font-semibold text-[#d46b4f]">{selectedTimeSlot}</span>
                  </div>

                  <div className="border-t border-[#eee7df] pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#8c847c]">Service price</span>
                      <span className="font-semibold text-[#1e1c1a]">
                        ₦{(selectedService?.price || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8c847c]">30% deposit due now</span>
                      <span className="font-semibold text-[#1e1c1a]">
                        {formatNairaKobo(depositPaidKobo)}
                      </span>
                    </div>
                    <div className="border-t border-[#eee7df] pt-3 flex justify-between items-baseline">
                      <span className="font-semibold text-sm text-[#1e1c1a]">Balance due at business</span>
                      <span className="text-2xl font-bold tracking-tight text-[#d46b4f]">
                        {formatNairaKobo((selectedService?.price || 0) * 100 - depositPaidKobo)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assurance pills */}
                <div className="mt-6 rounded-2xl bg-[#f8f5f0] p-4 text-[11px] text-[#756f69] space-y-1.5 border border-[#eee7df]">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-[#528361] shrink-0" />
                    <span>30% deposit collected securely through Paystack</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-[#528361] shrink-0" />
                    <span>Pay the remaining balance directly to the business</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-[#528361] shrink-0" />
                    <span>Contact the business directly about changes to your booking</span>
                  </p>
                </div>

                {/* Action CTA */}
                <button
                  type="submit"
                  disabled={isSubmittingBooking || !selectedService}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1e1c1a] py-4 text-sm font-semibold text-white shadow-md transition hover:bg-[#d46b4f] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingBooking ? 'Opening Paystack…' : `Pay 30% Deposit · ${formatNairaKobo(depositPaidKobo)}`}
                  {!isSubmittingBooking && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ============================================================== */
          /* CLASSIC CONFIRMATION RECEIPT SCREEN                            */
          /* ============================================================== */
          <div className="mx-auto mt-12 max-w-xl animate-in zoom-in-95 duration-300">
            <div className="rounded-[32px] border border-[#e5ddd4] bg-[#fffdf9] p-8 sm:p-10 shadow-2xl text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#e7f2ea] text-[#528361] shadow-inner">
                <Check size={36} strokeWidth={2.5} />
              </div>

              <span className="mt-6 inline-block rounded-full bg-[#e7f2ea] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#528361]">
                {bookingStatus === 'Confirmed' ? 'Reservation Confirmed' : 'Request Received'}
              </span>

              <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-tight">
                {bookingStatus === 'Confirmed' ? 'You’re booked!' : 'Your request is pending.'}
              </h2>
              <p className="mt-2 text-sm text-[#756f69]">
                Your booking details are available to <strong>{businessSettings.businessName}</strong>.
              </p>

              {/* Receipt Ticket Box */}
              <div className="mt-8 rounded-2xl border border-[#eee7df] bg-[#fbfaf7] p-6 text-left space-y-3.5 text-xs">
                <div className="flex justify-between items-center border-b border-[#eee7df] pb-3">
                  <span className="text-[#8c847c]">Reference ID</span>
                  <span className="font-mono font-bold text-sm text-[#1e1c1a]">{confirmedBookingId}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#8c847c]">Studio URL</span>
                  <span className="font-mono text-[11px] text-[#d46b4f]">/{activeSlug}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#8c847c]">Client</span>
                  <span className="font-semibold text-[#1e1c1a]">{customerName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#8c847c]">Phone</span>
                  <span className="font-semibold text-[#1e1c1a]">{customerPhone}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#8c847c]">Service</span>
                  <span className="font-semibold text-[#1e1c1a]">{confirmedBooking?.service_name || selectedService.name}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#8c847c]">Date & Time</span>
                  <span className="font-semibold text-[#d46b4f]">
                    {confirmedBooking?.appointment_date || selectedDateObj.fullDateString} at {confirmedBooking?.appointment_time || selectedTimeSlot}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#8c847c]">Location</span>
                  <span className="font-semibold text-[#1e1c1a]">{businessSettings.location}</span>
                </div>

                <div className="flex justify-between border-t border-[#eee7df] pt-3">
                  <span className="text-[#8c847c]">Service total</span>
                  <span className="font-semibold text-[#1e1c1a]">
                    ₦{(confirmedBooking?.amount ?? selectedService.price).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c847c]">30% deposit paid</span>
                  <span className="font-semibold text-[#528361]">
                    {formatNairaKobo(confirmedBooking?.deposit_paid_kobo ?? depositPaidKobo)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#eee7df] pt-3 text-sm">
                  <span className="font-bold text-[#1e1c1a]">Remaining balance</span>
                  <span className="font-bold text-[#d46b4f]">
                    {formatNairaKobo((confirmedBooking?.amount ?? selectedService.price) * 100 - (confirmedBooking?.deposit_paid_kobo ?? depositPaidKobo))}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResetBooking}
                  className="flex-1 rounded-full border border-[#ded8cf] bg-white py-3.5 text-xs font-semibold text-[#1e1c1a] hover:bg-[#f1ece5] transition"
                >
                  Book another appointment
                </button>
                <Link
                  href="/"
                  className="flex-1 inline-flex items-center justify-center rounded-full bg-[#1e1c1a] py-3.5 text-xs font-semibold text-white hover:bg-[#d46b4f] transition"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
