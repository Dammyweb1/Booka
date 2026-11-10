'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { createSupabaseClient } from '@/lib/supabase'

type Step = 'request' | 'verify' | 'success'

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    document.documentElement.classList.add('hide-page-scrollbar')
    return () => document.documentElement.classList.remove('hide-page-scrollbar')
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  const sendRecoveryEmail = async () => {
    const { error } = await createSupabaseClient().auth.resetPasswordForEmail(email.trim())
    if (error) throw error
    setCode('')
    setStep('verify')
    setResendCooldown(30)
  }

  // Step 1: Send a Supabase recovery email.
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid business email address.')
      return
    }

    setIsLoading(true)
    try {
      await sendRecoveryEmail()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send the recovery email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify the Supabase recovery OTP before changing the password.
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (code.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit recovery code.')
      return
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createSupabaseClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      })
      if (verifyError) throw verifyError

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setStep('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not verify the code or update your password.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    setErrorMessage('')
    setIsLoading(true)
    try {
      await sendRecoveryEmail()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not resend the recovery email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isPasswordValid = newPassword.length >= 8
  const doPasswordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  return (
    <div className="flex min-h-screen bg-[#f8f5f0] text-[#1e1c1a]">
      {/* Editorial Left Hero */}
      <div className="hidden w-[42%] flex-col justify-between bg-[#e9ddd2] p-10 md:flex">
        <Logo />
        <div className="max-w-[390px]">
          <p className="eyebrow text-[#d46b4f]">Account Security</p>
          <h1 className="mt-3 text-5xl font-medium leading-[.96] tracking-[-.07em]">
            Back to your{' '}
            <em className="whitespace-nowrap font-serif not-italic text-[#d46b4f]">studio.</em>
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#756f69]">
            Reset your credentials securely and get back to managing your schedule in seconds.
          </p>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-[#ded5c7] bg-white/60 p-4 backdrop-blur-xs">
            <div className="grid size-10 place-items-center rounded-xl bg-[#e7f2ea] text-[#528361]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1e1c1a]">Encrypted Recovery</p>
              <p className="text-[11px] text-[#8c847c]">End-to-end token verification for studio owners</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#8c847c]">Booka Backoffice · Secure Account Recovery</p>
      </div>

      {/* Main Right Form Area */}
      <main className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14">
        <div className="flex items-center justify-between">
          <div className="md:hidden">
            <Logo />
          </div>
          <Link
            href="/login"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[#756f69] transition hover:text-[#1e1c1a]"
          >
            <ArrowLeft size={15} /> Back to login
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[420px] py-10">
          {/* STEP 1: REQUEST EMAIL */}
          {step === 'request' && (
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f3e7df] px-3 py-1 text-xs font-semibold text-[#8a422f]">
                <KeyRound size={13} className="text-[#d46b4f]" />
                Password Reset
              </div>
              <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-[-.06em]">
                Forgot your password?
              </h2>
              <p className="mt-2 text-sm text-[#8c847c] leading-relaxed">
                Enter your registered business email address and Supabase will send a password recovery email.
              </p>

              {errorMessage && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleRequestReset} className="mt-8 flex flex-col gap-5">
                <label className="field">
                  Business email address
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.com"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#1e1c1a] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#d46b4f] disabled:opacity-70"
                >
                  {isLoading ? 'Sending recovery code...' : 'Send Recovery Code'}{' '}
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-[#8c847c]">
                Remembered your password?{' '}
                <Link href="/login" className="font-semibold text-[#d46b4f] hover:underline">
                  Log in here
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFY CODE & NEW PASSWORD */}
          {step === 'verify' && (
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f2ea] px-3 py-1 text-xs font-semibold text-[#528361]">
                <Check size={13} />
                Code Dispatched
              </div>
              <h2 className="mt-3 text-3xl sm:text-4xl font-medium tracking-[-.06em]">
                Create new password
              </h2>
              <p className="mt-2 text-sm text-[#8c847c]">
                If an account exists for <strong className="text-[#1e1c1a]">{email || 'your email'}</strong>, Supabase accepted the recovery request. Enter the 6-digit code from the email below.{' '}
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs font-semibold text-[#d46b4f] hover:underline ml-1"
                >
                  Edit email
                </button>
              </p>
              {errorMessage && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="mt-6 flex flex-col gap-4">
                <label className="field">
                  6-Digit Recovery Code
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter code from email"
                    className="w-full tracking-widest font-mono text-center text-lg font-semibold"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="relative field min-w-0">
                    New Password
                    <span className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        aria-label="Toggle password view"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c847c] hover:text-[#1e1c1a]"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>

                  <label className="relative field min-w-0">
                    Confirm Password
                    <span className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        aria-label="Toggle password view"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c847c] hover:text-[#1e1c1a]"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>
                </div>

                {/* Password Criteria Badges */}
                <div className="flex flex-col gap-1.5 text-xs text-[#8c847c] pt-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-3.5 rounded-full grid place-items-center text-[10px] ${
                        isPasswordValid ? 'bg-[#e7f2ea] text-[#528361]' : 'bg-[#eee7e0] text-[#a59d94]'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={isPasswordValid ? 'text-[#528361] font-medium' : ''}>
                      Minimum 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-3.5 rounded-full grid place-items-center text-[10px] ${
                        doPasswordsMatch ? 'bg-[#e7f2ea] text-[#528361]' : 'bg-[#eee7e0] text-[#a59d94]'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={doPasswordsMatch ? 'text-[#528361] font-medium' : ''}>
                      Passwords match
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-[#1e1c1a] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#d46b4f] disabled:opacity-70"
                >
                  {isLoading ? 'Verifying code...' : 'Update Password'}{' '}
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-xs text-[#8c847c]">
                <span>Didn&apos;t get the code?</span>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="inline-flex items-center gap-1 font-semibold text-[#d46b4f] hover:underline disabled:text-[#a59d94]"
                >
                  <RotateCcw size={12} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#e7f2ea] text-[#528361] shadow-inner mb-5">
                <CheckCircle2 size={36} />
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f2ea] px-3.5 py-1 text-xs font-semibold text-[#528361] mb-3">
                Security Cleared
              </div>
              <h2 className="text-3xl font-medium tracking-[-.05em] text-[#1e1c1a]">
                Password updated!
              </h2>
              <p className="mt-3 text-sm text-[#756f69] leading-relaxed max-w-[340px] mx-auto">
                Your password has been securely reset. Sign in to your Booka business backoffice with your new password.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e1c1a] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#d46b4f]"
                >
                  Sign in to Backoffice <ArrowRight size={16} />
                </Link>
                <Link
                  href="/"
                  className="text-xs font-semibold text-[#8c847c] hover:text-[#1e1c1a] py-2"
                >
                  Return to homepage
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-[#8c847c]">
          Booka Service Platform · 2026
        </div>
      </main>
    </div>
  )
}
