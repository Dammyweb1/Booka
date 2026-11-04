import { NextResponse, type NextRequest } from 'next/server'
import { paystackSignatureIsValid, recordPaystackReference } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  if (!paystackSignatureIsValid(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const payload = typeof event === 'object' && event !== null
    ? (event as { event?: string; data?: { reference?: string } })
    : null

  if (payload?.event === 'charge.success' && typeof payload.data?.reference === 'string') {
    const result = await recordPaystackReference(payload.data.reference)
    if (!result.ok) console.error('Paystack webhook could not record reference:', result.reason)
  }

  return NextResponse.json({ received: true })
}
