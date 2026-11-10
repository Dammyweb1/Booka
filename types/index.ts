export interface Service {
  id: string
  name: string
  detail: string
  category: 'barbing' | 'spa' | 'hair' | 'general'
  durationMinutes: number
  price: number
  color: string
  iconColor: string
  isActive: boolean
}

export interface Business {
  id: string
  name: string
  slug: string
  ownerName: string
  email: string
  phone: string
  address?: string
  location: string
  rating: number
  services: Service[]
  status: 'active' | 'onboarding'
}

export interface Appointment {
  id: string
  businessId: string
  serviceId?: string
  clientName: string
  clientPhone?: string
  serviceName: string
  time: string
  date: string
  amount: number
  deposit_paid_kobo: number
  payment_status: 'unpaid' | 'paid'
  status: 'Paid' | 'Confirmed' | 'Pending' | 'Archived' | 'Rejected'
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'booking' | 'payment' | 'alert'
  read: boolean
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  totalBookings: number
  totalSpent: number
  lastVisit: string
  status: 'VIP' | 'Regular' | 'New'
}

export interface BusinessSettings {
  businessId?: string
  slug?: string
  businessName: string
  ownerName: string
  logoUrl?: string
  email: string
  phone: string
  location: string
  timezone: string
  currency: string
  autoConfirm: boolean
  emailAlerts: boolean
  smsAlerts: boolean
  cancellationWindow: string
}

export interface MetricSummary {
  netRevenue: number
  paidBookings: number
  returningClientsPercent: number
  openSlots: number
}
