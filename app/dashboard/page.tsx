'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import {
  ArrowRight,
  Archive,
  Ban,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Globe,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MoreVertical,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Store,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { UsageChart } from '@/components/dashboard/usage-chart'
import { INITIAL_SETTINGS } from '@/lib/store'
import { createSupabaseClient } from '@/lib/supabase'
import {
  deleteService,
  loadBusinessWorkspace,
  saveAppointments,
  saveBusinessSettings,
  saveNotifications,
  saveServices,
  setServiceActive,
} from '@/lib/supabase-data'
import { Appointment, Client, NotificationItem, BusinessSettings, Service } from '@/types'
import { playBeepSound } from '@/lib/sound'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'Overview' | 'Appointments' | 'Services' | 'Clients' | 'Insights' | 'Settings'>('Overview')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isBeeping, setIsBeeping] = useState(false)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(INITIAL_SETTINGS)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    let active = true
    const loadWorkspace = async (userId: string) => {
      try {
        const workspace = await loadBusinessWorkspace(userId)
        if (!active) return
        setBusinessId(workspace.businessId)
        setBusinessSettings(workspace.settings)
        setServices(workspace.services)
        setAppointments(workspace.appointments)
        setClients(workspace.clients)
        setNotifications(workspace.notifications)
        setPageError('')
      } catch (error) {
        if (active) setPageError(error instanceof Error ? error.message : 'Could not load your Supabase data.')
      }
    }

    const initialize = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        if (!user) {
          router.replace('/login')
          return
        }
        if (!active) return
        setAuthUserId(user.id)
        await loadWorkspace(user.id)
      } catch (error) {
        if (active) setPageError(error instanceof Error ? error.message : 'Could not authenticate with Supabase.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void initialize()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!authUserId || !businessId) return
    const supabase = createSupabaseClient()
    const refresh = async () => {
      try {
        const workspace = await loadBusinessWorkspace(authUserId)
        setBusinessSettings(workspace.settings)
        setServices(workspace.services)
        setAppointments(workspace.appointments)
        setClients(workspace.clients)
        setNotifications(workspace.notifications)
        setPageError('')
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Could not refresh Supabase data.')
      }
    }
    const channel = supabase.channel(`business-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses', filter: `owner_id=eq.${authUserId}` }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `business_id=eq.${businessId}` }, () => { triggerBellBeep(); void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services', filter: `business_id=eq.${businessId}` }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `business_id=eq.${businessId}` }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `business_id=eq.${businessId}` }, () => { void refresh() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [authUserId, businessId])

  // Trigger bell ring animation and audio chime
  const triggerBellBeep = () => {
    playBeepSound()
    setIsBeeping(true)
    setTimeout(() => setIsBeeping(false), 1200)
  }

  const persistAppointments = async (newApts: Appointment[]) => {
    try {
      await saveAppointments(newApts, businessId)
      setAppointments(newApts)
      setPageError('')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not save appointments.')
    }
  }

  const persistServices = async (newSvcs: Service[]) => {
    try {
      await saveServices(newSvcs, businessId)
      setServices(newSvcs)
      setPageError('')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not save services.')
    }
  }

  const persistNotifications = async (newNotifs: NotificationItem[]) => {
    try {
      await saveNotifications(newNotifs, businessId)
      setNotifications(newNotifs)
      setPageError('')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not save notifications.')
    }
  }

  // Active Dropdown state for three dots & Share popover
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [bookingUrl, setBookingUrl] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const mobileMenuBackdropRef = useRef<HTMLButtonElement>(null)
  const mobileMenuPanelRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (!mobileMenuOpen || !mobileMenuPanelRef.current || !mobileMenuBackdropRef.current) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)

    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(mobileMenuBackdropRef.current, { autoAlpha: 1 })
        gsap.set(mobileMenuPanelRef.current, { xPercent: 0 })
        return
      }

      gsap.fromTo(
        mobileMenuBackdropRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.2, ease: 'power1.out' }
      )
      gsap.fromTo(
        mobileMenuPanelRef.current,
        { xPercent: -100 },
        { xPercent: 0, duration: 0.35, ease: 'power3.out' }
      )
    })

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      context.revert()
    }
  }, [mobileMenuOpen])

  const activeSlug =
    businessSettings.slug ||
    businessSettings.businessId ||
    businessSettings.businessName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    'studio'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBookingUrl(`${window.location.origin}/${activeSlug}`)
    }
  }, [activeSlug])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenActionDropdownId(null)
      }
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShareOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyBookingLink = async () => {
    const url =
      bookingUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/${activeSlug}`
        : `https://booka.app/${activeSlug}`)
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  // Appointment filters & search
  const [aptSearch, setAptSearch] = useState('')
  const [aptFilter, setAptFilter] = useState<'All' | 'Paid' | 'Confirmed' | 'Pending' | 'Archived' | 'Rejected'>('All')

  // Client search
  const [clientSearch, setClientSearch] = useState('')

  // Appointments sub-tab: Management vs Calendar
  const [aptSubTab, setAptSubTab] = useState<'management' | 'calendar'>('management')
  const [calendarDate, setCalendarDate] = useState(new Date())

  // Service management state
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)
  const [newSvcName, setNewSvcName] = useState('')
  const [newSvcDetail, setNewSvcDetail] = useState('')
  const [newSvcCategory, setNewSvcCategory] = useState<'barbing' | 'spa' | 'hair' | 'general'>('hair')
  const [newSvcDuration, setNewSvcDuration] = useState('60')
  const [newSvcPrice, setNewSvcPrice] = useState('15000')
  const [serviceActionId, setServiceActionId] = useState<string | null>(null)

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSvcName) return

    const categoryThemes: Record<string, { color: string; iconColor: string }> = {
      barbing: { color: 'bg-[#eee7ff]', iconColor: 'text-[#7253cb]' },
      spa: { color: 'bg-[#ffe7df]', iconColor: 'text-[#d46b4f]' },
      hair: { color: 'bg-[#e7f2ea]', iconColor: 'text-[#528361]' },
      general: { color: 'bg-[#f0ded4]', iconColor: 'text-[#9e503b]' },
    }

    const theme = categoryThemes[newSvcCategory] || categoryThemes.general

    const created: Service = {
      id: `srv-${Date.now()}`,
      name: newSvcName.trim(),
      detail: newSvcDetail.trim() || 'Professional tailored service',
      category: newSvcCategory,
      durationMinutes: parseInt(newSvcDuration) || 45,
      price: parseInt(newSvcPrice) || 10000,
      color: theme.color,
      iconColor: theme.iconColor,
      isActive: true,
    }

    persistServices([...services, created])

    // Push notification & audio beep
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Service Added',
      message: `${created.name} added to your business menu.`,
      time: 'Just now',
      type: 'alert',
      read: false,
    }
    persistNotifications([newNotif, ...notifications])

    setNewSvcName('')
    setNewSvcDetail('')
    setNewSvcDuration('60')
    setNewSvcPrice('15000')
    setShowAddServiceModal(false)
  }

  const handleDeleteService = (id: string) => {
    void deleteService(id, businessId).then(() => {
      setServices((current) => current.filter((service) => service.id !== id))
      setPageError('')
    }).catch((error: unknown) => {
      setPageError(error instanceof Error ? error.message : 'Could not delete service.')
    })
  }

  const handleToggleService = async (service: Service) => {
    setServiceActionId(service.id)
    try {
      await setServiceActive(service.id, businessId, !service.isActive)
      setServices((current) => current.map((item) =>
        item.id === service.id ? { ...item, isActive: !service.isActive } : item
      ))
      setPageError('')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not update service availability.')
    } finally {
      setServiceActionId(null)
    }
  }

  // Settings feedback
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Handle Logo Upload via FileReader
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 100 * 1024) {
      setPageError('Choose an image file smaller than 100 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Url = event.target?.result
      if (typeof base64Url !== 'string') {
        setPageError('Could not read the selected logo file.')
        return
      }
      const updated = { ...businessSettings, logoUrl: base64Url }
      try {
        await saveBusinessSettings(updated, authUserId!)
        setBusinessSettings(updated)
        setPageError('')
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Could not save your logo.')
      }
    }
    reader.onerror = () => setPageError('Could not read the selected logo file.')
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = async () => {
    const updated = { ...businessSettings, logoUrl: undefined }
    try {
      await saveBusinessSettings(updated, authUserId!)
      setBusinessSettings(updated)
      setPageError('')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not remove your logo.')
    }
  }

  // Dynamic greeting based on current local time
  const currentHour = new Date().getHours()
  const timeGreeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 17
        ? 'Good afternoon'
        : 'Good evening'

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  // Navigation tabs
  const navigation = [
    { label: 'Overview' as const, icon: LayoutDashboard },
    { label: 'Appointments' as const, icon: CalendarDays },
    { label: 'Services' as const, icon: Layers },
    { label: 'Clients' as const, icon: Users },
    { label: 'Insights' as const, icon: BarChart3 },
    { label: 'Settings' as const, icon: Settings },
  ]

  const openMobileTab = (tab: (typeof navigation)[number]['label']) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    const { error } = await createSupabaseClient().auth.signOut()
    if (error) setPageError(error.message)
    else router.replace('/login')
  }

  const serviceMix = [
    { label: 'Barbing', value: '42%', color: 'bg-[#d46b4f]' },
    { label: 'Spa treatments', value: '31%', color: 'bg-[#e89b80]' },
    { label: 'Hair dressing', value: '27%', color: 'bg-[#f2c6b5]' },
  ]

  // Filtered Appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.clientName.toLowerCase().includes(aptSearch.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(aptSearch.toLowerCase())
    const matchesStatus = aptFilter === 'All' ? true : apt.status === aptFilter
    return matchesSearch && matchesStatus
  })

  // Filtered Clients
  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  )

  // ── Calendar helpers ──
  const calendarYear = calendarDate.getFullYear()
  const calendarMonth = calendarDate.getMonth()
  const calendarMonthName = calendarDate.toLocaleString('en-US', { month: 'long' })
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay() // 0=Sun

  const navigateMonth = (delta: number) => {
    setCalendarDate(new Date(calendarYear, calendarMonth + delta, 1))
  }

  // Build a mapping of day-number → appointments for the current month
  const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const appointmentsByDay: Record<number, Appointment[]> = {}
  appointments.forEach((apt) => {
    // We match appointments either by a date string like "Today", "2024-11-06", or by parsing
    let aptDay: number | null = null
    if (apt.date === 'Today') {
      const now = new Date()
      if (now.getMonth() === calendarMonth && now.getFullYear() === calendarYear) {
        aptDay = now.getDate()
      }
    } else {
      // Try parsing ISO date
      const parsed = new Date(apt.date)
      if (!isNaN(parsed.getTime()) && parsed.getMonth() === calendarMonth && parsed.getFullYear() === calendarYear) {
        aptDay = parsed.getDate()
      }
    }
    if (aptDay !== null) {
      if (!appointmentsByDay[aptDay]) appointmentsByDay[aptDay] = []
      appointmentsByDay[aptDay].push(apt)
    }
  })

  const [selectedCalDay, setSelectedCalDay] = useState<number | null>(null)
  const selectedDayAppointments = selectedCalDay ? (appointmentsByDay[selectedCalDay] || []) : []

  // Three-dot action status modifier: 1. Mark Paid, 2. Archived, 3. Pending, 4. Reject
  const updateAppointmentStatus = (
    id: string,
    status: 'Paid' | 'Archived' | 'Pending' | 'Rejected'
  ) => {
    const updated = appointments.map((a) => (a.id === id ? { ...a, status } : a))
    persistAppointments(updated)
    setOpenActionDropdownId(null)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveBusinessSettings(businessSettings, authUserId!)
      setSettingsSaved(true)
      setPageError('')
      setTimeout(() => setSettingsSaved(false), 2500)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not save settings.')
    }
  }

  // Calculate live dynamic totals
  const totalRevenue = appointments
    .filter((a) => a.status !== 'Rejected' && a.status !== 'Archived')
    .reduce((sum, a) => sum + a.amount, 0)
  const paidCount = appointments.filter((a) => a.status === 'Paid').length
  const confirmedCount = appointments.filter((a) => a.status === 'Confirmed').length
  const pendingCount = appointments.filter((a) => a.status === 'Pending').length
  const unreadNotifsCount = notifications.filter((n) => !n.read).length

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center bg-[#f3efe9] text-sm text-[#756f69]">Loading your workspace…</main>
  }

  if (!authUserId || pageError && !businessId) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3efe9] px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold">Could not load your workspace</h1>
          <p role="alert" className="mt-3 text-sm text-[#a9432e]">{pageError || 'Please sign in to continue.'}</p>
          <button onClick={() => router.replace('/login')} className="mt-5 rounded-full bg-[#211f1c] px-5 py-3 text-sm font-semibold text-white">Go to login</button>
        </div>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f3efe9] text-[#211f1c]">
      {pageError && (
        <div role="alert" className="fixed bottom-4 right-4 z-50 max-w-md rounded-xl bg-[#fff0eb] px-4 py-3 text-sm text-[#a9432e] shadow-lg">
          {pageError}
        </div>
      )}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            ref={mobileMenuBackdropRef}
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/50 opacity-0"
          />
          <aside
            ref={mobileMenuPanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Backoffice navigation"
            className="absolute inset-y-0 left-0 flex w-[min(19rem,85vw)] flex-col justify-between bg-[#211f1c] px-5 py-6 text-white shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between">
                <Logo light href="/dashboard" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="grid size-10 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="mt-9">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-white/30">
                  Workspace
                </p>
                <div className="mt-3 flex flex-col gap-1">
                  {navigation.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => openMobileTab(label)}
                      className={cn(
                        'flex items-center justify-between rounded-xl px-3 py-3 text-sm transition',
                        activeTab === label
                          ? 'bg-[#f3efe9] font-semibold text-[#211f1c]'
                          : 'text-white/65 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={17} />
                        {label}
                      </span>
                      {label === 'Appointments' && (
                        <span className="rounded-full bg-[#d46b4f] px-2 py-0.5 text-[10px] font-semibold text-white">
                          {appointments.length}
                        </span>
                      )}
                      {label === 'Services' && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {services.filter((service) => service.isActive).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </nav>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div className="flex min-w-0 items-center gap-2.5">
                {businessSettings.logoUrl ? (
                  <img
                    src={businessSettings.logoUrl}
                    alt={businessSettings.businessName}
                    className="size-9 shrink-0 rounded-full border border-white/20 bg-white/10 object-cover p-0.5"
                  />
                ) : (
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d46b4f] text-xs font-semibold text-white">
                    {businessSettings.ownerName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{businessSettings.ownerName}</p>
                  <p className="truncate text-[10px] text-white/40">{businessSettings.businessName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="ml-3 shrink-0 text-white/50 transition hover:text-white"
              >
                <LogOut size={18} />
              </button>
            </div>
          </aside>
        </div>
      )}
      {/* Dark Sidebar Navigation */}
      <aside className="hidden w-[262px] shrink-0 flex-col justify-between bg-[#211f1c] px-5 py-6 text-white lg:flex">
        <div>
          <Logo light href="/dashboard" />
          <nav className="mt-9">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-white/30">
              Workspace
            </p>
            <div className="mt-3 flex flex-col gap-1">
              {navigation.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveTab(label)}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-3 text-sm transition',
                    activeTab === label
                      ? 'bg-[#f3efe9] font-semibold text-[#211f1c]'
                      : 'text-white/55 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={17} />
                    {label}
                  </span>
                  {label === 'Appointments' && (
                    <span className="rounded-full bg-[#d46b4f] px-2 py-0.5 text-[10px] font-semibold text-white">
                      {appointments.length}
                    </span>
                  )}
                  {label === 'Services' && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {services.filter((service) => service.isActive).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>

        <div>
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex items-center gap-2.5 min-w-0">
              {businessSettings.logoUrl ? (
                <img
                  src={businessSettings.logoUrl}
                  alt={businessSettings.businessName}
                  className="size-9 rounded-full object-cover bg-white/10 p-0.5 border border-white/20 shrink-0"
                />
              ) : (
                <div className="grid size-9 place-items-center rounded-full bg-[#d46b4f] text-xs font-semibold text-white shrink-0">
                  {businessSettings.ownerName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-white">{businessSettings.ownerName}</p>
                <p className="text-[10px] text-white/40 truncate">{businessSettings.businessName}</p>
              </div>
            </div>
            <button type="button" onClick={handleSignOut} aria-label="Sign out" className="text-white/40 hover:text-white shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="min-w-0 flex-1 flex flex-col">
        {/* TOP HEADER SECTION: FULL-WIDTH, MATCHES SIDEBAR BG (#211f1c), PX-8 */}
        <header className="flex w-full items-center justify-between border-b border-white/10 bg-[#211f1c] px-4 py-4 text-white sm:px-8">
          <div className="flex items-center gap-3">
            {businessSettings.logoUrl ? (
              <button
                type="button"
                onClick={() => setActiveTab('Overview')}
                aria-label="Go to overview"
                className="flex min-w-0 items-center gap-2.5 text-left sm:gap-3"
              >
                <img
                  src={businessSettings.logoUrl}
                  alt={businessSettings.businessName}
                  className="h-9 sm:h-10 max-w-[120px] sm:max-w-[160px] object-contain rounded-lg bg-white/5 p-1 border border-white/10"
                />
                <span className="text-xs sm:text-sm font-semibold tracking-[-0.02em] text-white inline truncate max-w-[130px] sm:max-w-none">
                  {businessSettings.businessName}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold tracking-[-0.02em] text-white/90 inline truncate max-w-[130px] sm:max-w-none">
                  {businessSettings.businessName}
                </span>
              </div>
            )}
          </div>

          {/* Action Area: Share Booking Page & Notification Bell */}
          <div className="flex items-center gap-2.5">
            {/* Share Booking Page Button & Popover */}
            <div className="relative" ref={shareRef}>
              <button
                type="button"
                onClick={() => setShareOpen(!shareOpen)}
                className={cn(
                  'relative grid size-10 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20',
                  shareOpen && 'bg-[#d46b4f] text-white hover:bg-[#d46b4f]'
                )}
                aria-label="Share booking page"
                title="Share your booking page"
              >
                <Share2 size={17} />
              </button>

              {shareOpen && (
                <div className="absolute right-0 top-12 z-30 max-h-[calc(100dvh-6rem)] w-full max-w-96 overflow-y-auto rounded-2xl border border-[#e5ddd4] bg-[#fffdf9] p-4 text-[#1e1c1a] shadow-2xl sm:p-5">
                  <div className="flex items-center justify-between border-b border-[#eee7df] pb-3">
                    <div>
                      <h4 className="font-semibold text-sm">Share Booking Page</h4>
                      <p className="text-[11px] text-[#8c847c]">Send your direct booking link to clients or friends</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShareOpen(false)}
                      className="grid size-7 place-items-center rounded-full text-[#8c847c] hover:bg-[#f1ece5] transition"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Copy Link Input Bar */}
                  <div className="mt-4">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8c847c]">Direct Booking Link</label>
                    <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#ded8cf] bg-white p-1.5 pl-3">
                      <input
                        readOnly
                        value={bookingUrl || 'https://booka.app/book'}
                        className="flex-1 min-w-0 bg-transparent text-xs text-[#1e1c1a] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyBookingLink}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0',
                          shareCopied
                            ? 'bg-[#528361] text-white'
                            : 'bg-[#1e1c1a] text-white hover:bg-[#d46b4f]'
                        )}
                      >
                        {shareCopied ? (
                          <>
                            <Check size={13} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Social Media Sharing Channels */}
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c847c]">Share via Social Media</p>
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {/* WhatsApp */}
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Book your next appointment with ${businessSettings.businessName} on Booka: ${bookingUrl || 'https://booka.app/book'}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-[#eee7df] bg-[#fbfaf7] p-2.5 text-center transition hover:border-[#25D366] hover:bg-[#25D366]/5 group"
                      >
                        <span className="grid size-9 place-items-center rounded-full bg-[#25D366] text-white shadow-sm transition group-hover:scale-110">
                          <svg className="size-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                          </svg>
                        </span>
                        <span className="text-[10px] font-semibold text-[#1e1c1a]">WhatsApp</span>
                      </a>

                      {/* X / Twitter */}
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Book your next appointment with ${businessSettings.businessName} on Booka`)}&url=${encodeURIComponent(bookingUrl || 'https://booka.app/book')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-[#eee7df] bg-[#fbfaf7] p-2.5 text-center transition hover:border-[#1e1c1a] hover:bg-black/5 group"
                      >
                        <span className="grid size-9 place-items-center rounded-full bg-black text-white shadow-sm transition group-hover:scale-110">
                          <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </span>
                        <span className="text-[10px] font-semibold text-[#1e1c1a]">X (Twitter)</span>
                      </a>

                      {/* Facebook */}
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingUrl || 'https://booka.app/book')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-[#eee7df] bg-[#fbfaf7] p-2.5 text-center transition hover:border-[#1877F2] hover:bg-[#1877F2]/5 group"
                      >
                        <span className="grid size-9 place-items-center rounded-full bg-[#1877F2] text-white shadow-sm transition group-hover:scale-110">
                          <svg className="size-4 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </span>
                        <span className="text-[10px] font-semibold text-[#1e1c1a]">Facebook</span>
                      </a>

                      {/* LinkedIn */}
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(bookingUrl || 'https://booka.app/book')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-[#eee7df] bg-[#fbfaf7] p-2.5 text-center transition hover:border-[#0A66C2] hover:bg-[#0A66C2]/5 group"
                      >
                        <span className="grid size-9 place-items-center rounded-full bg-[#0A66C2] text-white shadow-sm transition group-hover:scale-110">
                          <svg className="size-4 fill-current" viewBox="0 0 24 24">
                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                          </svg>
                        </span>
                        <span className="text-[10px] font-semibold text-[#1e1c1a]">LinkedIn</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShareOpen(false)
                setMobileMenuOpen(true)
              }}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
            >
              <Menu size={19} />
            </button>

            {/* Action Area: Notification Bell with animated Beep alert */}
            <div className="relative hidden lg:block" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen)
                // Mark all read on open
                const readList = notifications.map((n) => ({ ...n, read: true }))
                persistNotifications(readList)
              }}
              className={cn(
                'relative grid size-10 place-items-center rounded-full bg-white/10 text-white transition-all',
                isBeeping
                  ? 'bg-[#d46b4f] scale-110 shadow-[0_0_20px_rgba(212,107,79,0.8)] animate-bounce'
                  : 'hover:bg-white/20'
              )}
              aria-label="Open notifications"
            >
              <Bell size={18} className={isBeeping ? 'animate-wiggle' : ''} />
              {unreadNotifsCount > 0 && (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#d46b4f] ring-2 ring-[#211f1c] animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-30 w-84 rounded-2xl border border-[#e5ddd4] bg-[#fffdf9] p-4 text-[#1e1c1a] shadow-xl">
                <div className="flex items-center justify-between border-b border-[#eee7df] pb-3">
                  <p className="font-semibold text-sm">Notifications Feed</p>
                  <span className="rounded-full bg-[#f0ded4] px-2 py-0.5 text-[10px] font-semibold text-[#9e503b]">
                    {notifications.length} alerts
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2.5 max-h-72 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="flex gap-3 rounded-xl bg-[#f7eee8] p-3 text-left transition hover:bg-[#efe4dc]"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#d46b4f] text-white">
                        <CalendarDays size={14} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold">{notif.title}</p>
                          <span className="text-[10px] text-[#8c847c]">{notif.time}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-4 text-[#756f69]">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

        {/* Workspace Body Content */}
        <div className="flex-1 px-5 py-6 md:px-8 md:py-8 xl:px-12">
          {/* ============================================================== */}
          {/* TAB 1: OVERVIEW PAGE (CONTAINS TIME GREETING ONLY HERE)         */}
          {/* ============================================================== */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* TIME GREETING SECTION: ONLY VISIBLE ON OVERVIEW */}
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#ded8cf]/60 pb-4">
                <div>
                  <p className="eyebrow text-[#d46b4f]">{formattedDate}</p>
                  <h1 className="mt-1 text-3xl font-medium tracking-[-.06em] text-[#1e1c1a]">
                    {timeGreeting}, {businessSettings.ownerName.split(' ')[0]}.
                  </h1>
                </div>
                <span className="rounded-full bg-[#e6f1e8] px-3 py-1 text-xs font-semibold text-[#4e7d5d]">
                  All systems healthy
                </span>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[22px] border border-[#e4ddd5] bg-[#fffdf9] p-5 shadow-sm">
                  <p className="text-xs text-[#8c847c]">Net revenue</p>
                  <p className="mt-2 text-3xl font-medium tracking-[-.06em]">₦{totalRevenue.toLocaleString()}</p>
                  <p className="mt-2 text-xs font-medium text-[#528361]">↑ 24.8% vs last month</p>
                </div>
                <div className="rounded-[22px] border border-[#e4ddd5] bg-[#fffdf9] p-5 shadow-sm">
                  <p className="text-xs text-[#8c847c]">Total bookings</p>
                  <p className="mt-2 text-3xl font-medium tracking-[-.06em]">{180 + appointments.length}</p>
                  <p className="mt-2 text-xs font-medium text-[#528361]">↑ 18.2% this month</p>
                </div>
                <div className="rounded-[22px] border border-[#e4ddd5] bg-[#fffdf9] p-5 shadow-sm">
                  <p className="text-xs text-[#8c847c]">Returning clients</p>
                  <p className="mt-2 text-3xl font-medium tracking-[-.06em]">68%</p>
                  <p className="mt-2 text-xs font-medium text-[#528361]">↑ 6.4% retention</p>
                </div>
                <div className="rounded-[22px] border border-[#e4ddd5] bg-[#fffdf9] p-5 shadow-sm">
                  <p className="text-xs text-[#8c847c]">Open slots</p>
                  <p className="mt-2 text-3xl font-medium tracking-[-.06em]">27</p>
                  <p className="mt-2 text-xs font-medium text-[#8c847c]">Across 3 active services</p>
                </div>
              </div>

              {/* GSAP Utilization Dynamic Bar Chart */}
              <UsageChart />

              {/* Today's Schedule & Revenue Mix */}
              <div className="grid min-w-0 gap-5 xl:grid-cols-[1.35fr_.65fr]">
                {/* Today's Schedule */}
                <div className="min-w-0 rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-4 shadow-sm sm:p-6 md:p-7">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">Operations / Today</p>
                      <h2 className="mt-1.5 text-2xl font-semibold tracking-[-.05em]">Today&apos;s schedule</h2>
                      <p className="mt-0.5 text-xs text-[#8b8178]">
                        {appointments.length} appointments · {paidCount} paid, {confirmedCount} confirmed
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Appointments')}
                      className="rounded-full border border-[#ded5cc] px-3.5 py-1.5 text-xs font-semibold text-[#1e1c1a] transition hover:bg-[#f7f2eb]"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {appointments.slice(0, 4).map((apt) => (
                      <div
                        key={apt.id}
                        className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-[#eee7df] bg-[#fffdf9] p-3 transition hover:border-[#caa08f] sm:flex-nowrap sm:gap-4 sm:p-3.5"
                      >
                        <span className="w-12 shrink-0 font-mono text-xs font-medium text-[#998f85]">{apt.time}</span>
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f0ded4] text-xs font-semibold text-[#9e503b]">
                          {apt.clientName.split(' ').map((p) => p[0]).join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{apt.clientName}</p>
                          <p className="truncate text-xs text-[#998f85]">{apt.serviceName}</p>
                        </div>
                        <div className="ml-auto shrink-0 text-right">
                          <p className="text-sm font-semibold">₦{apt.amount.toLocaleString()}</p>
                          <span
                            className={cn(
                              'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                              apt.status === 'Paid' && 'bg-[#e7f2ea] text-[#528361]',
                              apt.status === 'Confirmed' && 'bg-[#e7f2ea] text-[#528361]',
                              apt.status === 'Pending' && 'bg-[#fff0d7] text-[#a47328]',
                              apt.status === 'Archived' && 'bg-[#eee7df] text-[#756f69]',
                              apt.status === 'Rejected' && 'bg-[#ffe7df] text-[#d46b4f]'
                            )}
                          >
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue Mix */}
                <div className="min-w-0 rounded-[28px] bg-[#211f1c] p-4 text-white sm:p-6 md:p-7">
                  <div className="flex items-center justify-between">
                    <p className="eyebrow text-[#efb49f]">Revenue mix</p>
                    <BarChart3 size={18} className="text-[#e89b80]" />
                  </div>
                  <p className="mt-6 break-words text-3xl font-medium tracking-[-.07em] sm:text-4xl">₦{totalRevenue.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-white/45">total collected this period</p>

                  <div className="mt-8 space-y-5">
                    {serviceMix.map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs">
                          <span className="text-white/65">{item.label}</span>
                          <span className="font-semibold text-[#efb49f]">{item.value}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: item.value }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/${activeSlug}`}
                    className="mt-8 inline-flex w-full items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Preview customer booking page <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: APPOINTMENTS PAGE WITH THREE-DOT ACTION DROPDOWN         */}
          {/* ============================================================== */}
          {activeTab === 'Appointments' && (
            <div className="space-y-6">
              {/* Sub-tab selector: Management | Calendar */}
              <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-[#e5ddd4] bg-[#fffdf9] p-1.5 shadow-sm sm:w-fit">
                <button
                  type="button"
                  onClick={() => setAptSubTab('management')}
                  className={cn(
                    'flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[10px] font-semibold transition sm:gap-2 sm:px-5 sm:text-xs',
                    aptSubTab === 'management'
                      ? 'bg-[#1e1c1a] text-white shadow-sm'
                      : 'text-[#8c847c] hover:text-[#1e1c1a] hover:bg-[#f1ece5]'
                  )}
                >
                  <CalendarDays size={14} /> Appointments Management
                </button>
                <button
                  type="button"
                  onClick={() => setAptSubTab('calendar')}
                  className={cn(
                    'flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[10px] font-semibold transition sm:gap-2 sm:px-5 sm:text-xs',
                    aptSubTab === 'calendar'
                      ? 'bg-[#1e1c1a] text-white shadow-sm'
                      : 'text-[#8c847c] hover:text-[#1e1c1a] hover:bg-[#f1ece5]'
                  )}
                >
                  <BarChart3 size={14} /> Booking Calendar
                </button>
              </div>

              {/* ──── SUB-TAB 1: APPOINTMENTS MANAGEMENT TABLE ──── */}
              {aptSubTab === 'management' && (
              <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eee7df] pb-6">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-.04em]">Appointments Management</h2>
                    <p className="mt-1 text-xs text-[#8c847c]">
                      Track live bookings. Changes persist automatically.
                    </p>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-3.5 top-3 text-[#8c847c]" size={16} />
                    <input
                      value={aptSearch}
                      onChange={(e) => setAptSearch(e.target.value)}
                      placeholder="Search by client or service..."
                      className="w-full rounded-full border border-[#ded8cf] bg-white py-2.5 pl-10 pr-4 text-xs outline-none focus:border-[#d46b4f]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full border border-[#ded8cf] bg-[#fbfaf7] p-1 text-xs font-semibold">
                    {(['All', 'Paid', 'Confirmed', 'Pending', 'Archived', 'Rejected'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setAptFilter(filter)}
                        className={cn(
                          'rounded-full px-3 py-1.5 transition text-[11px]',
                          aptFilter === filter
                            ? 'bg-[#1e1c1a] text-white shadow-sm'
                            : 'text-[#8c847c] hover:text-[#1e1c1a]'
                        )}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Appointments Table */}
                <div className="mt-6 overflow-x-visible">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#eee7df] text-[11px] font-bold uppercase tracking-wider text-[#8c847c]">
                        <th className="pb-3 pl-2">Time</th>
                        <th className="pb-3">Client</th>
                        <th className="pb-3">Service</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 pr-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee7df]">
                      {filteredAppointments.map((apt) => (
                        <tr key={apt.id} className="transition hover:bg-[#fbfaf7]">
                          <td className="py-4 pl-2 font-mono text-xs font-medium text-[#756f69]">{apt.time}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid size-9 place-items-center rounded-full bg-[#f0ded4] text-xs font-semibold text-[#9e503b]">
                                {apt.clientName.split(' ').map((p) => p[0]).join('')}
                              </div>
                              <div>
                                <p className="font-semibold text-xs text-[#1e1c1a]">{apt.clientName}</p>
                                <p className="text-[11px] text-[#8c847c]">{apt.clientPhone || '+234 800 000 0000'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-xs font-medium text-[#756f69]">{apt.serviceName}</td>
                          <td className="py-4 font-semibold text-xs text-[#1e1c1a]">₦{apt.amount.toLocaleString()}</td>
                          <td className="py-4">
                            <span
                              className={cn(
                                'inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                                apt.status === 'Paid' && 'bg-[#e7f2ea] text-[#528361]',
                                apt.status === 'Confirmed' && 'bg-[#e7f2ea] text-[#528361]',
                                apt.status === 'Pending' && 'bg-[#fff0d7] text-[#a47328]',
                                apt.status === 'Archived' && 'bg-[#eee7df] text-[#756f69]',
                                apt.status === 'Rejected' && 'bg-[#ffe7df] text-[#d46b4f]'
                              )}
                            >
                              {apt.status}
                            </span>
                          </td>
                          <td className="py-4 pr-2 text-right relative">
                            {/* THREE-DOT ACTIONS TRIGGER WITH REQUESTED 4 OPTIONS */}
                            <div className="inline-block text-left" ref={openActionDropdownId === apt.id ? dropdownRef : undefined}>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenActionDropdownId(openActionDropdownId === apt.id ? null : apt.id)
                                }
                                aria-label="Appointment action menu"
                                className="grid size-8 place-items-center rounded-full border border-transparent hover:border-[#ded8cf] hover:bg-white text-[#756f69] transition"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openActionDropdownId === apt.id && (
                                <div className="absolute right-0 top-10 z-40 w-40 rounded-2xl border border-[#e5ddd4] bg-white p-1.5 shadow-xl">
                                  {/* 1. Mark Paid */}
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(apt.id, 'Paid')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#528361] hover:bg-[#e7f2ea] transition"
                                  >
                                    <CheckCircle2 size={14} /> Mark Paid
                                  </button>

                                  {/* 2. Archived */}
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(apt.id, 'Archived')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#756f69] hover:bg-[#f1ece5] transition"
                                  >
                                    <Archive size={14} /> Archived
                                  </button>

                                  {/* 3. Pending */}
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(apt.id, 'Pending')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#a47328] hover:bg-[#fff0d7] transition"
                                  >
                                    <Clock size={14} /> Pending
                                  </button>

                                  {/* 4. Reject */}
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(apt.id, 'Rejected')}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#d46b4f] hover:bg-[#ffe7df] transition"
                                  >
                                    <Ban size={14} /> Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* ──── SUB-TAB 2: DYNAMIC BOOKING CALENDAR ──── */}
              {aptSubTab === 'calendar' && (
              <div className="space-y-5">
                <div className="min-w-0 rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-3 shadow-sm sm:p-6 md:p-8">
                  {/* Calendar Header with Month Navigation */}
                  <div className="flex flex-col items-start gap-4 border-b border-[#eee7df] pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-.04em]">Booking Calendar</h2>
                      <p className="mt-1 text-xs text-[#8c847c]">
                        Visual overview of all scheduled bookings. Click a day to see details.
                      </p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:gap-2">
                      <button
                        type="button"
                        onClick={() => navigateMonth(-1)}
                        className="grid size-9 place-items-center rounded-full border border-[#ded8cf] text-[#756f69] hover:bg-[#f1ece5] transition"
                        aria-label="Previous month"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="min-w-0 flex-1 text-center text-xs font-semibold sm:min-w-[140px] sm:flex-none sm:text-sm">
                        {calendarMonthName} {calendarYear}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigateMonth(1)}
                        className="grid size-9 place-items-center rounded-full border border-[#ded8cf] text-[#756f69] hover:bg-[#f1ece5] transition"
                        aria-label="Next month"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarDate(new Date())}
                        className="ml-1 shrink-0 rounded-full border border-[#ded8cf] px-2.5 py-1.5 text-[10px] font-semibold text-[#1e1c1a] hover:bg-[#f1ece5] transition sm:ml-2 sm:px-3 sm:text-[11px]"
                      >
                        Today
                      </button>
                    </div>
                  </div>

                  {/* Weekday Headers */}
                  <div className="mt-5 grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-[#8c847c] sm:gap-1 sm:text-[10px]">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} className="py-2">{d}</div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="mt-1 grid grid-cols-7 gap-0.5 sm:gap-1">
                    {/* Empty cells for days before the 1st */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1
                      const dayApts = appointmentsByDay[day] || []
                      const isToday =
                        day === new Date().getDate() &&
                        calendarMonth === new Date().getMonth() &&
                        calendarYear === new Date().getFullYear()
                      const isSelected = selectedCalDay === day
                      const hasBookings = dayApts.length > 0

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedCalDay(isSelected ? null : day)}
                          className={cn(
                            'relative aspect-square min-w-0 rounded-lg border text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 sm:rounded-2xl sm:text-xs',
                            isSelected
                              ? 'border-[#d46b4f] bg-[#d46b4f]/10 shadow-md ring-1 ring-[#d46b4f]/30'
                              : isToday
                                ? 'border-[#d46b4f]/40 bg-[#fdf0ec]'
                                : hasBookings
                                  ? 'border-[#e5ddd4] bg-[#f8f5f0] hover:border-[#d46b4f]/50 hover:shadow-sm'
                                  : 'border-transparent hover:bg-[#f8f5f0]'
                          )}
                        >
                          <span
                            className={cn(
                              'text-xs font-semibold sm:text-sm',
                              isToday ? 'text-[#d46b4f]' : 'text-[#1e1c1a]',
                              isSelected && 'text-[#d46b4f]'
                            )}
                          >
                            {day}
                          </span>

                          {hasBookings && (
                            <div className="flex items-center gap-0.5">
                              {dayApts.length <= 3 ? (
                                dayApts.map((a, idx) => (
                                  <span
                                    key={idx}
                                    className={cn(
                                      'size-1.5 rounded-full',
                                      a.status === 'Paid' || a.status === 'Confirmed'
                                        ? 'bg-[#528361]'
                                        : a.status === 'Pending'
                                          ? 'bg-[#d4a74f]'
                                          : a.status === 'Rejected'
                                            ? 'bg-[#d46b4f]'
                                            : 'bg-[#8c847c]'
                                    )}
                                  />
                                ))
                              ) : (
                                <span className="text-[9px] font-bold text-[#d46b4f]">{dayApts.length}</span>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#eee7df] pt-4 text-[10px] text-[#8c847c]">
                    <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#528361]" /> Paid / Confirmed</div>
                    <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d4a74f]" /> Pending</div>
                    <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d46b4f]" /> Rejected</div>
                    <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#8c847c]" /> Archived</div>
                  </div>
                </div>

                {/* Selected Day Drawer */}
                {selectedCalDay !== null && (
                  <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-[#eee7df] pb-4">
                      <div>
                        <p className="eyebrow text-[#d46b4f]">
                          {calendarMonthName} {selectedCalDay}, {calendarYear}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold tracking-[-.03em]">
                          {selectedDayAppointments.length === 0
                            ? 'No bookings scheduled'
                            : `${selectedDayAppointments.length} booking${selectedDayAppointments.length > 1 ? 's' : ''} scheduled`}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCalDay(null)}
                        className="grid size-8 place-items-center rounded-full text-[#8c847c] hover:bg-[#f1ece5] transition"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {selectedDayAppointments.length > 0 ? (
                      <div className="mt-4 grid gap-3">
                        {selectedDayAppointments.map((apt) => (
                          <div
                            key={apt.id}
                            className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-[#eee7df] bg-[#fbfaf7] p-3 transition hover:border-[#caa08f] sm:flex-nowrap sm:gap-4 sm:p-4"
                          >
                            <span className="w-14 shrink-0 font-mono text-xs font-medium text-[#998f85]">{apt.time}</span>
                            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f0ded4] text-xs font-semibold text-[#9e503b]">
                              {apt.clientName.split(' ').map((p) => p[0]).join('')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{apt.clientName}</p>
                              <p className="truncate text-xs text-[#998f85]">{apt.serviceName}</p>
                            </div>
                            <div className="ml-auto shrink-0 text-right">
                              <p className="text-sm font-semibold">₦{apt.amount.toLocaleString()}</p>
                              <span
                                className={cn(
                                  'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                                  apt.status === 'Paid' && 'bg-[#e7f2ea] text-[#528361]',
                                  apt.status === 'Confirmed' && 'bg-[#e7f2ea] text-[#528361]',
                                  apt.status === 'Pending' && 'bg-[#fff0d7] text-[#a47328]',
                                  apt.status === 'Archived' && 'bg-[#eee7df] text-[#756f69]',
                                  apt.status === 'Rejected' && 'bg-[#ffe7df] text-[#d46b4f]'
                                )}
                              >
                                {apt.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
                        <div className="grid size-14 place-items-center rounded-2xl bg-[#f1ece5]">
                          <CalendarDays size={24} className="text-[#8c847c]" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[#756f69]">No appointments</p>
                        <p className="mt-1 text-xs text-[#8c847c]">This day is clear — perfect for catching up or walk-ins.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: SERVICES MANAGEMENT & CUSTOM SERVICE CREATION             */}
          {/* ============================================================== */}
          {activeTab === 'Services' && (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eee7df] pb-6">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-.04em]">Service Menu & Offerings</h2>
                    <p className="mt-1 text-xs text-[#8c847c]">
                      Add, customize, and manage the services your clients can book.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddServiceModal(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1e1c1a] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#d46b4f]"
                  >
                    <Plus size={14} /> Add new service
                  </button>
                </div>

                {/* Metric Summary Bar */}
                <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl bg-[#f8f5f0] border border-[#eee7df] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c847c]">Active Services</p>
                    <p className="mt-1 text-2xl font-medium tracking-tight text-[#1e1c1a]">
                      {services.filter((service) => service.isActive).length}
                    </p>
                    <p className="mt-1 text-[11px] text-[#528361]">Available in customer catalog</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8f5f0] border border-[#eee7df] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c847c]">Avg Ticket Value</p>
                    <p className="mt-1 text-2xl font-medium tracking-tight text-[#1e1c1a]">
                      ₦{Math.round(
                        services.filter((service) => service.isActive)
                          .reduce((acc, service) => acc + service.price, 0) /
                        (services.filter((service) => service.isActive).length || 1)
                      ).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-[#8c847c]">Across all offerings</p>
                  </div>
                  <div className="col-span-2 lg:col-span-1 rounded-2xl bg-[#f8f5f0] border border-[#eee7df] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c847c]">Service Categories</p>
                    <p className="mt-1 text-2xl font-medium tracking-tight text-[#1e1c1a]">
                      {new Set(services.filter((service) => service.isActive).map((service) => service.category)).size} Categories
                    </p>
                    <p className="mt-1 text-[11px] text-[#8c847c]">Barbing, Spa, Hair & more</p>
                  </div>
                </div>

                {/* Services Cards Grid */}
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((svc) => (
                    <div
                      key={svc.id}
                      className="group flex flex-col justify-between rounded-2xl border border-[#eee7df] bg-[#fffdf9] p-5 transition hover:border-[#caa08f] hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                              svc.color,
                              svc.iconColor
                            )}
                          >
                            {svc.category}
                          </span>
                          <span className={cn(
                            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                            svc.isActive ? 'bg-[#e7f2ea] text-[#528361]' : 'bg-[#eee7df] text-[#756f69]'
                          )}>
                            {svc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-semibold text-[#1e1c1a]">{svc.name}</h3>
                        <p className="mt-1 text-xs text-[#756f69] leading-relaxed">{svc.detail}</p>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-[#eee7df] pt-3 text-xs">
                        <span className="flex items-center gap-1.5 text-[#8c847c]">
                          <Clock size={13} /> {svc.durationMinutes} mins
                        </span>
                        <span className="font-semibold text-sm text-[#1e1c1a]">
                          ₦{svc.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          disabled={serviceActionId === svc.id}
                          onClick={() => void handleToggleService(svc)}
                          className={cn(
                            'flex-1 rounded-full py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                            svc.isActive
                              ? 'border border-[#ded8cf] text-[#756f69] hover:bg-[#f1ece5]'
                              : 'bg-[#1e1c1a] text-white hover:bg-[#d46b4f]'
                          )}
                        >
                          {serviceActionId === svc.id ? 'Saving…' : svc.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(svc.id)}
                          className="rounded-full border border-[#ded8cf] px-3 text-[#8c847c] hover:bg-[#ffe7df] hover:text-[#d46b4f] transition"
                          title="Delete service"
                          aria-label={`Delete ${svc.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Service Modal */}
              {showAddServiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[#eee7df] pb-3">
                      <div>
                        <h3 className="text-xl font-semibold tracking-[-.04em]">Add new service</h3>
                        <p className="text-xs text-[#8c847c]">Expand your business catalog with new offerings</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddServiceModal(false)}
                        className="rounded-full p-1.5 text-[#8c847c] hover:bg-[#f1ece5]"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleAddService} className="mt-5 flex flex-col gap-4">
                      <label className="field">
                        Service name
                        <input
                          required
                          value={newSvcName}
                          onChange={(e) => setNewSvcName(e.target.value)}
                          placeholder="e.g. Deluxe Beard Grooming"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="field">
                          Category
                          <select
                            value={newSvcCategory}
                            onChange={(e) => setNewSvcCategory(e.target.value as any)}
                            className="w-full rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-sm outline-none"
                          >
                            <option value="hair">Hair dressing</option>
                            <option value="barbing">Barbing</option>
                            <option value="spa">Spa</option>
                            <option value="general">General</option>
                          </select>
                        </label>

                        <label className="field">
                          Duration (minutes)
                          <select
                            value={newSvcDuration}
                            onChange={(e) => setNewSvcDuration(e.target.value)}
                            className="w-full rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-sm outline-none"
                          >
                            <option value="30">30 mins</option>
                            <option value="45">45 mins</option>
                            <option value="60">60 mins</option>
                            <option value="90">90 mins</option>
                            <option value="120">120 mins</option>
                          </select>
                        </label>
                      </div>

                      <label className="field">
                        Price (₦)
                        <input
                          type="number"
                          required
                          value={newSvcPrice}
                          onChange={(e) => setNewSvcPrice(e.target.value)}
                          placeholder="15000"
                        />
                      </label>

                      <label className="field">
                        Short description / detail
                        <input
                          value={newSvcDetail}
                          onChange={(e) => setNewSvcDetail(e.target.value)}
                          placeholder="e.g. Precision shaping, razor line & scented towel treatment"
                        />
                      </label>

                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowAddServiceModal(false)}
                          className="flex-1 rounded-full border border-[#ded8cf] py-3 text-sm font-semibold text-[#1e1c1a] hover:bg-[#f8f5f0]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 rounded-full bg-[#1e1c1a] py-3 text-sm font-semibold text-white transition hover:bg-[#d46b4f]"
                        >
                          Save & Add to Menu
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CLIENTS DIRECTORY                                       */}
          {/* ============================================================== */}
          {activeTab === 'Clients' && (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eee7df] pb-6">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-.04em]">Client Directory</h2>
                    <p className="mt-1 text-xs text-[#8c847c]">
                      Detailed history, total visits, and contact information for your client base.
                    </p>
                  </div>
                  <div className="relative min-w-[240px]">
                    <Search className="absolute left-3.5 top-2.5 text-[#8c847c]" size={15} />
                    <input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search clients..."
                      className="w-full rounded-full border border-[#ded8cf] bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#d46b4f]"
                    />
                  </div>
                </div>

                {/* Clients Grid Cards */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredClients.map((cli) => (
                    <div
                      key={cli.id}
                      className="rounded-[22px] border border-[#e4ddd5] bg-[#fffdf9] p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid size-11 place-items-center rounded-2xl bg-[#eee7ff] text-xs font-bold text-[#7253cb]">
                            {cli.name.split(' ').map((p) => p[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{cli.name}</h3>
                            <span
                              className={cn(
                                'inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase mt-0.5',
                                cli.status === 'VIP' && 'bg-[#f3e7df] text-[#d46b4f]',
                                cli.status === 'Regular' && 'bg-[#e7f2ea] text-[#528361]',
                                cli.status === 'New' && 'bg-[#fff0d7] text-[#a47328]'
                              )}
                            >
                              {cli.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-1.5 text-xs text-[#756f69]">
                        <p className="flex items-center gap-2">
                          <Phone size={13} className="text-[#8c847c]" /> {cli.phone}
                        </p>
                        <p className="flex items-center gap-2">
                          <Mail size={13} className="text-[#8c847c]" /> {cli.email}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-[#eee7df] pt-3 text-xs">
                        <div>
                          <p className="text-[10px] uppercase text-[#8c847c]">Bookings</p>
                          <p className="font-semibold text-sm">{cli.totalBookings} visits</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-[#8c847c]">Total Spent</p>
                          <p className="font-semibold text-sm text-[#528361]">₦{cli.totalSpent.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: INSIGHTS & ANALYTICS                                    */}
          {/* ============================================================== */}
          {activeTab === 'Insights' && (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-[-.04em]">Business Insights & Revenue Growth</h2>
                <p className="mt-1 text-xs text-[#8c847c]">
                  Operational performance metrics, peak hours, and customer retention insights.
                </p>

                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  <div className="rounded-2xl bg-[#efe0d7] p-5">
                    <p className="eyebrow text-[#9e503b]">Peak Performance</p>
                    <h3 className="mt-2 text-xl font-semibold">Fridays & Saturdays</h3>
                    <p className="mt-2 text-xs leading-5 text-[#756c64]">
                      96% average capacity utilization. Recommend opening 2 additional slots on weekends.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#e7f2ea] p-5">
                    <p className="eyebrow text-[#528361]">Top Revenue Service</p>
                    <h3 className="mt-2 text-xl font-semibold">Barbing & Grooming</h3>
                    <p className="mt-2 text-xs leading-5 text-[#4e7d5d]">
                      42% of net income this month. Average client ticket size: ₦8,500.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#eee7ff] p-5">
                    <p className="eyebrow text-[#7253cb]">Repeat Rate</p>
                    <h3 className="mt-2 text-xl font-semibold">68% Client Retention</h3>
                    <p className="mt-2 text-xs leading-5 text-[#5c4794]">
                      42 clients booked more than twice this month. Customer loyalty is up 6.4%.
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-base font-semibold">Quarterly Booking Saturation</h3>
                  <UsageChart />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: SETTINGS PAGE                                           */}
          {/* ============================================================== */}
          {activeTab === 'Settings' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 shadow-sm">
                  <div>
                    <span className="eyebrow text-[#d46b4f]">WORKSPACE CONFIGURATION</span>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-.04em]">Business & Portal Settings</h2>
                    <p className="mt-1 text-xs text-[#8c847c]">
                      Update business profile info, operational policies, timezone, and communication preferences.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-[#1e1c1a] px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#d46b4f]"
                  >
                    {settingsSaved ? (
                      <>
                        <Check size={14} className="text-[#528361]" /> Changes Saved!
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Save Changes
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-[#eee7df] pb-4">
                    <div className="grid size-10 place-items-center rounded-xl bg-[#eee7ff] text-[#7253cb]">
                      <Store size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Business Identity</h3>
                      <p className="text-xs text-[#8c847c]">Public-facing business information displayed on booking portals.</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 rounded-2xl bg-[#f8f5f0] border border-[#eee7df]">
                    <div className="flex items-center gap-4">
                      {businessSettings.logoUrl ? (
                        <div className="relative">
                          <img
                            src={businessSettings.logoUrl}
                            alt="Brand Logo"
                            className="size-16 object-contain rounded-xl bg-white p-2 border border-[#ded8cf] shadow-sm"
                          />
                        </div>
                      ) : (
                        <div className="grid size-16 place-items-center rounded-xl bg-[#1e1c1a] text-white font-serif text-xl font-bold">
                          {businessSettings.businessName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-[#1e1c1a]">Business Brand Logo</p>
                        <p className="text-[11px] text-[#8c847c]">Replaces default Booka logo on backoffice header.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:ml-auto">
                      <label className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-[#1e1c1a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d46b4f] transition">
                        <span>Upload new logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {businessSettings.logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="rounded-full border border-[#ded8cf] px-3 py-2 text-xs font-semibold text-[#756f69] hover:bg-white transition"
                        >
                          Reset to default
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <label className="field">
                      Business name
                      <input
                        value={businessSettings.businessName}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      Primary contact email
                      <input
                        type="email"
                        value={businessSettings.email}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      Official phone number
                      <input
                        value={businessSettings.phone}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      Physical studio address
                      <input
                        value={businessSettings.location}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, location: e.target.value })}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-[#eee7df] pb-4">
                      <div className="grid size-10 place-items-center rounded-xl bg-[#ffe7df] text-[#d46b4f]">
                        <Globe size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">Timezone & Currency</h3>
                        <p className="text-xs text-[#8c847c]">Regional localization and payments.</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <label className="field">
                        Timezone
                        <select
                          value={businessSettings.timezone || 'West Africa Time (GMT+1)'}
                          onChange={(e) => setBusinessSettings({ ...businessSettings, timezone: e.target.value })}
                          className="w-full rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-sm outline-none"
                        >
                          <option>West Africa Time (GMT+1)</option>
                          <option>Greenwich Mean Time (GMT+0)</option>
                          <option>Eastern Time (US & Canada)</option>
                        </select>
                      </label>

                      <label className="field">
                        Operating Currency
                        <select
                          value={businessSettings.currency || 'NGN (₦) — Nigerian Naira'}
                          onChange={(e) => setBusinessSettings({ ...businessSettings, currency: e.target.value })}
                          className="w-full rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-sm outline-none"
                        >
                          <option>NGN (₦) — Nigerian Naira</option>
                          <option>USD ($) — US Dollar</option>
                          <option>GBP (£) — British Pound</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-[#eee7df] pb-4">
                      <div className="grid size-10 place-items-center rounded-xl bg-[#e7f2ea] text-[#528361]">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">Booking Rules</h3>
                        <p className="text-xs text-[#8c847c]">Appointment automation and cancellation rules.</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <label className="field">
                        Cancellation policy window
                        <select
                          value={businessSettings.cancellationWindow}
                          onChange={(e) => setBusinessSettings({ ...businessSettings, cancellationWindow: e.target.value })}
                          className="w-full rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-sm outline-none"
                        >
                          <option>24 hours before appointment</option>
                          <option>12 hours before appointment</option>
                          <option>Up to 2 hours before</option>
                          <option>Strict (No cancellations within 48h)</option>
                        </select>
                      </label>

                      <div className="flex items-center justify-between rounded-xl bg-[#f8f5f0] p-3 text-xs">
                        <div>
                          <p className="font-semibold text-[#1e1c1a]">Instant auto-confirmation</p>
                          <p className="text-[#8c847c]">Automatically confirm slots when clients book online.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={businessSettings.autoConfirm}
                          onChange={(e) => setBusinessSettings({ ...businessSettings, autoConfirm: e.target.checked })}
                          className="size-4 accent-[#d46b4f]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8 shadow-sm">
                  <h3 className="text-base font-semibold">Communication & Alerts</h3>
                  <p className="text-xs text-[#8c847c]">Control which notification channels alert you for booking changes.</p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-2xl border border-[#eee7df] bg-[#fbfaf7] p-4">
                      <div>
                        <p className="text-sm font-semibold">Email Notifications</p>
                        <p className="text-xs text-[#8c847c]">Receive instant email when a client creates or cancels a booking.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={businessSettings.emailAlerts}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, emailAlerts: e.target.checked })}
                        className="size-4 accent-[#d46b4f]"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-[#eee7df] bg-[#fbfaf7] p-4">
                      <div>
                        <p className="text-sm font-semibold">SMS Alert Notifications</p>
                        <p className="text-xs text-[#8c847c]">Send SMS text dispatch to your phone for last-minute walk-ins.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={businessSettings.smsAlerts}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, smsAlerts: e.target.checked })}
                        className="size-4 accent-[#d46b4f]"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
