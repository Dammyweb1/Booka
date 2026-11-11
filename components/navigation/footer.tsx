import Link from 'next/link'
import { Logo } from '@/components/brand/logo'

export function Footer() {
  return (
    <footer className="w-full border-t border-[#ded8cf] bg-[#1e1c1a] py-14 text-white">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 lg:px-10 lg:grid-cols-[1.2fr_.8fr_.8fr_.8fr] items-start">
        <div>
          <Logo light />
          <p className="mt-5 max-w-[320px] text-sm leading-7 text-white/60">
            A simple booking page and backoffice for independent service businesses.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <span className="size-2 rounded-full bg-[#e89b80]" />
            <span className="text-xs uppercase tracking-[0.18em] text-white/50">Made for better days</span>
          </div>
        </div>
        <div>
          <p className="eyebrow text-[#e89b80]">For your business</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
            <Link href="/#how" className="transition-colors hover:text-white">How it works</Link>
            <Link href="/#features" className="transition-colors hover:text-white">Features</Link>
            <Link href="/faq" className="transition-colors hover:text-white">Faq</Link>
            <Link href="/onboarding" className="w-fit transition-colors hover:text-white">Onboarding</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow text-[#e89b80]">Contact us</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
            <a href="tel:+2348000026652" className="transition-colors hover:text-white">
              +234 800 002 6652
            </a>
            <a href="mailto:booka-co@gmail.com" className="transition-colors hover:text-white">
              booka-co@gmail.com
            </a>
            <p className="text-xs leading-5 text-white/45">
              Lagos, Nigeria
            </p>
          </div>
        </div>
        <div>
          <p className="eyebrow text-[#e89b80]">Get started</p>
          <p className="mt-4 text-sm leading-6 text-white/60">
            Set up your business profile and create a page clients can use to book with you.
          </p>
          <Link href="/onboarding" className="mt-5 inline-flex rounded-full bg-[#d46b4f] px-5 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
            Onboarding
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1240px] flex-col gap-3 border-t border-white/10 px-6 lg:px-10 pt-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Booka. Make time for more.</span>
        <span>Beautifully booked.</span>
      </div>
    </footer>
  )
}
