# Booka technical stack

## Current implementation

- **Framework:** Next.js 16 App Router
- **Language:** TypeScript
- **UI:** React 19
- **Styling:** Tailwind CSS 4 with custom CSS tokens for the navy, ivory, gold, teal, and coral palette
- **Icons:** lucide-react
- **Runtime:** Node.js with pnpm
- **Deployment target:** Vercel
- **Database:** Supabase Postgres with row level security
- **Authentication:** Supabase Auth, email/password by default
- **Public booking flow:** `create_public_booking` SQL function called from a
  server action under the anonymous Supabase key; it validates input,
  enforces an exact-time conflict check, and never grants direct anonymous
  access to the bookings table
- **Backoffice:** authenticated server page with client-side tabbed dashboard
  (Overview, Bookings, Services, Payments, Customers, Settings)

## Planned production stack

- **Payments:** Paystack Checkout and server-side transaction verification
- **Email:** Resend for booking confirmations and owner notifications
- **Scheduling:** PostgreSQL availability rules plus a server-side booking
  transaction
- **File storage:** Supabase Storage for business images and service media
- **Analytics:** Vercel Analytics plus product events stored in Supabase

## Supabase setup

- Copy `.env.example` to `.env.local` and add the Supabase project URL and
  publishable key.
- Apply both migrations: `20261103000000_create_businesses.sql` creates the
  `businesses` table and its RLS model, `20261104000000_add_services_and_bookings.sql`
  adds the service menu, bookings, RLS, and the public booking RPC.
- Onboarding creates an email/password Auth account; a database trigger saves
  the submitted owner and business details to `public.businesses`.
- Enable email confirmation in Supabase Auth and configure the project Site URL
  and redirect URLs for the deployed app.
- The `businesses` table uses row level security so authenticated owners can
  access only their own record.
- `/backoffice` requires an authenticated owner with a saved business profile.

## Security requirements

- Keep Supabase service-role credentials server-only.
- Validate onboarding, service, booking, and payment payloads on the server.
- Enforce RLS policies for businesses, services, bookings, customers, and
  payments.
- Recalculate payment totals server-side and verify Paystack transactions on
  the server.
- Never trust a public business slug as authorization; scope owner actions to
  the authenticated user.
- Public booking requests are validated and inserted through a
  security-definer function, never through direct table access.

## Current boundary

Onboarding, sign-in, business persistence, service management, booking
management, and the public booking flow are backed by Supabase. Payment
collection, email/SMS notifications, availability rules, and media uploads are
not implemented yet.
