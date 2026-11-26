'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'

interface Studio {
  id: string
  name: string
  location: string
  slug: string
  owner: string
  contact: string
  bank: string
  accountNumber: string
  accountName: string
  subaccountCode: string
  feeShare: string
  studioShare: number
  platformFee: number
  feeBearer: 'subaccount' | 'account'
  status: 'Ready' | 'Action needed'
  appointments: number
  grossVolume: number
  lifecycleStatus: 'active' | 'suspended'
  suspensionReason: string
  verificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected'
  verificationNote: string
}

const exportStudios = (studios: Studio[]) => {
  const columns = ['Business', 'Slug', 'Owner', 'Email and phone', 'Location', 'Bank', 'Subaccount', 'Studio share', 'Platform fee']
  const rows = studios.map((studio) => [
    studio.name,
    studio.slug,
    studio.owner,
    studio.contact,
    studio.location,
    studio.bank,
    studio.subaccountCode,
    studio.studioShare,
    studio.platformFee,
  ])
  const csv = [columns, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'booka-studios.csv'
  link.click()
  URL.revokeObjectURL(url)
}

interface AdminStudioRow {
  business_id: string
  slug: string
  business_name: string
  owner_name: string
  email: string
  phone: string
  location: string
  paystack_subaccount_code: string | null
  settlement_bank: string | null
  account_number: string | null
  account_name: string | null
  fee_share_percent: number
  platform_fee_percent: number
  fee_bearer: string
  appointment_count: number
  gross_volume: number
  lifecycle_status: 'active' | 'suspended'
  suspension_reason: string | null
  verification_status: 'pending' | 'under_review' | 'verified' | 'rejected'
  verification_note: string | null
}

const formatNaira = (amount: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
}).format(amount)

const verificationStatusLabels: Record<Studio['verificationStatus'], string> = {
  pending: 'Pending verification',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Rejected',
}

