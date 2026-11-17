'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { createSupabaseClient } from '@/lib/supabase'

export default function ConfirmationExpiredPage() {
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleResend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')
    setIsSending(true)

    try {
      const { error } = await createSupabaseClient().auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: new URL('/login', window.location.origin).toString(),
        },
      })
      if (error) throw error
      setMessage('If this address has an unconfirmed Booka account, a new link has been sent.')
    } catch (error) {
      console.error('Signup confirmation resend failed:', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not resend the confirmation email. Please try again later.'
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5f0] px-6 py-12 text-[#1e1c1a]">
      <section className="w-full max-w-md rounded-3xl border border-[#e4ddd5] bg-white p-8 shadow-sm">
        <Logo />
        <h1 className="mt-10 text-3xl font-medium tracking-[-.05em]">Confirmation link expired</h1>
        <p className="mt-3 text-sm leading-6 text-[#756f69]">
          Signup confirmation links are valid for 15 minutes and can only be used once. Enter your email to request a
          new link.
        </p>

        <form onSubmit={handleResend} className="mt-7 space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            Business email address
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#ded8cf] bg-[#fbfaf7] px-4 py-3 outline-none focus:border-[#d46b4f]"
            />
          </label>

          {message && <p role="status" className="text-sm text-[#528361]">{message}</p>}
          {errorMessage && <p role="alert" className="text-sm text-[#a9432e]">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isSending}
            className="w-full rounded-xl bg-[#1e1c1a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#35312e] disabled:opacity-60"
          >
            {isSending ? 'Sending...' : 'Send a new confirmation link'}
          </button>
        </form>

        <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-[#756f69] hover:underline">
          Back to login
        </Link>
      </section>
    </main>
  )
}
