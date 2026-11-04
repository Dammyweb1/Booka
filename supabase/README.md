# Supabase setup

Booka onboarding writes to Supabase Auth (`auth.users`) and the
`public.businesses` table. The business row is created by a database trigger
from the signup metadata, so it also exists when email confirmation is on and
the owner has no session yet.

## 1. Environment

Copy `.env.example` to `.env.local` and fill in the values from
**Supabase Dashboard -> Project Settings -> API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key)

`NEXT_PUBLIC_SITE_URL` is optional locally; Booka uses the request origin when
it is missing. Set it in production so confirmation emails point at the right
domain.

## 2. Apply the schema

Apply the migrations in order:

1. `supabase/migrations/20261103000000_create_businesses.sql` creates the
   `businesses` table and its RLS model.
2. `supabase/migrations/20261104000000_add_services_and_bookings.sql` adds
   the `services` and `bookings` tables, RLS, the public booking RPC, and
   seeds a starter menu for every business.
3. `supabase/migrations/20261105000000_add_paystack_payments.sql` adds payment
   tracking and the Paystack payment flow.
4. `supabase/migrations/20261106000000_enable_realtime_notifications.sql`
   enables realtime notifications for bookings and payments.
5. `supabase/migrations/20261107000000_add_service_images.sql` adds optional
   service image paths and the public `service-images` bucket, with uploads
   restricted to each business owner.
6. `supabase/migrations/20261108000000_fix_service_image_upload_policy.sql`
   scopes storage writes directly to the authenticated owner ID used as the
   first folder in each image path.

**Option A - Supabase CLI (recommended):** the CLI is installed as a dev
dependency and already linked to the project ref via a script.

```bash
pnpm exec supabase login   # once per machine, opens the browser
pnpm db:link               # asks for your database password
pnpm db:push               # applies supabase/migrations
```

`db:link` prompts for the database password from **Project Settings ->
Database**. To skip the prompt, set `SUPABASE_DB_PASSWORD` in your environment.
You can also run these directly with `pnpm exec supabase <command>`.

**Option B - SQL editor:** open the Supabase dashboard, go to **SQL Editor**,
paste each migration file in order, and run it.

The migrations are safe to run again: they use `if not exists`,
`drop policy if exists`, `create or replace`, `drop trigger if exists`, and
the backfill uses `on conflict do nothing`.

Running the first migration creates:

- `public.businesses` with one row per owner (`owner_id` unique)
- A unique `slug` per business, generated from its name (`adeshola-spa`,
  `adeshola-spa-2`, ...), which powers the public `/{slug}` page
- Row level security so owners can only read/write their own business, while
  anonymous visitors can read only `slug`, `name`, `business_type`, and `city`
- `create_business_for_new_owner()`, an `auth.users` insert trigger that builds
  the business row from `raw_user_meta_data`

Running the second migration creates:

- `public.services` and `public.bookings`, linked to `businesses`
- Row level security: authenticated owners manage only their own services
  and bookings; anonymous visitors can read only active services and never
  see bookings
- `create_public_booking(...)`, a security-definer RPC granted to `anon`; it
  validates input, confirms the service is active and belongs to the
  business, rejects past times and double-booked slots, and inserts the
  booking. Anonymous callers cannot read or modify bookings directly
- `seed_business_services()`, an `after insert` trigger plus backfill that
  gives every new business a starter three-service menu for its category

The service image migration allows JPEG, PNG, and WebP files up to 5 MB.
Images are publicly readable for the business booking page, while uploads and
deletions require an authenticated owner of the business.

## 3. Auth settings

In **Authentication -> Providers -> Email**, make sure Email is enabled.

If **Confirm email** is enabled (Supabase's default):

- Add `http://localhost:3000/auth/callback` (and your production
  `https://your-domain/auth/callback`) to **Authentication -> URL Configuration
  -> Redirect URLs**.
- Set **Site URL** to `http://localhost:3000` for local work.

Booka sends `emailRedirectTo` on signup, so the confirmation link lands on
`/auth/callback`, exchanges the PKCE code for a session, and forwards the owner
to `/backoffice`.

## 4. Verify it works

1. Run `pnpm dev` and open `http://localhost:3000/onboarding/business`.
2. Complete both onboarding steps.
3. With confirmations off you land in `/backoffice` immediately. With
   confirmations on you see a "check your inbox" panel, then sign in after
   confirming.
4. Open the booking URL shown in the backoffice, or visit `/{slug}` directly
   (for example `http://localhost:3000/adeshola-spa`). It should render that
   business's public page even in a signed-out browser, with the active
   services from the database.
5. Click a service's booking button, fill in the form, and submit. The
   request lands as a `pending` booking in the owner's backoffice.
6. Confirm or cancel the booking from the Backoffice -> Bookings tab.

If you see a database schema error in the form, run the migrations from
step 2.
