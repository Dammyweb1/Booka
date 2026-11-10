'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

export function TopNav() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300 ease-in-out',
        isScrolled
          ? 'bg-[#f8f5f0]/90 backdrop-blur-md shadow-[0_8px_30px_rgba(30,28,26,0.06)] border-b border-[#e4ddd5]/80 py-3.5'
          : 'bg-transparent py-5'
      )}
    >
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 lg:px-10">
        <Logo />

        {/* Re-arranged Navbar Items */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#756f69] md:flex">
          <Link href="/#about" className="transition hover:text-[#1e1c1a]">
            About Booka
          </Link>
          <Link href="/#how" className="transition hover:text-[#1e1c1a]">
            How it works
          </Link>
          <Link href="/#features" className="transition hover:text-[#1e1c1a]">
            Features
          </Link>
          <Link href="/faq" className="transition hover:text-[#1e1c1a]">
            Faq
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2.5 text-sm font-medium text-[#3e3935] hover:bg-white md:block transition"
          >
            Log in
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1e1c1a] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(30,28,26,.12)] transition hover:-translate-y-0.5 hover:bg-[#d46b4f]"
          >
            Get started <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  )
}
