'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { createSupabaseClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const supa = createSupabaseClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setIsLoading(true)
    try {
      const { error } = await supa.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        console.error('Login error:', error.message)
        setLoginError(
          error.message === 'Invalid login credentials'
            ? 'Supabase could not verify this email and password. Check the exact email and password used during registration, confirm the account exists in this project under Authentication → Users, and complete email confirmation if required. If you still cannot sign in, use password recovery.'
            : error.message
        )
        return
      }
      router.push('/dashboard')
    } catch (error) {
      console.error('Login request failed:', error)
      setLoginError('Could not reach Supabase. Check your internet connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8f5f0] text-[#1e1c1a]">
      {/* Editorial Left Hero */}
      <div className="hidden w-[42%] flex-col justify-between bg-[#e9ddd2] p-10 md:flex">
        <Logo />
        <div className="max-w-[380px]">
          <p className="eyebrow text-[#d46b4f]">Your business, in motion</p>
          <h1 className="mt-3 text-5xl font-medium leading-[.96] tracking-[-.07em]">
            Welcome back,<br />
            <em className="whitespace-nowrap font-serif not-italic text-[#d46b4f]">business owner.</em>
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#756f69]">
            Sign in to check today&apos;s appointments, review revenue, and manage availability.
          </p>
        </div>
        <p className="text-xs text-[#8c847c]">Booka Backoffice · Secure Access</p>
      </div>

      {/* Login Form Right */}
      <main className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14">
        <div className="flex items-center justify-between">
          <div className="md:hidden">
            <Logo />
          </div>
          <span className="ml-auto hidden text-sm text-[#8c847c] md:block">
            New to Booka?{' '}
            <Link href="/onboarding" className="font-semibold text-[#1e1c1a] hover:underline">
              Create account
            </Link>
          </span>
        </div>

        <div className="mx-auto w-full max-w-[420px] py-10">
          <p className="eyebrow text-[#d46b4f]">Owner Portal</p>
          <h2 className="mt-3 text-4xl font-medium tracking-[-.06em]">Good to see you.</h2>
          <p className="mt-2 text-sm text-[#8c847c]">Log in to manage your bookings and clients.</p>

          {loginError && (
            <p role="alert" className="mt-5 rounded-xl bg-[#fff0eb] px-4 py-3 text-sm leading-6 text-[#a9432e]">
              {loginError}
            </p>
          )}

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-5">
            <label className="field">
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
              />
            </label>

            <label className="relative field">
              Password
              <span className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pr-11"
                />
                <button
                  type="button"
                  aria-label="Toggle password view"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c847c]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <div className="flex justify-end">
              <Link href="/reset-password" className="text-xs font-semibold text-[#d46b4f] hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#1e1c1a] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#d46b4f]"
            >
              {isLoading ? 'Signing in...' : 'Log in to Backoffice'} <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-[#a59d94]">
            By continuing, you agree to Booka&apos;s Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="text-center text-xs text-[#8c847c]">
          Booka Service Platform · 2026
        </div>
      </main>
    </div>
  )
}
