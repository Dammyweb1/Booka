'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { Appointment } from '@/types'

type BookingRange = '7 days' | '30 days' | '90 days'
type ChartPerspective = 'created' | 'scheduled'

interface BookingPoint {
  label: string
  dateKey: string
  bookings: number
  paid: number
}

function toLocalDate(value: string | undefined | null): Date | null {
  if (!value) return null
  if (value === 'Today') {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  }

  // Handle standard 'YYYY-MM-DD'
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (isoDate) {
    return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]))
  }

  // Handle ISO timestamp 'YYYY-MM-DDTHH:mm:ss...' or date string
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getBookingPoints(
  appointments: Appointment[],
  range: BookingRange,
  perspective: ChartPerspective
): BookingPoint[] {
  const days = range === '7 days' ? 7 : range === '30 days' ? 30 : 90
  const bucketDays = range === '7 days' ? 1 : range === '30 days' ? 3 : 7
  const bucketCount = Math.ceil(days / bucketDays)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // In 'created' mode: look back from (today - days + 1) to today
  // In 'scheduled' mode: look forward from today to (today + days - 1)
  const startDate = new Date(today)
  if (perspective === 'created') {
    startDate.setDate(today.getDate() - days + 1)
  }

  const points: BookingPoint[] = Array.from({ length: bucketCount }, (_, index) => {
    const bucketDate = new Date(startDate)
    bucketDate.setDate(bucketDate.getDate() + index * bucketDays)

    const isToday = bucketDate.getTime() === today.getTime()
    let label = ''

    if (range === '7 days') {
      label = isToday
        ? 'Today'
        : bucketDate.toLocaleDateString('en-US', { weekday: 'short' })
    } else if (range === '30 days') {
      label = String(bucketDate.getDate()).padStart(2, '0')
    } else {
      label = bucketDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return {
      label,
      dateKey: bucketDate.toISOString().slice(0, 10),
      bookings: 0,
      paid: 0,
    }
  })

  const startOrdinal = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) / 86_400_000

  appointments.forEach((appointment) => {
    let targetDate: Date | null = null

    if (perspective === 'created') {
      // 1. Prefer createdAt timestamp (when the client actually booked & paid)
      if (appointment.createdAt) {
        targetDate = toLocalDate(appointment.createdAt)
      }

      // 2. Fallback to appointment.date
      if (!targetDate && appointment.date) {
        const parsed = toLocalDate(appointment.date)
        if (parsed) {
          // If the appointment is scheduled for the future and createdAt was not recorded,
          // treat it as a current/active booking today for the live activity chart
          targetDate = parsed > today ? today : parsed
        }
      }
    } else {
      // 'scheduled' perspective: tracks the scheduled appointment calendar date
      targetDate = toLocalDate(appointment.date)
    }

    if (!targetDate) return

    const dateOrdinal = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()) / 86_400_000
    const offset = dateOrdinal - startOrdinal

    // Outside the chart's visible date window
    if (offset < 0 || offset >= days) return

    const pointIndex = Math.floor(offset / bucketDays)
    const point = points[pointIndex]
    if (!point) return

    point.bookings += 1
    const isPaid = appointment.payment_status === 'paid' || appointment.status === 'Paid'
    if (isPaid) {
      point.paid += 1
    }
  })

  return points
}

