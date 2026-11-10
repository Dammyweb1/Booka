'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { createSupabaseClient } from '@/lib/supabase'

export default function WelcomePage() {
  const [businessName, setBusinessName] = useState<string>('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    const loadBusinessName = async () => {
      try {
        const { data, error } = await createSupabaseClient().auth.getUser()
        if (error) throw error
        if (active && typeof data.user?.user_metadata.business_name === 'string') {
          setBusinessName(data.user.user_metadata.business_name)
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load your account details.')
      }
    }
    void loadBusinessName()
    return () => { active = false }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1e1c1a] text-[#1e1c1a]">
      {/* Blurred Dashboard Silhouette Background */}
      <div className="pointer-events-none absolute inset-0 bg-[#f8f5f0]/80 blur-[3px]">
        <div className="mx-auto max-w-[1180px] px-8 py-8 opacity-40">
          <div className="flex items-center justify-between border-b border-[#d9d0c7] pb-6">
            <Logo />
            <div className="h-9 w-32 rounded-full bg-[#d46b4f]" />
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <div className="h-32 rounded-[24px] border border-[#e4ddd5] bg-white" />
            <div className="h-32 rounded-[24px] border border-[#e4ddd5] bg-white" />
            <div className="h-32 rounded-[24px] border border-[#e4ddd5] bg-white" />
          </div>
          <div className="mt-6 h-72 rounded-[24px] border border-[#e4ddd5] bg-white" />
        </div>
      </div>

      <div className="absolute inset-0 bg-black/40" />

      {/* Centered Modal Artboard */}
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-[480px] rounded-[32px] border border-[#e4ddd5] bg-[#fbfaf7] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,.35)] md:p-12"
        >
          <div className="mx-auto mb-6 flex items-center justify-between text-left">
            <span className="eyebrow text-[#8c847c]">BOOKA / OWNER PORTAL</span>
            <Link
              href="/dashboard"
              aria-label="Continue to dashboard"
              title="Continue to dashboard"
              className="rounded-full p-2 text-[#8c847c] transition hover:bg-[#f1ece5]"
            >
              <X size={18} />
            </Link>
          </div>

          <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[#e7f2ea] text-[#528361]">
            <Check size={28} />
          </div>

          <p className="eyebrow mt-6 text-[#528361]">You&apos;re officially in</p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-.06em]">Welcome to Booka.</h1>
          <p className="mx-auto mt-4 max-w-[380px] leading-7 text-[#756f69]">
            {loadError
              ? loadError
              : businessName
              ? `Your business profile for "${businessName}" has been successfully set up.`
              : 'Your business profile has been successfully set up.'}{' '}
            You are ready to manage appointments, customize services, and grow your clientele.
          </p>
        </div>
      </div>
    </div>
  )
}
