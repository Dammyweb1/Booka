'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Download, Search } from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'

interface AuditEntry {
  log_id: number
  event_type: string
  actor_email: string
  entity_type: string
  entity_id: string
  summary: string
  details: Record<string, unknown>
  created_at: string
  total_count: number
}

const PAGE_SIZE = 50

const EVENT_TYPES = [
  { value: 'all', label: 'All events' },
  { value: 'business_signup', label: 'Business signups' },
  { value: 'booking_payment', label: 'Booking payments' },
  { value: 'studio_fee_configuration_updated', label: 'Studio fee changes' },
  { value: 'platform_settings_updated', label: 'Platform setting changes' },
]

const eventLabel = (eventType: string) => (
  EVENT_TYPES.find((event) => event.value === eventType)?.label ?? eventType.replace(/_/g, ' ')
)

const formatTimestamp = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      const loadAudit = async () => {
        setIsLoading(true)
        setErrorMessage('')
        try {
          const supabase = createSupabaseClient()
          const { data, error } = await supabase.rpc('admin_list_audit_logs', {
            p_limit: PAGE_SIZE,
            p_offset: page * PAGE_SIZE,
            p_event_type: eventType,
            p_search: search.trim() || null,
          })
          if (error) throw error

          const rows = (data ?? []) as AuditEntry[]
          if (active) {
            setEntries(rows)
            setTotalCount(Number(rows[0]?.total_count ?? 0))
          }
        } catch (error) {
          if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load audit history.')
        } finally {
          if (active) setIsLoading(false)
        }
      }

      void loadAudit()
    }, 200)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [eventType, page, search])

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const updateSearch = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const updateEventType = (value: string) => {
    setEventType(value)
    setPage(0)
  }

  const exportAuditLog = async () => {
    setErrorMessage('')
    try {
      const supabase = createSupabaseClient()
      const allRows: AuditEntry[] = []
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabase.rpc('admin_list_audit_logs', {
          p_limit: PAGE_SIZE,
          p_offset: offset,
          p_event_type: eventType,
          p_search: search.trim() || null,
        })
        if (error) throw error
        const rows = (data ?? []) as AuditEntry[]
        allRows.push(...rows)
        if (rows.length < PAGE_SIZE) break
      }

      const columns = ['Event type', 'Actor', 'Entity type', 'Entity ID', 'Summary', 'Details', 'Created at']
      const rows = allRows.map((entry) => [
        entry.event_type, entry.actor_email, entry.entity_type, entry.entity_id,
        entry.summary, JSON.stringify(entry.details), entry.created_at,
      ])
      const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'booka-audit-log.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not export audit history.')
    }
  }

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <div className="border-b border-[#ded8cf]/60 pb-6">
        <div className="flex items-center gap-2 text-xs text-[#756f69]">
          <span>Governance</span><span>/</span><span className="font-semibold text-[#1e1c1a]">Audit log</span>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Audit log</h1>
            <p className="mt-1 text-sm text-[#756f69]">A searchable, persistent record of platform events and admin changes.</p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button type="button" onClick={() => void exportAuditLog()} disabled={isLoading || totalCount === 0} className="inline-flex items-center gap-2 rounded-xl border border-[#ded8cf] bg-white px-3 py-2.5 text-xs font-medium disabled:opacity-50">
              <Download className="size-3.5" /> Export all
            </button>
            <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs font-medium text-[#c0593c] hover:underline">
              Platform settings <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load audit history: {errorMessage}
        </div>
      )}

      <section className="mt-6 min-w-0 rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#f0ece4] pb-5 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-3 size-4 text-[#8c847c]" />
            <input
              type="search"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search summary, admin or record ID..."
              className="h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] pl-10 pr-3.5 text-xs outline-none focus:border-[#c0593c]"
            />
          </div>
          <label className="sr-only" htmlFor="audit-event-filter">Filter event type</label>
          <select
            id="audit-event-filter"
            value={eventType}
            onChange={(event) => updateEventType(event.target.value)}
            className="h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3 text-xs sm:w-auto"
          >
            {EVENT_TYPES.map((event) => (
              <option key={event.value} value={event.value}>{event.label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-[#756f69]">Loading audit events...</p>
        ) : entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#756f69]">
            {errorMessage ? 'Audit entries could not be loaded.' : 'No audit events match this filter.'}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[840px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#f0ece4] text-[#8c847c]">
                    <th className="py-3.5 font-medium">Event</th>
                    <th className="py-3.5 font-medium">Actor</th>
                    <th className="py-3.5 font-medium">Record</th>
                    <th className="py-3.5 font-medium">Summary</th>
                    <th className="py-3.5 text-right font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f1ea]">
                  {entries.map((entry) => (
                    <tr key={entry.log_id} className="align-top hover:bg-[#faf8f5]">
                      <td className="py-4">
                        <span className="inline-flex rounded-full bg-[#f5ede3] px-2.5 py-1 text-[10px] font-medium text-[#9b563c]">
                          {eventLabel(entry.event_type)}
                        </span>
                      </td>
                      <td className="py-4 text-[#756f69]">{entry.actor_email}</td>
                      <td className="py-4">
                        <p className="font-medium capitalize">{entry.entity_type}</p>
                        <p className="mt-0.5 max-w-36 truncate font-mono text-[10px] text-[#8c847c]" title={entry.entity_id}>
                          {entry.entity_id}
                        </p>
                      </td>
                      <td className="max-w-sm py-4">
                        <p className="leading-relaxed">{entry.summary}</p>
                        <details className="mt-2 text-[10px] text-[#756f69]">
                          <summary className="cursor-pointer hover:text-[#c0593c]">View event details</summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#faf8f5] p-3 font-mono text-[10px]">{JSON.stringify(entry.details, null, 2)}</pre>
                        </details>
                      </td>
                      <td className="py-4 text-right text-[#756f69]">{formatTimestamp(entry.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-[#f5f1ea] md:hidden">
              {entries.map((entry) => (
                <li key={entry.log_id} className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-[#f5ede3] px-2.5 py-1 text-[10px] font-medium text-[#9b563c]">
                      {eventLabel(entry.event_type)}
                    </span>
                    <time className="text-right text-[10px] text-[#8c847c]">{formatTimestamp(entry.created_at)}</time>
                  </div>
                  <p className="text-xs leading-relaxed">{entry.summary}</p>
                  <p className="break-all font-mono text-[10px] text-[#8c847c]">{entry.entity_type} · {entry.entity_id}</p>
                  <p className="text-[11px] text-[#756f69]">By {entry.actor_email}</p>
                  <details className="text-[10px] text-[#756f69]">
                    <summary className="cursor-pointer">View event details</summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#faf8f5] p-3 font-mono">{JSON.stringify(entry.details, null, 2)}</pre>
                  </details>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-[#f0ece4] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#756f69]">
            {totalCount} matching events · page {page + 1} of {pageCount}
          </p>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0 || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-[#ded8cf] px-3 py-2 text-xs disabled:opacity-40"
            >
              <ArrowLeft className="size-3.5" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              disabled={page + 1 >= pageCount || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-[#ded8cf] px-3 py-2 text-xs disabled:opacity-40"
            >
              Next <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
