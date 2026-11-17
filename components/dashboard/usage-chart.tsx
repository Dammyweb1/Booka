'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { Appointment } from '@/types'

type BookingRange = '7 days' | '30 days' | '90 days'

interface BookingPoint {
  label: string
  bookings: number
  paid: number
}

function toLocalDate(value: string) {
  if (value === 'Today') {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = isoDate
    ? new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getBookingPoints(appointments: Appointment[], range: BookingRange): BookingPoint[] {
  const days = range === '7 days' ? 7 : range === '30 days' ? 30 : 90
  const bucketDays = range === '7 days' ? 1 : range === '30 days' ? 3 : 7
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - days + 1)

  const points = Array.from({ length: Math.ceil(days / bucketDays) }, (_, index) => {
    const bucketDate = new Date(startDate)
    bucketDate.setDate(bucketDate.getDate() + index * bucketDays)
    return {
      label: range === '7 days'
        ? bucketDate.toLocaleDateString('en-US', { weekday: 'short' })
        : range === '30 days'
          ? String(bucketDate.getDate()).padStart(2, '0')
          : bucketDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bookings: 0,
      paid: 0,
    }
  })

  const startOrdinal = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) / 86_400_000
  appointments.forEach((appointment) => {
    const date = toLocalDate(appointment.date)
    if (!date) return
    const dateOrdinal = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
    const offset = dateOrdinal - startOrdinal
    if (offset < 0 || offset >= days) return
    const point = points[Math.floor(offset / bucketDays)]
    if (!point) return
    point.bookings += 1
    if (appointment.status === 'Paid' || appointment.payment_status === 'paid') {
      point.paid += 1
    }
  })

  return points
}

export function UsageChart({ appointments }: { appointments: Appointment[] }) {
  const [range, setRange] = useState<BookingRange>('30 days')
  const barsRef = useRef<SVGGElement>(null)
  const data = getBookingPoints(appointments, range)
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
  }, [range, hasBookings])

  return (
    <section className="mt-6 overflow-hidden rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-5 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full', hasBookings ? 'bg-[#528361]' : 'bg-[#cfc7be]')} />
            <p className="eyebrow text-[#8c8177]">Live booking data</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Appointment activity</h2>
          <p className="mt-1 text-sm text-[#817970]">
            {hasBookings
              ? 'Track appointments and paid bookings over time.'
              : 'Your appointment activity will appear here as soon as clients book.'}
          </p>
        </div>

        <div className="flex rounded-full border border-[#e5ddd4] bg-[#f7f2eb] p-1 text-xs font-semibold">
          {(['7 days', '30 days', '90 days'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={cn(
                'rounded-full px-3 py-2 transition',
                range === item ? 'bg-[#211f1c] text-white shadow-sm' : 'text-[#8c8177] hover:text-[#211f1c]'
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_180px]">
        <div className="min-w-0">
          {hasBookings ? (
            <>
              <div className="relative h-[250px]">
                <div className="absolute inset-y-0 left-0 flex flex-col justify-between pb-5 text-[10px] text-[#b2a79e]">
                  {[1, 0.75, 0.5, 0.25, 0].map((fraction, index) => (
                    <span key={index}>{Math.ceil(yAxisMax * fraction)}</span>
                  ))}
                </div>
                <svg
                  viewBox="0 0 620 210"
                  className="absolute inset-0 ml-9 h-full w-[calc(100%-2.25rem)] overflow-visible"
                  role="img"
                  aria-label={`Appointments by date for the last ${range}`}
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
                        <g key={`${range}-${point.label}`}>
                          <rect
                            x={x - width / 2}
                            y={205 - totalHeight}
                            width={width}
                            height={totalHeight}
                            rx="7"
                            fill="#e9d5ca"
                          />
                          {point.paid > 0 && (
                            <rect
                              x={x - paidWidth / 2}
                              y={205 - paidHeight}
                              width={paidWidth}
                              height={paidHeight}
                              rx="5"
                              fill="#d46b4f"
                            />
                          )}
                        </g>
                      )
                    })}
                  </g>
                </svg>
                <div className="absolute inset-x-9 bottom-0 flex justify-between text-[9px] font-medium text-[#8c8177] sm:text-[10px]">
                  {data.map((point, index) => (
                    <span key={`${point.label}-${index}`}>{point.label}</span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-5 text-xs font-medium text-[#746b63]">
                <span className="flex items-center gap-2">
                  <i className="size-2 rounded-full bg-[#d46b4f]" />
                  Paid bookings
                </span>
                <span className="flex items-center gap-2">
                  <i className="size-2 rounded-full bg-[#e9d5ca]" />
                  Total appointments
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
                Once a client books an appointment, your activity will be charted here.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#211f1c] p-5 text-white">
          <p className="eyebrow text-[#efb49f]">At a glance</p>
          <p className="mt-6 text-4xl font-medium tracking-[-.07em]">{totalBookings}</p>
          <p className="mt-1 text-sm text-white/50">appointments</p>
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">Paid bookings</p>
            <p className="mt-1 font-semibold">{paidBookings}</p>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">Busiest period</p>
            <p className="mt-1 font-semibold text-[#efb49f]">
              {busiestPoint?.bookings ? `${busiestPoint.label} · ${busiestPoint.bookings}` : 'No activity yet'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
