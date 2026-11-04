import { NextResponse, type NextRequest } from 'next/server'
import { recordPaystackReference } from '@/lib/paystack'

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference') ?? request.nextUrl.searchParams.get('trxref') ?? ''
  const result = await recordPaystackReference(reference)

  const destination = new URL('/payment/result', request.url)
  destination.searchParams.set('status', result.ok ? result.status : 'failed')
  if (!result.ok) destination.searchParams.set('reason', result.reason)
  if (result.businessSlug) destination.searchParams.set('business', result.businessSlug)

  return NextResponse.redirect(destination)
}
