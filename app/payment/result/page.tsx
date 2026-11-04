import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, ExternalLink, X } from 'lucide-react'

type PaymentResultPageProps = {
  searchParams: Promise<{ status?: string; business?: string; reason?: string }>
}

export const metadata: Metadata = {
  title: 'Payment result — Booka',
}

export default async function PaymentResultPage({ searchParams }: PaymentResultPageProps) {
  const { status, business, reason } = await searchParams
  const succeeded = status === 'success'
  const businessHref = business && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(business) ? `/${business}` : '/'

  return (
    <main className="payment-result">
      <section className="payment-result-card">
        <span className={`payment-result-icon ${succeeded ? 'success' : 'failed'}`}>
          {succeeded ? <Check size={30} /> : <X size={30} />}
        </span>
        <span className="eyebrow">{succeeded ? 'Payment received' : 'Payment not completed'}</span>
        <h1>{succeeded ? 'Your booking is confirmed.' : 'Checkout was not completed.'}</h1>
        <p>
          {succeeded
            ? 'Paystack verified the transaction. The business will see the booking as confirmed in its backoffice.'
            : reason === 'payment-not-configured'
              ? 'Payments are not configured on this Booka instance yet. Contact the business to complete your booking.'
              : 'Your booking is still saved as pending. Return to the booking page to try payment again.'}
        </p>
        <div className="payment-result-actions">
          <Link className="primary-button" href={businessHref}>Back to booking page <ExternalLink size={16} /></Link>
        </div>
      </section>
    </main>
  )
}
