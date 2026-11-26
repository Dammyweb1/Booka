'use client'

import React, { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight, QrCode } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'
import { markAdminSessionActivity } from '@/lib/admin-session'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // 2FA / TOTP states
  const [twoFactorCode, setTwoFactorCode] = useState<string[]>([])
  const [awaiting2FA, setAwaiting2FA] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const codeInputs = useRef<Array<HTMLInputElement | null>>([])
  const isVerifying2FA = useRef(false)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Function to setup or challenge 2FA via Supabase TOTP
  const prepare2FA = async (client: ReturnType<typeof createSupabaseClient>, adminEmail: string, adminId: string) => {
    try {
      setQrCodeUrl(null)
      setFactorId(null)
      setChallengeId(null)

      const { data: factorsData } = await client.auth.mfa.listFactors()
      const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified')

      if (verifiedTotp) {
        const { data: challengeData, error: challengeErr } = await client.auth.mfa.challenge({
          factorId: verifiedTotp.id,
        })
        if (!challengeErr && challengeData) {
          setFactorId(verifiedTotp.id)
          setChallengeId(challengeData.id)
        }
        return
      }

      const { data: enrollData, error: enrollErr } = await client.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Booka Admin',
        friendlyName: adminEmail,
      })

      if (!enrollErr && enrollData?.totp) {
        const qrRaw = enrollData.totp.qr_code
        const qrUri = qrRaw.startsWith('data:')
          ? qrRaw
          : `data:image/svg+xml;utf-8,${encodeURIComponent(qrRaw)}`
        setQrCodeUrl(qrUri)
        setFactorId(enrollData.id)
      } else if (enrollErr) {
        throw enrollErr
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not prepare authenticator 2FA.')
    }
  }

  const verifyTwoFactorCode = async (code: string) => {
    if (isVerifying2FA.current) return
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('Please enter the 6-digit verification code.')
      return
    }
    if (!userId || !factorId) {
      setErrorMessage('Authenticator verification is not ready. Return to sign in and try again.')
      return
    }

    isVerifying2FA.current = true
    setIsLoading(true)
    setErrorMessage('')

    try {
      const supabase = createSupabaseClient()
      let activeChallengeId = challengeId

      if (!activeChallengeId) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId,
        })
        if (challengeError) throw challengeError
        activeChallengeId = challengeData.id
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: activeChallengeId,
        code,
      })
      if (verifyError) throw verifyError

      const { error: lastSeenError } = await supabase.rpc('admin_mark_last_seen')
      if (lastSeenError) throw lastSeenError
      markAdminSessionActivity()
      router.replace('/admin')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invalid 2FA code. Please check your authenticator app.')
      setTwoFactorCode([])
      codeInputs.current[0]?.focus()
    } finally {
      isVerifying2FA.current = false
      setIsLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    // Handle 2FA verification step
    if (awaiting2FA && userId) {
      await verifyTwoFactorCode(twoFactorCode.join(''))
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    try {
      const supabase = createSupabaseClient()

      // 1. Password authentication
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        setErrorMessage(signInError.message)
        setIsLoading(false)
        return
      }

      // 2. Verify platform admin clearance
      const { data: adminRecord, error: adminErr } = await supabase
        .from('platform_admins')
        .select('role, requires_2fa, is_active')
        .eq('id', signInData.user.id)
        .maybeSingle()

      if (adminErr || !adminRecord || !adminRecord.is_active) {
        setErrorMessage('Access denied. This account does not have platform admin privileges.')
        setIsLoading(false)
        await supabase.auth.signOut()
        return
      }

      if (!adminRecord.requires_2fa) {
        const { error: lastSeenError } = await supabase.rpc('admin_mark_last_seen')
        if (lastSeenError) throw lastSeenError
        markAdminSessionActivity()
        router.replace('/admin')
        return
      }

      await prepare2FA(supabase, email.trim(), signInData.user.id)
      setUserId(signInData.user.id)
      setAwaiting2FA(true)
      setIsLoading(false)
      return
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not reach server.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#faf8f5] text-[#1e1c1a] overflow-hidden">
      {/* LEFT DARK HERO PANEL */}
      <div className="hidden lg:flex w-[28%] xl:w-[26%] bg-[#141f19] text-[#f8f5f0] p-8 xl:p-10 flex-col justify-between shadow-2xl relative overflow-hidden shrink-0">
        {/* Top Header */}
        <div>
          {/* Logo & Category */}
          <div className="flex items-center justify-between">
            <Logo light href="/" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8ea396]">MISSION CONTROL</span>
          </div>
        </div>

        {/* Middle Content */}
        <div className="my-auto py-6">
          {/* Accent Dash */}
          <div className="h-1 w-9 rounded-full bg-[#d46b4f]" />

          {/* Editorial Headline */}
          <h1 className="mt-5 text-3xl xl:text-4xl font-medium tracking-tight text-white leading-[1.12]">
            Good business.<br />
            Beautifully<br />
            <span className="font-serif italic text-[#e5b882]">under control.</span>
          </h1>

          <p className="mt-3 text-xs xl:text-sm leading-relaxed text-[#9fb0a5] max-w-[300px]">
            The quiet confidence behind every booking, every studio, and every settlement.
          </p>
        </div>

        {/* Bottom Footer */}
        <div className="pt-5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono tracking-widest text-[#8ea396] uppercase">
          <span>BUILT FOR LAGOS.</span>
          <span>01 / 03</span>
        </div>
      </div>

      {/* RIGHT AUTH FORM */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto no-scrollbar">
        {/* Top Header (Mobile Logo) */}
        <div className="lg:hidden flex items-center justify-between mb-4">
          <Logo href="/" />
        </div>

        {/* Center Card Content */}
        <div className="w-full max-w-md mx-auto my-auto">
          {awaiting2FA ? (
            <div className="text-center">
              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#c0593c] font-bold flex items-center justify-center gap-1.5">
                <QrCode className="size-3.5" />
                AUTHENTICATOR 2FA
              </p>

              <h2 className="mt-2 text-3xl font-medium tracking-tight text-[#1e1c1a]">
                {qrCodeUrl ? 'Scan to set up authenticator.' : 'Enter verification code.'}
              </h2>

              {qrCodeUrl ? (
                <p className="mt-2 text-sm text-[#756f69]">
                  Scan this QR code once with Google Authenticator, 1Password, or Authy.
                </p>
              ) : (
                <p className="mt-2 text-sm text-[#756f69]">
                  Enter the 6-digit code from your authenticator app.
                </p>
              )}

              {errorMessage && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* QR setup is shown only for a first-time MFA enrollment */}
              {qrCodeUrl && (
                <div className="mt-5 p-4 rounded-2xl bg-transparent flex flex-col items-center text-center">
                  <div className="p-2.5 rounded-xl bg-transparent inline-flex items-center justify-center">
                    <img
                    src={qrCodeUrl}
                    alt="Authenticator 2FA QR Code"
                    className="size-36 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Verification Form */}
              <form onSubmit={handleAuth} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#1e1c1a] mb-1.5 text-center">
                    Enter 6-digit code from authenticator app
                  </label>
                  <div className="flex justify-center gap-2 mb-5" role="group" aria-label="6-digit verification code">
                    {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        codeInputs.current[index] = element
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      pattern="[0-9]*"
                      maxLength={1}
                      required
                      autoFocus={index === 0}
                      value={twoFactorCode[index] ?? ''}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const digit = e.target.value.replace(/\D/g, '').slice(-1)
                        const digits = [...twoFactorCode]
                        digits[index] = digit
                        setTwoFactorCode(digits)
                        setErrorMessage('')
                        if (digit && index < 5) codeInputs.current[index + 1]?.focus()
                        const code = digits.join('')
                        if (/^\d{6}$/.test(code)) void verifyTwoFactorCode(code)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
                          codeInputs.current[index - 1]?.focus()
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault()
                        const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                        if (!digits) return
                        setTwoFactorCode(Array.from({ length: 6 }, (_, index) => digits[index] ?? ''))
                        setErrorMessage('')
                        if (digits.length === 6) {
                          void verifyTwoFactorCode(digits)
                        } else {
                          codeInputs.current[Math.min(digits.length, 5)]?.focus()
                        }
                      }}
                      aria-label={`Digit ${index + 1}`}
                      className="w-[52px] h-14 rounded-xl border border-[#ded8cf] bg-white text-center text-xl font-mono text-[#1e1c1a] focus:outline-none focus:border-[#c0593c] focus:ring-1 focus:ring-[#c0593c]"
                    />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mx-auto w-[352px] max-w-full h-12 rounded-xl bg-[#c0593c] hover:bg-[#a84b31] disabled:opacity-50 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>{isLoading ? 'Verifying clearance...' : 'Verify & Continue'}</span>
                  <ArrowRight className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAwaiting2FA(false)
                    setTwoFactorCode([])
                    setErrorMessage('')
                    setQrCodeUrl(null)
                  }}
                  className="mx-auto block w-[352px] max-w-full py-2 text-center text-xs font-medium text-[#756f69] hover:text-[#1e1c1a] transition"
                >
                  ← Back to sign in
                </button>
              </form>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#c0593c] font-bold">
                YOUR PLATFORM, AT A GLANCE
              </p>

              <h2 className="mt-2 text-4xl font-medium tracking-tight text-[#1e1c1a]">
                Welcome back.
              </h2>

              <p className="mt-2 text-sm text-[#756f69]">
                Sign in to your Booka command center.
              </p>

              {errorMessage && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleAuth} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#1e1c1a] mb-1.5">Work email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 size-4 text-[#8c847c]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="adeshola.adedokun@sendsphere.co"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#ded8cf] bg-white text-sm text-[#1e1c1a] placeholder-[#a69f97] focus:outline-none focus:border-[#c0593c] focus:ring-1 focus:ring-[#c0593c]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#1e1c1a]">Password</label>
                    <Link href="/admin/reset-password" className="text-xs font-medium text-[#c0593c] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 size-4 text-[#8c847c]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#ded8cf] bg-white text-sm text-[#1e1c1a] placeholder-[#a69f97] focus:outline-none focus:border-[#c0593c] focus:ring-1 focus:ring-[#c0593c]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#8c847c] hover:text-[#1e1c1a]"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <p className="pt-1 text-xs text-[#756f69]">
                  Sign-in ends when this browser session closes or after 3 hours of inactivity.
                </p>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-[#c0593c] hover:bg-[#a84b31] disabled:opacity-50 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>{isLoading ? 'Verifying clearance...' : 'Continue with 2FA'}</span>
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
          )}

          {/* Security Sub-Notice */}
          <div className={`${awaiting2FA ? 'mx-auto w-[352px] max-w-full text-center' : ''} mt-6 flex items-center justify-center gap-1.5 text-xs text-[#756f69]`}>
            <ShieldCheck className="size-4 text-[#528361]" />
            <span>
              {'Protected access. Every session is logged.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
