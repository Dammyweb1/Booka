'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Settings2, ShieldAlert } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

interface PlatformSettings {
  default_platform_fee_percent: number
  booking_deposit_percent: number
  maintenance_mode: boolean
  updated_at: string
  updated_by_email: string | null
}

export default function AdminPlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [platformFee, setPlatformFee] = useState('')
  const [depositPercent, setDepositPercent] = useState('')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let active = true

    const loadSettings = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase.rpc('admin_get_platform_settings')
        if (error) throw error
        const current = ((data ?? []) as PlatformSettings[])[0]
        if (!current) throw new Error('Platform settings have not been initialized.')

        if (active) {
          setSettings(current)
          setPlatformFee(String(current.default_platform_fee_percent))
          setDepositPercent(String(current.booking_deposit_percent))
          setMaintenanceMode(current.maintenance_mode)
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load platform settings.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadSettings()
    return () => {
      active = false
    }
  }, [])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextPlatformFee = Number(platformFee)
    const nextDepositPercent = Number(depositPercent)

    if (
      !Number.isFinite(nextPlatformFee) ||
      nextPlatformFee < 0 ||
      nextPlatformFee > 100 ||
      !Number.isFinite(nextDepositPercent) ||
      nextDepositPercent < 1 ||
      nextDepositPercent > 100
    ) {
      setErrorMessage('Enter a platform fee from 0–100% and a deposit from 1–100%.')
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.rpc('admin_update_platform_settings', {
        p_default_platform_fee_percent: nextPlatformFee,
        p_booking_deposit_percent: nextDepositPercent,
        p_maintenance_mode: maintenanceMode,
      })
      if (error) throw error

      const saved = ((data ?? []) as PlatformSettings[])[0]
      if (!saved) throw new Error('Settings were not returned after saving.')
      setSettings(saved)
      setPlatformFee(String(saved.default_platform_fee_percent))
      setDepositPercent(String(saved.booking_deposit_percent))
      setMaintenanceMode(saved.maintenance_mode)
      setSuccessMessage('Platform settings saved.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save platform settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const resetChanges = () => {
    if (!settings) return
    setPlatformFee(String(settings.default_platform_fee_percent))
    setDepositPercent(String(settings.booking_deposit_percent))
    setMaintenanceMode(settings.maintenance_mode)
    setErrorMessage('')
    setSuccessMessage('')
  }

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <div className="border-b border-[#ded8cf]/60 pb-6">
        <div className="flex items-center gap-2 text-xs text-[#756f69]">
          <span>Governance</span><span>/</span><span className="font-semibold text-[#1e1c1a]">Platform settings</span>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Platform settings</h1>
            <p className="mt-1 text-sm text-[#756f69]">Control checkout defaults and platform availability.</p>
          </div>
          <Link href="/admin/audit-log" className="inline-flex items-center gap-1 self-start text-xs font-medium text-[#c0593c] hover:underline sm:self-auto">
            Review audit log <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Check className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section className="space-y-6 rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex items-start gap-3 border-b border-[#f0ece4] pb-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ede3] text-[#c0593c]">
              <Settings2 className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Checkout defaults</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#756f69]">
                These rules are used for new signups and future booking checkouts. Existing studio fee overrides remain unchanged.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="platform-fee" className="block text-xs font-medium text-[#1e1c1a]">
                Default Booka platform fee
              </label>
              <div className="relative mt-2">
                <input
                  id="platform-fee"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  disabled={isLoading || !settings}
                  value={platformFee}
                  onChange={(event) => {
                    setPlatformFee(event.target.value)
                    setSuccessMessage('')
                  }}
                  className="h-12 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3.5 pr-9 font-mono text-sm outline-none focus:border-[#c0593c] disabled:opacity-60"
                  placeholder={isLoading ? 'Loading…' : ''}
                />
                <span className="absolute right-3 top-3.5 text-xs text-[#756f69]">%</span>
              </div>
              <p className="mt-2 text-[11px] text-[#756f69]">
                New businesses receive {platformFee && Number.isFinite(Number(platformFee)) ? (100 - Number(platformFee)).toFixed(1) : '—'}% studio share.
              </p>
            </div>

            <div>
              <label htmlFor="deposit-percent" className="block text-xs font-medium text-[#1e1c1a]">
                Booking deposit
              </label>
              <div className="relative mt-2">
                <input
                  id="deposit-percent"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  required
                  disabled={isLoading || !settings}
                  value={depositPercent}
                  onChange={(event) => {
                    setDepositPercent(event.target.value)
                    setSuccessMessage('')
                  }}
                  className="h-12 w-full rounded-xl border border-[#ded8cf] bg-[#faf8f5] px-3.5 pr-9 font-mono text-sm outline-none focus:border-[#c0593c] disabled:opacity-60"
                  placeholder={isLoading ? 'Loading…' : ''}
                />
                <span className="absolute right-3 top-3.5 text-xs text-[#756f69]">%</span>
              </div>
              <p className="mt-2 text-[11px] text-[#756f69]">
                Applied to new Paystack checkouts. In-flight payments keep their original rate.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#ded8cf] bg-[#faf8f5] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Pause new booking payments</p>
                <p className="mt-1 text-xs leading-relaxed text-[#756f69]">
                  Visitors can browse booking pages, but checkout initialization will be paused platform-wide.
                </p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-3">
                <span className="text-xs font-medium">{maintenanceMode ? 'Paused' : 'Running'}</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Pause new booking payments"
                  disabled={isLoading || !settings}
                  checked={maintenanceMode}
                  onChange={(event) => {
                    setMaintenanceMode(event.target.checked)
                    setSuccessMessage('')
                  }}
                  className="size-5 accent-[#c0593c]"
                />
              </label>
            </div>
            {maintenanceMode && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                Checkout is paused until you turn this off and save changes.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#f0ece4] pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetChanges} disabled={isLoading || isSaving || !settings} className="rounded-xl border border-[#ded8cf] px-4 py-2.5 text-xs font-medium hover:bg-[#faf8f5] disabled:opacity-50">
              Discard changes
            </button>
            <button type="submit" disabled={isLoading || isSaving || !settings} className="rounded-xl bg-[#c0593c] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#a84b31] disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </section>

        <aside className="rounded-2xl bg-[#141f19] p-5 text-white shadow-sm sm:p-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8ea396]">Change control</p>
          <h2 className="mt-3 text-lg font-semibold">Every update is recorded.</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#b8c5bd]">
            Platform setting changes include the previous and saved values in the audit history.
          </p>
          {settings && (
            <div className="mt-6 border-t border-white/10 pt-4 text-xs">
              <p className="text-[#8ea396]">Last updated</p>
              <p className="mt-1">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(settings.updated_at))}</p>
              <p className="mt-1 break-all text-[#b8c5bd]">{settings.updated_by_email || 'System default'}</p>
            </div>
          )}
          <Link href="/admin/audit-log" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#e5b882] hover:underline">
            Open audit history <ArrowUpRight className="size-3.5" />
          </Link>
        </aside>
      </form>
    </div>
  )
}
