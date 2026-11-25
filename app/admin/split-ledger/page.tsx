'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  HelpCircle,
  Search,
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

interface BookingRecord {
  booking_id: string
  paystack_reference: string | null
  business_id: string
  business_name: string
  client_name: string
  client_email: string
  client_phone: string
  amount: number
  deposit_paid_kobo: number
  payment_status: 'paid' | 'unpaid'
  payment_outcome: 'normal' | 'refund_pending' | 'refunded' | 'disputed' | 'chargeback'
  payment_outcome_note: string | null
  booking_status: string
  appointment_date: string
  created_at: string
}

type StatusFilter = 'all' | 'paid' | 'unpaid'
type TimeFilter = 'all' | '30' | '90'

const formatNaira = (amount: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
}).format(amount)

export default function AdminSplitLedgerPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      setIsLoading(true)
    const loadBookings = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase.rpc('admin_search_bookings', {
          p_search: searchQuery.trim() || null,
          p_payment_status: statusFilter,
          p_outcome: 'all',
          p_limit: 100,
          p_offset: 0,
        })
        if (error) throw error
        if (active) setBookings((data ?? []) as BookingRecord[])
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load booking payments.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadBookings()
    }, 200)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [searchQuery, statusFilter])

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const cutoff = timeFilter === 'all'
      ? 0
      : Date.now() - Number(timeFilter) * 24 * 60 * 60 * 1000

    return bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.payment_status !== statusFilter) return false
      if (cutoff && new Date(booking.created_at).getTime() < cutoff) return false
      if (!query) return true

      return [
        booking.paystack_reference,
        booking.booking_id,
        booking.business_name,
        booking.client_name,
      ].some((value) => value?.toLowerCase().includes(query))
    })
  }, [bookings, searchQuery, statusFilter, timeFilter])

  const paidBookings = filteredBookings.filter((booking) => booking.payment_status === 'paid')
  const depositsKobo = paidBookings.reduce((total, booking) => total + Number(booking.deposit_paid_kobo), 0)

  const exportBookings = async () => {
    setIsExporting(true)
    setErrorMessage('')
    try {
      const supabase = createSupabaseClient()
      const allBookings: BookingRecord[] = []
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.rpc('admin_search_bookings', {
          p_search: searchQuery.trim() || null,
          p_payment_status: statusFilter,
          p_outcome: 'all',
          p_limit: 100,
          p_offset: offset,
        })
        if (error) throw error
        const rows = (data ?? []) as BookingRecord[]
        allBookings.push(...rows)
        if (rows.length < 100) break
      }

      const cutoff = timeFilter === 'all'
        ? 0
        : Date.now() - Number(timeFilter) * 24 * 60 * 60 * 1000
      const exportRows = allBookings.filter((booking) => (
        !cutoff || new Date(booking.created_at).getTime() >= cutoff
      ))
    const columns = ['Reference', 'Studio', 'Client', 'Booking date', 'Booking value (NGN)', 'Deposit paid (NGN)', 'Payment status']
    const rows = exportRows.map((booking) => [
      booking.paystack_reference || booking.booking_id,
      booking.business_name,
      booking.client_name,
      booking.appointment_date,
      booking.amount,
      booking.payment_status === 'paid' ? Number(booking.deposit_paid_kobo) / 100 : 0,
      booking.payment_status,
    ])
    const csv = [columns, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'booka-booking-payments.csv'
    link.click()
    URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not export booking payments.')
    } finally {
      setIsExporting(false)
    }
  }

  const updatePaymentOutcome = async (
    booking: BookingRecord,
    outcome: BookingRecord['payment_outcome']
  ) => {
    if (outcome === 'refund_pending' || outcome === 'refunded') {
      try {
        const supabase = createSupabaseClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) throw new Error('Your admin session has expired.')
        const response = await fetch('/api/admin/refunds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ bookingId: booking.booking_id }),
        })
        const result = await response.json() as { error?: string }
        if (!response.ok) throw new Error(result.error || 'Could not submit the Paystack refund.')
        setBookings((current) => current.map((item) => item.booking_id === booking.booking_id
          ? { ...item, payment_outcome: 'refund_pending', payment_outcome_note: 'Refund submitted to Paystack.' }
          : item))
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not submit the Paystack refund.')
      }
      return
    }

    const note = window.prompt(
      'Admin note for this payment outcome',
      booking.payment_outcome_note ?? ''
    )
    if (note === null) return
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_update_payment_outcome', {
        p_booking_id: booking.booking_id,
        p_outcome: outcome,
        p_note: note.trim() || null,
      })
      if (error) throw error
      setBookings((current) => current.map((item) => item.booking_id === booking.booking_id
        ? { ...item, payment_outcome: outcome, payment_outcome_note: note.trim() || null }
        : item))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update payment outcome.')
    }
  }

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <div className="flex flex-col gap-5 border-b border-[#ded8cf]/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#756f69]">
            <span>Workspace</span><span>/</span><span className="font-semibold text-[#1e1c1a]">Booking payments</span>
          </div>
          <h1 className="mt-4 text-2xl font-medium tracking-tight sm:text-3xl">Booking payments</h1>
          <p className="mt-1 text-sm text-[#756f69]">Verified payment records from studio booking pages.</p>
        </div>
        <button
          type="button"
          onClick={() => void exportBookings()}
          disabled={isLoading || isExporting || filteredBookings.length === 0}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#ded8cf] bg-white px-4 py-2.5 text-xs font-medium shadow-sm hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <Download className="size-3.5 text-[#756f69]" />
          <span>{isExporting ? 'Exporting all matches…' : 'Export all filtered records'}</span>
        </button>
      </div>

      {errorMessage && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load booking payments: {errorMessage}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#1e1c1a] p-5 text-white sm:p-6">
          <p className="text-xs text-[#a69f97]">Deposits collected in view</p>
          <p className="mt-3 break-words font-mono text-2xl font-semibold sm:text-3xl">
            {isLoading ? '—' : formatNaira(depositsKobo / 100)}
          </p>
          <p className="mt-1 text-xs text-[#a69f97]">Verified Paystack payments</p>
        </div>
        <div className="rounded-2xl border border-[#ded8cf] bg-white p-5 sm:p-6">
          <p className="text-xs text-[#756f69]">Paid bookings in view</p>
          <p className="mt-3 font-mono text-3xl font-semibold">{isLoading ? '—' : paidBookings.length}</p>
          <p className="mt-1 text-xs text-[#756f69]">Successfully verified</p>
        </div>
        <div className="rounded-2xl border border-[#ded8cf] bg-white p-5 sm:p-6">
          <p className="text-xs text-[#756f69]">Booking records in view</p>
          <p className="mt-3 font-mono text-3xl font-semibold">{isLoading ? '—' : filteredBookings.length}</p>
          <p className="mt-1 text-xs text-[#756f69]">Latest 1,000 records maximum</p>
        </div>
      </div>

      <section className="mt-6 min-w-0 rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#f0ece4] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-3 size-4 text-[#8c847c]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search reference, studio or client..."
              className="h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] pl-10 pr-3.5 text-xs outline-none focus:border-[#c0593c]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <label className="sr-only" htmlFor="payment-status-filter">Payment status</label>
            <select
              id="payment-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="min-w-0 rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3 py-2 text-xs"
            >
              <option value="all">All payment statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <label className="sr-only" htmlFor="payment-time-filter">Time period</label>
            <select
              id="payment-time-filter"
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value as TimeFilter)}
              className="min-w-0 rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3 py-2 text-xs"
            >
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-[#756f69]">Loading payment records...</p>
        ) : filteredBookings.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#756f69]">
            {errorMessage ? 'Payment records could not be loaded.' : 'No booking payments match these filters.'}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#f0ece4] text-[#8c847c]">
                    <th className="py-3.5 font-medium">Reference</th>
                    <th className="py-3.5 font-medium">Studio / Client</th>
                    <th className="py-3.5 font-medium">Booking value</th>
                    <th className="py-3.5 font-medium">Deposit paid</th>
                    <th className="py-3.5 font-medium">Booking date</th>
                    <th className="py-3.5 text-right font-medium">Payment status</th>
                    <th className="py-3.5 text-right font-medium">Admin outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f1ea]">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.booking_id} className="hover:bg-[#faf8f5]">
                      <td className="py-4 font-mono font-medium">{booking.paystack_reference || booking.booking_id}</td>
                      <td className="py-4">
                        <p className="font-semibold">{booking.business_name}</p>
                        <p className="mt-0.5 text-[11px] text-[#756f69]">{booking.client_name}</p>
                      </td>
                      <td className="py-4 font-mono">{formatNaira(Number(booking.amount))}</td>
                      <td className="py-4 font-mono">
                        {booking.payment_status === 'paid'
                          ? formatNaira(Number(booking.deposit_paid_kobo) / 100)
                          : '—'}
                      </td>
                      <td className="py-4 text-[#756f69]">{booking.appointment_date}</td>
                      <td className="py-4 text-right">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${booking.payment_status === 'paid' ? 'bg-[#edf5ef] text-[#528361]' : 'bg-[#f5f1ea] text-[#756f69]'}`}>
                          {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <select
                          aria-label={`Payment outcome for ${booking.booking_id}`}
                          value={booking.payment_outcome}
                          onChange={(event) => void updatePaymentOutcome(
                            booking,
                            event.target.value as BookingRecord['payment_outcome']
                          )}
                          className="max-w-32 rounded-lg border border-[#ded8cf] bg-white px-2 py-1.5 text-[11px]"
                        >
                          <option value="normal">Normal</option>
                          <option value="refund_pending">Refund pending</option>
                          <option value="refunded">Refunded</option>
                          <option value="disputed">Disputed</option>
                          <option value="chargeback">Chargeback</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-[#f5f1ea] md:hidden">
              {filteredBookings.map((booking) => (
                <li key={booking.booking_id} className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{booking.business_name}</p>
                      <p className="mt-0.5 text-xs text-[#756f69]">{booking.client_name}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${booking.payment_status === 'paid' ? 'bg-[#edf5ef] text-[#528361]' : 'bg-[#f5f1ea] text-[#756f69]'}`}>
                      {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <p className="break-all font-mono text-[11px] text-[#756f69]">{booking.paystack_reference || booking.booking_id}</p>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-[#756f69]">Booking {formatNaira(Number(booking.amount))}</span>
                    <span className="font-mono font-medium">
                      {booking.payment_status === 'paid'
                        ? formatNaira(Number(booking.deposit_paid_kobo) / 100)
                        : 'No deposit'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8c847c]">Appointment: {booking.appointment_date}</p>
                  <select
                    aria-label={`Payment outcome for ${booking.booking_id}`}
                    value={booking.payment_outcome}
                    onChange={(event) => void updatePaymentOutcome(
                      booking,
                      event.target.value as BookingRecord['payment_outcome']
                    )}
                    className="h-9 w-full rounded-lg border border-[#ded8cf] bg-white px-3 text-xs"
                  >
                    <option value="normal">Normal</option>
                    <option value="refund_pending">Refund pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="disputed">Disputed</option>
                    <option value="chargeback">Chargeback</option>
                  </select>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-[#f0ece4] pt-4 text-xs text-[#756f69] sm:flex-row sm:items-center sm:justify-between">
          <span>{filteredBookings.length} matching records</span>
          <span>Amounts reflect booking value and verified deposit separately.</span>
        </div>
      </section>

      <footer className="mt-8 flex items-center gap-2 border-t border-[#ded8cf]/60 pt-5 text-xs text-[#8c847c]">
        <HelpCircle className="size-3.5" />
        <span>Paystack verifies payments before they appear as paid.</span>
      </footer>
    </div>
  )
}
