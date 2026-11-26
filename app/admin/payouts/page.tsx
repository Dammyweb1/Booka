'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'

interface PayoutRecord {
  payout_id: number
  business_id: string
  business_name: string
  paystack_transfer_code: string | null
  paystack_reference: string | null
  amount_kobo: number
  status: 'pending' | 'processing' | 'successful' | 'failed' | 'reversed'
  failure_reason: string | null
  initiated_at: string
  completed_at: string | null
}

const formatNaira = (kobo: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
}).format(kobo / 100)

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [status, setStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const exportPayouts = () => {
    const header = ['Studio', 'Business ID', 'Reference', 'Transfer code', 'Amount (NGN)', 'Status', 'Failure reason', 'Initiated', 'Completed']
    const rows = payouts.map((payout) => [
      payout.business_name, payout.business_id, payout.paystack_reference,
      payout.paystack_transfer_code, payout.amount_kobo / 100, payout.status,
      payout.failure_reason, payout.initiated_at, payout.completed_at,
    ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'booka-payouts.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setErrorMessage('')
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase.rpc('admin_list_payouts', { p_status: status })
        if (error) throw error
        if (active) setPayouts((data ?? []) as PayoutRecord[])
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load payouts.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [status])

  const updatePayout = async (payout: PayoutRecord, nextStatus: PayoutRecord['status']) => {
    let failureReason = payout.failure_reason ?? ''
    if (nextStatus === 'failed') {
      const response = window.prompt('Failure reason', failureReason)
      if (response === null) return
      failureReason = response.trim()
      if (!failureReason) {
        setErrorMessage('A failure reason is required for failed payouts.')
        return
      }
    }
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_update_payout', {
        p_payout_id: payout.payout_id,
        p_status: nextStatus,
        p_failure_reason: failureReason || null,
      })
      if (error) throw error
      setPayouts((current) => current.map((item) => item.payout_id === payout.payout_id
        ? { ...item, status: nextStatus, failure_reason: failureReason || null }
        : item))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update payout.')
    }
  }

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <div className="flex flex-col gap-4 border-b border-[#ded8cf]/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-[#756f69]">Operations / Payouts</p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">Payout reconciliation</h1>
          <p className="mt-1 text-sm text-[#756f69]">Monitor and reconcile studio settlement records.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={exportPayouts} disabled={!payouts.length} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ded8cf] bg-white px-3 text-xs font-medium disabled:opacity-50">
            <Download className="size-3.5" /> Export
          </button>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-xl border border-[#ded8cf] bg-white px-3 text-xs"
            aria-label="Payout status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm sm:p-6">
        {isLoading ? (
          <p className="py-12 text-center text-sm text-[#756f69]">Loading payout records...</p>
        ) : payouts.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#756f69]">No payout records match this status.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#f0ece4] text-[#8c847c]">
                  <th className="py-3.5 font-medium">Studio</th>
                  <th className="py-3.5 font-medium">Reference</th>
                  <th className="py-3.5 font-medium">Amount</th>
                  <th className="py-3.5 font-medium">Initiated</th>
                  <th className="py-3.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f1ea]">
                {payouts.map((payout) => (
                  <tr key={payout.payout_id}>
                    <td className="py-4">
                      <p className="font-semibold">{payout.business_name}</p>
                      {payout.failure_reason && (
                        <p className="mt-1 max-w-52 text-[10px] text-red-700">{payout.failure_reason}</p>
                      )}
                    </td>
                    <td className="py-4 font-mono text-[11px] text-[#756f69]">
                      {payout.paystack_reference || payout.paystack_transfer_code || `Payout ${payout.payout_id}`}
                    </td>
                    <td className="py-4 font-mono font-semibold">{formatNaira(payout.amount_kobo)}</td>
                    <td className="py-4 text-[#756f69]">
                      {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                        .format(new Date(payout.initiated_at))}
                    </td>
                    <td className="py-4">
                      <select
                        value={payout.status}
                        onChange={(event) => void updatePayout(
                          payout,
                          event.target.value as PayoutRecord['status']
                        )}
                        className="rounded-lg border border-[#ded8cf] bg-white px-2 py-2"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="successful">Successful</option>
                        <option value="failed">Failed</option>
                        <option value="reversed">Reversed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
