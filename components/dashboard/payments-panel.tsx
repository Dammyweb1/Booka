'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Search,
  Wallet,
} from 'lucide-react'
import { Appointment } from '@/types'
import { cn } from '@/lib/utils'

type PaymentFilter = 'All bookings' | 'Paid deposits' | 'Awaiting payment'
type PeriodFilter = 'All time' | 'Last 30 days' | 'This month'

function formatNairaFromKobo(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

function formatRecordedDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function escapeCsvCell(value: string) {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safeValue.replace(/"/g, '""')}"`
}

export function PaymentsPanel({ appointments }: { appointments: Appointment[] }) {
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('Paid deposits')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('All time')

  const paidAppointments = appointments.filter((appointment) => appointment.payment_status === 'paid')
  const awaitingPaymentCount = appointments.filter((appointment) => appointment.payment_status !== 'paid').length
  const totalCollected = paidAppointments.reduce((total, appointment) => total + appointment.deposit_paid_kobo, 0)
  const averageDeposit = paidAppointments.length ? totalCollected / paidAppointments.length : 0

  const visibleAppointments = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = new Date()
    const periodStart = periodFilter === 'This month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : periodFilter === 'Last 30 days'
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : null

    return appointments
      .filter((appointment) => {
        const matchesPayment = paymentFilter === 'All bookings'
          || (paymentFilter === 'Paid deposits' && appointment.payment_status === 'paid')
          || (paymentFilter === 'Awaiting payment' && appointment.payment_status !== 'paid')
        const matchesSearch = !query || [
          appointment.clientName,
          appointment.clientEmail ?? '',
          appointment.clientPhone ?? '',
          appointment.serviceName,
          appointment.paystackReference ?? '',
          appointment.id,
        ].some((value) => value.toLowerCase().includes(query))
        const recordedAt = appointment.createdAt ? new Date(appointment.createdAt) : null
        const matchesPeriod = !periodStart || (
          recordedAt !== null &&
          !Number.isNaN(recordedAt.getTime()) &&
          recordedAt >= periodStart
        )
        return matchesPayment && matchesSearch && matchesPeriod
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
  }, [appointments, paymentFilter, periodFilter, search])

  const handleExport = () => {
    const rows = [
      ['Client', 'Email', 'Phone', 'Service', 'Add-ons', 'Appointment date', 'Recorded at', 'Payment status', 'Deposit received (NGN)', 'Paystack reference'],
      ...visibleAppointments.map((appointment) => [
        appointment.clientName,
        appointment.clientEmail ?? '',
        appointment.clientPhone ?? '',
        appointment.serviceName,
        (appointment.selectedAddons ?? []).map((addon) => addon.name).join(', '),
        appointment.date,
        appointment.createdAt ?? '',
        appointment.payment_status === 'paid' ? 'Paid deposit' : 'Awaiting payment',
        (appointment.deposit_paid_kobo / 100).toFixed(2),
        appointment.paystackReference ?? '',
      ]),
    ]
    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'booka-payments.csv'
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const paymentFilters: PaymentFilter[] = ['All bookings', 'Paid deposits', 'Awaiting payment']
  const periodFilters: PeriodFilter[] = ['All time', 'Last 30 days', 'This month']

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[30px] bg-[#211f1c] px-6 py-7 text-white shadow-sm sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-14 -top-28 -z-10 size-80 rounded-full bg-[#d46b4f]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 right-1/3 -z-10 size-64 rounded-full bg-[#e89b80]/15 blur-3xl" />
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-[#efb49f]">Revenue / Transactions</p>
            <h1 className="mt-2 text-3xl font-medium tracking-[-.06em] sm:text-4xl">Payments</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
              Track booking deposits, find a client or reference, and export your payment records.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={visibleAppointments.length === 0}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#f3efe9] px-5 py-3 text-xs font-semibold text-[#211f1c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-white/55">
              <Wallet size={15} className="text-[#efb49f]" /> Deposits collected
            </div>
            <p className="mt-3 text-2xl font-medium tracking-[-.05em] sm:text-3xl">
              {formatNairaFromKobo(totalCollected)}
            </p>
            <p className="mt-1 text-[11px] text-white/40">Verified booking payments</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-white/55">
              <CheckCircle2 size={15} className="text-[#9bccaa]" /> Paid deposits
            </div>
            <p className="mt-3 text-2xl font-medium tracking-[-.05em] sm:text-3xl">{paidAppointments.length}</p>
            <p className="mt-1 text-[11px] text-white/40">Bookings with a verified payment</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-white/55">
              <Clock3 size={15} className="text-[#f1cd8a]" /> Awaiting payment
            </div>
            <p className="mt-3 text-2xl font-medium tracking-[-.05em] sm:text-3xl">{awaitingPaymentCount}</p>
            <p className="mt-1 text-[11px] text-white/40">Bookings without a verified deposit</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-white/55">
              <CreditCard size={15} className="text-[#efb49f]" /> Average deposit
            </div>
            <p className="mt-3 text-2xl font-medium tracking-[-.05em] sm:text-3xl">
              {formatNairaFromKobo(averageDeposit)}
            </p>
            <p className="mt-1 text-[11px] text-white/40">Across verified payments</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] shadow-sm">
        <div className="border-b border-[#eee7df] p-4 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-.04em]">Booking payment activity</h2>
              <p className="mt-1 text-xs text-[#8c847c]">
                {visibleAppointments.length} {visibleAppointments.length === 1 ? 'booking' : 'bookings'} shown · Deposit amounts are actual amounts received.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative min-w-0 sm:min-w-[250px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c847c]" size={15} />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search client, service, reference..."
                  className="w-full rounded-full border border-[#ded8cf] bg-white py-2.5 pl-10 pr-4 text-xs outline-none transition focus:border-[#d46b4f]"
                />
              </label>
              <select
                aria-label="Filter payments by date"
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
                className="rounded-full border border-[#ded8cf] bg-white px-4 py-2.5 text-xs font-medium text-[#514a44] outline-none focus:border-[#d46b4f]"
              >
                {periodFilters.map((period) => <option key={period}>{period}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {paymentFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setPaymentFilter(filter)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition',
                  paymentFilter === filter
                    ? 'bg-[#211f1c] text-white shadow-sm'
                    : 'bg-[#f5f1eb] text-[#756f69] hover:bg-[#eee7df]'
                )}
              >
                {filter}
                {filter === 'Paid deposits' && (
                  <span className="ml-2 text-white/55">{paidAppointments.length}</span>
                )}
                {filter === 'Awaiting payment' && (
                  <span className={cn('ml-2', paymentFilter === filter ? 'text-white/55' : 'text-[#a39a91]')}>
                    {awaitingPaymentCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {visibleAppointments.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[#faf7f2] text-[10px] font-semibold uppercase tracking-[.14em] text-[#998f85]">
                  <tr>
                    <th className="px-6 py-3.5">Client</th>
                    <th className="px-6 py-3.5">Service / appointment</th>
                    <th className="px-6 py-3.5">Deposit received</th>
                    <th className="px-6 py-3.5">Reference</th>
                    <th className="px-6 py-3.5">Recorded</th>
                    <th className="px-6 py-3.5">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe4]">
                  {visibleAppointments.map((appointment) => {
                    const isPaid = appointment.payment_status === 'paid'
                    return (
                      <tr key={appointment.id} className="transition hover:bg-[#fcfaf6]">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#292521]">{appointment.clientName}</p>
                          <p className="mt-1 text-xs text-[#998f85]">{appointment.clientPhone || appointment.clientEmail || 'No contact details'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-[#292521]">{appointment.serviceName}</p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#998f85]">
                            <CalendarDays size={12} /> {appointment.date} · {appointment.time}
                          </p>
                          {(appointment.selectedAddons ?? []).length > 0 && (
                            <p className="mt-1 max-w-[190px] truncate text-[10px] text-[#a39a91]">
                              + {(appointment.selectedAddons ?? []).map((addon) => addon.name).join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#292521]">
                            {isPaid ? formatNairaFromKobo(appointment.deposit_paid_kobo) : '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-[#756f69]">
                            {appointment.paystackReference || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#756f69]">{formatRecordedDate(appointment.createdAt)}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold',
                            isPaid ? 'bg-[#e7f2ea] text-[#528361]' : 'bg-[#fff0d7] text-[#9a6d25]'
                          )}>
                            {isPaid ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                            {isPaid ? 'Deposit paid' : 'Awaiting payment'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[#f0ebe4] md:hidden">
              {visibleAppointments.map((appointment) => {
                const isPaid = appointment.payment_status === 'paid'
                return (
                  <article key={appointment.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#292521]">{appointment.clientName}</p>
                        <p className="mt-1 text-xs text-[#8c847c]">{appointment.serviceName}</p>
                        {(appointment.selectedAddons ?? []).length > 0 && (
                          <p className="mt-1 truncate text-[10px] text-[#a39a91]">
                            + {(appointment.selectedAddons ?? []).map((addon) => addon.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold',
                        isPaid ? 'bg-[#e7f2ea] text-[#528361]' : 'bg-[#fff0d7] text-[#9a6d25]'
                      )}>
                        {isPaid ? 'Deposit paid' : 'Awaiting payment'}
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div className="text-xs text-[#8c847c]">
                        <p>{appointment.date} · {appointment.time}</p>
                        <p className="mt-1 max-w-[220px] truncate font-mono">{appointment.paystackReference || 'No payment reference'}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[#292521]">
                        {isPaid ? formatNairaFromKobo(appointment.deposit_paid_kobo) : '—'}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f5f1eb] text-[#9e503b]">
              <CreditCard size={21} />
            </span>
            <h3 className="mt-4 text-base font-semibold text-[#292521]">
              {appointments.length === 0
                ? 'No booking payments yet'
                : paymentFilter === 'Paid deposits' && paidAppointments.length === 0
                  ? 'No paid deposits yet'
                  : 'No matching payments'}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#8c847c]">
              {appointments.length === 0
                ? 'Verified deposits from customer bookings will appear here.'
                : 'Try a different search or adjust the payment and date filters.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
