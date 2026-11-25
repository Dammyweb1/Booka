'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { createSupabaseClient } from '@/lib/supabase'

type Step = 'request' | 'verify' | 'success'

export default function AdminResetPasswordPage() {
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [signOutWarning, setSignOutWarning] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  const sendRecoveryCode = async () => {
    const { error } = await createSupabaseClient().auth.resetPasswordForEmail(email.trim())
    if (error) throw error
    setCode('')
    setStep('verify')
    setResendCooldown(30)
  }

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsLoading(true)
    try {
      await sendRecoveryCode()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send the recovery email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (code.trim().length !== 6) {
      setErrorMessage('Enter the 6-digit recovery code from your email.')
      return
    }
    if (newPassword.length < 8) {
      setErrorMessage('Your new password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('The passwords do not match.')
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

      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        setSignOutWarning('Your password was updated, but this recovery session could not be ended automatically. Sign in again from the admin login page.')
      }
      setStep('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not verify the code or update your password.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isLoading) return
    setErrorMessage('')
    setIsLoading(true)
    try {
      await sendRecoveryCode()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not resend the recovery email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#faf8f5] text-[#1e1c1a]">
      <aside className="hidden w-[28%] shrink-0 flex-col justify-between bg-[#141f19] p-8 text-[#f8f5f0] lg:flex xl:p-10">
        <Logo light href="/admin/auth" />
        <div className="max-w-[300px]">
          <div className="mb-5 grid size-11 place-items-center rounded-xl bg-white/10 text-[#e5b882]">
            <ShieldCheck size={22} />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8ea396]">Admin account security</p>
          <h1 className="mt-3 text-4xl font-medium leading-tight tracking-tight">
            Secure access to your command center.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#9fb0a5]">
            Reset your admin password using the recovery code sent to your email.
          </p>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#8ea396]">Booka · Mission Control</p>
      </aside>

      <main className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo href="/admin/auth" />
          </div>
          <Link
            href="/admin/auth"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-[#756f69] transition hover:text-[#1e1c1a]"
          >
            <ArrowLeft size={15} />
            Admin sign in
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[420px] py-10">
          {step === 'success' ? (
            <div className="text-center">
              <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[#e7f2ea] text-[#528361]">
                <CheckCircle2 size={34} />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#528361]">Password updated</p>
              <h2 className="mt-2 text-3xl font-medium tracking-tight">You&apos;re all set.</h2>
              <p className="mt-3 text-sm leading-6 text-[#756f69]">
                Your admin password has been changed. Sign in again and complete your authenticator check.
              </p>
              {signOutWarning && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
                  {signOutWarning}
                </p>
              )}
              <Link
                href="/admin/auth"
                className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c0593c] text-sm font-medium text-white transition hover:bg-[#a84b31]"
              >
                Continue to admin sign in
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#c0593c]">
                <KeyRound size={14} />
                Admin password reset
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight">
                {step === 'request' ? 'Reset your password.' : 'Create a new password.'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#756f69]">
                {step === 'request'
                  ? 'Enter your admin email and we will send a recovery code.'
                  : `If an account exists for ${email}, enter the 6-digit code from the email and choose a new password.`}
              </p>

              {errorMessage && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              {step === 'request' ? (
                <form onSubmit={handleRequestReset} className="mt-7 space-y-4">
                  <label className="block text-xs font-medium text-[#1e1c1a]">
                    Admin email
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@company.com"
                      className="mt-2 h-11 w-full rounded-xl border border-[#ded8cf] bg-white px-3.5 text-sm text-[#1e1c1a] placeholder-[#a69f97] focus:border-[#c0593c] focus:outline-none focus:ring-1 focus:ring-[#c0593c]"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c0593c] text-sm font-medium text-white transition hover:bg-[#a84b31] disabled:opacity-50"
                  >
                    {isLoading ? 'Sending recovery code...' : 'Send recovery code'}
                    <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="mt-7 space-y-4">
                  <label className="block text-xs font-medium text-[#1e1c1a]">
                    6-digit recovery code
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="mt-2 h-11 w-full rounded-xl border border-[#ded8cf] bg-white px-3.5 text-center font-mono text-lg tracking-[0.3em] focus:border-[#c0593c] focus:outline-none focus:ring-1 focus:ring-[#c0593c]"
                    />
                  </label>
                  <label className="block text-xs font-medium text-[#1e1c1a]">
                    New password
                    <span className="relative mt-2 block">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="h-11 w-full rounded-xl border border-[#ded8cf] bg-white px-3.5 pr-11 text-sm focus:border-[#c0593c] focus:outline-none focus:ring-1 focus:ring-[#c0593c]"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c847c]"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>
                  <label className="block text-xs font-medium text-[#1e1c1a]">
                    Confirm new password
                    <span className="relative mt-2 block">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="h-11 w-full rounded-xl border border-[#ded8cf] bg-white px-3.5 pr-11 text-sm focus:border-[#c0593c] focus:outline-none focus:ring-1 focus:ring-[#c0593c]"
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c847c]"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c0593c] text-sm font-medium text-white transition hover:bg-[#a84b31] disabled:opacity-50"
                  >
                    {isLoading ? 'Updating password...' : 'Update password'}
                    <ArrowRight size={16} />
                  </button>
                  <div className="flex items-center justify-between text-xs text-[#756f69]">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage('')
                        setStep('request')
                      }}
                      className="font-medium hover:text-[#1e1c1a]"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || isLoading}
                      className="font-medium text-[#c0593c] hover:underline disabled:text-[#a69f97]"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#8c847c]">Booka Admin · Secure Access</p>
      </main>
    </div>
  )
}
