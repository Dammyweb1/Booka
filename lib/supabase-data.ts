import { createSupabaseClient } from '@/lib/supabase'
import { Appointment, BusinessSettings, Client, NotificationItem, Service } from '@/types'

type BusinessRow = {
  business_id: string
  slug: string
  business_name: string
  owner_name: string
  email: string
  phone: string
  location: string
  logo_url: string | null
  timezone: string
  currency: string
  auto_confirm: boolean
  email_alerts: boolean
  sms_alerts: boolean
  cancellation_window: string
}

export type BusinessWorkspace = {
  businessId: string
  settings: BusinessSettings
  services: Service[]
  appointments: Appointment[]
  clients: Client[]
  notifications: NotificationItem[]
}

function requireNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function loadBusinessWorkspace(userId: string): Promise<BusinessWorkspace> {
  const supabase = createSupabaseClient()
  const [businessResult, servicesResult, appointmentsResult, clientsResult, notificationsResult] =
    await Promise.all([
      supabase.from('businesses').select('*').eq('owner_id', userId).maybeSingle(),
      supabase.from('services').select('*').order('created_at'),
      supabase.from('appointments').select('*').order('appointment_date', { ascending: false }),
      supabase.from('clients').select('*').order('last_visit', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    ])

  requireNoError(businessResult.error)
  requireNoError(servicesResult.error)
  requireNoError(appointmentsResult.error)
  requireNoError(clientsResult.error)
  requireNoError(notificationsResult.error)

  const business = businessResult.data as BusinessRow | null
  if (!business) {
    throw new Error('No business profile is linked to this account. Complete registration again or contact support.')
  }

  const services = (servicesResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    detail: row.detail,
    category: row.category,
    durationMinutes: row.duration_minutes,
    price: row.price,
    color: row.color,
    iconColor: row.icon_color,
    isActive: row.is_active,
  })) as Service[]

  const appointments = (appointmentsResult.data ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    serviceName: row.service_name,
    time: row.appointment_time,
    date: row.appointment_date,
    amount: row.amount,
    status: row.status,
  })) as Appointment[]

  const clients = (clientsResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    totalBookings: row.total_bookings,
    totalSpent: row.total_spent,
    lastVisit: row.last_visit ?? '',
    status: row.status,
  })) as Client[]

  const notifications = (notificationsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(row.created_at)),
    type: row.type,
    read: row.read,
  })) as NotificationItem[]

  return {
    businessId: business.business_id,
    settings: {
      businessId: business.business_id,
      slug: business.slug,
      businessName: business.business_name,
      ownerName: business.owner_name,
      email: business.email,
      phone: business.phone,
      location: business.location,
      logoUrl: business.logo_url ?? undefined,
      timezone: business.timezone,
      currency: business.currency,
      autoConfirm: business.auto_confirm,
      emailAlerts: business.email_alerts,
      smsAlerts: business.sms_alerts,
      cancellationWindow: business.cancellation_window,
    },
    services,
    appointments,
    clients,
    notifications,
  }
}

export async function saveBusinessSettings(settings: BusinessSettings, userId: string) {
  const supabase = createSupabaseClient()
  const { error } = await supabase.from('businesses').update({
    business_name: settings.businessName,
    owner_name: settings.ownerName,
    email: settings.email,
    phone: settings.phone,
    location: settings.location,
    logo_url: settings.logoUrl ?? null,
    timezone: settings.timezone,
    currency: settings.currency,
    auto_confirm: settings.autoConfirm,
    email_alerts: settings.emailAlerts,
    sms_alerts: settings.smsAlerts,
    cancellation_window: settings.cancellationWindow,
    updated_at: new Date().toISOString(),
  }).eq('owner_id', userId)
  requireNoError(error)
}

export async function saveServices(services: Service[], businessId: string) {
  const supabase = createSupabaseClient()
  if (services.length === 0) return
  const { error } = await supabase.from('services').upsert(
    services.map((service) => ({
      id: service.id,
      business_id: businessId,
      name: service.name,
      detail: service.detail,
      category: service.category,
      duration_minutes: service.durationMinutes,
      price: service.price,
      color: service.color,
      icon_color: service.iconColor,
      is_active: service.isActive,
    })),
    { onConflict: 'business_id,id' }
  )
  requireNoError(error)
}

export async function setServiceActive(id: string, businessId: string, isActive: boolean) {
  const supabase = createSupabaseClient()
  const { error } = await supabase.from('services')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('business_id', businessId)
  requireNoError(error)
}

export async function deleteService(id: string, businessId: string) {
  const supabase = createSupabaseClient()
  const { error } = await supabase.from('services').delete()
    .eq('id', id)
    .eq('business_id', businessId)
  requireNoError(error)
}

export async function saveAppointments(appointments: Appointment[], businessId: string) {
  if (appointments.length === 0) return
  const supabase = createSupabaseClient()
  const { error } = await supabase.from('appointments').upsert(
    appointments.map((appointment) => ({
      id: appointment.id,
      business_id: businessId,
      client_name: appointment.clientName,
      client_phone: appointment.clientPhone ?? '',
      service_name: appointment.serviceName,
      appointment_time: appointment.time,
      appointment_date: appointment.date === 'Today'
        ? new Date().toISOString().slice(0, 10)
        : appointment.date,
      amount: appointment.amount,
      status: appointment.status,
    }))
  )
  requireNoError(error)
}

export async function saveNotifications(notifications: NotificationItem[], businessId: string) {
  if (notifications.length === 0) return
  const supabase = createSupabaseClient()
  const { error } = await supabase.from('notifications').upsert(
    notifications.map((notification) => ({
      id: notification.id,
      business_id: businessId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
    }))
  )
  requireNoError(error)
}
