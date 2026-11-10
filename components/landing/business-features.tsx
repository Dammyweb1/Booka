import { CalendarDays, Link2, Settings, Users } from 'lucide-react'

const FEATURES = [
  {
    title: 'A booking page for your business',
    copy: 'Give clients a direct place to view your services and submit an appointment booking.',
    icon: Link2,
    color: 'bg-[#eee7ff] text-[#7253cb]',
  },
  {
    title: 'Appointment management',
    copy: 'See bookings in your dashboard and update their status as your day changes.',
    icon: CalendarDays,
    color: 'bg-[#ffe7df] text-[#d46b4f]',
  },
  {
    title: 'Client details in one workspace',
    copy: 'Keep the contact details provided with bookings available in your business workspace.',
    icon: Users,
    color: 'bg-[#e7f2ea] text-[#528361]',
  },
  {
    title: 'Control over your services',
    copy: 'Add services with their descriptions, durations, and prices, or remove services you no longer offer.',
    icon: Settings,
    color: 'bg-[#f3e9da] text-[#a47328]',
  },
]

export function BusinessFeatures() {
  return (
    <section id="features" className="w-full border-y border-[#ded5c7] bg-[#efe8df] py-20 lg:py-28">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <div data-scroll-reveal className="max-w-[620px]">
          <p className="eyebrow text-[#d46b4f]">Booka for your business</p>
          <h2 className="mt-3 text-3xl font-medium tracking-[-.05em] text-[#1e1c1a] sm:text-4xl lg:text-5xl">
            The tools to keep bookings <em className="font-serif not-italic text-[#d46b4f]">organized.</em>
          </h2>
          <p className="mt-4 text-base leading-7 text-[#6b645c]">
            Share a direct booking page with clients and manage the details from your backoffice.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                data-scroll-reveal
                className="rounded-[24px] border border-[#ded5c7] bg-[#fffdf9] p-6"
              >
                <div className={`grid size-12 place-items-center rounded-2xl ${feature.color}`}>
                  <Icon size={21} />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-[-.03em] text-[#1e1c1a]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#756f69]">{feature.copy}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
