'use client'

import { useEffect, useState } from 'react'
import { Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'

interface CustomerRecord {
  client_id: string
  business_id: string
  business_name: string
  customer_name: string
  email: string
  phone: string
  total_bookings: number
  total_spent: number
  last_visit: string | null
  is_restricted: boolean
  restriction_reason: string | null
}

const formatNaira = (amount: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
}).format(amount)

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadCustomers = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.rpc('admin_search_customers', {
        p_search: search.trim() || null,
      })
      if (error) throw error
      setCustomers((data ?? []) as CustomerRecord[])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load customers.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCustomers(), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const toggleRestriction = async (customer: CustomerRecord) => {
    let reason: string | null = null
    if (!customer.is_restricted) {
      reason = window.prompt(`Why restrict ${customer.customer_name} from booking with ${customer.business_name}?`)
      if (reason === null) return
      if (!reason.trim()) {
        setErrorMessage('A restriction reason is required.')
        return
      }
    } else if (!window.confirm(`Restore booking access for ${customer.customer_name}?`)) {
      return
    }

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_set_customer_restriction', {
        p_client_id: customer.client_id,
        p_business_id: customer.business_id,
        p_is_restricted: !customer.is_restricted,
        p_reason: reason,
      })
      if (error) throw error
      await loadCustomers()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update customer access.')
    }
  }

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <header className="border-b border-[#ded8cf]/60 pb-6">
        <p className="text-xs text-[#756f69]">Operations / Customers</p>
        <h1 className="mt-3 text-2xl font-medium sm:text-3xl">Customer accounts</h1>
        <p className="mt-1 text-sm text-[#756f69]">Review booking history and manage studio-specific booking restrictions.</p>
      </header>
      {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
      <section className="mt-6 rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm sm:p-6">
        <div className="relative mb-5 max-w-lg">
          <Search className="absolute left-3.5 top-3 size-4 text-[#8c847c]" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, contact, or studio..." className="h-10 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] pl-10 pr-3 text-xs" />
        </div>
        {isLoading ? <p className="py-10 text-center text-sm text-[#756f69]">Loading customers…</p> : customers.length === 0 ? <p className="py-10 text-center text-sm text-[#756f69]">No customers found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead><tr className="border-b border-[#f0ece4] text-[#8c847c]">
                <th className="py-3 font-medium">Customer</th><th className="py-3 font-medium">Studio</th><th className="py-3 font-medium">Bookings</th><th className="py-3 font-medium">Spent</th><th className="py-3 font-medium">Last visit</th><th className="py-3 text-right font-medium">Access</th>
              </tr></thead>
              <tbody className="divide-y divide-[#f5f1ea]">
                {customers.map((customer) => (
                  <tr key={`${customer.business_id}-${customer.client_id}`}>
                    <td className="py-4">
                      <p className="font-semibold">{customer.customer_name}</p>
                      <p className="mt-1 text-[11px] text-[#756f69]">{customer.email || 'No email'} · {customer.phone}</p>
                    </td>
                    <td className="py-4">{customer.business_name}</td>
                    <td className="py-4 font-mono">{customer.total_bookings}</td>
                    <td className="py-4 font-mono">{formatNaira(customer.total_spent)}</td>
                    <td className="py-4 text-[#756f69]">{customer.last_visit ?? '—'}</td>
                    <td className="py-4 text-right">
                      <button type="button" onClick={() => void toggleRestriction(customer)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium ${customer.is_restricted ? 'bg-amber-50 text-amber-800' : 'border border-[#ded8cf] text-[#756f69]'}`}>
                        {customer.is_restricted ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                        {customer.is_restricted ? 'Restricted' : 'Restrict bookings'}
                      </button>
                      {customer.is_restricted && customer.restriction_reason && <p className="mt-1 max-w-48 text-[10px] text-amber-800">{customer.restriction_reason}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && customers.length >= 500 && <p className="mt-4 text-xs text-[#8c847c]">Showing the first 500 matching customers. Refine your search to narrow results.</p>}
      </section>
    </div>
  )
}
