'use client'

import { useLayoutEffect, useEffect, useRef, useState, type FormEvent } from 'react'
import gsap from 'gsap'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { serviceImageFor } from '@/lib/service-images'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  CreditCard,
  Ellipsis,
  Home,
  Menu,
  LogOut,
  Pencil,
  Plus,
  Scissors,
  Settings2,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { deleteBooking, deleteService, saveService, setBookingStatus, updateBusinessProfile } from '@/app/backoffice/actions'
import { signOutOwner } from '@/app/onboarding/actions'
import Logo from '@/components/logo'
import type { Database } from '@/lib/supabase/database.types'
import {
  BOOKING_STATUSES,
  formatBookingDate,
  formatNaira,
  formatShortDate,
  initialsOf,
  type ActionFeedback,
  type BookaBooking,
  type BookaBusiness,
  type BookaPaymentRecord,
  type BookaService,
  type BookingStatus,
  type ServiceTone,
} from '@/lib/booka-types'

type DashboardTab = 'overview' | 'bookings' | 'services' | 'payments' | 'customers' | 'settings'

type NotificationItem = {
  id: string
  kind: 'booking' | 'payment'
  title: string
  description: string
  at: string
}

type ServiceDraft = {
  id?: string
  name: string
  duration_minutes: string
  price_naira: string
  tone: ServiceTone
  active: boolean
  image_path: string | null
}

type ProfileDraft = {
  name: string
  business_type: BookaBusiness['business_type']
  owner_first_name: string
  owner_last_name: string
  address: string
  city: string
  phone: string
}

type BackofficeProps = {
  business: BookaBusiness
  initialServices: BookaService[]
  initialBookings: BookaBooking[]
  initialPayments: BookaPaymentRecord[]
}

const navTabs: Array<{ id: DashboardTab; label: string; icon: typeof Home }> = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'services', label: 'Services', icon: Scissors },
  { id: 'payments', label: 'Payments', icon: CircleDollarSign },
  { id: 'customers', label: 'Customers', icon: Users },
]

const emptyServiceDraft: ServiceDraft = {
  name: '',
  duration_minutes: '45',
  price_naira: '10000',
  tone: 'gold',
  active: true,
  image_path: null,
}

