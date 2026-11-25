'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Calendar, TrendingUp } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

type Range = '30' | '90' | 'all'

interface OverviewStats {
  registered_businesses: number
  pending_payout_setup: number
  booking_count: number
  paid_booking_count: number
  paid_deposits_kobo: number
}

interface DailyActivity {
  activity_date: string
  paid_bookings: number
  paid_deposits_kobo: number
}

interface StudioSummary {
  business_id: string
  business_name: string
  location: string
  gross_volume: number
}

interface RecentBooking {
  booking_id: string
  paystack_reference: string | null
  business_name: string
  client_name: string
  amount: number
  deposit_paid_kobo: number
  payment_status: string
  booking_status: string
  created_at: string
}

const formatNaira = (amount: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
}).format(amount)

const formatActivityDate = (date: string) => new Intl.DateTimeFormat('en-NG', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${date}T00:00:00Z`))

function Sparkline({
  values,
  color,
  gradientId,
  label,
}: {
  values: number[]
  color: string
  gradientId: string
  label: string
}) {
  const width = 240
  const height = 68
  const padding = 5
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const range = max - min
  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1)
    const y = range > 0
      ? height - padding - ((value - min) / range) * (height - padding * 2)
      : height / 2
    return { x, y }
  })
  const linePath = points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : ''

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={label}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  )
}

export default function AdminOverviewPage() {
  const [range, setRange] = useState<Range>('30')
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [studios, setStudios] = useState<StudioSummary[]>([])
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    const loadOverview = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const since = range === 'all'
          ? null
          : new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        const supabase = createSupabaseClient()
        const [statsResult, activityResult, studiosResult, bookingsResult] = await Promise.all([
          supabase.rpc('admin_overview_stats', { p_since: since }),
          supabase.rpc('admin_daily_activity'),
          supabase.rpc('admin_list_studios'),
          supabase.rpc('admin_list_bookings', { p_limit: 8 }),
        ])

        const failedResult = [statsResult, activityResult, studiosResult, bookingsResult].find((result) => result.error)
        if (failedResult?.error) throw failedResult.error

        if (!active) return
        setStats(((statsResult.data ?? []) as OverviewStats[])[0] ?? null)
        setDailyActivity((activityResult.data ?? []) as DailyActivity[])
        setStudios((studiosResult.data ?? []) as StudioSummary[])
        setRecentBookings((bookingsResult.data ?? []) as RecentBooking[])
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load admin overview.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadOverview()
    return () => {
      active = false
    }
  }, [range])

  const topStudios = [...studios]
    .sort((a, b) => Number(b.gross_volume) - Number(a.gross_volume))
    .slice(0, 5)
  const paidActivityValues = dailyActivity.map((activity) => Number(activity.paid_bookings))
  const depositActivityValues = dailyActivity.map((activity) => Number(activity.paid_deposits_kobo))
  const paidActivityTotal = paidActivityValues.reduce((total, value) => total + value, 0)
  const depositsActivityTotal = depositActivityValues.reduce((total, value) => total + value, 0)

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <div className="flex flex-col gap-5 border-b border-[#ded8cf]/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#756f69]">
            <span>Workspace</span><span>/</span><span className="font-semibold text-[#1e1c1a]">Overview</span>
          </div>
          <h1 className="mt-4 text-2xl font-medium tracking-tight sm:text-3xl">Mission Control</h1>
          <p className="mt-1 text-sm text-[#756f69]">Live business and booking activity across Booka.</p>
        </div>
        <label className="flex w-full items-center gap-2 self-start rounded-xl border border-[#ded8cf] bg-white px-3.5 py-2.5 text-xs text-[#1e1c1a] sm:w-auto sm:self-auto">
          <Calendar className="size-3.5 shrink-0 text-[#756f69]" />
          <span className="whitespace-nowrap">Activity period</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as Range)}
            className="min-w-0 bg-transparent font-medium outline-none"
            aria-label="Activity period"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </label>
      </div>

      {errorMessage && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load overview: {errorMessage}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-[#1e1c1a] p-5 text-white shadow-sm sm:p-6">
          <p className="text-xs font-medium text-[#a69f97]">Registered businesses</p>
          <p className="mt-4 font-mono text-3xl font-semibold">{isLoading ? '—' : stats?.registered_businesses ?? 0}</p>
          <p className="mt-2 text-xs text-[#a69f97]">All business owner accounts</p>
        </div>
        <div className="rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-medium text-[#756f69]">Bookings</p>
          <p className="mt-4 font-mono text-3xl font-semibold">{isLoading ? '—' : stats?.booking_count ?? 0}</p>
          <p className="mt-2 text-xs text-[#756f69]">{range === 'all' ? 'All time' : `Last ${range} days`}</p>
        </div>
        <div className="rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-medium text-[#756f69]">Paid bookings</p>
          <p className="mt-4 font-mono text-3xl font-semibold">{isLoading ? '—' : stats?.paid_booking_count ?? 0}</p>
          <p className="mt-2 text-xs text-[#756f69]">Verified by Paystack</p>
        </div>
        <div className="rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-medium text-[#756f69]">Deposits collected</p>
          <p className="mt-4 break-words font-mono text-2xl font-semibold sm:text-3xl">
            {isLoading ? '—' : formatNaira(Number(stats?.paid_deposits_kobo ?? 0) / 100)}
          </p>
          <p className="mt-2 text-xs text-[#756f69]">Successful booking payments</p>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ded8cf] bg-white p-5 text-[#1e1c1a] shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#f0ece4] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#9b563c]">
              Daily performance · last 14 days
            </p>
            <h2 className="mt-2 text-lg font-semibold">Booking trends</h2>
            <p className="mt-1 text-xs text-[#756f69]">Daily paid bookings and verified deposit activity.</p>
          </div>
          <Link href="/admin/audit-log" className="inline-flex items-center gap-1 self-start text-xs font-medium text-[#c0593c] hover:underline sm:self-auto">
            Activity log <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <p className="py-12 text-center text-sm text-[#756f69]">Loading booking trends...</p>
        ) : dailyActivity.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#756f69]">Daily activity is unavailable.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl bg-[#faf8f5] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#756f69]">Paid bookings</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-[#263b8c]">
                    {new Intl.NumberFormat('en-NG').format(paidActivityTotal)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#756f69]">14-day total</span>
              </div>
              <div className="mt-5">
                <Sparkline
                  values={paidActivityValues}
                  color="#39478f"
                  gradientId="paid-activity-gradient"
                  label="Daily paid booking trend for the last 14 days"
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[#8c847c]">
                <span>{formatActivityDate(dailyActivity[0].activity_date)}</span>
                <span>{formatActivityDate(dailyActivity[dailyActivity.length - 1].activity_date)}</span>
              </div>
            </article>

            <article className="rounded-2xl bg-[#faf8f5] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#756f69]">Deposits collected</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-[#a33b83]">
                    {formatNaira(depositsActivityTotal / 100)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#756f69]">14-day total</span>
              </div>
              <div className="mt-5">
                <Sparkline
                  values={depositActivityValues}
                  color="#a33b83"
                  gradientId="deposit-activity-gradient"
                  label="Daily verified deposits trend for the last 14 days"
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[#8c847c]">
                <span>{formatActivityDate(dailyActivity[0].activity_date)}</span>
                <span>{formatActivityDate(dailyActivity[dailyActivity.length - 1].activity_date)}</span>
              </div>
            </article>
          </div>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0ece4] pb-4">
            <div>
              <h2 className="text-base font-semibold">Recent booking activity</h2>
              <p className="mt-1 text-xs text-[#756f69]">Most recent booking records</p>
            </div>
            <Link href="/admin/split-ledger" className="inline-flex items-center gap-1 text-xs font-medium text-[#c0593c] hover:underline">
              All bookings <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          {isLoading ? (
            <p className="py-10 text-center text-sm text-[#756f69]">Loading bookings...</p>
          ) : recentBookings.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#756f69]">No booking records yet.</p>
          ) : (
            <div className="mt-2 divide-y divide-[#f5f1ea]">
              {recentBookings.map((booking) => (
                <div key={booking.booking_id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{booking.business_name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#756f69]">
                      {booking.client_name} · {booking.paystack_reference || booking.booking_id}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${booking.payment_status === 'paid' ? 'bg-[#edf5ef] text-[#528361]' : 'bg-[#f5f1ea] text-[#756f69]'}`}>
                      {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                    <span className="text-right font-mono text-xs font-semibold">
                      {booking.payment_status === 'paid'
                        ? formatNaira(Number(booking.deposit_paid_kobo) / 100)
                        : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-2 border-b border-[#f0ece4] pb-4">
            <div>
              <h2 className="text-base font-semibold">Studios by paid booking value</h2>
              <p className="mt-1 text-xs text-[#756f69]">Lifetime paid service value</p>
            </div>
            <TrendingUp className="size-4 shrink-0 text-[#528361]" />
          </div>
          {isLoading ? (
            <p className="py-10 text-center text-sm text-[#756f69]">Loading studios...</p>
          ) : topStudios.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#756f69]">No businesses registered yet.</p>
          ) : (
            <div className="mt-2 divide-y divide-[#f5f1ea]">
              {topStudios.map((studio, index) => (
                <div key={studio.business_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-xs text-[#8c847c]">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{studio.business_name}</p>
                      <p className="truncate text-xs text-[#756f69]">{studio.location || 'Location not provided'}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold">{formatNaira(Number(studio.gross_volume))}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/studios" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-[#ded8cf] bg-[#faf8f5] py-2.5 text-xs font-medium hover:bg-[#f0ece4]">
            View studios <ArrowUpRight className="size-3.5" />
          </Link>
        </section>
      </div>

      <div className="mt-6 rounded-2xl border border-[#ded8cf] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Payout setup requiring attention</p>
            <p className="mt-1 text-xs text-[#756f69]">Businesses missing payout account details</p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="font-mono text-xl font-semibold text-[#c0822e]">
              {isLoading ? '—' : stats?.pending_payout_setup ?? 0}
            </span>
            <Link href="/admin/studios" className="text-xs font-medium text-[#c0593c] hover:underline">
              Review studios
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