export default function AdminStudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Drawer edit state
  const [editStudioShare, setEditStudioShare] = useState(97)
  const [editPlatformFee, setEditPlatformFee] = useState(3)
  const [editBearer, setEditBearer] = useState<'subaccount' | 'account'>('subaccount')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [lifecycleReason, setLifecycleReason] = useState('')
  const [verificationStatus, setVerificationStatus] = useState<Studio['verificationStatus']>('pending')
  const [verificationNote, setVerificationNote] = useState('')
  const [verificationSaved, setVerificationSaved] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    let isCurrent = true

    const loadStudios = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase.rpc('admin_list_studios')
        if (error) throw error

        if (isCurrent) {
          setStudios(((data ?? []) as AdminStudioRow[]).map((row) => {
            const subaccountCode = row.paystack_subaccount_code ?? ''
            const bank = row.settlement_bank ?? ''
            const accountNumber = row.account_number ?? ''
            const studioShare = Number(row.fee_share_percent)
            const platformFee = Number(row.platform_fee_percent)

            return {
              id: row.business_id,
              name: row.business_name,
              location: row.location || 'Location not provided',
              slug: `/${row.slug.replace(/^\/+/, '')}`,
              owner: row.owner_name,
              contact: [row.email, row.phone].filter(Boolean).join(' · '),
              bank: bank || 'Bank details required',
              accountNumber,
              accountName: row.account_name ?? '',
              subaccountCode: subaccountCode || 'None',
              feeShare: `${studioShare}% / ${platformFee}%`,
              studioShare,
              platformFee,
              feeBearer: row.fee_bearer === 'account' ? 'account' : 'subaccount',
              status: subaccountCode && bank && accountNumber ? 'Ready' as const : 'Action needed' as const,
              appointments: Number(row.appointment_count),
              grossVolume: Number(row.gross_volume),
              lifecycleStatus: row.lifecycle_status,
              suspensionReason: row.suspension_reason ?? '',
              verificationStatus: row.verification_status,
              verificationNote: row.verification_note ?? '',
            }
          }))
        }
      } catch (error) {
        if (isCurrent) {
          setPageError(error instanceof Error ? error.message : 'Could not load studios.')
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadStudios()
    return () => {
      isCurrent = false
    }
  }, [])

  const handleOpenDrawer = (studio: Studio) => {
    setSelectedStudio(studio)
    setEditStudioShare(studio.studioShare)
    setEditPlatformFee(studio.platformFee)
    setEditBearer(studio.feeBearer)
    setLifecycleReason(studio.suspensionReason)
    setVerificationStatus(studio.verificationStatus)
    setVerificationNote(studio.verificationNote)
    setVerificationSaved(false)
    setSaveError('')
    setSaveSuccess(false)
    setActionError('')
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => setSelectedStudio(null), 300)
  }

  const handleLifecycleAction = async () => {
    if (!selectedStudio) return
    const nextStatus = selectedStudio.lifecycleStatus === 'active' ? 'suspended' : 'active'
    if (nextStatus === 'suspended' && !lifecycleReason.trim()) {
      setActionError('A suspension reason is required.')
      return
    }
    setActionLoading(true)
    setActionError('')
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_set_studio_lifecycle', {
        p_business_id: selectedStudio.id,
        p_lifecycle_status: nextStatus,
        p_reason: lifecycleReason.trim() || null,
      })
      if (error) throw error
      const updated = {
        ...selectedStudio,
        lifecycleStatus: nextStatus as Studio['lifecycleStatus'],
        suspensionReason: nextStatus === 'suspended' ? lifecycleReason.trim() : '',
      }
      setSelectedStudio(updated)
      setStudios((current) => current.map((studio) => studio.id === updated.id ? updated : studio))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update studio status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerificationAction = async () => {
    if (!selectedStudio) return
    setActionLoading(true)
    setActionError('')
    setVerificationSaved(false)
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_set_studio_verification', {
        p_business_id: selectedStudio.id,
        p_verification_status: verificationStatus,
        p_note: verificationNote.trim() || null,
      })
      if (error) throw error
      const updated = {
        ...selectedStudio,
        verificationStatus,
        verificationNote: verificationNote.trim(),
      }
      setSelectedStudio(updated)
      setStudios((current) => current.map((studio) => studio.id === updated.id ? updated : studio))
      setVerificationSaved(true)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update verification status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveDrawer = async () => {
    if (!selectedStudio) return

    if (
      editStudioShare < 0 ||
      editStudioShare > 100 ||
      editPlatformFee < 0 ||
      editPlatformFee > 100 ||
      editStudioShare + editPlatformFee !== 100
    ) {
      setSaveError('Studio and platform fees must be between 0 and 100 and total 100%.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_update_studio_fees', {
        p_business_id: selectedStudio.id,
        p_fee_share_percent: editStudioShare,
        p_platform_fee_percent: editPlatformFee,
        p_fee_bearer: editBearer,
      })
      if (error) throw error

      setStudios((prev) =>
        prev.map((s) =>
          s.id === selectedStudio.id
            ? {
                ...s,
                studioShare: editStudioShare,
                platformFee: editPlatformFee,
                feeBearer: editBearer,
                feeShare: `${editStudioShare}% / ${editPlatformFee}%`,
              }
            : s
        )
      )
      setSelectedStudio({
        ...selectedStudio,
        studioShare: editStudioShare,
        platformFee: editPlatformFee,
        feeBearer: editBearer,
        feeShare: `${editStudioShare}% / ${editPlatformFee}%`,
      })
      setSaveSuccess(true)
      setTimeout(() => handleCloseDrawer(), 600)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save fee configuration.')
    } finally {
      setIsSaving(false)
    }
  }

  const pendingCount = studios.filter((studio) => studio.status === 'Action needed').length
  const averagePlatformFee = studios.length
    ? studios.reduce((total, studio) => total + studio.platformFee, 0) / studios.length
    : 0

  const filteredStudios = studios.filter((s) => {
    if (filterTab === 'active' && s.status !== 'Ready') return false
    if (filterTab === 'pending' && s.status !== 'Action needed') return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.bank.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="relative flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <div>
        {/* ========================================================================= */}
        {/* TOP STATUS BAR                                                            */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between border-b border-[#ded8cf]/60 pb-5">
          <div className="flex items-center gap-2 text-xs text-[#756f69]">
            <span>Workspace</span>
            <span>/</span>
            <span className="font-semibold text-[#1e1c1a]">Studios</span>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* HEADER & EXPORT                                                           */}
        {/* ========================================================================= */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-[#1e1c1a]">
              Studios & subaccounts
            </h1>
            <p className="mt-1 text-sm text-[#756f69]">
              The businesses behind the bookings. Keep every payout ready.
            </p>
          </div>

          <button onClick={() => exportStudios(filteredStudios)} disabled={filteredStudios.length === 0} className="flex items-center justify-center gap-2 self-start rounded-xl border border-[#ded8cf] bg-white px-4 py-2.5 text-xs font-medium text-[#1e1c1a] shadow-sm hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto">
            <Download className="size-3.5 text-[#756f69]" />
            <span>Export list</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 3 METRIC CARDS                                                            */}
        {/* ========================================================================= */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#ded8cf] rounded-2xl p-6 shadow-sm">
            <p className="text-xs text-[#756f69] font-medium">Registered studios</p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-semibold font-mono tracking-tight text-[#1e1c1a]">{studios.length}</span>
              <span className="text-xs text-[#756f69]">Businesses on Booka</span>
            </div>
          </div>

          <div className="bg-white border border-[#ded8cf] rounded-2xl p-6 shadow-sm">
            <p className="text-xs text-[#756f69] font-medium">Needs attention</p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-semibold font-mono tracking-tight text-[#c0822e]">{pendingCount}</span>
              <span className="text-xs text-[#756f69]">Missing payout details</span>
            </div>
          </div>

          <div className="bg-white border border-[#ded8cf] rounded-2xl p-6 shadow-sm">
            <p className="text-xs text-[#756f69] font-medium">Average platform fee</p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-semibold font-mono tracking-tight text-[#1e1c1a]">{averagePlatformFee.toFixed(1)}%</span>
              <span className="text-xs text-[#756f69]">Across registered studios</span>
            </div>
          </div>
        </div>

        {pageError && (
          <div role="alert" className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            Could not load studios: {pageError}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STUDIOS TABLE CONTAINER                                                   */}
        {/* ========================================================================= */}
        <div className="mt-8 bg-white border border-[#ded8cf] rounded-2xl p-6 shadow-sm">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-[#f0ece4]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 size-4 text-[#8c847c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search studio, slug or settlement bank..."
                className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-[#ded8cf] bg-[#faf8f5] text-xs text-[#1e1c1a] placeholder-[#8c847c] focus:outline-none focus:border-[#c0593c]"
              />
            </div>

          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-6 pt-4 border-b border-[#f0ece4] text-xs font-medium">
            <button
              onClick={() => setFilterTab('all')}
              className={`pb-3 transition-colors relative ${
                filterTab === 'all'
                  ? 'text-[#c0593c] font-semibold border-b-2 border-[#c0593c]'
                  : 'text-[#756f69] hover:text-[#1e1c1a]'
              }`}
            >
              All studios
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`pb-3 transition-colors relative ${
                filterTab === 'active'
                  ? 'text-[#c0593c] font-semibold border-b-2 border-[#c0593c]'
                  : 'text-[#756f69] hover:text-[#1e1c1a]'
              }`}
            >
              Active subaccount
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              className={`pb-3 transition-colors relative ${
                filterTab === 'pending'
                  ? 'text-[#c0593c] font-semibold border-b-2 border-[#c0593c]'
                  : 'text-[#756f69] hover:text-[#1e1c1a]'
              }`}
            >
              Needs bank info
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8c847c] border-b border-[#f0ece4]">
                  <th className="py-3.5 font-medium">Studio</th>
                  <th className="py-3.5 font-medium">Public page</th>
                  <th className="py-3.5 font-medium">Settlement bank</th>
                  <th className="py-3.5 font-medium">Subaccount code</th>
                  <th className="py-3.5 font-medium">Fee share</th>
                  <th className="py-3.5 font-medium">Status</th>
                  <th className="py-3.5 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f1ea]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-[#756f69]">Loading studios...</td>
                  </tr>
                ) : filteredStudios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-[#756f69]">
                      {pageError ? 'Studio data could not be loaded.' : 'No studios match this search.'}
                    </td>
                  </tr>
                ) : filteredStudios.map((studio) => (
                  <tr
                    key={studio.id}
                    onClick={() => handleOpenDrawer(studio)}
                    className="hover:bg-[#faf8f5] transition-colors cursor-pointer group"
                  >
                    <td className="py-4">
                      <p className="font-semibold text-[#1e1c1a] group-hover:text-[#c0593c] transition-colors">
                        {studio.name}
                      </p>
                      <p className="text-[11px] text-[#756f69]">{studio.location}</p>
                    </td>

                    <td className="py-4 font-mono text-[#756f69]">{studio.slug}</td>

                    <td className="py-4 text-[#1e1c1a]">
                      {studio.status === 'Ready' ? (
                        <span>{studio.bank}</span>
                      ) : (
                        <span className="text-[#756f69] italic">{studio.bank}</span>
                      )}
                    </td>

                    <td className="py-4 font-mono text-xs">
                      {studio.subaccountCode === 'None' ? (
                        <span className="text-[#756f69]">None</span>
                      ) : (
                        <span className="text-[#1e1c1a]">{studio.subaccountCode}</span>
                      )}
                    </td>

                    <td className="py-4 font-mono">
                      {studio.feeShare === '—' ? (
                        <span className="text-[#756f69]">—</span>
                      ) : (
                        <span className="text-[#c0593c] font-semibold">{studio.feeShare}</span>
                      )}
                    </td>

                    <td className="py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        {studio.status === 'Ready' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#edf5ef] text-[#528361]">
                            <span className="size-1.5 rounded-full bg-[#528361]" />
                            <span>Ready</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#fcf5e8] text-[#c0822e]">
                            <span className="size-1.5 rounded-full bg-[#c0822e]" />
                            <span>Action needed</span>
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          studio.verificationStatus === 'verified'
                            ? 'bg-[#edf5ef] text-[#528361]'
                            : studio.verificationStatus === 'rejected'
                              ? 'bg-[#fceeee] text-[#b54747]'
                              : 'bg-[#f4f0e9] text-[#756f69]'
                        }`}>
                          {verificationStatusLabels[studio.verificationStatus]}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 text-right">
                      <ArrowUpRight className="size-4 text-[#8c847c] group-hover:text-[#c0593c] transition-colors ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination */}
          <div className="mt-6 pt-4 border-t border-[#f0ece4] flex items-center justify-between text-xs text-[#756f69]">
            <span>Showing {filteredStudios.length} of {studios.length} studios</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM CALLOUT                                                            */}
        {/* ========================================================================= */}
        <div className="mt-6 p-4 rounded-2xl bg-[#f5ede3] border border-[#e8ded0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-[#e3d7c7] text-[#73583a] flex items-center justify-center shrink-0">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1e1c1a]">
                Good banking details make great settlements.
              </p>
              <p className="text-[11px] text-[#73583a]">
                Studios must complete bank verification before payouts can begin.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilterTab('pending')}
            className="text-xs font-medium text-[#c0593c] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Review pending studios</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SLIDE-OVER STUDIO DETAIL DRAWER (Artboard 05)                             */}
      {/* ========================================================================= */}
      {drawerOpen && selectedStudio && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={handleCloseDrawer}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-md bg-white border-l border-[#ded8cf] shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto z-10 custom-scrollbar">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-6 border-b border-[#f0ece4]">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#c0593c] font-bold">
                    STUDIO CONFIGURATION & BANKING
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#1e1c1a]">
                    {selectedStudio.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-[#756f69]">{selectedStudio.location}</span>
                    <span className="text-[#ded8cf]">•</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${selectedStudio.status === 'Ready' ? 'text-[#528361]' : 'text-[#c0822e]'}`}>
                      <span className={`size-1.5 rounded-full ${selectedStudio.status === 'Ready' ? 'bg-[#528361]' : 'bg-[#c0822e]'}`} />
                      <span>{selectedStudio.status === 'Ready' ? 'Payout details present' : 'Payout details incomplete'}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCloseDrawer}
                  className="p-1.5 rounded-xl border border-[#ded8cf] hover:bg-[#faf8f5] text-[#756f69] hover:text-[#1e1c1a]"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Owner Info Row */}
              <div className="mt-6 grid grid-cols-2 gap-4 pb-6 border-b border-[#f0ece4] text-xs">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#8c847c]">OWNER</p>
                  <p className="mt-1 font-semibold text-[#1e1c1a]">{selectedStudio.owner}</p>
                  <Link
                    href={selectedStudio.slug}
                    target="_blank"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[#c0593c] hover:underline font-mono"
                  >
                    <span>booka.app{selectedStudio.slug}</span>
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>

                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#8c847c]">CONTACT</p>
                  <p className="mt-1 text-[#756f69] leading-relaxed">{selectedStudio.contact}</p>
                </div>
              </div>

              {/* Lifetime Performance Card (Dark Charcoal Card) */}
              <div className="mt-6 p-5 rounded-2xl bg-[#1e1c1a] text-white">
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#a69f97] font-semibold">
                  LIFETIME PERFORMANCE
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[11px] text-[#a69f97]">Appointments</p>
                    <p className="mt-1 text-xl font-semibold font-mono text-white">
                      {selectedStudio.appointments}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#a69f97]">Gross volume</p>
                    <p className="mt-1 text-xl font-semibold font-mono text-white">
                      {formatNaira(selectedStudio.grossVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#a69f97]">Platform fee</p>
                    <p className="mt-1 text-xl font-semibold font-mono text-[#e5b882]">
                      {selectedStudio.platformFee}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Settlement Account */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1e1c1a]">Settlement account</h3>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-[#8c847c]">
                    POWERED BY PAYSTACK
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#f0ece4]">
                    <span className="text-[#756f69]">Subaccount code</span>
                    <span className="font-mono font-semibold text-[#1e1c1a]">
                      {selectedStudio.subaccountCode}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-[#f0ece4]">
                    <span className="text-[#756f69]">Settlement bank</span>
                    <span className="text-[#1e1c1a] font-medium">{selectedStudio.bank}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-[#f0ece4]">
                    <span className="text-[#756f69]">Account number</span>
                    <span className="font-mono text-[#1e1c1a]">{selectedStudio.accountNumber || 'Pending'}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-[#f0ece4]">
                    <span className="text-[#756f69]">Account name</span>
                    <span className="text-[#1e1c1a] font-medium">{selectedStudio.accountName || 'Pending'}</span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-[#756f69]">Verification</span>
                    <span className={`font-semibold flex items-center gap-1 ${selectedStudio.status === 'Ready' ? 'text-[#528361]' : 'text-[#c0822e]'}`}>
                      {selectedStudio.status === 'Ready' ? 'Details present' : 'Details incomplete'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Studio Operations */}
              <div className="mt-8 pt-6 border-t border-[#f0ece4] space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#1e1c1a]">Studio operations</h3>
                  <p className="mt-1 text-xs text-[#756f69]">Lifecycle and account verification controls.</p>
                </div>

                {actionError && (
                  <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{actionError}</p>
                )}

                <div className="rounded-xl border border-[#ded8cf] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold">
                        {selectedStudio.lifecycleStatus === 'active' ? 'Studio is active' : 'Studio is suspended'}
                      </p>
                      <p className="mt-1 text-[11px] text-[#756f69]">
                        {selectedStudio.lifecycleStatus === 'active'
                          ? 'Public booking activity remains available.'
                          : selectedStudio.suspensionReason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLifecycleAction()}
                      disabled={actionLoading}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                        selectedStudio.lifecycleStatus === 'active'
                          ? 'border border-red-200 bg-red-50 text-red-700'
                          : 'bg-[#1e1c1a] text-white'
                      } disabled:opacity-50`}
                    >
                      {selectedStudio.lifecycleStatus === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </div>
                  {selectedStudio.lifecycleStatus === 'active' && (
                    <label className="mt-3 block text-[11px] font-medium text-[#756f69]">
                      Suspension reason
                      <input
                        value={lifecycleReason}
                        onChange={(event) => setLifecycleReason(event.target.value)}
                        placeholder="Required when suspending"
                        className="mt-1 h-9 w-full rounded-lg border border-[#ded8cf] px-3 text-xs outline-none focus:border-[#c0593c]"
                      />
                    </label>
                  )}
                </div>

                <div className="rounded-xl border border-[#ded8cf] p-4">
                  <label className="block text-xs font-medium">
                    Verification status
                    <select
                      value={verificationStatus}
                      onChange={(event) => {
                        setVerificationStatus(event.target.value as Studio['verificationStatus'])
                        setVerificationSaved(false)
                      }}
                      className="mt-2 h-9 w-full rounded-lg border border-[#ded8cf] bg-white px-3 text-xs"
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under review</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <label className="mt-3 block text-xs font-medium">
                    Admin verification note
                    <textarea
                      value={verificationNote}
                      onChange={(event) => {
                        setVerificationNote(event.target.value)
                        setVerificationSaved(false)
                      }}
                      rows={2}
                      className="mt-2 w-full resize-none rounded-lg border border-[#ded8cf] px-3 py-2 text-xs outline-none focus:border-[#c0593c]"
                    />
                  </label>
                  {verificationSaved && (
                    <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-green-50 p-3 text-xs text-green-800">
                      Verification status saved.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleVerificationAction()}
                    disabled={actionLoading}
                    className="mt-3 rounded-lg bg-[#1e1c1a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save verification'}
                  </button>
                </div>
              </div>

              {/* Split Fee Configuration */}
              <div className="mt-8 pt-6 border-t border-[#f0ece4] space-y-4">
                <h3 className="text-sm font-semibold text-[#1e1c1a]">Split fee configuration</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#756f69] mb-1.5">Studio share</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editStudioShare}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setEditStudioShare(v)
                          setEditPlatformFee(100 - v)
                        }}
                        className="w-full h-11 px-3.5 pr-8 rounded-xl border border-[#ded8cf] bg-[#faf8f5] text-sm font-mono text-[#1e1c1a] focus:outline-none focus:border-[#c0593c]"
                      />
                      <span className="absolute right-3 top-3 text-xs text-[#756f69] font-mono">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#756f69] mb-1.5">Booka platform fee</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editPlatformFee}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setEditPlatformFee(v)
                          setEditStudioShare(100 - v)
                        }}
                        className="w-full h-11 px-3.5 pr-8 rounded-xl border border-[#ded8cf] bg-[#faf8f5] text-sm font-mono text-[#c0593c] font-semibold focus:outline-none focus:border-[#c0593c]"
                      />
                      <span className="absolute right-3 top-3 text-xs text-[#756f69] font-mono">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#756f69] mb-1.5">Bearer of Paystack charges</label>
                  <select
                    value={editBearer}
                    onChange={(e) => setEditBearer(e.target.value === 'account' ? 'account' : 'subaccount')}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#ded8cf] bg-[#faf8f5] text-xs text-[#1e1c1a] focus:outline-none focus:border-[#c0593c]"
                  >
                    <option value="subaccount">Subaccount (Owner)</option>
                    <option value="account">Booka Master Account</option>
                  </select>
                </div>

                {saveError && (
                  <p role="alert" className="text-xs text-red-700">{saveError}</p>
                )}
                  <p className="text-[11px] text-[#8c847c]">
                    These settings are saved for future payment-routing integration.
                  </p>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="pt-6 mt-6 border-t border-[#f0ece4] flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="px-4 py-2.5 rounded-xl border border-[#ded8cf] hover:bg-[#faf8f5] text-xs font-medium text-[#1e1c1a]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveDrawer}
                className="px-5 py-2.5 rounded-xl bg-[#c0593c] hover:bg-[#a84b31] text-white text-xs font-semibold shadow-sm transition-all"
              >
                {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
