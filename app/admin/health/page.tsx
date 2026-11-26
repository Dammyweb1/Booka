'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'

interface WebhookEvent {
  event_id: string
  event_type: string
  processing_status: 'processing' | 'processed' | 'failed'
  error_message: string | null
  attempt_count: number
  last_attempt_at: string
  payload: Record<string, unknown>
}

const formatTimestamp = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

export default function AdminHealthPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadEvents = useCallback(async () => {
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.rpc('admin_list_webhook_events', { p_limit: 100 })
      if (error) throw error
      setEvents((data ?? []) as WebhookEvent[])
      setLastUpdated(new Date().toISOString())
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load webhook health.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
    const interval = window.setInterval(() => void loadEvents(), 30000)
    return () => window.clearInterval(interval)
  }, [loadEvents])

  const failedCount = events.filter((event) => event.processing_status === 'failed').length
  const processingCount = events.filter((event) => event.processing_status === 'processing').length
  const isHealthy = failedCount === 0 && processingCount === 0

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <header className="flex flex-col gap-3 border-b border-[#ded8cf]/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-[#756f69]">Governance / System health</p>
          <h1 className="mt-3 text-2xl font-medium sm:text-3xl">Webhook health</h1>
          <p className="mt-1 text-sm text-[#756f69]">Recent Paystack event processing and failures.</p>
        </div>
        <button type="button" onClick={() => void loadEvents()} className="inline-flex items-center gap-2 self-start rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-xs font-medium">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </header>

      {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl bg-[#1e1c1a] p-5 text-white">
          <p className="text-xs text-[#a69f97]">Webhook processing</p>
          <p className="mt-3 flex items-center gap-2 text-lg font-semibold">
            {isLoading ? 'Checking…' : isHealthy ? <><ShieldCheck className="size-5 text-emerald-300" /> No pending failures</> : <><ShieldAlert className="size-5 text-amber-300" /> Attention needed</>}
          </p>
        </article>
        <article className="rounded-2xl border border-[#ded8cf] bg-white p-5">
          <p className="text-xs text-[#756f69]">Failed events in recent 100</p>
          <p className="mt-3 font-mono text-3xl font-semibold">{isLoading ? '—' : failedCount}</p>
        </article>
        <article className="rounded-2xl border border-[#ded8cf] bg-white p-5">
          <p className="text-xs text-[#756f69]">Currently processing</p>
          <p className="mt-3 font-mono text-3xl font-semibold">{isLoading ? '—' : processingCount}</p>
          <p className="mt-1 text-[10px] text-[#8c847c]">Last checked {lastUpdated ? formatTimestamp(lastUpdated) : '—'}</p>
        </article>
      </div>

      <section className="mt-6 rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="size-4 text-[#c0593c]" />
          <h2 className="text-sm font-semibold">Recent events</h2>
        </div>
        {isLoading ? <p className="py-8 text-center text-sm text-[#756f69]">Loading webhook events…</p> : events.length === 0 ? <p className="py-8 text-center text-sm text-[#756f69]">No webhook events recorded yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead><tr className="border-b border-[#f0ece4] text-[#8c847c]">
                <th className="py-3 font-medium">Event</th><th className="py-3 font-medium">Type</th><th className="py-3 font-medium">Status</th><th className="py-3 font-medium">Attempts</th><th className="py-3 font-medium">Last attempt</th><th className="py-3 font-medium">Details</th>
              </tr></thead>
              <tbody className="divide-y divide-[#f5f1ea]">
                {events.map((event) => (
                  <tr key={event.event_id} className="align-top">
                    <td className="max-w-40 break-all py-4 font-mono text-[10px]">{event.event_id}</td>
                    <td className="py-4">{event.event_type}</td>
                    <td className="py-4"><span className={`rounded-full px-2 py-1 text-[10px] ${event.processing_status === 'processed' ? 'bg-[#edf5ef] text-[#528361]' : event.processing_status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{event.processing_status}</span></td>
                    <td className="py-4 font-mono">{event.attempt_count}</td>
                    <td className="py-4 text-[#756f69]">{formatTimestamp(event.last_attempt_at)}</td>
                    <td className="max-w-72 py-4">
                      {event.error_message && <p className="text-red-700">{event.error_message}</p>}
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[#756f69]">Payload</summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#faf8f5] p-2 text-[10px]">{JSON.stringify(event.payload, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 border-t border-[#f0ece4] pt-3 text-[11px] text-[#8c847c]">
          This view reports webhook processing stored in Booka. It does not probe Paystack availability or Supabase infrastructure health.
        </p>
      </section>
    </div>
  )
}
