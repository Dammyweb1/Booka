'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronDown,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react'
import { TopNav } from '@/components/navigation/top-nav'
import { Footer } from '@/components/navigation/footer'
import { cn } from '@/lib/utils'

interface FAQItem {
  id: string
  category: 'clients' | 'owners' | 'payments' | 'cancellations'
  categoryLabel: string
  question: string
  answer: string
  highlight?: string
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'clients',
    categoryLabel: 'For Clients',
    question: 'How do I book with a business on Booka?',
    answer:
      'Open the business’s Booka link, choose one of its listed services and an available date and time, then enter your contact details and submit the booking.',
    highlight: 'Book directly through the link shared by the business.',
  },
  {
    id: 'faq-2',
    category: 'clients',
    categoryLabel: 'For Clients',
    question: 'Can I book more than one service at a time?',
    answer:
      'A booking currently covers one service. Submit a separate booking for another service, or contact the business if you need help coordinating appointments.',
  },
  {
    id: 'faq-3',
    category: 'payments',
    categoryLabel: 'Payments',
    question: 'Does Booka process appointment payments?',
    answer:
      'Booka records the booking but does not process payments. The booking page shows the service price; contact the business to confirm how and when to pay.',
    highlight: 'Arrange payment directly with the business.',
  },
  {
    id: 'faq-4',
    category: 'cancellations',
    categoryLabel: 'Cancellations',
    question: 'How can I change or cancel a booking?',
    answer:
      'Booka does not currently provide a self-service cancellation or rescheduling link. Contact the business directly to ask about changing your booking.',
  },
  {
    id: 'faq-5',
    category: 'owners',
    categoryLabel: 'For Business Owners',
    question: 'How does Booka work for business owners?',
    answer:
      'Create a business profile and booking page, add your services, and share the page directly with clients. The backoffice lets you manage services, appointments, business details, and client information.',
    highlight: 'A direct booking page with a business backoffice.',
  },
  {
    id: 'faq-6',
    category: 'owners',
    categoryLabel: 'For Business Owners',
    question: 'How do I share my booking page?',
    answer:
      'Your business has a unique Booka link. Copy it from your backoffice and share it with clients or add it to your social media profile.',
    highlight: 'Clients use your link to view your services and submit bookings.',
  },
  {
    id: 'faq-7',
    category: 'owners',
    categoryLabel: 'For Business Owners',
    question: 'Where can I see new bookings?',
    answer:
      'Bookings appear in the Appointments area of your backoffice. The dashboard can refresh appointment data when it receives updates; Booka does not currently send booking confirmation emails or SMS reminders.',
    highlight: 'Review and update appointments from your dashboard.',
  },
  {
    id: 'faq-8',
    category: 'owners',
    categoryLabel: 'For Business Owners',
    question: 'Can I manage the services shown on my booking page?',
    answer:
      'Yes. Use the Services area in your backoffice to add a service with its description, duration, and price, or remove a service you no longer offer.',
    highlight: 'Your service menu is used on your business booking page.',
  },
  {
    id: 'faq-9',
    category: 'payments',
    categoryLabel: 'Payments',
    question: 'What currency and timezone are supported by default?',
    answer:
      'Booka currently uses Nigerian Naira (NGN ₦) and West Africa Time (GMT+1) as defaults. Review your business settings for the options available to your account.',
    highlight: 'Default settings: NGN (₦) and GMT+1.',
  },
  {
    id: 'faq-10',
    category: 'cancellations',
    categoryLabel: 'Cancellations',
    question: 'What happens if a client does not show up?',
    answer:
      'You can update the appointment status in your backoffice. Booka does not automatically apply a no-show or cancellation policy, so communicate your policy directly to clients.',
    highlight: 'Appointment status is managed by the business.',
  },
]

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [openIds, setOpenIds] = useState<string[]>(['faq-1', 'faq-5'])
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({})

  const categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'clients', label: 'For Clients' },
    { id: 'owners', label: 'For Business Owners' },
    { id: 'payments', label: 'Payments & Pricing' },
    { id: 'cancellations', label: 'Cancellations & Rules' },
  ]

  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.categoryLabel.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [searchQuery, selectedCategory])

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleExpandAll = () => {
    if (openIds.length === filteredFAQs.length) {
      setOpenIds([])
    } else {
      setOpenIds(filteredFAQs.map((f) => f.id))
    }
  }

  const handleVote = (id: string) => {
    setHelpfulVotes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-[#1e1c1a] flex flex-col justify-between">
      <TopNav />

      <main className="mx-auto max-w-[1040px] px-6 py-10 lg:py-16 w-full flex-1">
        {/* Hero Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ded8cf] bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-[#d46b4f]">
            <HelpCircle size={14} />
            Support & Knowledge Center
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-medium tracking-[-0.05em] text-[#1e1c1a]">
            Frequently Asked <em className="font-serif not-italic text-[#d46b4f]">Questions</em>
          </h1>
          <p className="mx-auto mt-4 max-w-[540px] text-base leading-relaxed text-[#756f69]">
            Everything you need to know about booking appointments, managing your studio, and making the most of Booka.
          </p>

          {/* Dynamic Search Box */}
          <div className="mx-auto mt-8 max-w-xl relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8c847c]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, e.g. booking page, services, appointments, payments..."
              className="w-full rounded-2xl border border-[#ded8cf] bg-white pl-11 pr-10 py-3.5 text-sm shadow-sm transition focus:border-[#d46b4f] focus:outline-none focus:ring-2 focus:ring-[#d46b4f]/15"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8c847c] hover:bg-[#f1ece5] hover:text-[#1e1c1a]"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#e4ddd5] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-semibold transition',
                  selectedCategory === cat.id
                    ? 'bg-[#1e1c1a] text-white shadow-sm'
                    : 'border border-[#ded8cf] bg-white text-[#756f69] hover:border-[#1e1c1a] hover:text-[#1e1c1a]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExpandAll}
            className="text-xs font-semibold text-[#8c847c] hover:text-[#1e1c1a] transition"
          >
            {openIds.length === filteredFAQs.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Results Counter */}
        <div className="mt-6 flex items-center justify-between text-xs text-[#8c847c]">
          <span>
            Showing {filteredFAQs.length} {filteredFAQs.length === 1 ? 'question' : 'questions'}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="font-medium text-[#d46b4f] hover:underline"
            >
              Reset search
            </button>
          )}
        </div>

        {/* Dynamic Accordion List */}
        <div className="mt-4 space-y-3">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((item) => {
              const isOpen = openIds.includes(item.id)
              const isVoted = helpfulVotes[item.id]

              return (
                <div
                  key={item.id}
                  className={cn(
                    'overflow-hidden rounded-2xl border transition-all duration-200',
                    isOpen
                      ? 'border-[#d46b4f]/40 bg-white shadow-sm'
                      : 'border-[#ded8cf] bg-white/70 hover:bg-white hover:border-[#cfc7bc]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between p-5 text-left transition"
                  >
                    <div className="flex items-center gap-3 pr-4">
                      <span className="rounded-full bg-[#f3e7df] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9d4f39]">
                        {item.categoryLabel}
                      </span>
                      <h3 className="font-semibold text-base text-[#1e1c1a] tracking-tight">
                        {item.question}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-full border border-[#ded8cf] bg-[#fbfaf7] text-[#756f69] transition-transform duration-200',
                        isOpen && 'rotate-180 bg-[#1e1c1a] text-white border-transparent'
                      )}
                    >
                      <ChevronDown size={16} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#f3eee8] px-5 pb-5 pt-3.5 text-sm leading-relaxed text-[#68625c]">
                      <p>{item.answer}</p>

                      {item.highlight && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#fff9f6] p-3 text-xs font-medium text-[#9d4f39] border border-[#f5ded5]">
                          <Sparkles size={14} className="shrink-0 text-[#d46b4f]" />
                          <span>{item.highlight}</span>
                        </div>
                      )}

                      {/* Was this helpful? */}
                      <div className="mt-4 flex items-center justify-between border-t border-[#f5efe9] pt-3 text-xs text-[#8c847c]">
                        <span>Was this answer helpful?</span>
                        <button
                          type="button"
                          onClick={() => handleVote(item.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition border',
                            isVoted
                              ? 'border-[#528361] bg-[#e7f2ea] text-[#528361] font-semibold'
                              : 'border-[#ded8cf] bg-white text-[#756f69] hover:border-[#1e1c1a]'
                          )}
                        >
                          <ThumbsUp size={12} />
                          <span>{isVoted ? 'Helpful!' : 'Yes'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ded8cf] bg-white p-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#f3e7df] text-[#d46b4f]">
                <Search size={20} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No questions matched your search</h3>
              <p className="mt-1 text-xs text-[#8c847c]">
                Try searching with keywords like &quot;services&quot;, &quot;booking link&quot;, or &quot;payment&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                }}
                className="mt-5 rounded-full bg-[#1e1c1a] px-5 py-2 text-xs font-semibold text-white hover:bg-[#d46b4f] transition"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Still Need Assistance Banner */}
        <div className="mt-16 rounded-[28px] border border-[#e5ddd4] bg-[#211f1c] p-8 sm:p-10 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="rounded-full bg-[#d46b4f]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#efb49f] border border-[#d46b4f]/30">
                Direct Help
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-medium tracking-tight">
                Still have a question?
              </h2>
              <p className="mt-2 max-w-[460px] text-sm text-white/70 leading-relaxed">
                Contact us for help with business onboarding, using your backoffice, or other Booka questions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="mailto:support@booka.com"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold text-[#1e1c1a] hover:bg-[#f8f5f0] transition shadow-sm"
              >
                <Mail size={14} />
                <span>Email Support</span>
              </a>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full bg-[#d46b4f] px-5 py-3 text-xs font-semibold text-white hover:bg-[#c66046] transition shadow-sm"
              >
                <span>Get started as owner</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
