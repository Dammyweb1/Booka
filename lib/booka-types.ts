export type BusinessCategory = 'Barbing' | 'Hairdressing' | 'Spa'

export type ServiceTone = 'gold' | 'teal' | 'rose'

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type BookaBusiness = {
  id: string
  slug: string
  name: string
  business_type: BusinessCategory
  owner_first_name: string
  owner_last_name: string
  address: string
  city: string
  phone: string
}

export type BookaService = {
  id: string
  business_id: string
  name: string
  duration_minutes: number
  price_naira: number
  tone: ServiceTone
  active: boolean
  image_path: string | null
  created_at: string
}

export type BookaBooking = {
  id: string
  business_id: string
  service_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  starts_at: string
  status: BookingStatus
  notes: string | null
  created_at: string
}

export type PaymentStatus = 'awaiting_payment' | 'initialized' | 'success' | 'failed' | 'abandoned'

export type BookaPayment = {
  id: string
  booking_id: string
  business_id: string
  service_id: string | null
  service_name: string
  customer_name: string
  customer_email: string
  amount_naira: number
  status: PaymentStatus
  provider: 'paystack'
  paystack_reference: string
  paystack_access_code: string | null
  authorization_url: string | null
  channel: string | null
  transaction_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export type BookaPaymentRecord = BookaPayment & {
  starts_at: string
  booking_status: BookingStatus
}

export type ActionFeedback<T = undefined> = {
  success: boolean
  message: string
  data?: T
}

export const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled']

export const SERVICE_TONES: ServiceTone[] = ['gold', 'teal', 'rose']

export function formatNaira(value: number) {
  return `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(value)}`
}

export function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(new Date(value))
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
