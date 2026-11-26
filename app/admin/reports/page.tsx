'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Download, FileBarChart } from 'lucide-react'
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
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
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

      <form onSubmit={generateReport} className="mt-6 grid gap-4 rounded-2xl border border-[#ded8cf] bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <label className="text-xs font-medium">Period start
          <input required type="date" value={periodStart} max={periodEnd} onChange={(event) => setPeriodStart(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#ded8cf] px-3" />
        </label>
        <label className="text-xs font-medium">Period end
          <input required type="date" value={periodEnd} min={periodStart} max={today} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#ded8cf] px-3" />
        </label>
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