export function UsageChart({ appointments }: { appointments: Appointment[] }) {
  const [range, setRange] = useState<BookingRange>('30 days')
  const [perspective, setPerspective] = useState<ChartPerspective>('created')
  const barsRef = useRef<SVGGElement>(null)

  const data = getBookingPoints(appointments, range, perspective)
  const totalBookings = data.reduce((total, point) => total + point.bookings, 0)
  const paidBookings = data.reduce((total, point) => total + point.paid, 0)
  const busiestPoint = data.reduce<BookingPoint | null>(
    (busiest, point) => point.bookings > (busiest?.bookings ?? 0) ? point : busiest,
    null
  )
  const hasBookings = totalBookings > 0
  const maxBookings = Math.max(1, ...data.map((point) => point.bookings))
  const yAxisMax = Math.max(5, Math.ceil(maxBookings / 5) * 5)

  useEffect(() => {
    if (!barsRef.current || !hasBookings) return
    const bars = Array.from(barsRef.current.children)
    gsap.set(bars, { scaleY: 0, transformOrigin: 'center bottom' })
    const tween = gsap.to(bars, {
      scaleY: 1,
      duration: 0.65,
      stagger: 0.035,
      ease: 'back.out(1.3)',
    })
    return () => {
      tween.kill()
    }
  }, [range, perspective, hasBookings])

  return (
    <section className="mt-6 overflow-hidden rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-5 sm:p-6 md:p-8">
      {/* Header with Title and Perspective + Range Toggles */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full', hasBookings ? 'bg-[#528361] animate-pulse' : 'bg-[#cfc7be]')} />
            <p className="eyebrow text-[#8c8177]">
              {perspective === 'created' ? 'Live booking activity' : 'Upcoming schedule'}
            </p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Appointment activity</h2>
          <p className="mt-1 text-sm text-[#817970]">
            {perspective === 'created'
              ? `Tracking live client bookings and verified payments over the last ${range}.`
              : `Tracking upcoming client appointments scheduled over the next ${range}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Perspective Switcher: When Booked vs When Scheduled */}
          <div className="flex rounded-full border border-[#e5ddd4] bg-[#f7f2eb] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPerspective('created')}
              className={cn(
                'rounded-full px-3 py-1.5 transition',
                perspective === 'created' ? 'bg-[#211f1c] text-white shadow-sm' : 'text-[#8c8177] hover:text-[#211f1c]'
              )}
              title="Track by the date clients booked"
            >
              When booked
            </button>
            <button
              type="button"
              onClick={() => setPerspective('scheduled')}
              className={cn(
                'rounded-full px-3 py-1.5 transition',
                perspective === 'scheduled' ? 'bg-[#211f1c] text-white shadow-sm' : 'text-[#8c8177] hover:text-[#211f1c]'
              )}
              title="Track by the scheduled appointment date"
            >
              Scheduled date
            </button>
          </div>

          {/* Range Switcher */}
          <div className="flex rounded-full border border-[#e5ddd4] bg-[#f7f2eb] p-1 text-xs font-semibold">
            {(['7 days', '30 days', '90 days'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={cn(
                  'rounded-full px-3 py-1.5 transition',
                  range === item ? 'bg-[#211f1c] text-white shadow-sm' : 'text-[#8c8177] hover:text-[#211f1c]'
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart Body + Stat Card */}
      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_200px]">
        <div className="min-w-0">
          {hasBookings ? (
            <>
              <div className="relative h-[250px]">
                {/* Y-Axis Labels */}
                <div className="absolute inset-y-0 left-0 flex flex-col justify-between pb-5 text-[10px] text-[#b2a79e]">
                  {[1, 0.75, 0.5, 0.25, 0].map((fraction, index) => (
                    <span key={index}>{Math.ceil(yAxisMax * fraction)}</span>
                  ))}
                </div>

                {/* SVG Bars & Gridlines */}
                <svg
                  viewBox="0 0 620 210"
                  className="absolute inset-0 ml-9 h-full w-[calc(100%-2.25rem)] overflow-visible"
                  role="img"
                  aria-label={`Appointments by date for ${range}`}
                >
                  <g stroke="#eee7df" strokeWidth="1">
                    {[5, 55, 105, 155, 205].map((y) => (
                      <line key={y} x1="0" x2="620" y1={y} y2={y} />
                    ))}
                  </g>
                  <g ref={barsRef}>
                    {data.map((point, index) => {
                      const bucketWidth = 600 / data.length
                      const x = index * bucketWidth + bucketWidth / 2
                      const totalHeight = (point.bookings / yAxisMax) * 180
                      const paidHeight = (point.paid / yAxisMax) * 180
                      const width = Math.max(8, Math.min(34, bucketWidth * 0.62))
                      const paidWidth = Math.max(5, width * 0.58)

                      return (
                        <g key={`${perspective}-${range}-${point.label}-${index}`} className="group cursor-pointer">
                          <title>
                            {`${point.label}: ${point.bookings} appointment${point.bookings === 1 ? '' : 's'} (${point.paid} paid)`}
                          </title>
                          {/* Total Appointments Bar (Cream/Warm Biscuit) */}
                          <rect
                            x={x - width / 2}
                            y={205 - totalHeight}
                            width={width}
                            height={totalHeight}
                            rx="7"
                            fill="#e9d5ca"
                            className="transition-opacity group-hover:opacity-80"
                          />
                          {/* Paid Deposit Bookings Bar (Terracotta Coral) */}
                          {point.paid > 0 && (
                            <rect
                              x={x - paidWidth / 2}
                              y={205 - paidHeight}
                              width={paidWidth}
                              height={paidHeight}
                              rx="5"
                              fill="#d46b4f"
                              className="transition-opacity group-hover:opacity-90"
                            />
                          )}
                        </g>
                      )
                    })}
                  </g>
                </svg>

                {/* X-Axis Labels */}
                <div className="absolute inset-x-9 bottom-0 flex justify-between text-[9px] font-medium text-[#8c8177] sm:text-[10px]">
                  {data.map((point, index) => (
                    <span
                      key={`${point.label}-${index}`}
                      className={cn(
                        point.label === 'Today' && 'font-bold text-[#d46b4f]'
                      )}
                    >
                      {point.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-5 text-xs font-medium text-[#746b63]">
                <span className="flex items-center gap-2">
                  <i className="size-2 rounded-full bg-[#d46b4f]" />
                  Paid deposits ({paidBookings})
                </span>
                <span className="flex items-center gap-2">
                  <i className="size-2 rounded-full bg-[#e9d5ca]" />
                  Total appointments ({totalBookings})
                </span>
              </div>
            </>
          ) : (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5ddd4] bg-[#fbfaf7] px-6 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-white text-[#b2a79e] shadow-sm">
                <span className="text-xl font-light">—</span>
              </span>
              <p className="mt-4 text-sm font-semibold text-[#4c443e]">No appointments in this period</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[#8c847c]">
                {perspective === 'created'
                  ? 'Once a client books an appointment, your live activity will be charted here.'
                  : 'Switch to "When booked" or check future dates to see upcoming appointments.'}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Summary Card */}
        <div className="rounded-2xl bg-[#211f1c] p-5 text-white">
          <p className="eyebrow text-[#efb49f]">
            {perspective === 'created' ? 'Live Activity' : 'Schedule Scope'}
          </p>
          <p className="mt-5 text-4xl font-medium tracking-[-.07em]">{totalBookings}</p>
          <p className="mt-1 text-sm text-white/50">
            {perspective === 'created' ? 'appointments booked' : 'appointments scheduled'}
          </p>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">Paid with Paystack</p>
            <p className="mt-1 text-lg font-semibold text-[#efb49f]">{paidBookings}</p>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">
              {perspective === 'created' ? 'Highest volume' : 'Peak schedule'}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {busiestPoint?.bookings ? `${busiestPoint.label} · ${busiestPoint.bookings} bookings` : 'No activity yet'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
