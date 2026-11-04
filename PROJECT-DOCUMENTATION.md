# Booka project documentation

Booka is a booking platform for barbers, hairdressers, and spas. A business
owner onboards once, receives a public booking URL, and manages services and
bookings from a private backoffice.

## Current functionality

- **Onboarding:** email/password signup through Supabase Auth. A database
  trigger creates the `businesses` row from signup metadata, generates a unique
  slug, and seeds the shared starter services from the Courator Barbing page:
  Spa (20 min, ₦15,000), Barbing (30 min, ₦8,000), and Hairdressing
  (30 min, ₦10,000), each with its matching image. Existing business menus
  are not changed by the seed update.
- **`/{businessSlug}`**: public page reads the business and its active
  services from Supabase. Visitors can choose a service, fill in a booking
  form, and submit a request.
- **Dremo Barbing:** its active public services mirror the three service
  cards, prices, and images from Courator Barbing. Its replaced services are
  kept inactive so existing bookings retain their service references.
- **Public booking transaction:** `create_public_booking` is a security-definer
  RPC that validates the payload, confirms the service belongs to the
  business and is active, rejects the past, and rejects a double-booked slot.
  Anonymous clients call only the RPC, never the `bookings` table.
- **Paystack payments:** booking a service creates a `payments` row in
  `awaiting_payment` state. The customer can complete checkout from the
  booking confirmation screen. The callback verifies the transaction with
  Paystack, checks the amount, marks the payment as `success`, and confirms
  the booking. A webhook handles the same update server-to-server.
- **Backoffice Payments:** every booking’s payment record is visible with
  paid amount, service filter, Paystack reference, checkout state, and
  verification time. The owner cannot mark a payment successful manually.
- **Backoffice Services:** services can be created, edited, shown, hidden, and
  deleted from a modal. Only active services appear publicly.
- **`/backoffice`:** authenticated owner dashboard with Overview, Bookings,
  Services, Payments, Customers, and Settings tabs.
- **Overview:** bookings this month, revenue collected, open demand, average
  booking value, a booking-status-driven revenue chart, and the next 4
  appointments.
- **Bookings tab:** filters for all/pending/confirmed/completed/cancelled,
  with owner actions to confirm, complete, or cancel a booking.
- **Services tab:** full CRUD with show/hide on the public page. Empty menus
  on the public page show a "menu is being updated" empty state rather than a
  fabricated menu.
- **Payments:** computed, read-only summary of collected, expected, and
  average revenue per completed booking. No payment provider is wired yet.
- **Customers:** derived list of unique customer emails with counts, spend, and
  last visit.
- **Settings:** edit business name, type, owner names, address, city, and
  phone. The public slug remains stable so existing links keep working.

## Route map

- `/onboarding/business`, `/onboarding/business-setup`,
  `/onboarding/owner`, `/onboarding/owner-contact`
- `/backoffice`
- `/{businessSlug}`
- `/{businessSlug}` booking section inline (no separate `/book` route yet)
- `/reset-password`

## Database schema and RLS

- `public.businesses`: one row per owner (`owner_id` unique), with slug, name,
  type, owner name, address, city, phone.
- `public.services`: business FK with cascade, name, duration, price, tone,
  active flag. A `seed_business_services` trigger and backfill seed every new
  business with 3 category-appropriate services.
- `public.bookings`: business FK with cascade, nullable service FK (SET NULL on
  delete), customer details, `starts_at`, status, notes.
- `public.payments`: one row per booking, business and service snapshots,
  customer email, amount in naira, status, Paystack reference, transaction id,
  channel, and paid time.

- RLS:
  - Authenticated owners can do anything within their own businesses only.
  - Anonymous callers may see active services and public business fields
    (`id, slug, name, business_type, city, address, phone`) but never owner
    names, bookings, or payment records.
  - Booking and its awaiting payment are created only through
    `create_public_booking(...)`.

## Security notes

- All owner writes scope by `owner_id = auth.uid()` and by the bound business
  id from the server session. Slugs are never used for authorization.
- `bookings` and `payments` are not granted to anonymous users at all.
- `create_public_booking` is granted execute to `anon` and `authenticated`
  but is security-definer and does its own validation and conflict check.
- Paystack outcomes are recorded only by the server after verifying the
  transaction with Paystack (callback and webhook). The service role is
  used server-side.
- Server actions validate all payloads and revalidate `/backoffice` and the
  public business page.
- Service role keys remain server-only and must not be exposed to clients.

## Still to do

1. Payment provider integration (Paystack by default) with server-side
   verification and webhook-driven status updates.
2. Availability rules and blocked times, with the current exact-slot conflict
   check expanded to cover service durations.
3. Email or SMS booking confirmations and owner notifications.
4. A stored `customers` table instead of the current derived view.
5. Availability management UI and calendar integrations.
6. Service images, business media storage, and public page customization.
7. Product analytics and experimentation.