function sameMonth(value: string, date: Date) {
  const parsed = new Date(value)
  return parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth()
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

export default function Backoffice({ business, initialServices, initialBookings, initialPayments }: BackofficeProps) {
  const [tab, setTab] = useState<DashboardTab>('overview')
  const [services, setServices] = useState<BookaService[]>(initialServices)
  const [bookings, setBookings] = useState<BookaBooking[]>(initialBookings)
  const [payments, setPayments] = useState<BookaPaymentRecord[]>(initialPayments)
  const [profile, setProfile] = useState<BookaBusiness>(business)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(() =>
    typeof window === 'undefined' || window.localStorage.getItem('booka-notification-sound') !== 'off',
  )
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false)
  const [paymentServiceFilter, setPaymentServiceFilter] = useState('all')
  const [navOpen, setNavOpen] = useState(false)
  const [feedback, setFeedback] = useState<ActionFeedback<unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<ServiceDraft | null>(null)
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null)
  const [serviceImagePreview, setServiceImagePreview] = useState<string | null>(null)
  const [openBookingActions, setOpenBookingActions] = useState<{ id: string; top: number; right: number } | null>(null)
  const bookingActionsRef = useRef<HTMLDivElement | null>(null)
  const [filter, setFilter] = useState<'all' | BookingStatus>('all')
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    name: business.name,
    business_type: business.business_type,
    owner_first_name: business.owner_first_name,
    owner_last_name: business.owner_last_name,
    address: business.address,
    city: business.city,
    phone: business.phone,
  })

  const sidebarRef = useRef<HTMLElement | null>(null)
  const scrimRef = useRef<HTMLButtonElement | null>(null)
  const chartRef = useRef<SVGSVGElement | null>(null)
  const ownerMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ownerMenuOpen) return

    const closeOwnerMenu = (event: MouseEvent) => {
      if (!ownerMenuRef.current?.contains(event.target as Node)) setOwnerMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOwnerMenuOpen(false)
    }

    document.addEventListener('mousedown', closeOwnerMenu)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOwnerMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [ownerMenuOpen])

  useEffect(() => {
    if (!openBookingActions) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!bookingActionsRef.current?.contains(event.target as Node)) setOpenBookingActions(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenBookingActions(null)
    }
    const closeOnScroll = () => setOpenBookingActions(null)

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [openBookingActions])

  const notificationRef = useRef<HTMLDivElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const notifiedRef = useRef(new Set<string>())
  const soundEnabledRef = useRef(soundEnabled)

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
    if (typeof window !== 'undefined') window.localStorage.setItem('booka-notification-sound', soundEnabled ? 'on' : 'off')
  }, [soundEnabled])

  useEffect(() => {
    const unlockNotificationSound = () => {
      if (!soundEnabledRef.current || audioContextRef.current) return

      try {
        const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioContextClass) return

        const context = new AudioContextClass()
        audioContextRef.current = context
        void context.resume().catch(() => undefined)
      } catch {
        // The browser blocked audio until another gesture; notifications still work.
      }
    }

    window.addEventListener('pointerdown', unlockNotificationSound)
    window.addEventListener('keydown', unlockNotificationSound)

    return () => {
      window.removeEventListener('pointerdown', unlockNotificationSound)
      window.removeEventListener('keydown', unlockNotificationSound)
    }
  }, [])

  useEffect(() => {
    if (!notificationPanelOpen) return

    const closePanel = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationPanelOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationPanelOpen(false)
    }

    document.addEventListener('mousedown', closePanel)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closePanel)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [notificationPanelOpen])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 641px)')

    const resetForDesktop = () => {
      if (!desktop.matches) return

      const sidebar = sidebarRef.current
      if (sidebar) gsap.set(sidebar, { clearProps: 'transform' })
      setNavOpen(false)
    }

    resetForDesktop()
    desktop.addEventListener('change', resetForDesktop)

    return () => desktop.removeEventListener('change', resetForDesktop)
  }, [])

  const serviceByIdRef = useRef(new Map(services.map((service) => [service.id, service])))

  useEffect(() => {
    serviceByIdRef.current = new Map(services.map((service) => [service.id, service]))
  }, [services])

  useEffect(() => {
    if (!draft) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setDraft(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draft, saving])

  function playNotificationTone() {
    if (!soundEnabledRef.current || typeof window === 'undefined') return

    try {
      const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return

      const context = audioContextRef.current ?? new AudioContextClass()
      audioContextRef.current = context
      void context.resume().catch(() => undefined)

      const notes = [880, 740, 880, 1180] as const
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const start = context.currentTime + index * 0.18

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, start)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.24, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)

        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(start)
        oscillator.stop(start + 0.18)
      })
    } catch {
      // Notifications still appear if the browser has blocked audio output.
    }
  }

  function pushNotification(item: NotificationItem) {
    setNotifications((current) => [item, ...current])
    setUnreadCount((current) => current + 1)
    playNotificationTone()
  }

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    const supabase = createBrowserClient<Database>(url, key)
    const paymentFromRow = (
      row: Database['public']['Tables']['payments']['Row'],
      existing?: BookaPaymentRecord,
    ): BookaPaymentRecord => ({
      ...row,
      starts_at: existing?.starts_at ?? row.created_at,
      booking_status: existing?.booking_status ?? 'pending',
    })
    const notifyPaymentReceived = (payment: Database['public']['Tables']['payments']['Row']) => {
      const notificationId = `payment-success:${payment.id}`
      if (notifiedRef.current.has(notificationId)) return
      notifiedRef.current.add(notificationId)
      pushNotification({
        id: notificationId,
        kind: 'payment',
        title: 'Payment received',
        description: `${formatNaira(payment.amount_naira)} via Paystack for ${payment.service_name}`,
        at: payment.paid_at ?? payment.created_at,
      })
    }

    const channel = supabase
      .channel(`booka-backoffice-${business.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const booking = payload.new as unknown as BookaBooking
          setBookings((current) => {
            if (current.some((item) => item.id === booking.id)) return current
            return [...current, booking].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
          })

          const notificationId = `booking-created:${booking.id}`
          if (notifiedRef.current.has(notificationId)) return
          notifiedRef.current.add(notificationId)
          const service = booking.service_id ? serviceByIdRef.current.get(booking.service_id) : undefined
          pushNotification({
            id: notificationId,
            kind: 'booking',
            title: 'New booking',
            description: `${booking.customer_name} booked ${service?.name ?? 'a service'} for ${formatBookingDate(booking.starts_at)}`,
            at: booking.created_at,
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const booking = payload.new as unknown as BookaBooking
          setBookings((current) => {
            if (!current.some((item) => item.id === booking.id)) {
              return [...current, booking].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
            }
            return current.map((item) => (item.id === booking.id ? booking : item))
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const row = payload.new as unknown as Database['public']['Tables']['payments']['Row']
          setPayments((current) => {
            const existing = current.find((payment) => payment.id === row.id)
            const record = paymentFromRow(row, existing)
            return existing ? current.map((payment) => (payment.id === row.id ? record : payment)) : [record, ...current]
          })
          if (row.status === 'success') notifyPaymentReceived(row)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const row = payload.new as unknown as Database['public']['Tables']['payments']['Row']
          setPayments((current) => {
            const existing = current.find((payment) => payment.id === row.id)
            const record = paymentFromRow(row, existing)
            return existing ? current.map((payment) => (payment.id === row.id ? record : payment)) : [record, ...current]
          })
          if (row.status === 'success') notifyPaymentReceived(row)
        },
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR') console.error('Booka realtime subscription failed:', error)
      })

    return () => {
      void supabase.removeChannel(channel)
    }
    // The service lookup is intentionally reached through a ref so services
    // can be edited without tearing down the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id])

  const now = new Date()
  const today = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const publicPath = profile.slug ? `/${profile.slug}` : ''
  const publicUrl = profile.slug ? `booka.co/${profile.slug}` : 'Add a business to get a booking link'

  const serviceById = new Map(services.map((service) => [service.id, service]))
  const priceOf = (booking: BookaBooking) => (booking.service_id ? serviceById.get(booking.service_id)?.price_naira ?? 0 : 0)
  const serviceName = (booking: BookaBooking) => (booking.service_id ? serviceById.get(booking.service_id)?.name ?? 'Service removed' : 'Service removed')

  const pendingBookings = bookings.filter((booking) => booking.status === 'pending')
  const upcoming = bookings
    .filter((booking) => booking.status !== 'cancelled' && new Date(booking.starts_at) >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  const monthBookings = bookings.filter((booking) => booking.status !== 'cancelled' && sameMonth(booking.starts_at, now))
  const successfulPayments = payments.filter((payment) => payment.status === 'success')
  const openPayments = payments.filter((payment) => payment.status === 'awaiting_payment' || payment.status === 'initialized')
  const failedPayments = payments.filter((payment) => payment.status === 'failed' || payment.status === 'abandoned')
  const collected = successfulPayments.reduce((total, payment) => total + payment.amount_naira, 0)
  const expected = openPayments.reduce((total, payment) => total + payment.amount_naira, 0)
  const failedTotal = failedPayments.reduce((total, payment) => total + payment.amount_naira, 0)
  const average = successfulPayments.length ? Math.round(collected / successfulPayments.length) : 0

  const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (5 - index), 1))
  const monthlyRevenue = months.map((month) =>
    successfulPayments
      .filter((payment) => monthKey(new Date(payment.paid_at ?? payment.created_at)) === monthKey(month))
      .reduce((total, payment) => total + payment.amount_naira, 0),
  )
  const maxRevenue = Math.max(...monthlyRevenue, 1)
  const chartPoints = monthlyRevenue.map((value, index) => ({
    x: index * (720 / 5),
    y: 210 - (value / maxRevenue) * 180,
  }))
  const chartLine = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const chartArea = `${chartLine} L720 230 L0 230 Z`
  const chartTotal = monthlyRevenue.reduce((total, value) => total + value, 0)
  const chartAnimationKey = monthlyRevenue.join('|')

  useLayoutEffect(() => {
    if (tab !== 'overview') return

    const chart = chartRef.current
    if (!chart) return

    const line = chart.querySelector<SVGPathElement>('.chart-line')
    const area = chart.querySelector<SVGPathElement>('.chart-area')
    const dots = Array.from(chart.querySelectorAll<SVGCircleElement>('.chart-point'))
    const length = line?.getTotalLength() ?? 0

    if (line && length > 0) {
      gsap.set(line, { strokeDasharray: length, strokeDashoffset: length })
    }
    if (area) gsap.set(area, { autoAlpha: 0 })
    if (dots.length > 0) gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' })

    const timeline = gsap.timeline()
    if (line) timeline.to(line, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.out' }, 0)
    if (area) timeline.to(area, { autoAlpha: 1, duration: 0.75, ease: 'power2.out' }, 0.25)
    if (dots.length > 0) timeline.to(dots, { scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(1.8)' }, 0.35)

    return () => {
      timeline.kill()
      if (line) gsap.set(line, { clearProps: 'strokeDasharray,strokeDashoffset' })
      if (area) gsap.set(area, { clearProps: 'opacity,visibility' })
      if (dots.length > 0) gsap.set(dots, { clearProps: 'transform' })
    }
  }, [tab, chartAnimationKey])

  const paymentServiceNames = Array.from(new Set([
    ...services.map((service) => service.name),
    ...payments.map((payment) => payment.service_name),
  ])).sort((a, b) => a.localeCompare(b))
  const filteredPayments = (paymentServiceFilter === 'all'
    ? payments
    : payments.filter((payment) => payment.service_name === paymentServiceFilter))
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filteredBookings = (filter === 'all' ? bookings : bookings.filter((booking) => booking.status === filter))
    .slice()
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  const customers = Array.from(
    bookings.reduce((map, booking) => {
      const key = booking.customer_email.toLowerCase()
      const current = map.get(key) ?? {
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
        bookings: 0,
        spend: 0,
        lastVisit: booking.starts_at,
      }
      current.bookings += 1
      if (new Date(booking.starts_at) > new Date(current.lastVisit)) current.lastVisit = booking.starts_at
      current.spend = successfulPayments
        .filter((payment) => payment.customer_email.toLowerCase() === key)
        .reduce((total, payment) => total + payment.amount_naira, 0)
      map.set(key, current)
      return map
    }, new Map<string, { name: string; email: string; phone: string; bookings: number; spend: number; lastVisit: string }>()),
  )
    .map(([, customer]) => customer)
    .sort((a, b) => b.bookings - a.bookings)

  function openSidebar() {
    setNavOpen(true)

    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 640px)').matches) return

    window.requestAnimationFrame(() => {
      const sidebar = sidebarRef.current
      if (!sidebar) return

      gsap.fromTo(sidebar, { xPercent: -105 }, {
        xPercent: 0,
        duration: 0.45,
        ease: 'power3.out',
        onComplete: () => gsap.set(sidebar, { clearProps: 'transform' }),
      })
      if (scrimRef.current) {
        gsap.fromTo(scrimRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 })
      }
    })
  }

  function closeSidebar() {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
    const sidebar = sidebarRef.current

    if (!isMobile || !navOpen || !sidebar) {
      setNavOpen(false)
      return
    }

    gsap.to(sidebar, {
      xPercent: -105,
      duration: 0.32,
      ease: 'power2.in',
      onComplete: () => setNavOpen(false),
    })

    if (scrimRef.current) {
      gsap.to(scrimRef.current, { autoAlpha: 0, duration: 0.24, ease: 'power2.in' })
    }
  }

  function openTab(next: DashboardTab) {
    setTab(next)
    closeSidebar()
    setFeedback(null)
  }

  function toggleNotificationPanel() {
    setNotificationPanelOpen((current) => {
      if (!current) setUnreadCount(0)
      return !current
    })
  }

  function clearNotifications() {
    setNotifications([])
    setUnreadCount(0)
  }

  async function submitService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    setSaving(true)
    setFeedback(null)
    let uploadedImagePath: string | null = null
    let supabase: ReturnType<typeof createBrowserClient<Database>> | null = null
    try {
      let imagePath = draft.image_path
      if (serviceImageFile) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key) {
          setFeedback({ success: false, message: 'Image upload is unavailable. Check your Supabase configuration.' })
          return
        }

        supabase = createBrowserClient<Database>(url, key)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setFeedback({ success: false, message: 'Your owner session has expired. Sign in again before uploading a service image.' })
          return
        }

        const extension = serviceImageFile.type === 'image/png' ? 'png' : serviceImageFile.type === 'image/webp' ? 'webp' : 'jpg'
        uploadedImagePath = `${user.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('service-images')
          .upload(uploadedImagePath, serviceImageFile, { contentType: serviceImageFile.type, cacheControl: '3600' })
        if (uploadError) {
          console.error('Service image upload failed:', uploadError.message)
          const errorMessage = uploadError.message.toLowerCase()
          const message = errorMessage.includes('bucket not found')
            ? 'Service image storage is not set up yet. Apply the service image migration to your Supabase project, then try again.'
            : errorMessage.includes('row-level security')
              ? 'Supabase blocked this upload. Apply supabase/migrations/20261108000000_fix_service_image_upload_policy.sql in the SQL Editor, then sign out and back in before retrying.'
              : `Could not upload the service image: ${uploadError.message}`
          setFeedback({ success: false, message })
          return
        }
        imagePath = uploadedImagePath
      }

      const result = await saveService({
        id: draft.id,
        name: draft.name,
        duration_minutes: Number(draft.duration_minutes),
        price_naira: Number(draft.price_naira),
        tone: draft.tone,
        active: draft.active,
        image_path: imagePath,
      })
      setFeedback(result)
      if (result.success && result.data) {
        const saved = result.data
        setServices((current) => {
          const exists = current.some((service) => service.id === saved.id)
          return exists ? current.map((service) => (service.id === saved.id ? saved : service)) : [...current, saved]
        })
        resetServiceImageSelection()
        setDraft(null)
      } else if (uploadedImagePath && supabase) {
        const { error: cleanupError } = await supabase.storage.from('service-images').remove([uploadedImagePath])
        if (cleanupError) console.error('Unused service image cleanup failed:', cleanupError.message)
      }
    } catch {
      if (uploadedImagePath && supabase) {
        const { error: cleanupError } = await supabase.storage.from('service-images').remove([uploadedImagePath])
        if (cleanupError) console.error('Unused service image cleanup failed:', cleanupError.message)
      }
      setFeedback({ success: false, message: 'Could not reach the server. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  function chooseServiceImage(file: File | undefined) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ success: false, message: 'Choose a JPEG, PNG, or WebP image.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ success: false, message: 'Service images must be 5 MB or smaller.' })
      return
    }

    if (serviceImagePreview) URL.revokeObjectURL(serviceImagePreview)
    setServiceImageFile(file)
    setServiceImagePreview(URL.createObjectURL(file))
    setFeedback(null)
  }

  function resetServiceImageSelection() {
    if (serviceImagePreview) URL.revokeObjectURL(serviceImagePreview)
    setServiceImageFile(null)
    setServiceImagePreview(null)
  }

  function editService(service: BookaService) {
    resetServiceImageSelection()
    setFeedback(null)
    setDraft({
      id: service.id,
      name: service.name,
      duration_minutes: String(service.duration_minutes),
      price_naira: String(service.price_naira),
      tone: service.tone,
      active: service.active,
      image_path: service.image_path,
    })
  }

  function closeServiceDraft() {
    if (saving) return
    resetServiceImageSelection()
    setDraft(null)
  }

  async function toggleService(service: BookaService) {
    setSaving(true)
    setFeedback(null)
    try {
      const result = await saveService({
        id: service.id,
        name: service.name,
        duration_minutes: service.duration_minutes,
        price_naira: service.price_naira,
        tone: service.tone,
        active: !service.active,
      })
      setFeedback(result)
      if (result.success && result.data) {
        const saved = result.data
        setServices((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      }
    } catch {
      setFeedback({ success: false, message: 'Could not reach the server. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function removeService(service: BookaService) {
    if (!window.confirm(`Delete “${service.name}”? Existing bookings will keep the time but lose the service name.`)) return
    setSaving(true)
    setFeedback(null)
    try {
      const result = await deleteService(service.id)
      setFeedback(result)
      if (result.success) setServices((current) => current.filter((item) => item.id !== service.id))
    } catch {
      setFeedback({ success: false, message: 'Could not reach the server. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function changeBookingStatus(booking: BookaBooking, status: BookingStatus) {
    setOpenBookingActions(null)
    setSaving(true)
    setFeedback(null)
    try {
      const result = await setBookingStatus(booking.id, status)
      setFeedback(result)
      if (result.success && result.data) {
        const saved = result.data
        setBookings((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      }
    } catch {
      setFeedback({ success: false, message: 'Could not reach the server. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function removeBooking(booking: BookaBooking) {
    if (!window.confirm(`Delete the booking for ${booking.customer_name}? This cannot be undone.`)) return

    setOpenBookingActions(null)
    setSaving(true)
    setFeedback(null)
    try {
      const result = await deleteBooking(booking.id)
      setFeedback(result)
      if (result.success) {
        setBookings((current) => current.filter((item) => item.id !== booking.id))
        setPayments((current) => current.filter((payment) => payment.booking_id !== booking.id))
      }
    } catch {
      setFeedback({ success: false, message: 'Could not reach the server. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const result = await updateBusinessProfile(profileDraft)
      setFeedback(result)
      if (result.success && result.data) setProfile(result.data)
    } catch {
      setFeedback({ success: false, message: 'Could not reach the server. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="backoffice-shell screen-shell">
      <aside ref={sidebarRef} className={`dashboard-sidebar ${navOpen ? 'open' : ''}`}>
        <div>
          <div className="sidebar-brand">
            <Logo light />
            <button className="sidebar-close" type="button" aria-label="Close navigation" onClick={closeSidebar}><X size={18} /></button>
          </div>
          <span className="workspace-label">{profile.name.toUpperCase()} / OWNER</span>
          <nav className="dashboard-nav">
            {navTabs.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => openTab(id)}>
                <Icon size={17} />
                {label}
                {id === 'bookings' && pendingBookings.length > 0 && <b>{pendingBookings.length}</b>}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => openTab('settings')}><Settings2 size={17} />Settings</button>
        </div>
      </aside>

      {navOpen && <button className="sidebar-scrim" ref={scrimRef} type="button" aria-label="Close navigation" onClick={closeSidebar} />}

      <div className="dashboard-main">
        <div className="dashboard-utility-bar">
          <span className="utility-date">{today}</span>
          <div className="utility-actions">
            <div className="notification-wrap" ref={notificationRef}>
              <button
                className="utility-bell"
                type="button"
                aria-label={notificationPanelOpen ? 'Close notifications' : 'Notifications'}
                aria-haspopup="dialog"
                aria-expanded={notificationPanelOpen}
                onClick={toggleNotificationPanel}
              >
                <Bell size={18} />
                {unreadCount > 0 && <i>{unreadCount > 9 ? '9+' : unreadCount}</i>}
              </button>
              {notificationPanelOpen && (
                <div className="notification-panel" role="dialog" aria-label="Notifications">
                  <div className="notification-panel-heading">
                    <div>
                      <strong>Notifications</strong>
                      <small>Bookings and Paystack payments</small>
                    </div>
                    <div className="notification-panel-actions">
                      <button type="button" className="notification-sound" aria-pressed={soundEnabled} onClick={() => setSoundEnabled((current) => !current)}>
                        {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />} Sound
                      </button>
                      {notifications.length > 0 && <button type="button" className="notification-clear" onClick={clearNotifications}>Clear</button>}
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      <Bell size={24} />
                      <strong>All quiet right now.</strong>
                      <span>You will hear a chime when someone books or when a Paystack payment is verified.</span>
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notifications.map((notification) => {
                        const Icon = notification.kind === 'booking' ? CalendarDays : CreditCard
                        return (
                          <div className="notification-item" key={notification.id}>
                            <span className={`notification-icon ${notification.kind}`}><Icon size={17} /></span>
                            <div>
                              <strong>{notification.title}</strong>
                              <small>{notification.description}</small>
                            </div>
                            <time>{formatShortDate(notification.at)}</time>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="header-owner-wrap" ref={ownerMenuRef}>
              <button
                className={`header-owner ${ownerMenuOpen ? 'open' : ''}`}
                type="button"
                aria-haspopup="menu"
                aria-expanded={ownerMenuOpen}
                aria-label="Open owner menu"
                onClick={() => setOwnerMenuOpen((current) => !current)}
              >
                <span>{initialsOf(`${profile.owner_first_name} ${profile.owner_last_name}`)}</span>
                <ChevronDown size={15} />
              </button>
              {ownerMenuOpen && (
                <div className="owner-menu" role="menu">
                  <div className="owner-menu-name" role="none">
                    <strong>{profile.owner_first_name} {profile.owner_last_name}</strong>
                    <small>Owner account</small>
                    <Link className="owner-menu-link" href={publicPath || '/'} onClick={() => setOwnerMenuOpen(false)}>
                      {publicUrl}
                    </Link>
                  </div>
                  <form action={signOutOwner}>
                    <button className="owner-menu-logout" type="submit" role="menuitem"><LogOut size={15} />Log out</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
        <header className="dashboard-header">
          <button className="icon-button dashboard-menu" type="button" aria-label="Open dashboard menu" onClick={openSidebar}><Menu size={18} /></button>
          <div>
            <h1>{greeting}, {profile.owner_first_name} <span>✦</span></h1>
          </div>
        </header>

        {feedback && (
          <p className={`form-feedback dashboard-feedback ${feedback.success ? 'success' : 'error'}`} role={feedback.success ? 'status' : 'alert'}>
            {feedback.message}
          </p>
        )}

        {tab === 'overview' && (
          <>
            <div className="metric-grid overview-metrics">
              <article><span>Bookings this month</span><strong>{monthBookings.length}</strong><small className="neutral">{pendingBookings.length} pending confirmation</small></article>
              <article><span>Revenue collected</span><strong>{formatNaira(collected)}</strong><small className="positive">{formatNaira(expected)} <i>awaiting payment</i></small></article>
              <article><span>Avg. booking value</span><strong>{formatNaira(average)}</strong><small className="neutral">Across {successfulPayments.length} verified payments</small></article>
            </div>

            <div className="dashboard-columns">
              <article className="analytics-card">
                <div className="card-heading">
                  <div><span className="eyebrow">Revenue overview</span><h2>{formatNaira(chartTotal)} <small>last 6 months</small></h2></div>
                  <span className="filter-button">Verified payments <ChevronDown size={14} /></span>
                </div>
                <div className="chart-wrap">
                  <div className="chart-labels">
                    <span>{formatNaira(maxRevenue)}</span>
                    <span>{formatNaira(Math.round(maxRevenue * 0.66))}</span>
                    <span>{formatNaira(Math.round(maxRevenue * 0.33))}</span>
                    <span>₦0</span>
                  </div>
                  <svg ref={chartRef} viewBox="0 0 720 230" role="img" aria-label="Revenue chart">
                    <defs>
                      <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#c5a46d" stopOpacity=".32" />
                        <stop offset="1" stopColor="#c5a46d" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path className="chart-area" d={chartArea} fill="url(#chartFill)" />
                    <path className="chart-line" d={chartLine} fill="none" stroke="#c5a46d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    {chartPoints.map((point, index) => <circle className="chart-point" key={index} cx={point.x} cy={point.y} r="5" fill="#0a1e36" stroke="#c5a46d" strokeWidth="3" />)}
                  </svg>
                  <div className="chart-months">
                    {months.map((month) => <span key={monthKey(month)}>{new Intl.DateTimeFormat('en-NG', { month: 'short' }).format(month)}</span>)}
                  </div>
                </div>
              </article>

              <article className="upcoming-card">
                <div className="card-heading">
                  <div><span className="eyebrow">Next up</span><h2>Upcoming <small>{upcoming.length} bookings</small></h2></div>
                  <button className="text-button" type="button" onClick={() => openTab('bookings')}>See all <ArrowRight size={14} /></button>
                </div>
                {upcoming.length === 0 ? (
                  <p className="empty-state">No upcoming bookings yet. Share your booking link to get started.</p>
                ) : (
                  <div className="booking-list">
                    {upcoming.slice(0, 4).map((booking) => (
                      <div className="booking-row" key={booking.id}>
                        <span className={`avatar ${serviceById.get(booking.service_id ?? '')?.tone ?? 'gold'}`}>{initialsOf(booking.customer_name)}</span>
                        <div><strong>{booking.customer_name}</strong><small>{serviceName(booking)}</small></div>
                        <time>{formatBookingDate(booking.starts_at)}</time>
                        <span className={`status ${booking.status}`}>{booking.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          </>
        )}

        {tab === 'bookings' && (
          <article className="panel-card bookings-panel">
            <div className="bookings-hero">
              <div>
                <span className="eyebrow">Customer ledger</span>
                <h2>Every booking, <em>beautifully tracked.</em></h2>
                <p>People who book your services through your landing page appear here with their contact details, appointment time, and current status.</p>
              </div>
              <div className="bookings-hero-stats" aria-label="Booking summary">
                <div><strong>{bookings.length}</strong><span>Total bookings</span></div>
                <div><strong>{pendingBookings.length}</strong><span>Need action</span></div>
                <div><strong>{upcoming.length}</strong><span>Upcoming</span></div>
              </div>
            </div>
            <div className="filter-toolbar">
              <div className="filter-row">
                {(['all', ...BOOKING_STATUSES] as const).map((status) => (
                  <button key={status} type="button" className={filter === status ? 'selected' : ''} onClick={() => setFilter(status)}>
                    {status === 'all' ? 'All bookings' : status[0].toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <span className="bookings-count"><Users size={13} /> {filteredBookings.length} shown</span>
            </div>
            {filteredBookings.length === 0 ? (
              <div className="empty-state bookings-empty">
                <Users size={28} />
                <strong>No customers match this view.</strong>
                <span>Once people book your menu on your public page, they’ll show up here automatically.</span>
              </div>
            ) : (
              <div className="bookings-table" role="table" aria-label="Bookings made by customers">
                <div className="bookings-table-header" role="row">
                  <span role="columnheader">Customer</span>
                  <span role="columnheader">Service & time</span>
                  <span role="columnheader">Value</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Action</span>
                </div>
                {filteredBookings.map((booking) => (
                  <div className="bookings-table-row" role="row" key={booking.id}>
                    <div className="booking-customer-cell" role="cell">
                      <span className={`avatar ${serviceById.get(booking.service_id ?? '')?.tone ?? 'gold'}`}>{initialsOf(booking.customer_name)}</span>
                      <div><strong>{booking.customer_name}</strong><small>{booking.customer_email}</small><small>{booking.customer_phone}</small></div>
                    </div>
                    <div className="booking-service-cell" role="cell">
                      <strong>{serviceName(booking)}</strong>
                      <small>{formatBookingDate(booking.starts_at)}</small>
                      <small>Booked {formatShortDate(booking.created_at)}</small>
                    </div>
                    <div className="booking-value-cell" role="cell"><strong>{formatNaira(priceOf(booking))}</strong><small>#{booking.id.slice(0, 8)}</small></div>
                    <span className={`status ${booking.status}`} role="cell">{booking.status}</span>
                    <div className="booking-actions" role="cell">
                      <div className="booking-action-menu" ref={openBookingActions?.id === booking.id ? bookingActionsRef : null}>
                        <button
                          type="button"
                          className="booking-action-trigger"
                          aria-label={`Actions for ${booking.customer_name}'s booking`}
                          aria-haspopup="menu"
                          aria-expanded={openBookingActions?.id === booking.id}
                          disabled={saving}
                          onClick={(event) => {
                            if (openBookingActions?.id === booking.id) {
                              setOpenBookingActions(null)
                              return
                            }
                            const rect = event.currentTarget.getBoundingClientRect()
                            const menuHeight = 132
                            const top = rect.bottom + menuHeight + 8 > window.innerHeight
                              ? Math.max(8, rect.top - menuHeight - 8)
                              : rect.bottom + 8
                            const right = Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - 176))
                            setOpenBookingActions({ id: booking.id, top, right })
                          }}
                        >
                          <Ellipsis size={19} />
                        </button>
                        {openBookingActions?.id === booking.id && (
                          <div className="booking-action-dropdown" role="menu" aria-label="Booking actions" style={{ top: openBookingActions.top, right: openBookingActions.right }}>
                            <button type="button" role="menuitem" disabled={saving || booking.status === 'pending'} onClick={() => changeBookingStatus(booking, 'pending')}>
                              <Clock size={14} /> Mark pending
                            </button>
                            <button type="button" role="menuitem" disabled={saving || booking.status !== 'pending'} onClick={() => changeBookingStatus(booking, 'confirmed')}>
                              <Check size={14} /> Confirm
                            </button>
                            <button type="button" role="menuitem" className="danger" disabled={saving || (booking.status !== 'pending' && booking.status !== 'confirmed')} onClick={() => changeBookingStatus(booking, 'cancelled')}>
                              <X size={14} /> Cancel
                            </button>
                            <button type="button" role="menuitem" className="danger" disabled={saving} onClick={() => removeBooking(booking)}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {tab === 'services' && (
          <article className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Services</span><h2>Your menu</h2></div>
              <button className="primary-button" type="button" onClick={() => { resetServiceImageSelection(); setFeedback(null); setDraft(emptyServiceDraft) }}><Plus size={16} /> Add service</button>
            </div>

            {services.length === 0 ? (
              <p className="empty-state">No services yet. Add your first service so customers can book.</p>
            ) : (
              <div className="service-list">
                {services.map((service) => (
                  <div className={`service-row ${service.active ? '' : 'inactive'}`} key={service.id}>
                    <span className={`service-dot ${service.tone}`} />
                    <div className="service-info"><strong>{service.name}</strong><small>{service.duration_minutes} min · {formatNaira(service.price_naira)}</small></div>
                    <span className={`status ${service.active ? 'confirmed' : 'cancelled'}`}>{service.active ? 'Live' : 'Hidden'}</span>
                    <div className="service-actions">
                      <button type="button" className="mini-button" disabled={saving} onClick={() => editService(service)}><Pencil size={13} /> Edit</button>
                      <button type="button" className="mini-button" disabled={saving} onClick={() => toggleService(service)}>{service.active ? 'Hide' : 'Show'}</button>
                      <button type="button" className="mini-button danger" disabled={saving} onClick={() => removeService(service)}><Trash2 size={13} /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {tab === 'customers' && (
          <article className="panel-card customers-panel">
            <div className="panel-heading customers-heading">
              <div><span className="eyebrow">Customer roster</span><h2>People who booked you</h2></div>
              <span className="payment-badge"><Users size={15} /> {customers.length} customers</span>
            </div>
            <p className="panel-note">Your most loyal customers, ranked by how often they book. Spend reflects Paystack-verified payments only.</p>
            {customers.length === 0 ? (
              <div className="empty-state bookings-empty">
                <Users size={28} />
                <strong>No customers yet.</strong>
                <span>Once someone books one of your services from your public page, their details will appear here.</span>
              </div>
            ) : (
              <div className="customers-table" role="table" aria-label="Customers who booked your business">
                <div className="customers-table-header" role="row">
                  <span role="columnheader">Customer</span>
                  <span role="columnheader">Phone</span>
                  <span role="columnheader">Bookings</span>
                  <span role="columnheader">Spent</span>
                  <span role="columnheader">Last visit</span>
                </div>
                {customers.map((customer) => (
                  <div className="customers-table-row" role="row" key={customer.email}>
                    <div className="customer-person-cell" role="cell">
                      <span className="avatar gold">{initialsOf(customer.name)}</span>
                      <div><strong>{customer.name}</strong><small>{customer.email}</small></div>
                    </div>
                    <a className="customer-phone" role="cell" href={`tel:${customer.phone}`}>{customer.phone}</a>
                    <strong className="customer-count" role="cell">{customer.bookings} booking{customer.bookings === 1 ? '' : 's'}</strong>
                    <strong className="customer-spend" role="cell">{formatNaira(customer.spend)}</strong>
                    <time className="customer-last-visit" role="cell">{new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(new Date(customer.lastVisit))}</time>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {tab === 'payments' && (
          <article className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Paystack</span><h2>Payment tracking</h2></div>
              <span className="payment-badge"><CreditCard size={15} /> {payments.length} records</span>
            </div>
            <p className="panel-note">Records are created when a customer holds a service on your landing page and marked paid only after Paystack verifies the transaction.</p>
            <div className="metric-grid payment-metrics">
              <article><span>Collected</span><strong>{formatNaira(collected)}</strong><small className="positive">{successfulPayments.length} verified payments</small></article>
              <article><span>Awaiting payment</span><strong>{formatNaira(expected)}</strong><small className="neutral">{openPayments.length} open checkouts</small></article>
              <article><span>Unsuccessful</span><strong>{formatNaira(failedTotal)}</strong><small className="neutral">{failedPayments.length} failed or abandoned</small></article>
            </div>
            <div className="filter-row payment-filter-row">
              <button type="button" className={paymentServiceFilter === 'all' ? 'selected' : ''} onClick={() => setPaymentServiceFilter('all')}>All services</button>
              {paymentServiceNames.map((serviceName) => (
                <button key={serviceName} type="button" className={paymentServiceFilter === serviceName ? 'selected' : ''} onClick={() => setPaymentServiceFilter(serviceName)}>{serviceName}</button>
              ))}
            </div>
            {filteredPayments.length === 0 ? (
              <p className="empty-state">No Paystack records yet. They appear as soon as a customer holds or pays for a service on your landing page.</p>
            ) : (
              <div className="booking-table">
                {filteredPayments.map((payment) => (
                  <div className="booking-table-row payment-row" key={payment.id}>
                    <span className="avatar gold">{initialsOf(payment.customer_name)}</span>
                    <div className="booking-customer"><strong>{payment.customer_name}</strong><small>{payment.customer_email}</small></div>
                    <div className="booking-service"><strong>{payment.service_name}</strong><small>{formatBookingDate(payment.starts_at)} · {payment.paystack_reference}</small></div>
                    <strong className="payment-amount">{formatNaira(payment.amount_naira)}</strong>
                    <span className={`status ${payment.status}`}>{payment.status === 'awaiting_payment' ? 'awaiting payment' : payment.status}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {tab === 'settings' && (
          <article className="panel-card">
            <div className="panel-heading">
              <div><span className="eyebrow">Settings</span><h2>Business details</h2></div>
              <span className="muted-note">Your public link stays the same</span>
            </div>
            <form className="panel-form" onSubmit={submitProfile}>
              <div className="field-grid">
                <label>Business name<input required minLength={2} maxLength={120} value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} /></label>
                <label>Business type<div className="select-wrap"><select value={profileDraft.business_type} onChange={(event) => setProfileDraft({ ...profileDraft, business_type: event.target.value as BookaBusiness['business_type'] })}><option value="Barbing">Barbing</option><option value="Hairdressing">Hairdressing</option><option value="Spa">Spa</option></select><ChevronDown size={16} /></div></label>
              </div>
              <div className="field-grid">
                <label>Owner first name<input required maxLength={80} value={profileDraft.owner_first_name} onChange={(event) => setProfileDraft({ ...profileDraft, owner_first_name: event.target.value })} /></label>
                <label>Owner last name<input required maxLength={80} value={profileDraft.owner_last_name} onChange={(event) => setProfileDraft({ ...profileDraft, owner_last_name: event.target.value })} /></label>
              </div>
              <label>Business address<input required maxLength={200} value={profileDraft.address} onChange={(event) => setProfileDraft({ ...profileDraft, address: event.target.value })} /></label>
              <div className="field-grid">
                <label>City<input required maxLength={100} value={profileDraft.city} onChange={(event) => setProfileDraft({ ...profileDraft, city: event.target.value })} /></label>
                <label>Phone number<input required type="tel" maxLength={32} value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })} /></label>
              </div>
              <label>Public booking link<input readOnly value={publicUrl} /></label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}<ArrowRight size={16} /></button>
              </div>
            </form>
          </article>
        )}
      </div>

      {draft && (
        <div className="modal-scrim service-modal-scrim" role="presentation" onClick={closeServiceDraft}>
          <section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">{draft.id ? 'Edit service' : 'Add service'}</span>
                <h2 id="service-modal-title">{draft.id ? 'Update your menu item' : 'Create a new service'}</h2>
              </div>
              <button className="icon-button modal-close" type="button" aria-label="Close service form" disabled={saving} onClick={closeServiceDraft}><X size={17} /></button>
            </div>
            <form className="panel-form service-modal-form" onSubmit={submitService}>
              <div className="field-grid">
                <label>Service name<input required autoFocus minLength={2} maxLength={120} placeholder="e.g. Signature glow facial" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                <label>Duration (minutes)<input required type="number" min={5} max={600} step={5} value={draft.duration_minutes} onChange={(event) => setDraft({ ...draft, duration_minutes: event.target.value })} /></label>
              </div>
              <div className="field-grid">
                <label>Price (₦)<input required type="number" min={0} max={100000000} step={100} value={draft.price_naira} onChange={(event) => setDraft({ ...draft, price_naira: event.target.value })} /></label>
                <label>Colour<div className="select-wrap"><select value={draft.tone} onChange={(event) => setDraft({ ...draft, tone: event.target.value as ServiceTone })}><option value="gold">Gold</option><option value="teal">Teal</option><option value="rose">Rose</option></select><ChevronDown size={16} /></div></label>
              </div>
              <label className="service-image-field">
                Service image (optional)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseServiceImage(event.currentTarget.files?.[0])} />
                <small>JPEG, PNG, or WebP · 5 MB max</small>
                {(serviceImagePreview || draft.image_path) && (
                  <img
                    className="service-image-preview"
                    src={serviceImagePreview ?? serviceImageFor(draft.name || 'Service', profile.business_type, draft.image_path ?? undefined)}
                    alt="Service image preview"
                  />
                )}
              </label>
              <label className="checkbox-row"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Show this service on the public page</label>
              {feedback && <p className={`form-feedback ${feedback.success ? 'success' : 'error'}`} role={feedback.success ? 'status' : 'alert'}>{feedback.message}</p>}
              <div className="form-actions">
                <button type="button" className="text-button" disabled={saving} onClick={closeServiceDraft}>Cancel</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : draft.id ? 'Save changes' : 'Add service'}<ArrowRight size={16} /></button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
