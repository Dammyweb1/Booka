'use client'

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  LayoutDashboard,
  Mail,
  Menu,
  Scissors,
  Search,
  Settings,
  Sparkles,
  Store,
  UserRound,
  Users,
  Wand2,
  X,
} from 'lucide-react'
import { useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function Section({
  eyebrow,
  title,
  children,
  dark = false,
  accent = false,
  className = '',
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
  dark?: boolean
  accent?: boolean
  className?: string
}) {
  return (
    <section
      className={`rounded-[28px] p-6 md:p-8 ${
        dark
          ? 'bg-[#1e1c1a] text-white'
          : accent
            ? 'border border-[#e4ddd5] bg-[#f3e7df]'
            : 'border border-[#e4ddd5] bg-[#fbfaf7]'
      } ${className}`}
    >
      <p className={`eyebrow ${dark ? 'text-[#efb49f]' : accent ? 'text-[#9d4f39]' : ''}`}>
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-2xl font-semibold tracking-[-.04em] ${dark ? 'text-white' : ''}`}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Swatch({ name, hex, token, className = '' }: { name: string; hex: string; token?: string; className?: string }) {
  return (
    <div className={className}>
      <div
        className="h-20 rounded-2xl border border-black/5"
        style={{ background: hex }}
      />
      <p className="mt-2.5 text-xs font-semibold">{name}</p>
      <p className="mt-0.5 font-mono text-[10px] text-[#8c847c]">{hex}</p>
      {token && <p className="font-mono text-[10px] text-[#b0a69c]">{token}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<'foundations' | 'components' | 'patterns'>('foundations')

  return (
    <main className="min-h-screen bg-[#f8f5f0] text-[#1e1c1a]">
      {/* ---- Header ---- */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 lg:px-10">
        <div>
          <p className="eyebrow text-[#d46b4f]">Booka / Design system</p>
          <h1 className="mt-3 max-w-[640px] text-5xl font-medium tracking-[-.07em]">
            Every colour, every word,{' '}
            <em className="font-serif not-italic text-[#d46b4f]">every detail.</em>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#756f69]">
            The complete visual language behind Booka — tokens, type scale, component
            patterns, and interaction states, all in one living reference.
          </p>
        </div>
        <a
          href="/"
          className="hidden items-center gap-2 rounded-full border border-[#e4ddd5] bg-[#fbfaf7] px-4 py-2.5 text-sm font-semibold md:flex"
        >
          <ArrowLeft size={16} data-icon="inline-start" />
          Back to artboards
        </a>
      </header>

      {/* ---- Tab nav ---- */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex gap-1 rounded-full border border-[#e4ddd5] bg-[#fbfaf7] p-1 w-fit text-sm font-semibold">
          {(['foundations', 'components', 'patterns'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2.5 capitalize transition ${
                activeTab === tab
                  ? 'bg-[#1e1c1a] text-white'
                  : 'text-[#8c847c] hover:text-[#1e1c1a]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Content ---- */}
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-8 lg:px-10">
        {activeTab === 'foundations' && <FoundationsTab />}
        {activeTab === 'components' && <ComponentsTab />}
        {activeTab === 'patterns' && <PatternsTab />}
      </div>
    </main>
  )
}

/* ================================================================== */
/*  TAB 1 — FOUNDATIONS                                               */
/* ================================================================== */

function FoundationsTab() {
  return (
    <div className="grid gap-6">
      {/* ---- Brand & core palette ---- */}
      <Section eyebrow="Foundations / Color" title="Brand & core palette">
        <p className="mt-2 text-sm text-[#8c847c]">
          The five anchor colours that define Booka&apos;s visual identity.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Swatch name="Brand Coral" hex="#D46B4F" token="--brand" />
          <Swatch name="Ink / Espresso" hex="#1E1C1A" token="--foreground" />
          <Swatch name="Canvas" hex="#F8F5F0" token="--background" />
          <Swatch name="Success Green" hex="#528361" token="--success" />
          <Swatch name="Plum Accent" hex="#7253CB" token="--accent-plum" />
        </div>
      </Section>

      {/* ---- Surfaces & backgrounds ---- */}
      <Section eyebrow="Foundations / Surfaces" title="Surfaces & backgrounds">
        <p className="mt-2 text-sm text-[#8c847c]">
          Layered surface tones create depth without harsh borders. Each maps to a specific elevation role.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Swatch name="Canvas" hex="#F8F5F0" token="--background" />
          <Swatch name="Surface" hex="#FBFAF7" token="--surface" />
          <Swatch name="Surface muted" hex="#F1ECE5" token="--surface-muted" />
          <Swatch name="Dashboard bg" hex="#F3EFE9" />
          <Swatch name="Warm bg alt" hex="#F6F1EA" />
          <Swatch name="Card white" hex="#FFFDF9" />
          <Swatch name="Artboard — Discover" hex="#E9DDD2" />
          <Swatch name="Artboard — Register" hex="#EFE7DC" />
          <Swatch name="Artboard — Confirm" hex="#F3E7DF" />
          <Swatch name="Artboard — Manage" hex="#E8E2D9" />
          <Swatch name="Artboard — Book" hex="#E5EEE8" />
          <Swatch name="Onboarding hero" hex="#E9DDD2" />
        </div>
      </Section>

      {/* ---- Brand extended ---- */}
      <Section eyebrow="Foundations / Color" title="Brand coral — full spectrum">
        <p className="mt-2 text-sm text-[#8c847c]">
          The brand coral palette extends from soft washes to dark text tones.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Swatch name="Coral 100" hex="#FFF8F5" />
          <Swatch name="Coral 200" hex="#F4D9CE" token="--brand-soft approx" />
          <Swatch name="Brand soft" hex="#F3E7DF" token="--brand-soft" />
          <Swatch name="Warm peach" hex="#E89B80" />
          <Swatch name="Light salmon" hex="#EFB49F" />
          <Swatch name="Coral 500" hex="#DD7658" />
          <Swatch name="Brand" hex="#D46B4F" token="--brand" />
          <Swatch name="Brand dark" hex="#C66046" />
          <Swatch name="Dark coral" hex="#9E503B" />
          <Swatch name="Brand text" hex="#9D4F39" />
          <Swatch name="Blush bg" hex="#F0DED4" />
          <Swatch name="Warm chip" hex="#F2C6B5" />
        </div>
      </Section>

      {/* ---- Success / green ---- */}
      <Section eyebrow="Foundations / Color" title="Success & growth">
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
          <Swatch name="Success soft" hex="#E7F2EA" token="--success-soft" />
          <Swatch name="Green wash" hex="#E6F3EB" />
          <Swatch name="Mint bg" hex="#D7E6DA" />
          <Swatch name="Success" hex="#528361" token="--success" />
          <Swatch name="Success strong" hex="#25804A" />
          <Swatch name="Health badge" hex="#4E7D5D" />
          <Swatch name="Growth muted" hex="#4D8060" />
          <Swatch name="Paid label" hex="#55806E" />
        </div>
      </Section>

      {/* ---- Plum accent ---- */}
      <Section eyebrow="Foundations / Color" title="Plum accent">
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
          <Swatch name="Plum soft" hex="#EEE7FF" token="--accent-plum-soft" />
          <Swatch name="Lavender panel" hex="#E7DDF5" />
          <Swatch name="Plum" hex="#7253CB" token="--accent-plum" />
          <Swatch name="Avatar lilac" hex="#C9B9DA" />
        </div>
      </Section>

      {/* ---- Neutrals — text ---- */}
      <Section eyebrow="Foundations / Color" title="Neutral text scale">
        <p className="mt-2 text-sm text-[#8c847c]">
          Six precisely graded grays from body text to ultra-subtle labels.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Swatch name="Ink" hex="#1E1C1A" token="--foreground" />
          <Swatch name="Dark secondary" hex="#3E3935" />
          <Swatch name="Body muted" hex="#756F69" token="--text-muted" />
          <Swatch name="Subtle" hex="#8C847C" token="--text-subtle" />
          <Swatch name="Light muted" hex="#A59D94" />
          <Swatch name="Soft label" hex="#B0A69C" />
        </div>
      </Section>

      {/* ---- Neutrals — borders ---- */}
      <Section eyebrow="Foundations / Color" title="Borders & dividers">
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
          <Swatch name="Border" hex="#E4DDD5" token="--border" />
          <Swatch name="Border input" hex="#DED8CF" />
          <Swatch name="Border strong" hex="#CFC7BC" token="--border-strong" />
          <Swatch name="Border warm" hex="#CAA08F" />
          <Swatch name="Divider" hex="#EEE7DF" />
        </div>
      </Section>

      {/* ---- Semantic / status ---- */}
      <Section eyebrow="Foundations / Color" title="Status & semantic">
        <p className="mt-2 text-sm text-[#8c847c]">
          Colours used for appointment statuses, payment states, and system messages.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-[#e7f2ea] p-4 text-center">
            <p className="text-sm font-semibold text-[#528361]">Confirmed / Paid</p>
            <p className="mt-1 font-mono text-[10px] text-[#528361]">#528361 on #E7F2EA</p>
          </div>
          <div className="rounded-2xl bg-[#fff0d7] p-4 text-center">
            <p className="text-sm font-semibold text-[#a47328]">Pending</p>
            <p className="mt-1 font-mono text-[10px] text-[#a47328]">#A47328 on #FFF0D7</p>
          </div>
          <div className="rounded-2xl bg-[#ffe7df] p-4 text-center">
            <p className="text-sm font-semibold text-[#d46b4f]">Attention</p>
            <p className="mt-1 font-mono text-[10px] text-[#d46b4f]">#D46B4F on #FFE7DF</p>
          </div>
          <div className="rounded-2xl bg-[#1e1c1a] p-4 text-center">
            <p className="text-sm font-semibold text-[#e89b80]">Live indicator</p>
            <p className="mt-1 font-mono text-[10px] text-[#e89b80]">#E89B80 on #1E1C1A</p>
          </div>
        </div>
      </Section>

      {/* ---- Avatars ---- */}
      <Section eyebrow="Foundations / Color" title="Avatar palette">
        <p className="mt-2 text-sm text-[#8c847c]">
          Warm, distinct tones assigned to user avatar backgrounds.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          {[
            ['Terracotta', '#D9B9A4'],
            ['Sage', '#B6C7AD'],
            ['Lilac', '#C9B9DA'],
            ['Blush', '#F0DED4'],
            ['Mint', '#D7E6DA'],
            ['Warm clay', '#E7D7CF'],
          ].map(([name, hex]) => (
            <div key={hex} className="text-center">
              <div
                className="mx-auto grid size-12 place-items-center rounded-full text-xs font-bold text-white"
                style={{ background: hex }}
              >
                AB
              </div>
              <p className="mt-2 text-xs font-semibold">{name}</p>
              <p className="font-mono text-[10px] text-[#8c847c]">{hex}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Shadows & radius ---- */}
      <Section eyebrow="Foundations / Elevation" title="Shadows & radii">
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-[#e4ddd5] bg-white p-6 shadow-[0_18px_40px_rgba(30,28,26,.08)]">
            <p className="text-sm font-semibold">Card shadow</p>
            <p className="mt-1 font-mono text-[10px] text-[#8c847c]">--shadow-card</p>
            <p className="mt-1 text-[10px] text-[#b0a69c]">0 18px 40px rgba(30,28,26,.08)</p>
          </div>
          <div className="rounded-[24px] border border-[#e4ddd5] bg-white p-6 shadow-[0_24px_80px_rgba(30,28,26,.18)]">
            <p className="text-sm font-semibold">Float shadow</p>
            <p className="mt-1 font-mono text-[10px] text-[#8c847c]">--shadow-float</p>
            <p className="mt-1 text-[10px] text-[#b0a69c]">0 24px 80px rgba(30,28,26,.18)</p>
          </div>
          <div className="rounded-[24px] border border-[#e4ddd5] bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold">Elevated UI</p>
            <p className="mt-1 font-mono text-[10px] text-[#8c847c]">shadow-xl (Tailwind)</p>
            <p className="mt-1 text-[10px] text-[#b0a69c]">Dropdowns, notifications</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['12px', 'rounded-xl', 'Inputs, buttons'],
            ['14px', 'rounded-[14px]', 'Field inputs'],
            ['22px', 'rounded-[22px]', 'Stat cards'],
            ['28px', 'rounded-[28px]', 'Dashboard panels'],
          ].map(([size, token, usage]) => (
            <div key={size} className="text-center">
              <div
                className={`mx-auto h-16 w-24 border-2 border-[#d46b4f] bg-[#f3e7df] ${token}`}
              />
              <p className="mt-2 text-xs font-semibold">{size}</p>
              <p className="text-[10px] text-[#8c847c]">{usage}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Typography ---- */}
      <Section dark eyebrow="Foundations / Typography" title="Type families">
        <p className="mt-2 text-sm text-white/55">
          Two typefaces with complementary roles. Fraunces for editorial warmth and personality.
          DM Sans for clarity and interface precision.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#efb49f]">Display / Headlines</p>
            <p className="mt-4 font-serif text-5xl tracking-[-.07em]">Make time for you.</p>
            <p className="mt-4 text-xs text-white/40">
              Fraunces · Variable · Google Fonts<br />
              Used for: h1–h6, editorial display, serif italic accents
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#efb49f]">Interface / Body</p>
            <p className="mt-4 text-2xl font-semibold">Your next appointment is ready.</p>
            <p className="mt-4 text-xs text-white/40">
              DM Sans · Variable · Google Fonts<br />
              Used for: body, labels, buttons, inputs, navigation
            </p>
          </div>
        </div>
      </Section>

      {/* ---- Type scale ---- */}
      <Section eyebrow="Foundations / Typography" title="Full type scale">
        <p className="mt-2 text-sm text-[#8c847c]">
          Every size used across the prototype, from hero headlines to micro labels.
        </p>
        <div className="mt-6 space-y-0 divide-y divide-[#e4ddd5]">
          {[
            { label: 'Hero', className: 'text-6xl font-medium tracking-[-.075em]', specimen: 'Make time for you.', meta: 'clamp(3.5rem,7vw,6.4rem) · 500 · -0.075em' },
            { label: 'Display', className: 'text-5xl font-medium tracking-[-.07em]', specimen: 'Build your place on Booka.', meta: 'text-5xl · 500 · -0.07em' },
            { label: 'Section', className: 'text-4xl font-medium tracking-[-.06em]', specimen: 'Good to see you.', meta: 'text-4xl · 500 · -0.06em' },
            { label: 'Heading L', className: 'text-3xl font-semibold tracking-[-.06em]', specimen: 'Your backoffice is ready.', meta: 'text-3xl · 600 · -0.06em' },
            { label: 'Heading M', className: 'text-2xl font-semibold tracking-[-.05em]', specimen: 'Bookings & paid sessions', meta: 'text-2xl · 600 · -0.05em' },
            { label: 'Heading S', className: 'text-xl font-semibold tracking-[-.04em]', specimen: 'Today\'s schedule', meta: 'text-xl · 600 · -0.04em' },
            { label: 'Body L', className: 'text-lg', specimen: 'Booka brings your favorite barbers, spas, and hair stylists into one calm, simple place.', meta: 'text-lg · 400' },
            { label: 'Body', className: 'text-base', specimen: 'The visual language behind the booking journey: warm, editorial, and clear.', meta: 'text-base · 400' },
            { label: 'UI / Button', className: 'text-sm font-semibold', specimen: 'Find your next appointment', meta: 'text-sm · 600' },
            { label: 'Caption', className: 'text-xs text-[#8c847c]', specimen: 'Owner workspace · Growth plan', meta: 'text-xs · 400' },
            { label: 'Eyebrow', className: 'eyebrow', specimen: 'OPERATIONS / TODAY', meta: '10px · 700 · 0.14em · uppercase' },
            { label: 'Micro', className: 'text-[10px] font-semibold', specimen: 'CONFIRMED', meta: '10px · 600–700 (badges)' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-24 shrink-0 text-xs font-semibold text-[#d46b4f]">
                {item.label}
              </span>
              <p className={item.className}>{item.specimen}</p>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-[#b0a69c]">
                {item.meta}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Font weights ---- */}
      <Section eyebrow="Foundations / Typography" title="Font weights">
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            ['Regular', 'font-normal', '400'],
            ['Medium', 'font-medium', '500'],
            ['Semibold', 'font-semibold', '600'],
            ['Bold', 'font-bold', '700'],
          ].map(([name, cls, weight]) => (
            <div key={weight} className="rounded-2xl border border-[#e4ddd5] bg-white p-5">
              <p className={`text-2xl ${cls}`}>Aa Bb Cc</p>
              <p className="mt-2 text-xs font-semibold">{name}</p>
              <p className="font-mono text-[10px] text-[#8c847c]">{cls} · {weight}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Letter spacing ---- */}
      <Section eyebrow="Foundations / Typography" title="Letter spacing">
        <div className="mt-6 space-y-0 divide-y divide-[#e4ddd5]">
          {[
            ['-0.075em', 'Hero headlines', 'tracking-[-.075em]'],
            ['-0.07em', 'Section titles', 'tracking-[-.07em]'],
            ['-0.06em', 'Form headings / subheads', 'tracking-[-.06em]'],
            ['-0.05em', 'Card headings / values', 'tracking-[-.05em]'],
            ['-0.04em', 'Dashboard headings', 'tracking-[-.04em]'],
            ['+0.14em', 'CSS .eyebrow class', 'tracking-[0.14em]'],
            ['+0.18em', 'Inline eyebrow labels', 'tracking-[0.18em]'],
            ['+0.20em', 'Sidebar nav labels', 'tracking-[.2em]'],
          ].map(([value, usage, token]) => (
            <div key={value} className="flex items-baseline gap-6 py-3">
              <span className="w-20 shrink-0 font-mono text-sm font-semibold">{value}</span>
              <span className="text-sm text-[#756f69]">{usage}</span>
              <span className="ml-auto font-mono text-[10px] text-[#b0a69c]">{token}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Spacing ---- */}
      <Section eyebrow="Foundations / Spacing" title="Spacing & layout">
        <p className="mt-2 text-sm text-[#8c847c]">
          Key spacing values used consistently throughout the interface.
        </p>
        <div className="mt-6 space-y-3">
          {[
            ['Page max-width', '1240px', 'max-w-[1240px]', 'Primary content container'],
            ['Page padding', '24–40px', 'px-6 lg:px-10', 'Horizontal page gutters'],
            ['Section gap', '20px', 'gap-5 / mt-5', 'Between dashboard sections'],
            ['Card padding', '24–32px', 'p-6 md:p-8', 'Interior card spacing'],
            ['Grid gap', '16–20px', 'gap-4 / gap-5', 'Between grid items'],
            ['Input padding', '14px 16px', 'py-3.5 px-4', 'Inside form fields'],
          ].map(([label, value, token, note]) => (
            <div key={label} className="flex items-baseline gap-4 rounded-xl bg-[#f1ece5] px-4 py-3">
              <span className="w-36 shrink-0 text-sm font-semibold">{label}</span>
              <span className="font-mono text-sm text-[#d46b4f]">{value}</span>
              <span className="font-mono text-[10px] text-[#8c847c]">{token}</span>
              <span className="ml-auto text-xs text-[#b0a69c]">{note}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ================================================================== */
/*  TAB 2 — COMPONENTS                                                */
/* ================================================================== */

function ComponentsTab() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="grid gap-6">
      {/* ---- Buttons ---- */}
      <Section eyebrow="Components / Actions" title="Buttons">
        <p className="mt-2 text-sm text-[#8c847c]">
          Four button variants used across the platform.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="rounded-full bg-[#d46b4f] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(212,107,79,.22)] transition hover:-translate-y-0.5">
            Primary brand <ArrowRight className="ml-2 inline" size={15} />
          </button>
          <button className="rounded-full bg-[#1e1c1a] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#d46b4f]">
            Primary dark <ArrowRight className="ml-2 inline" size={15} />
          </button>
          <button className="rounded-full border border-[#cfc7bc] bg-transparent px-6 py-3.5 text-sm font-semibold text-[#3e3935]">
            Secondary outline
          </button>
          <button className="text-sm font-semibold text-[#d46b4f]">
            Text link <ArrowRight className="ml-1 inline" size={14} />
          </button>
        </div>
        <div className="mt-6 rounded-2xl bg-[#1e1c1a] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#efb49f]">On dark surfaces</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="rounded-full bg-[#d46b4f] px-5 py-3 text-sm font-semibold text-white">
              Brand on dark
            </button>
            <button className="rounded-full bg-[#e89b80] px-5 py-3 text-sm font-semibold text-[#1e1c1a]">
              Warm accent
            </button>
            <button className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
              Ghost on dark <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
        </div>
      </Section>

      {/* ---- Inputs ---- */}
      <Section eyebrow="Components / Forms" title="Input fields">
        <p className="mt-2 text-sm text-[#8c847c]">
          The <code className="font-mono text-[#d46b4f]">.field</code> class applies to all form
          labels, with a consistent border-radius and focus ring.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="field">
            Business name
            <input placeholder="e.g. The Good Room" />
          </label>
          <label className="field">
            Email address
            <input type="email" placeholder="hello@yourplace.com" />
          </label>
          <label className="relative field">
            Password
            <span className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                className="w-full pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c847c]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <label className="field">
            Business address <span className="font-normal text-[#b0a69c]">(optional)</span>
            <input placeholder="14 Allen Avenue, Lagos" />
          </label>
        </div>
        <div className="mt-6 rounded-2xl bg-[#1e1c1a] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#efb49f]">Search input — dark surface</p>
          <div className="relative mt-4">
            <Search className="absolute left-4 top-3.5 text-white/40" size={17} />
            <input
              className="w-full rounded-full border border-white/10 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/40"
              placeholder="Search places or services"
            />
          </div>
        </div>
      </Section>

      {/* ---- Stat cards ---- */}
      <Section eyebrow="Components / Data" title="KPI stat cards">
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Net revenue', '₦1.24m', '↑ 24.8% vs last month'],
            ['Paid bookings', '184', '↑ 18.2% this month'],
            ['Returning clients', '68%', '↑ 6.4% retention'],
            ['Open slots', '27', 'Across 4 services'],
          ].map(([label, value, change]) => (
            <div key={label} className="rounded-[22px] border border-[#e4ddd5] bg-[#fbfaf7] p-5">
              <p className="text-xs text-[#8c847c]">{label}</p>
              <p className="mt-3 text-3xl font-medium tracking-[-.06em]">{value}</p>
              <p className="mt-2 text-xs font-medium text-[#528361]">{change}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Badges & status ---- */}
      <Section eyebrow="Components / Feedback" title="Badges & status pills">
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#e7f2ea] px-2.5 py-1 text-[10px] font-bold uppercase text-[#528361]">
            Confirmed
          </span>
          <span className="rounded-full bg-[#e7f2ea] px-2.5 py-1 text-[10px] font-bold uppercase text-[#528361]">
            Paid
          </span>
          <span className="rounded-full bg-[#fff0d7] px-2.5 py-1 text-[10px] font-bold uppercase text-[#a47328]">
            Pending
          </span>
          <span className="rounded-full bg-[#e6f1e8] px-3 py-1 text-xs font-semibold text-[#4e7d5d]">
            All systems healthy
          </span>
          <span className="rounded-full bg-[#e7f2ea] px-2.5 py-1 text-[10px] font-bold text-[#528361]">
            LIVE
          </span>
          <span className="rounded-full bg-[#f0ded4] px-2 py-1 text-[10px] font-semibold text-[#9e503b]">
            1 new
          </span>
          <span className="rounded-full bg-[#d46b4f] px-2 py-0.5 text-[10px] text-white">
            8
          </span>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#e7f2ea] p-4 text-sm text-[#528361]">
          <Check size={18} /> Success states stay calm and reassuring.
        </div>
      </Section>

      {/* ---- Service cards ---- */}
      <Section eyebrow="Components / Cards" title="Service cards">
        <p className="mt-2 text-sm text-[#8c847c]">
          Service cards appear in onboarding selection, landing page, and booking directory.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { name: 'Barbing', detail: 'Sharp fades & clean cuts', icon: Scissors, color: 'bg-[#eee7ff]', iconColor: 'text-[#7253cb]' },
            { name: 'Spa', detail: 'Slow down & feel good', icon: Sparkles, color: 'bg-[#ffe7df]', iconColor: 'text-[#d46b4f]' },
            { name: 'Hair dressing', detail: 'Your look, your way', icon: UserRound, color: 'bg-[#e7f2ea]', iconColor: 'text-[#528361]' },
          ].map(({ name, detail, icon: Icon, color, iconColor }) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-[24px] border border-[#e4ddd5] bg-[#fbfaf7] p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`grid size-14 place-items-center rounded-2xl ${color} ${iconColor}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="mt-1 text-sm text-[#8c847c]">{detail}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-[#a59d94]" />
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Avatars ---- */}
      <Section eyebrow="Components / Identity" title="Avatars & initials">
        <p className="mt-2 text-sm text-[#8c847c]">
          Three sizes used for user representation.
        </p>
        <div className="mt-6 flex flex-wrap items-end gap-6">
          {/* Small — inline/sidebar */}
          <div className="text-center">
            <div className="avatar mx-auto bg-[#d9b9a4]">A</div>
            <p className="mt-2 text-[10px] font-semibold text-[#8c847c]">Small · 30px</p>
            <p className="text-[10px] text-[#b0a69c]">.avatar class</p>
          </div>
          {/* Medium — schedule rows */}
          <div className="text-center">
            <div className="mx-auto grid size-10 place-items-center rounded-full bg-[#f0ded4] text-xs font-semibold text-[#9e503b]">
              AO
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[#8c847c]">Medium · 40px</p>
            <p className="text-[10px] text-[#b0a69c]">Appointment rows</p>
          </div>
          {/* Large — hero brand avatar */}
          <div className="text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e7f2ea] text-[#528361]">
              <Check size={25} />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[#8c847c]">Large · 56px</p>
            <p className="text-[10px] text-[#b0a69c]">Success / confirmation</p>
          </div>
          {/* Stacked */}
          <div className="text-center">
            <div className="mx-auto flex -space-x-2">
              <div className="avatar bg-[#d9b9a4]">A</div>
              <div className="avatar bg-[#b6c7ad]">K</div>
              <div className="avatar bg-[#c9b9da]">M</div>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[#8c847c]">Stacked</p>
            <p className="text-[10px] text-[#b0a69c]">Social proof</p>
          </div>
          {/* Profile button */}
          <div className="text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#e4ddd5] bg-[#fbfaf7] py-1.5 pl-1.5 pr-3">
              <span className="grid size-9 place-items-center rounded-full bg-[#d46b4f] text-xs font-semibold text-white">
                AC
              </span>
              <span className="text-left">
                <span className="block text-xs font-semibold">Amara Cole</span>
                <span className="block text-[10px] text-[#998f85]">Owner</span>
              </span>
              <ChevronRight className="size-4 text-[#998f85]" />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[#8c847c]">Profile pill</p>
          </div>
        </div>
      </Section>

      {/* ---- Nav items ---- */}
      <Section eyebrow="Components / Navigation" title="Sidebar navigation">
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Light sidebar */}
          <div className="rounded-2xl border border-[#e4ddd5] bg-[#fbfaf7] p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8c847c]">Light sidebar</p>
            <div className="flex flex-col gap-2">
              <div className="nav-item active"><LayoutDashboard size={17} /> Overview</div>
              <div className="nav-item"><CalendarDays size={17} /> Appointments</div>
              <div className="nav-item"><Users size={17} /> Clients</div>
              <div className="nav-item"><BarChart3 size={17} /> Analytics</div>
              <div className="nav-item"><Settings size={17} /> Settings</div>
            </div>
          </div>
          {/* Dark sidebar */}
          <div className="rounded-2xl bg-[#1e1c1a] p-4 text-white">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-white/30">Dark sidebar</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 rounded-xl bg-[#f3efe9] px-3 py-3 text-sm font-semibold text-[#1e1c1a]">
                <LayoutDashboard size={17} /> Overview
              </div>
              <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/55">
                <CalendarDays size={17} /> Appointments
                <span className="ml-auto rounded-full bg-[#d46b4f] px-2 py-0.5 text-[10px] text-white">8</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/55">
                <Users size={17} /> Clients
              </div>
              <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/55">
                <BarChart3 size={17} /> Insights
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---- Notification & bell ---- */}
      <Section eyebrow="Components / Feedback" title="Notifications">
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Bell button */}
          <div>
            <p className="mb-3 text-xs font-semibold text-[#8c847c]">Bell trigger with unread dot</p>
            <div className="relative w-fit">
              <button className="relative grid size-11 place-items-center rounded-full border border-[#e4ddd5] bg-[#fbfaf7] text-[#1e1c1a]">
                <Bell size={18} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#d46b4f] ring-2 ring-[#fbfaf7]" />
              </button>
            </div>
          </div>
          {/* Notification card */}
          <div className="w-80 rounded-2xl border border-[#e4ddd5] bg-[#fbfaf7] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Notifications</p>
              <span className="rounded-full bg-[#f0ded4] px-2 py-1 text-[10px] font-semibold text-[#9e503b]">1 new</span>
            </div>
            <div className="mt-4 flex gap-3 rounded-xl bg-[#f7eee8] p-3 text-left">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d46b4f] text-white">
                <CalendarDays size={15} />
              </span>
              <span>
                <span className="block text-sm font-semibold">New appointment request</span>
                <span className="mt-1 block text-xs leading-5 text-[#817970]">
                  Nia Johnson booked a deep tissue spa session for tomorrow at 11:00.
                </span>
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* ---- Progress indicators ---- */}
      <Section eyebrow="Components / Navigation" title="Progress indicators">
        <p className="mt-2 text-sm text-[#8c847c]">
          Two progress styles used in the onboarding flow.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Bar variant */}
          <div>
            <p className="mb-3 text-xs font-semibold text-[#8c847c]">Progress bars</p>
            <div className="flex gap-2">
              <span className="h-1.5 w-16 rounded-full bg-[#d46b4f]" />
              <span className="h-1.5 w-16 rounded-full bg-[#d46b4f]" />
              <span className="h-1.5 w-16 rounded-full bg-[#ded8cf]" />
            </div>
            <p className="mt-2 text-xs text-[#8c847c]">Step 2 of 3</p>
          </div>
          {/* Dot variant */}
          <div>
            <p className="mb-3 text-xs font-semibold text-[#8c847c]">Step dots</p>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-[#1e1c1a] text-xs text-white">1</span>
              <span className="h-px w-6 bg-[#1e1c1a]/15" />
              <span className="grid size-7 place-items-center rounded-full bg-[#1e1c1a] text-xs text-white">2</span>
              <span className="h-px w-6 bg-[#1e1c1a]/15" />
              <span className="grid size-7 place-items-center rounded-full bg-[#e9ddd2] text-xs">3</span>
            </div>
            <p className="mt-2 text-xs text-[#8c847c]">Step 2 of 3</p>
          </div>
        </div>
      </Section>

      {/* ---- Select / dropdown ---- */}
      <Section eyebrow="Components / Forms" title="Select & range pickers">
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <select className="rounded-full border border-[#e4ddd5] bg-[#fbfaf7] px-4 py-3 text-sm font-medium outline-none">
            <option>This month</option>
            <option>Last month</option>
            <option>This quarter</option>
          </select>
          <div className="flex rounded-full border border-[#e4ddd5] bg-[#fbfaf7] p-1 text-xs font-semibold">
            <button className="rounded-full bg-[#1e1c1a] px-3 py-2 text-white">7 days</button>
            <button className="rounded-full px-3 py-2 text-[#8c847c]">30 days</button>
            <button className="rounded-full px-3 py-2 text-[#8c847c]">90 days</button>
          </div>
          <button className="rounded-full border border-[#e4ddd5] bg-[#fbfaf7] px-3.5 py-2 text-xs font-semibold">
            Nearest first
          </button>
        </div>
      </Section>
    </div>
  )
}

/* ================================================================== */
/*  TAB 3 — PATTERNS                                                  */
/* ================================================================== */

function PatternsTab() {
  return (
    <div className="grid gap-6">
      {/* ---- Appointment row ---- */}
      <Section eyebrow="Patterns / Operations" title="Appointment row">
        <p className="mt-2 text-sm text-[#8c847c]">
          The atomic unit of the daily schedule. Shows time, client avatar, service, amount, and status.
        </p>
        <div className="mt-6 grid gap-3">
          {([
            ['09:30', 'Ada Okafor', 'Signature fade', '₦8,500', 'Paid', 'text-[#528361]'],
            ['11:00', 'Tomi Adeyemi', 'Deep tissue spa', '₦12,000', 'Confirmed', 'text-[#8b8178]'],
            ['14:30', 'Kemi Yusuf', 'Silk press', '₦18,500', 'Confirmed', 'text-[#8b8178]'],
            ['16:00', 'Zainab Bello', 'Classic manicure', '₦6,000', 'Pending', 'text-[#b97942]'],
          ] as const).map(([time, name, service, amount, status, statusColor]) => (
            <div key={time} className="flex items-center gap-4 rounded-2xl border border-[#eee7df] bg-[#fbfaf7] p-3">
              <span className="w-12 font-mono text-xs text-[#998f85]">{time}</span>
              <div className="grid size-10 place-items-center rounded-full bg-[#f0ded4] text-xs font-semibold text-[#9e503b]">
                {name.split(' ').map((p) => p[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{name}</p>
                <p className="mt-1 text-xs text-[#998f85]">{service}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{amount}</p>
                <p className={`mt-1 text-[10px] font-semibold ${statusColor}`}>{status}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Revenue mix (dark) ---- */}
      <Section dark eyebrow="Patterns / Data" title="Revenue mix panel">
        <p className="mt-2 text-sm text-white/50">
          Dark panel showing revenue breakdown by service with stacked bar indicators.
        </p>
        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-4xl font-medium tracking-[-.07em]">₦1.24m</p>
            <p className="mt-1 text-sm text-white/45">total collected</p>
          </div>
          <BarChart3 size={18} className="text-[#e89b80]" />
        </div>
        <div className="mt-8 space-y-5">
          {[
            ['Barbing', '42%', 'bg-[#d46b4f]'],
            ['Spa treatments', '31%', 'bg-[#e89b80]'],
            ['Hair dressing', '27%', 'bg-[#f2c6b5]'],
          ].map(([label, value, barColor]) => (
            <div key={label}>
              <div className="flex justify-between text-xs">
                <span className="text-white/65">{label}</span>
                <span className="font-semibold text-[#efb49f]">{value}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: value }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Business card / directory ---- */}
      <Section eyebrow="Patterns / Cards" title="Business directory card">
        <p className="mt-2 text-sm text-[#8c847c]">
          How business listings appear in the customer booking flow.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['The Cut Club', 'Signature cuts · Lekki', '4.9', 'bg-[#eee7ff]'],
            ['Mellow House Spa', 'Massage & facials · Ikeja', '4.8', 'bg-[#ffe7df]'],
            ['Knot & Co.', 'Hair & styling · Yaba', '4.9', 'bg-[#e7f2ea]'],
            ['The Mane Edit', 'Cuts & colour · VI', '4.7', 'bg-[#f3e9da]'],
          ].map(([name, detail, rating, color]) => (
            <div key={name} className="group rounded-[22px] border border-[#e4ddd5] bg-[#fbfaf7] p-4 transition hover:-translate-y-1 hover:shadow-lg">
              <div className={`grid h-28 place-items-center rounded-[17px] ${color}`}>
                <Scissors className="text-[#7253cb]" size={31} />
              </div>
              <div className="mt-4 flex items-start justify-between">
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="mt-1 text-xs text-[#8c847c]">{detail}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold">★ {rating}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#eee8df] pt-3 text-xs font-semibold">
                <span className="text-[#d46b4f]">View availability</span>
                <ArrowRight size={14} className="transition group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Onboarding service selection ---- */}
      <Section eyebrow="Patterns / Onboarding" title="Service toggle selection">
        <p className="mt-2 text-sm text-[#8c847c]">
          Interactive service selection during onboarding. Selected state uses coral border + warm background.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { name: 'Barbing', detail: 'Cuts, fades & grooming', icon: Scissors, selected: true },
            { name: 'Spa', detail: 'Treatments & wellness', icon: Sparkles, selected: true },
            { name: 'Hair dressing', detail: 'Styling, color & care', icon: Wand2, selected: false },
          ].map(({ name, detail, icon: Icon, selected }) => (
            <div
              key={name}
              className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition ${
                selected
                  ? 'border-[#d46b4f] bg-[#fff8f5] shadow-[0_12px_30px_rgba(212,107,79,.12)]'
                  : 'border-[#ded8cf] bg-white hover:border-[#caa08f]'
              }`}
            >
              <span
                className={`grid size-11 place-items-center rounded-xl ${
                  selected ? 'bg-[#d46b4f] text-white' : 'bg-[#f1ebe4] text-[#d46b4f]'
                }`}
              >
                <Icon size={19} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{name}</span>
                <span className="mt-1 block text-sm text-[#8c847c]">{detail}</span>
              </span>
              <span
                className={`grid size-6 place-items-center rounded-full border text-xs ${
                  selected
                    ? 'border-[#d46b4f] bg-[#d46b4f] text-white'
                    : 'border-[#cfc7be] text-transparent'
                }`}
              >
                ✓
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Welcome / success modal ---- */}
      <Section eyebrow="Patterns / Modals" title="Welcome confirmation modal">
        <p className="mt-2 text-sm text-[#8c847c]">
          Post-onboarding welcome dialog that overlays the dashboard with a blurred backdrop.
        </p>
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-[460px] rounded-[28px] border border-[#e4ddd5] bg-[#fbfaf7] p-8 text-center shadow-[0_24px_80px_rgba(30,28,26,.28)]">
            <div className="mx-auto mb-4 flex items-center justify-between text-left">
              <span className="eyebrow text-[#8c847c]">BOOKA / OWNER PORTAL</span>
              <button className="rounded-full p-2 text-[#8c847c] hover:bg-[#f1ece5]">
                <X size={18} />
              </button>
            </div>
            <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[#e7f2ea] text-[#528361]">
              <Check size={28} />
            </div>
            <p className="eyebrow mt-6 text-[#528361]">You&apos;re officially in</p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-.06em]">Welcome to Booka.</h2>
            <p className="mx-auto mt-3 max-w-[380px] leading-7 text-[#756f69]">
              Your business profile is ready. We&apos;ve sent a welcome email with everything
              you need to launch your booking page.
            </p>
            <div className="my-6 flex items-center gap-3 rounded-2xl bg-[#f6f1ea] p-4 text-left">
              <div className="grid size-10 place-items-center rounded-xl bg-white text-[#d46b4f]">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold">Welcome email sent</p>
                <p className="mt-0.5 text-xs text-[#8c847c]">Check your inbox for next steps</p>
              </div>
            </div>
            <button className="w-full rounded-full bg-[#1e1c1a] px-6 py-4 text-sm font-semibold text-white">
              Continue to login <ArrowRight className="ml-2 inline" size={16} />
            </button>
          </div>
        </div>
      </Section>

      {/* ---- Client pulse / workspace panels ---- */}
      <Section eyebrow="Patterns / Dashboard" title="Info & action panels">
        <p className="mt-2 text-sm text-[#8c847c]">
          Supporting panels that appear below the main chart on the dashboard.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {/* Client pulse */}
          <div className="rounded-[28px] border border-[#e4ddd5] bg-[#fbfaf7] p-6">
            <p className="eyebrow">Client pulse</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.05em]">People are returning</h3>
            <p className="mt-3 text-sm leading-6 text-[#817970]">
              42 clients have booked more than twice this month.
            </p>
            <div className="mt-6 flex -space-x-2">
              <span className="grid size-9 place-items-center rounded-full border-2 border-[#fbfaf7] bg-[#f0ded4] text-xs font-semibold">AO</span>
              <span className="grid size-9 place-items-center rounded-full border-2 border-[#fbfaf7] bg-[#d7e6da] text-xs font-semibold">TA</span>
              <span className="grid size-9 place-items-center rounded-full border-2 border-[#fbfaf7] bg-[#e7d7cf] text-xs font-semibold">KY</span>
              <span className="grid size-9 place-items-center rounded-full border-2 border-[#fbfaf7] bg-[#1e1c1a] text-xs font-semibold text-white">+39</span>
            </div>
          </div>
          {/* Workspace checklist */}
          <div className="rounded-[28px] border border-[#e4ddd5] bg-[#fbfaf7] p-6">
            <p className="eyebrow">Workspace checklist</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.05em]">Keep growing</h3>
            <div className="mt-5 space-y-3 text-sm">
              <p className="flex items-center gap-2"><span className="text-[#528361]">✓</span> Profile completed</p>
              <p className="flex items-center gap-2"><span className="text-[#528361]">✓</span> First service added</p>
              <p className="flex items-center gap-2 text-[#998f85]"><span className="text-[#d46b4f]">○</span> Invite your team</p>
            </div>
          </div>
          {/* Next best action */}
          <div className="rounded-[28px] bg-[#efe0d7] p-6">
            <p className="eyebrow text-[#9e503b]">Next best action</p>
            <h3 className="mt-2 text-xl font-semibold leading-tight tracking-[-.05em]">Fill the quiet hours.</h3>
            <p className="mt-3 text-sm leading-6 text-[#756c64]">
              Promote 27 open slots to your regulars.
            </p>
            <button className="mt-5 flex w-full items-center justify-between rounded-xl bg-[#1e1c1a] px-4 py-3 text-sm font-semibold text-white">
              Promote availability <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </Section>

      {/* ---- Dark summary panel ---- */}
      <Section dark eyebrow="Patterns / Data" title="Summary statistic panel">
        <p className="mt-2 text-sm text-white/50">
          Compact dark panel used inside the utilization chart for at-a-glance numbers.
        </p>
        <div className="mt-6 max-w-[200px] rounded-2xl bg-white/[.06] p-5">
          <p className="eyebrow text-[#efb49f]">At a glance</p>
          <p className="mt-6 text-4xl font-medium tracking-[-.07em]">86%</p>
          <p className="mt-1 text-sm text-white/50">average utilization</p>
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">Best day</p>
            <p className="mt-1 font-semibold">Friday · 96%</p>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">Conversion</p>
            <p className="mt-1 font-semibold text-[#efb49f]">82.4% paid</p>
          </div>
        </div>
      </Section>

      {/* ---- Chart legend ---- */}
      <Section eyebrow="Patterns / Data" title="Chart legends">
        <div className="mt-6 flex flex-wrap gap-6 text-xs font-medium text-[#6f675f]">
          <span className="flex items-center gap-2">
            <i className="size-2 rounded-full bg-[#d46b4f]" />Paid sessions
          </span>
          <span className="flex items-center gap-2">
            <i className="size-2 rounded-full bg-[#e9d5ca]" />Total bookings
          </span>
          <span className="flex items-center gap-2">
            <i className="size-2 rounded-full bg-[#528361]" />Confirmed
          </span>
          <span className="flex items-center gap-2">
            <i className="size-2 rounded-full bg-[#b97942]" />Pending
          </span>
        </div>
      </Section>

      {/* ---- Split layout ---- */}
      <Section eyebrow="Patterns / Layout" title="Onboarding split-screen">
        <p className="mt-2 text-sm text-[#8c847c]">
          The signature Booka onboarding layout — dark editorial panel on the left, form content on the right.
        </p>
        <div className="mt-6 grid overflow-hidden rounded-2xl sm:grid-cols-[38%_62%]">
          <div className="flex flex-col justify-end bg-[#1e1c1a] p-6 text-white">
            <p className="eyebrow text-[#efb49f]">Business onboarding</p>
            <h3 className="mt-4 text-3xl font-medium leading-[.95] tracking-[-.07em]">
              Build your{' '}
              <em className="font-serif not-italic text-[#e89b80]">place</em> on Booka.
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/60">
              Set up your details and let customers find your services with confidence.
            </p>
          </div>
          <div className="bg-[#f8f5f0] p-6">
            <p className="eyebrow text-[#d46b4f]">01 / Your details</p>
            <h3 className="mt-3 text-2xl font-medium tracking-[-.06em]">Tell us about your place.</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="field">Business name<input placeholder="The Good Room" /></label>
              <label className="field">Owner name<input placeholder="Amara Cole" /></label>
            </div>
            <button className="mt-6 rounded-full bg-[#d46b4f] px-6 py-3.5 text-sm font-semibold text-white">
              Continue <ArrowRight className="ml-1 inline" size={15} />
            </button>
          </div>
        </div>
      </Section>
    </div>
  )
}
