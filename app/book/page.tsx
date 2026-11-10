import { redirect } from 'next/navigation'

/**
 * Default `/book` route is intentionally disabled.
 * Booka is a direct SaaS booking platform (not a public marketplace directory).
 * Clients can only access a booking page via a business owner's unique shared link:
 * `/book/[slug]` (e.g. `/book/the-cut-club`).
 */
export default function DefaultBookPage() {
  redirect('/')
}
