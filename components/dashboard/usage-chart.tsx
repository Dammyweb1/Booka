'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

export function UsageChart() {
  const [range, setRange] = useState<'7 days' | '30 days' | '90 days'>('30 days')
  const barsRef = useRef<SVGGElement>(null)

  const datasets = {
    '7 days': [
      { label: 'Mon', bookings: 34, paid: 27, utilization: 72 },
      { label: 'Tue', bookings: 42, paid: 35, utilization: 81 },
      { label: 'Wed', bookings: 51, paid: 44, utilization: 89 },
      { label: 'Thu', bookings: 46, paid: 38, utilization: 84 },
      { label: 'Fri', bookings: 63, paid: 52, utilization: 96 },
      { label: 'Sat', bookings: 76, paid: 61, utilization: 100 },
      { label: 'Sun', bookings: 29, paid: 24, utilization: 58 },
    ],
    '30 days': [
      { label: '01', bookings: 38, paid: 31, utilization: 64 },
      { label: '04', bookings: 46, paid: 38, utilization: 72 },
      { label: '07', bookings: 55, paid: 45, utilization: 81 },
      { label: '10', bookings: 48, paid: 41, utilization: 76 },
      { label: '13', bookings: 67, paid: 55, utilization: 91 },
      { label: '16', bookings: 74, paid: 62, utilization: 96 },
      { label: '19', bookings: 61, paid: 49, utilization: 84 },
      { label: '22', bookings: 82, paid: 69, utilization: 100 },
      { label: '25', bookings: 78, paid: 65, utilization: 94 },
      { label: '28', bookings: 91, paid: 76, utilization: 100 },
    ],
    '90 days': [
      { label: 'Jan', bookings: 48, paid: 39, utilization: 68 },
      { label: 'Feb', bookings: 57, paid: 47, utilization: 76 },
      { label: 'Mar', bookings: 64, paid: 52, utilization: 82 },
      { label: 'Apr', bookings: 71, paid: 59, utilization: 88 },
      { label: 'May', bookings: 83, paid: 69, utilization: 95 },
      { label: 'Jun', bookings: 91, paid: 76, utilization: 100 },
    ],
  }

  const data = datasets[range]

  useEffect(() => {
    if (!barsRef.current) return
    const bars = Array.from(barsRef.current.children)
    gsap.set(bars, { scaleY: 0, transformOrigin: 'center bottom' })
    const tween = gsap.to(bars, {
      scaleY: 1,
      duration: 0.75,
      stagger: 0.05,
      ease: 'back.out(1.4)',
    })
    return () => {
      tween.kill()
    }
  }, [range])

  return (
    <section className="mt-6 overflow-hidden rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#d46b4f]" />
            <p className="eyebrow text-[#c66046]">Live utilization</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Bookings that move your business</h2>
          <p className="mt-1 text-sm text-[#817970]">
            Track customer demand, paid sessions, and calendar saturation.
          </p>
        </div>

        {/* Range Selector */}
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

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_180px]">
        {/* SVG Graphic Area */}
        <div className="min-w-0">
          <div className="relative h-[250px]">
            <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-[#b2a79e]">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            <svg
              viewBox="0 0 620 210"
              className="absolute inset-0 ml-9 h-full w-[calc(100%-2.25rem)] overflow-visible"
              role="img"
              aria-label={`Utilization bars for ${range}`}
            >
              <g stroke="#eee7df" strokeWidth="1">
                <line x1="0" x2="620" y1="5" y2="5" />
                <line x1="0" x2="620" y1="55" y2="55" />
                <line x1="0" x2="620" y1="105" y2="105" />
                <line x1="0" x2="620" y1="155" y2="155" />
                <line x1="0" x2="620" y1="205" y2="205" />
              </g>
              <g ref={barsRef}>
                {data.map((item, index) => {
                  const x = index * (600 / data.length) + 8
                  const height = item.utilization * 1.8
                  return (
                    <g key={item.label}>
                      <rect
                        x={x}
                        y={210 - height}
                        width={Math.max(20, 34 - data.length)}
                        height={height}
                        rx="8"
                        fill="#e9d5ca"
                      />
                      <rect
                        x={x + 5}
                        y={210 - item.paid * 1.8}
                        width={Math.max(10, 24 - data.length / 2)}
                        height={item.paid * 1.8}
                        rx="5"
                        fill="#d46b4f"
                      />
                    </g>
                  )
                })}
              </g>
            </svg>
            <div className="absolute inset-x-9 bottom-0 flex justify-between text-[10px] font-medium text-[#8c8177]">
              {data.map((item) => (
                <span key={item.label}>{item.label}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-xs font-medium text-[#746b63]">
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-[#d46b4f]" />
              Paid sessions
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-[#e9d5ca]" />
              Total bookings
            </span>
          </div>
        </div>

        {/* Dark Metric Callout */}
        <div className="rounded-2xl bg-[#211f1c] p-5 text-white">
          <p className="eyebrow text-[#efb49f]">At a glance</p>
          <p className="mt-6 text-4xl font-medium tracking-[-.07em]">86%</p>
          <p className="mt-1 text-sm text-white/50">average utilization</p>
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">Best day</p>
            <p className="mt-1 font-semibold">Friday · 96%</p>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">Conversion</p>
            <p className="mt-1 font-semibold text-[#efb49f]">82.4% paid</p>
          </div>
        </div>
      </div>
    </section>
  )
}

