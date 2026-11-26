'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

interface Ticket {
  ticket_id: number
  subject: string
  description: string
  category: string
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

const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState<TicketPriority>('normal')
  const [businessId, setBusinessId] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadTickets = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.rpc('admin_list_support_tickets', {
        p_status: statusFilter,
        p_search: search.trim() || null,
      })
      if (error) throw error
      setTickets((data ?? []) as Ticket[])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load support tickets.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTickets(), 200)
    return () => window.clearTimeout(timer)
  }, [statusFilter, search])

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
        p_customer_email: customerEmail.trim() || null,
        p_assigned_admin_id: userData.user.id,
      })
      if (error) throw error
      setSubject('')
      setDescription('')
      setBusinessId('')
      setCustomerEmail('')
      setSuccessMessage('Support ticket created.')
      await loadTickets()
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
    resolution: string
  ) => {
    setErrorMessage('')
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_update_support_ticket', {
        p_ticket_id: ticket.ticket_id,
        p_status: nextStatus,
        p_priority: nextPriority,
        p_assigned_admin_id: ticket.assigned_admin_id,
        p_resolution: resolution.trim() || null,
      })
      if (error) throw error
      setSuccessMessage(`Ticket #${ticket.ticket_id} updated.`)
      await loadTickets()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update ticket.')
    }
  }

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <header className="border-b border-[#ded8cf]/60 pb-6">
        <p className="text-xs text-[#756f69]">Operations / Support</p>
        <h1 className="mt-3 text-2xl font-medium sm:text-3xl">Support tickets</h1>
        <p className="mt-1 text-sm text-[#756f69]">Create, assign, prioritize, and resolve platform issues.</p>
      </header>

      {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
      {successMessage && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{successMessage}</p>}

      <form onSubmit={createTicket} className="mt-6 grid gap-4 rounded-2xl border border-[#ded8cf] bg-white p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold">Create a ticket</h2>
        </div>
        <label className="text-xs font-medium">Subject
          <input required minLength={3} maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#ded8cf] px-3" />
        </label>
        <label className="text-xs font-medium">Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#ded8cf] bg-white px-3">
            <option value="general">General</option><option value="booking">Booking</option><option value="payment">Payment</option><option value="payout">Payout</option><option value="verification">Verification</option><option value="account">Account</option>
          </select>
        </label>
        <label className="text-xs font-medium">Priority
          <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} className="mt-1.5 h-10 w-full rounded-lg border border-[#ded8cf] bg-white px-3">
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </label>
        <label className="text-xs font-medium">Related studio ID (optional)
          <input value={businessId} onChange={(event) => setBusinessId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#ded8cf] px-3" />
        </label>
        <label className="text-xs font-medium">Customer email (optional)
          <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#ded8cf] px-3" />
        </label>
        <label className="text-xs font-medium sm:col-span-2">Issue details
          <textarea required minLength={3} maxLength={5000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#ded8cf] p-3" />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving} className="rounded-xl bg-[#c0593c] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            {isSaving ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>

      <section className="mt-6 rounded-2xl border border-[#ded8cf] bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input aria-label="Search tickets" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subject, customer, or studio..." className="h-10 min-w-0 flex-1 rounded-lg border border-[#ded8cf] px-3 text-xs" />
          <select aria-label="Ticket status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-[#ded8cf] bg-white px-3 text-xs">
            <option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting">Waiting</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
          </select>
        </div>
        {isLoading ? <p className="py-8 text-center text-sm text-[#756f69]">Loading tickets…</p> : tickets.length === 0 ? <p className="py-8 text-center text-sm text-[#756f69]">No tickets found.</p> : (
          <ul className="divide-y divide-[#f0ece4]">
            {tickets.map((ticket) => (
              <li key={ticket.ticket_id} className="grid gap-4 py-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">#{ticket.ticket_id} · {ticket.subject}</h3>
                    <span className="rounded-full bg-[#f5ede3] px-2 py-1 text-[10px] capitalize">{ticket.priority} priority</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#756f69]">{ticket.description}</p>
                  <p className="mt-2 text-[11px] text-[#8c847c]">
                    {[ticket.business_name, ticket.customer_email, ticket.assigned_admin_email, dateLabel(ticket.created_at)].filter(Boolean).join(' · ')}
                  </p>
                  <label className="mt-3 block text-[11px] font-medium">Resolution / internal note
                    <textarea key={`${ticket.ticket_id}-${ticket.resolution ?? ''}`} defaultValue={ticket.resolution ?? ''} rows={2} className="mt-1 w-full rounded-lg border border-[#ded8cf] p-2 text-xs" id={`ticket-resolution-${ticket.ticket_id}`} />
                  </label>
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:w-56 lg:flex-col">
                  <select aria-label={`Ticket status ${ticket.ticket_id}`} value={ticket.status} onChange={(event) => void saveTicket(ticket, event.target.value as TicketStatus, ticket.priority, (document.getElementById(`ticket-resolution-${ticket.ticket_id}`) as HTMLTextAreaElement)?.value ?? '')} className="h-9 rounded-lg border border-[#ded8cf] bg-white px-2 text-xs">
                    <option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting">Waiting</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                  </select>
                  <select aria-label={`Ticket priority ${ticket.ticket_id}`} value={ticket.priority} onChange={(event) => void saveTicket(ticket, ticket.status, event.target.value as TicketPriority, (document.getElementById(`ticket-resolution-${ticket.ticket_id}`) as HTMLTextAreaElement)?.value ?? '')} className="h-9 rounded-lg border border-[#ded8cf] bg-white px-2 text-xs">
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                  <button type="button" onClick={() => void saveTicket(ticket, ticket.status, ticket.priority, (document.getElementById(`ticket-resolution-${ticket.ticket_id}`) as HTMLTextAreaElement)?.value ?? '')} className="h-9 rounded-lg border border-[#ded8cf] px-3 text-xs font-medium">Save note</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!isLoading && tickets.length >= 500 && <p className="mt-4 text-xs text-[#8c847c]">Showing the first 500 matching tickets. Refine your search to narrow results.</p>}
      </section>
    </div>
  )
}
