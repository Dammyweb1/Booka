# Booka

Booka is a booking platform for barbers, hairdressers, and spas. Owners onboard
once, get a public booking page at `/{business-slug}`, and manage bookings,
services, and payments from a private backoffice.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Connect Supabase and Paystack

Copy `.env.example` to `.env.local` with your project URL and publishable
key. To enable payments, also add a Supabase server-only secret key (or legacy
`service_role` key) and your Paystack test secret key, then apply the database
migrations:

```env
SUPABASE_SECRET_KEY=your_server_only_secret_key
PAYSTACK_SECRET_KEY=sk_test_your_paystack_test_secret
```

In Supabase, find or create a key under **Project Settings → API Keys →
Secret keys**. On older dashboard layouts, use the `service_role` key under
**Legacy API Keys**. Never add either key with a `NEXT_PUBLIC_` prefix or
expose it in client-side code.

```bash
pnpm exec supabase login
pnpm db:link
pnpm db:push
```

See `supabase/README.md` for the migration order, auth redirect settings, and
verification steps. The migrations create businesses, services, bookings, and
the `payments` table used for Paystack tracking.

## What works today

- Owner onboarding through Supabase Auth with email/password
- Public business page at `/{business-slug}` with the active service menu
- Book first, pay now: booking holds the slot and opens Paystack Checkout
- Paystack transaction verification through a callback route and webhook,
  with payment records visible in the backoffice
- Backoffice at `/backoffice` with Overview, Bookings, Services, Payments,
  Customers, and Settings
- Row level security everywhere; anonymous visitors never see bookings or
  payment records

See `TECH-STACK.md` for the stack and `PROJECT-DOCUMENTATION.md` for the
current feature set and production plan.
