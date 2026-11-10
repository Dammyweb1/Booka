'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BriefcaseBusiness, ListChecks, Link2, CalendarDays, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      number: '01',
      title: 'Set up your business',
      copy: 'Create your business profile and add the details clients need before booking.',
      icon: BriefcaseBusiness,
      color: 'bg-[#eee7ff] text-[#7253cb]',
      highlight: 'Business profile',
    },
    {
      number: '02',
      title: 'Add your services',
      copy: 'List the services you offer, with their durations and prices.',
      icon: ListChecks,
      color: 'bg-[#ffe7df] text-[#d46b4f]',
      highlight: 'Your service menu',
    },
    {
      number: '03',
      title: 'Share your booking page',
      copy: 'Send your direct Booka link to clients or add it to your social profiles.',
      icon: Link2,
      color: 'bg-[#e7f2ea] text-[#528361]',
      highlight: 'Direct booking link',
    },
    {
      number: '04',
      title: 'Manage appointments',
      copy: 'Review bookings and keep your appointments and client details organized in the backoffice.',
      icon: CalendarDays,
      color: 'bg-[#f3e9da] text-[#a47328]',
      highlight: 'Business backoffice',
    },
  ]

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActiveStep(0)
      return
    }

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      // 1. Animated wave flow line drawing
      gsap.fromTo(
        '.flow-path',
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          duration: 2.2,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: section,
            start: 'top 70%',
            once: true,
          },
        }
      )

      // 2. Cascading flow from Step 1 to Step 4
      const pulseLoop = gsap.timeline({ repeat: -1, repeatDelay: 1.5, paused: true })
      steps.forEach((_, idx) => {
        pulseLoop.to(`.step-badge-${idx}`, {
          scale: 1.1,
          duration: 0.35,
          yoyo: true,
          repeat: 1,
          ease: 'power1.inOut',
          onStart: () => setActiveStep(idx),
        })
      })

      const masterTl = gsap.timeline({
        delay: 0.3,
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
          once: true,
        },
        onComplete: () => pulseLoop.play(),
      })

      steps.forEach((_, idx) => {
        masterTl
          .fromTo(
            `.step-card-${idx}`,
            { autoAlpha: 0, y: 32, scale: 0.95 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              ease: 'power3.out',
              onStart: () => setActiveStep(idx),
            },
            idx === 0 ? 0 : '-=0.25'
          )
          .fromTo(
            `.step-badge-${idx}`,
            { scale: 0.4, rotation: -20, boxShadow: '0 0 0 rgba(212,107,79,0)' },
            {
              scale: 1,
              rotation: 0,
              duration: 0.6,
              ease: 'back.out(2)',
            },
            '<0.1'
          )
          .to(
            `.step-pulse-${idx}`,
            {
              scale: 1.5,
              opacity: 0,
              duration: 0.8,
              ease: 'power2.out',
            },
            '<0.2'
          )
      })

    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section id="how" ref={sectionRef} className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div data-scroll-reveal className="max-w-[620px]">
          <p className="eyebrow text-[#d46b4f]">How it works</p>
          <h2 className="mt-4 text-5xl font-medium leading-[.95] tracking-[-.07em] md:text-6xl">
            Good plans, <em className="font-serif not-italic text-[#d46b4f]">made simple.</em>
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#756f69]">
            Set up your booking page, share it with clients, and keep your appointment workflow organized in one place.
          </p>
        </div>

        {/* Live Active Step Pill Indicator */}
        <div data-scroll-reveal className="flex items-center gap-2 rounded-full border border-[#ded8cf] bg-[#fbfaf7] px-4 py-2 text-xs font-semibold shadow-sm">
          <span className="size-2 rounded-full bg-[#d46b4f] animate-ping" />
          <span className="text-[#8c847c]">Active flow:</span>
          <span className="text-[#1e1c1a]">Step {activeStep + 1} of 4</span>
        </div>
      </div>

      <div className="relative mt-20 grid gap-10 md:grid-cols-4 md:gap-6">
        {/* Animated Connecting SVG Wave */}
        <svg
          className="flow-line pointer-events-none absolute left-[5%] right-[5%] top-7 hidden h-20 w-[90%] overflow-visible md:block"
          viewBox="0 0 100 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Background muted track */}
          <path
            className="fill-none stroke-[#ded8cf]/60 stroke-[2]"
            d="M 0 28 C 8 2, 25 2, 33 28 C 41 54, 58 54, 66 28 C 74 2, 92 2, 100 28"
          />
          {/* Animated GSAP drawn line */}
          <path
            className="flow-path fill-none stroke-[#d46b4f] stroke-[3]"
            d="M 0 28 C 8 2, 25 2, 33 28 C 41 54, 58 54, 66 28 C 74 2, 92 2, 100 28"
            pathLength="1"
            strokeDasharray="1"
          />
        </svg>

        {steps.map((step, idx) => {
          const Icon = step.icon
          const isCurrent = activeStep === idx

          return (
            <article
              key={step.number}
              onClick={() => setActiveStep(idx)}
              className={cn(
                `step-card-${idx} group relative rounded-[28px] border bg-[#fbfaf7] p-6 transition-all duration-300 cursor-pointer`,
                'hover:-translate-y-1 hover:shadow-xl',
                isCurrent
                  ? 'border-[#d46b4f] shadow-[0_16px_36px_rgba(212,107,79,0.12)] bg-[#fffcf9]'
                  : 'border-[#e4ddd5] hover:border-[#caa08f]'
              )}
            >
              {/* Top Row: Animated Number Badge + Category Icon */}
              <div className="flex items-center justify-between">
                <div className="relative">
                  {/* GSAP Radial Pulse Ring */}
                  <span
                    className={cn(
                      `step-pulse-${idx} absolute inset-0 rounded-full`,
                      isCurrent ? 'bg-[#d46b4f]/30' : 'bg-transparent'
                    )}
                  />
                  <div
                    className={cn(
                      `step-badge-${idx} relative grid size-14 place-items-center rounded-full text-sm font-semibold transition-colors duration-300`,
                      isCurrent
                        ? 'bg-[#d46b4f] text-white shadow-[0_8px_20px_rgba(212,107,79,0.35)]'
                        : 'bg-[#1e1c1a] text-white shadow-[0_8px_18px_rgba(30,28,26,0.15)] group-hover:bg-[#d46b4f]'
                    )}
                  >
                    {step.number}
                  </div>
                </div>

                <div className={cn('grid size-11 place-items-center rounded-2xl transition-transform group-hover:scale-105', step.color)}>
                  <Icon size={20} />
                </div>
              </div>

              {/* Step Info */}
              <div className="mt-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8c847c]">
                  {step.highlight}
                </span>
                <h3 className="mt-1.5 text-2xl font-semibold tracking-[-.04em] text-[#1e1c1a]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#756f69]">
                  {step.copy}
                </p>
              </div>

              {/* Progress Flow Notch Indicator */}
              <div className="mt-6 flex items-center gap-1.5 border-t border-[#eee7df] pt-4 text-xs font-semibold">
                <span className={cn('transition-colors', isCurrent ? 'text-[#d46b4f]' : 'text-[#8c847c]')}>
                  Phase {step.number}
                </span>
                <ArrowRight
                  size={13}
                  className={cn(
                    'transition-transform',
                    isCurrent ? 'text-[#d46b4f] translate-x-1' : 'text-[#a59d94]'
                  )}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
