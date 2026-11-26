'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRef } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download, FileBarChart } from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'

interface FinancialReport {
  report_id: number
  period_start: string
  period_end: string
  booking_count: number
  paid_booking_count: number
  gross_booking_value: number
  deposits_collected_kobo: number
  refunds_kobo: number
  successful_payouts_kobo: number
  failed_payout_count: number
  generated_at: string
}

const formatNaira = (kobo: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
}).format(kobo / 100)

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const dateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ReportDatePicker({
  label,
  value,
  min,
  max,
  today,
  onChange,
}: {
  label: string
  value: string
  min?: string
  max?: string
  today: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseDate(value)
    return new Date(selected.getFullYear(), selected.getMonth(), 1)
  })
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const selected = parseDate(value)
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
  }, [isOpen, value])

  useEffect(() => {
    if (!isOpen) return
    const updatePopoverPosition = () => {
      const trigger = triggerRef.current
      const calendar = calendarRef.current
      if (!trigger || !calendar) return

      const triggerRect = trigger.getBoundingClientRect()
      const viewportPadding = 8
      const width = Math.min(288, window.innerWidth - viewportPadding * 2)
      const height = calendar.getBoundingClientRect().height
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.left),
        window.innerWidth - width - viewportPadding
      )
      const below = triggerRect.bottom + viewportPadding
      const top = below + height <= window.innerHeight - viewportPadding
        ? below
        : Math.max(viewportPadding, triggerRect.top - height - viewportPadding)

      setPopoverPosition({ top, left, width })
    }

    updatePopoverPosition()
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [isOpen])

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth)
  const selectedLabel = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parseDate(value))
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
  const leadingDays = (firstDay.getDay() + 6) % 7
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div
      ref={pickerRef}
      className="relative w-full"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsOpen(false)
      }}
    >
      <span className="text-xs font-medium text-[#514a44]">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${selectedLabel}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${label.toLowerCase().replace(/\s+/g, '-')}-calendar`}
        onClick={() => {
          setPopoverPosition(null)
          setIsOpen((open) => !open)
        }}
        className="mt-1.5 flex h-11 w-full items-center gap-3 rounded-xl border border-[#ded8cf] bg-white px-3 text-left text-xs font-medium text-[#1e1c1a] outline-none transition hover:border-[#c9b8a8] focus:border-[#c0593c] focus:ring-4 focus:ring-[#c0593c]/10"
      >
        <CalendarDays className="size-4 shrink-0 text-[#c0593c]" />
        <span className="min-w-0 flex-1">{selectedLabel}</span>
        <ChevronDown className={`size-4 shrink-0 text-[#8c847c] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={calendarRef}
          id={`${label.toLowerCase().replace(/\s+/g, '-')}-calendar`}
          role="dialog"
          aria-label={`${label} calendar`}
          style={{
            position: 'fixed',
            top: popoverPosition?.top ?? 8,
            left: popoverPosition?.left ?? 8,
            width: popoverPosition?.width ?? 'min(18rem, calc(100vw - 1rem))',
            visibility: popoverPosition ? 'visible' : 'hidden',
          }}
          className="z-50 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl border border-[#ded8cf] bg-white p-3 shadow-[0_16px_40px_rgba(30,28,26,0.16)]"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="grid size-8 place-items-center rounded-lg text-[#756f69] transition hover:bg-[#f5f1eb] hover:text-[#1e1c1a]"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-xs font-semibold text-[#1e1c1a]">{monthLabel}</p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="grid size-8 place-items-center rounded-lg text-[#756f69] transition hover:bg-[#f5f1eb] hover:text-[#1e1c1a]"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekdays.map((weekday) => (
              <span key={weekday} className="grid h-7 place-items-center text-[10px] font-medium text-[#8c847c]">
                {weekday}
              </span>
            ))}
            {Array.from({ length: 42 }, (_, index) => {
              const day = index - leadingDays + 1
              if (day < 1 || day > daysInMonth) return <span key={`blank-${index}`} aria-hidden="true" />

              const currentDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)
              const currentValue = dateValue(currentDate)
              const isDisabled = (min !== undefined && currentValue < min) || (max !== undefined && currentValue > max)
              const isSelected = currentValue === value
              const isToday = currentValue === today

              return (
                <button
                  key={currentValue}
                  type="button"
                  aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(currentDate)}
                  aria-pressed={isSelected}
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(currentValue)
                    setIsOpen(false)
                  }}
                  className={`grid aspect-square min-w-0 place-items-center rounded-lg text-[11px] transition disabled:cursor-not-allowed disabled:text-[#d4cec6] ${
                    isSelected
                      ? 'bg-[#c0593c] font-semibold text-white'
                      : isToday
                        ? 'bg-[#f5ede3] font-semibold text-[#a94931]'
                        : 'text-[#514a44] hover:bg-[#f5f1eb]'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const firstDay = new Date()
  firstDay.setUTCDate(1)
  const [periodStart, setPeriodStart] = useState(firstDay.toISOString().slice(0, 10))
  const [periodEnd, setPeriodEnd] = useState(today)
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.rpc('admin_list_reports', { p_limit: 200 })
      if (error) throw error
      setReports((data ?? []) as FinancialReport[])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load financial reports.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadReports() }, [])

  const generateReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsGenerating(true)
    setErrorMessage('')
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_generate_financial_report', {
        p_start: periodStart,
        p_end: periodEnd,
      })
      if (error) throw error
      await loadReports()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not generate report.')
    } finally {
      setIsGenerating(false)
    }
  }

  const exportReports = () => {
    const header = ['Period start', 'Period end', 'Bookings', 'Paid bookings', 'Gross booking value (NGN)', 'Deposits (NGN)', 'Refunds (NGN)', 'Successful payouts (NGN)', 'Failed payouts', 'Generated at']
    const rows = reports.map((report) => [
      report.period_start, report.period_end, report.booking_count, report.paid_booking_count,
      report.gross_booking_value, report.deposits_collected_kobo / 100, report.refunds_kobo / 100,
      report.successful_payouts_kobo / 100, report.failed_payout_count, report.generated_at,
    ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.href = url
    link.download = 'booka-financial-reports.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <header className="flex flex-col gap-4 border-b border-[#ded8cf]/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-[#756f69]">Finance / Reports</p>
          <h1 className="mt-3 text-2xl font-medium sm:text-3xl">Financial reports</h1>
          <p className="mt-1 text-sm text-[#756f69]">Saved reports include bookings, deposits, refunds, and payouts.</p>
        </div>
        <button type="button" onClick={exportReports} disabled={!reports.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ded8cf] bg-white px-4 py-2.5 text-xs font-medium disabled:opacity-50">
          <Download className="size-4" /> Export saved reports
        </button>
      </header>

      {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}

      <form onSubmit={generateReport} className="mt-6 grid gap-4 rounded-2xl border border-[#ded8cf] bg-gradient-to-br from-white to-[#faf8f5] p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <ReportDatePicker label="Period start" value={periodStart} max={periodEnd} today={today} onChange={setPeriodStart} />
        <ReportDatePicker label="Period end" value={periodEnd} min={periodStart} max={today} today={today} onChange={setPeriodEnd} />
        <button disabled={isGenerating} type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1e1c1a] px-4 text-xs font-semibold text-white disabled:opacity-50">
          <FileBarChart className="size-4" /> {isGenerating ? 'Generating…' : 'Generate report'}
        </button>
      </form>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm sm:p-6">
        {isLoading ? <p className="py-10 text-center text-sm text-[#756f69]">Loading reports…</p> : reports.length === 0 ? <p className="py-10 text-center text-sm text-[#756f69]">No saved reports yet. Generate one above; daily reports are also scheduled.</p> : (
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead><tr className="border-b border-[#f0ece4] text-[#8c847c]">
              <th className="py-3 font-medium">Period</th><th className="py-3 font-medium">Bookings</th><th className="py-3 font-medium">Paid</th><th className="py-3 font-medium">Gross value</th><th className="py-3 font-medium">Deposits</th><th className="py-3 font-medium">Refunds</th><th className="py-3 font-medium">Payouts</th><th className="py-3 font-medium">Failed payouts</th>
            </tr></thead>
            <tbody className="divide-y divide-[#f5f1ea]">
              {reports.map((report) => (
                <tr key={report.report_id}>
                  <td className="py-4 font-medium">{report.period_start} – {report.period_end}</td>
                  <td className="py-4 font-mono">{report.booking_count}</td>
                  <td className="py-4 font-mono">{report.paid_booking_count}</td>
                  <td className="py-4 font-mono">{formatNaira(report.gross_booking_value * 100)}</td>
                  <td className="py-4 font-mono">{formatNaira(report.deposits_collected_kobo)}</td>
                  <td className="py-4 font-mono">{formatNaira(report.refunds_kobo)}</td>
                  <td className="py-4 font-mono">{formatNaira(report.successful_payouts_kobo)}</td>
                  <td className="py-4 font-mono">{report.failed_payout_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
