'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  TicketCheck,
  UserRound,
  X,
} from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
type TicketCategory = 'general' | 'booking' | 'payment' | 'payout' | 'verification' | 'account'
type StatusFilter = TicketStatus | 'all'

interface Ticket {
  ticket_id: number
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  business_id: string | null
  business_name: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  assigned_admin_id: string | null
  assigned_admin_email: string | null
  resolution: string | null
  created_at: string
  updated_at: string
  total_count?: number
}

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
}

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

const categoryLabels: Record<TicketCategory, string> = {
  general: 'General',
  booking: 'Booking',
  payment: 'Payment',
  payout: 'Payout',
  verification: 'Verification',
  account: 'Account',
}

const priorityStyles: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-[#f5f1eb] text-[#756f69]',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-red-100 text-red-800',
}

const statusStyles: Record<TicketStatus, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-violet-50 text-violet-700',
  waiting: 'bg-amber-50 text-amber-800',
  resolved: 'bg-emerald-50 text-emerald-800',
  closed: 'bg-slate-100 text-slate-600',
}

const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('general')
  const [priority, setPriority] = useState<TicketPriority>('normal')
  const [businessId, setBusinessId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savingTicketId, setSavingTicketId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadTickets = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
      setErrorMessage('')
    }
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.rpc('admin_list_support_tickets', {
        p_status: 'all',
        p_search: search.trim() || null,
      })
      if (error) throw error
      setTickets((data ?? []) as Ticket[])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load support tickets.')
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTickets(), 200)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    void createSupabaseClient().auth.getUser().then(({ data, error }) => {
      if (error) throw error
      if (active) setCurrentAdminId(data.user?.id ?? null)
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not verify the current admin.')
    })
    return () => {
      active = false
    }
  }, [])

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const supabase = createSupabaseClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw userError ?? new Error('Admin session expired.')
      const { error } = await supabase.rpc('admin_create_support_ticket', {
        p_subject: subject,
        p_description: description,
        p_category: category,
        p_priority: priority,
        p_business_id: businessId.trim() || null,
        p_customer_name: customerName.trim() || null,
        p_customer_email: customerEmail.trim() || null,
        p_customer_phone: customerPhone.trim() || null,
        p_assigned_admin_id: userData.user.id,
      })
      if (error) throw error
      setSubject('')
      setDescription('')
      setBusinessId('')
      setCustomerName('')
      setCustomerEmail('')
      setCustomerPhone('')
      setIsCreateOpen(false)
      setSuccessMessage('Support ticket created.')
      await loadTickets(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create ticket.')
    } finally {
      setIsSaving(false)
    }
  }

  const saveTicket = async (
    ticket: Ticket,
    nextStatus: TicketStatus,
    nextPriority: TicketPriority,
    resolution: string,
    assignedAdminId = ticket.assigned_admin_id
  ) => {
    setErrorMessage('')
    setSuccessMessage('')
    setSavingTicketId(ticket.ticket_id)
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_update_support_ticket', {
        p_ticket_id: ticket.ticket_id,
        p_status: nextStatus,
        p_priority: nextPriority,
        p_assigned_admin_id: assignedAdminId,
        p_resolution: resolution.trim() || null,
      })
      if (error) throw error
      setSuccessMessage(`Ticket #${ticket.ticket_id} updated.`)
      setResolutionDrafts((current) => {
        const next = { ...current }
        delete next[ticket.ticket_id]
        return next
      })
      await loadTickets(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update ticket.')
    } finally {
      setSavingTicketId(null)
    }
  }

  const visibleTickets = tickets.filter((ticket) => (
    (statusFilter === 'all' || ticket.status === statusFilter) &&
    (priorityFilter === 'all' || ticket.priority === priorityFilter) &&
    (categoryFilter === 'all' || ticket.category === categoryFilter)
  ))
  const openCount = tickets.filter((ticket) => ticket.status === 'open').length
  const inProgressCount = tickets.filter((ticket) => ticket.status === 'in_progress').length
  const waitingCount = tickets.filter((ticket) => ticket.status === 'waiting').length
  const urgentCount = tickets.filter((ticket) =>
    ticket.priority === 'urgent' && !['resolved', 'closed'].includes(ticket.status)
  ).length

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <header className="flex flex-col gap-5 border-b border-[#ded8cf]/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c0593c]">
            <LifeBuoy className="size-3.5" /> Operations / Support
          </p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">Support center</h1>
          <p className="mt-1 text-sm text-[#756f69]">Triage requests, manage priorities, and keep every issue moving.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadTickets()}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#ded8cf] bg-white px-3.5 text-xs font-medium transition hover:bg-[#faf8f5] disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen((open) => !open)}
            aria-expanded={isCreateOpen}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1e1c1a] px-4 text-xs font-semibold text-white transition hover:bg-[#c0593c]"
          >
            {isCreateOpen ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            {isCreateOpen ? 'Close form' : 'New ticket'}
          </button>
        </div>
      </header>

      {errorMessage && (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}

      <section aria-label="Ticket summary" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Open tickets', count: openCount, note: 'Need an owner', Icon: TicketCheck, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'In progress', count: inProgressCount, note: 'Being worked on', Icon: Clock3, color: 'text-violet-700', bg: 'bg-violet-50' },
          { label: 'Waiting', count: waitingCount, note: 'Awaiting a response', Icon: LifeBuoy, color: 'text-amber-800', bg: 'bg-amber-50' },
          { label: 'Urgent active', count: urgentCount, note: 'Needs priority attention', Icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(({ label, count, note, Icon, color, bg }) => (
          <article key={label} className="rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#756f69]">{label}</p>
                <p className="mt-2 font-mono text-2xl font-semibold">{isLoading ? '—' : count}</p>
              </div>
              <span className={`grid size-9 place-items-center rounded-xl ${bg} ${color}`}>
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[#8c847c]">{note}</p>
          </article>
        ))}
      </section>

      {isCreateOpen && (
        <form onSubmit={createTicket} className="mt-6 rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#f0ece4] pb-4">
            <div>
              <h2 className="text-sm font-semibold">Create support ticket</h2>
              <p className="mt-1 text-xs text-[#756f69]">Capture the issue and link it to a studio or customer if known.</p>
            </div>
            <TicketCheck className="size-5 shrink-0 text-[#c0593c]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-medium sm:col-span-2 xl:col-span-3">
              Subject
              <input required minLength={3} maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Briefly describe the issue" className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3 text-xs outline-none transition focus:border-[#c0593c] focus:ring-4 focus:ring-[#c0593c]/10" />
            </label>
            <label className="text-xs font-medium">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value as TicketCategory)} className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-white px-3 text-xs outline-none focus:border-[#c0593c]">
                {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium">
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-white px-3 text-xs outline-none focus:border-[#c0593c]">
                {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium">
              Related studio ID <span className="font-normal text-[#8c847c]">· optional</span>
              <input value={businessId} onChange={(event) => setBusinessId(event.target.value)} placeholder="e.g. bk-1234" className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3 text-xs outline-none focus:border-[#c0593c]" />
            </label>
            <label className="text-xs font-medium">
              Customer name <span className="font-normal text-[#8c847c]">· optional</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3 text-xs outline-none focus:border-[#c0593c]" />
            </label>
            <label className="text-xs font-medium">
              Customer email <span className="font-normal text-[#8c847c]">· optional</span>
              <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3 text-xs outline-none focus:border-[#c0593c]" />
            </label>
            <label className="text-xs font-medium">
              Customer phone <span className="font-normal text-[#8c847c]">· optional</span>
              <input type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3 text-xs outline-none focus:border-[#c0593c]" />
            </label>
            <label className="text-xs font-medium sm:col-span-2 xl:col-span-3">
              Issue details
              <textarea required minLength={3} maxLength={5000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add the steps, impact, and any useful context." className="mt-1.5 w-full resize-y rounded-xl border border-[#ded8cf] bg-[#faf8f5] p-3 text-xs leading-relaxed outline-none focus:border-[#c0593c]" />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#c0593c] px-4 text-xs font-semibold text-white transition hover:bg-[#a94931] disabled:cursor-wait disabled:opacity-50">
              <Plus className="size-3.5" /> {isSaving ? 'Creating…' : 'Create ticket'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ded8cf] bg-white shadow-sm">
        <div className="border-b border-[#f0ece4] p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-semibold">Ticket queue</h2>
              <p className="mt-1 text-xs text-[#756f69]">{tickets.length} matching tickets · sorted by priority and recent activity</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8c847c]" />
                <input aria-label="Search tickets" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subject, customer, or studio" className="h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] pl-9 pr-3 text-xs outline-none transition focus:border-[#c0593c] focus:ring-4 focus:ring-[#c0593c]/10" />
              </label>
              <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as TicketPriority | 'all')} className="h-10 rounded-xl border border-[#ded8cf] bg-white px-3 text-xs outline-none focus:border-[#c0593c]">
                <option value="all">All priorities</option>
                {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label} priority</option>)}
              </select>
              <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as TicketCategory | 'all')} className="h-10 rounded-xl border border-[#ded8cf] bg-white px-3 text-xs outline-none focus:border-[#c0593c]">
                <option value="all">All categories</option>
                {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {([
              ['all', 'All tickets', tickets.length],
              ['open', 'Open', openCount],
              ['in_progress', 'In progress', inProgressCount],
              ['waiting', 'Waiting', waitingCount],
              ['resolved', 'Resolved', tickets.filter((ticket) => ticket.status === 'resolved').length],
              ['closed', 'Closed', tickets.filter((ticket) => ticket.status === 'closed').length],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={statusFilter === value}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                  statusFilter === value
                    ? 'bg-[#1e1c1a] text-white'
                    : 'bg-[#f5f1eb] text-[#756f69] hover:bg-[#eee7df] hover:text-[#1e1c1a]'
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${statusFilter === value ? 'bg-white/15 text-white' : 'bg-white text-[#756f69]'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#756f69]">
            <RefreshCw className="size-4 animate-spin" /> Loading ticket queue…
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f5f1eb] text-[#8c847c]">
              <TicketCheck className="size-5" />
            </span>
            <p className="mt-4 text-sm font-semibold">{tickets.length === 0 ? 'No tickets found' : 'No tickets match these filters'}</p>
            <p className="mt-1 text-xs text-[#756f69]">Try changing the status, priority, category, or search term.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0ece4]">
            {visibleTickets.map((ticket) => {
              const resolution = resolutionDrafts[ticket.ticket_id] ?? ticket.resolution ?? ''
              const isSavingTicket = savingTicketId === ticket.ticket_id
              const isAssignedToMe = currentAdminId !== null && ticket.assigned_admin_id === currentAdminId

              return (
                <article key={ticket.ticket_id} className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_250px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold text-[#8c847c]">#{ticket.ticket_id}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[ticket.status]}`}>{statusLabels[ticket.status]}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityStyles[ticket.priority]}`}>{priorityLabels[ticket.priority]} priority</span>
                      <span className="rounded-full border border-[#e5ddd4] px-2.5 py-1 text-[10px] font-medium text-[#756f69]">{categoryLabels[ticket.category]}</span>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold leading-5">{ticket.subject}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#756f69]">{ticket.description}</p>

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#8c847c]">
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> Opened {dateLabel(ticket.created_at)}</span>
                      {ticket.business_name && <span className="inline-flex items-center gap-1.5"><Building2 className="size-3.5" /> {ticket.business_name}</span>}
                      {ticket.customer_name && <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" /> {ticket.customer_name}</span>}
                      {ticket.assigned_admin_email && <span>Assigned to {ticket.assigned_admin_email}</span>}
                    </div>

                    {(ticket.customer_email || ticket.customer_phone) && (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        {ticket.customer_email && (
                          <a href={`mailto:${ticket.customer_email}`} className="inline-flex items-center gap-1.5 text-[#9b563c] hover:underline">
                            <Mail className="size-3.5" /> {ticket.customer_email}
                          </a>
                        )}
                        {ticket.customer_phone && (
                          <a href={`tel:${ticket.customer_phone}`} className="inline-flex items-center gap-1.5 text-[#9b563c] hover:underline">
                            <Phone className="size-3.5" /> {ticket.customer_phone}
                          </a>
                        )}
                      </div>
                    )}

                    <label className="mt-5 block text-[11px] font-semibold text-[#514a44]">
                      Resolution / internal note
                      <textarea
                        value={resolution}
                        onChange={(event) => setResolutionDrafts((current) => ({ ...current, [ticket.ticket_id]: event.target.value }))}
                        rows={2}
                        maxLength={5000}
                        placeholder="Record the outcome or the next action."
                        className="mt-1.5 w-full resize-y rounded-xl border border-[#ded8cf] bg-[#faf8f5] p-3 text-xs font-normal leading-relaxed outline-none transition focus:border-[#c0593c] focus:ring-4 focus:ring-[#c0593c]/10"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-2 xl:border-l xl:border-[#f0ece4] xl:pl-5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-[#8c847c]">
                      Ticket status
                      <select
                        aria-label={`Ticket status ${ticket.ticket_id}`}
                        value={ticket.status}
                        disabled={savingTicketId !== null}
                        onChange={(event) => void saveTicket(ticket, event.target.value as TicketStatus, ticket.priority, resolution)}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-white px-3 text-xs font-medium normal-case tracking-normal text-[#1e1c1a] outline-none focus:border-[#c0593c] disabled:opacity-50"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-[#8c847c]">
                      Priority
                      <select
                        aria-label={`Ticket priority ${ticket.ticket_id}`}
                        value={ticket.priority}
                        disabled={savingTicketId !== null}
                        onChange={(event) => void saveTicket(ticket, ticket.status, event.target.value as TicketPriority, resolution)}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#ded8cf] bg-white px-3 text-xs font-medium normal-case tracking-normal text-[#1e1c1a] outline-none focus:border-[#c0593c] disabled:opacity-50"
                      >
                        {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    {currentAdminId && (
                      <button
                        type="button"
                        disabled={savingTicketId !== null}
                        onClick={() => void saveTicket(
                          ticket,
                          ticket.status,
                          ticket.priority,
                          resolution,
                          isAssignedToMe ? null : currentAdminId
                        )}
                        className="mt-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#ded8cf] px-3 text-xs font-medium transition hover:bg-[#faf8f5] disabled:opacity-50"
                      >
                        {isAssignedToMe ? 'Release assignment' : 'Assign to me'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={savingTicketId !== null}
                      onClick={() => void saveTicket(ticket, ticket.status, ticket.priority, resolution)}
                      className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1e1c1a] px-3 text-xs font-semibold text-white transition hover:bg-[#c0593c] disabled:cursor-wait disabled:opacity-50"
                    >
                      {isSavingTicket ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                      {isSavingTicket ? 'Saving…' : 'Save updates'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {!isLoading && tickets.length >= 500 && (
          <p className="border-t border-[#f0ece4] px-5 py-3 text-xs text-[#8c847c] sm:px-6">
            Showing the first 500 matching tickets. Refine your search to narrow results.
          </p>
        )}
      </section>
    </div>
  )
}
