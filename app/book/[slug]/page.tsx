import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Legacy `/book/[slug]` URL route forwards directly to clean root vanity URL:
 * `booka.app/[slug]` (e.g. `/[slug]`).
 */
export default async function LegacyBookSlugRedirect({ params }: PageProps) {
  const { slug } = await params
  redirect(`/${slug}`)
}
