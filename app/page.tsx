import Link from 'next/link'
import { ArrowRight, CalendarDays, Link2, Settings, Users } from 'lucide-react'
import { TopNav } from '@/components/navigation/top-nav'
import { Footer } from '@/components/navigation/footer'
import { HowItWorks } from '@/components/landing/how-it-works'
import { BusinessFeatures } from '@/components/landing/business-features'
import { LandingScrollAnimations } from '@/components/landing/landing-scroll-animations'
import { TypewriterHeading } from '@/components/landing/typewriter-heading'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8f5f0] text-[#1e1c1a]">
      <LandingScrollAnimations />
      <TopNav />

      <main className="mx-auto max-w-[1240px] px-6 pb-20 pt-8 lg:px-10 lg:pt-14">
        {/* Hero Section */}
        <section className="grid items-center gap-14 lg:grid-cols-[1.04fr_.96fr]">
          <div data-scroll-reveal>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#ded8cf] bg-white/70 px-3.5 py-2 text-xs font-medium text-[#756f69]">
              <span className="size-2 rounded-full bg-[#dd7658]" />
              Booking, made simpler for your business
            </div>

            <TypewriterHeading />

            <p className="mt-8 max-w-[500px] text-lg leading-8 text-[#756f69]">
              A simple booking page and backoffice for independent service businesses. Share your link with clients, manage appointments, and keep your services and client details organized.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center rounded-full bg-[#d46b4f] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(212,107,79,.22)] transition hover:-translate-y-0.5 hover:bg-[#c66046]"
              >
                Onboarding <ArrowRight className="ml-2 inline" size={16} />
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-[#cfc7bc] bg-transparent px-6 py-3.5 text-sm font-semibold text-[#3e3935] transition hover:bg-white"
              >
                Sign in to backoffice
              </Link>
            </div>
          </div>

          {/* Booking page and backoffice preview */}
          <div data-scroll-reveal className="relative min-h-[500px] overflow-hidden rounded-[34px] bg-[#e9ddd2] p-5 shadow-sm">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,.9),transparent_35%),linear-gradient(135deg,#edd9cd,#d9c0b2)]" />
            <div className="relative ml-auto flex max-w-[350px] flex-col gap-3 rounded-[22px] bg-[#fbfaf7]/90 p-5 shadow-[0_24px_60px_rgba(83,54,41,.15)] backdrop-blur">
              <div>
                <p className="text-xs font-semibold text-[#756f69]">Your Booka page</p>
                <p className="mt-1 text-sm font-semibold">A simple way for clients to book with you</p>
              </div>
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white p-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-[#eee7ff] text-[#7253cb]">
                  <Link2 size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold">Share your booking link</p>
                  <p className="text-xs text-[#8c847c]">Add it to your social profile</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-[#e9e2d9] pt-3 text-center">
                <div className="rounded-xl bg-white p-2">
                  <CalendarDays className="mx-auto text-[#d46b4f]" size={17} />
                  <p className="mt-1 text-[10px] font-medium">Appointments</p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <Users className="mx-auto text-[#528361]" size={17} />
                  <p className="mt-1 text-[10px] font-medium">Clients</p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <Settings className="mx-auto text-[#7253cb]" size={17} />
                  <p className="mt-1 text-[10px] font-medium">Services</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-9 left-7 max-w-[230px] rounded-[22px] bg-[#1e1c1a] p-5 text-white shadow-xl">
              <p className="text-xs text-white/60">Your business, more organized</p>
              <p className="mt-2 text-2xl font-medium leading-7 tracking-[-.04em]">
                Spend less time coordinating appointments.
              </p>
            </div>
            <div className="absolute bottom-20 right-10 size-28 rounded-full border-[18px] border-[#d46b4f]/80" />
          </div>
        </section>

        {/* Business tools */}
        <section id="services" className="mt-32">
          <div data-scroll-reveal className="mb-8">
            <p className="eyebrow">Your business, in one place</p>
            <h2 className="section-title">
              Set up your services.<br />
              <em>Stay on top of bookings.</em>
            </h2>
            <p className="mt-4 max-w-[560px] text-base leading-7 text-[#756f69]">
              Create a booking page for your business, share it directly with clients, and manage appointments from your backoffice.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Your services',
                detail: 'Set up the services, durations, and prices clients can book.',
                icon: Settings,
                color: 'bg-[#eee7ff] text-[#7253cb]',
              },
              {
                title: 'Your appointments',
                detail: 'Review and update bookings from your business dashboard.',
                icon: CalendarDays,
                color: 'bg-[#ffe7df] text-[#d46b4f]',
              },
              {
                title: 'Your clients',
                detail: 'Keep client contact details together with your workspace.',
                icon: Users,
                color: 'bg-[#e7f2ea] text-[#528361]',
              },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  data-scroll-reveal
                  className="flex items-center gap-4 rounded-[24px] border border-[#e4ddd5] bg-[#fbfaf7] p-5 text-left shadow-xs"
                >
                  <div className={`grid size-14 place-items-center rounded-2xl ${feature.color}`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e1c1a]">{feature.title}</p>
                    <p className="mt-1 text-sm text-[#8c847c]">{feature.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* Fullwidth About Booka Section */}
      <section id="about" className="w-full bg-[#efe8df] py-20 lg:py-28 border-y border-[#ded5c7]">
        <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div data-scroll-reveal>
              <p className="eyebrow text-[#d46b4f]">About Booka</p>
              <h2 className="section-title max-w-[620px]">
                Your business deserves a <em>beautiful backoffice.</em>
              </h2>
              <p className="mt-5 max-w-[560px] text-base leading-8 text-[#6b645c]">
                Booka helps independent service businesses share a direct booking page and manage appointments, services, and client details from one backoffice.
              </p>
            </div>
            <Link
              data-scroll-reveal
              href="/onboarding"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#1e1c1a] px-7 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-[#d46b4f] hover:-translate-y-0.5"
            >
              Set up your business <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works GSAP Section */}
      <HowItWorks />

      <BusinessFeatures />

      <Footer />
    </div>
  )
}
