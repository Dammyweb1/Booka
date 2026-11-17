# Supabase data setup

The app's dashboard and public booking page use Supabase for persisted business data.

## Apply the database schema

1. Open the project in the Supabase Dashboard.
2. Open **SQL Editor** and create a new query.
3. Copy the full contents of [`supabase/schema.sql`](./supabase/schema.sql) into the editor and run it.
4. Confirm the query completes successfully before testing the app.

The script creates owner-scoped tables and RLS policies, creates business/service rows from Auth metadata for existing accounts, and installs a trigger for future signups. It also adds database functions used by public business pages and booking submissions.

The backoffice includes Barbing, Spa, and Hairdressing as service categories; categories are never bookable and have no customer-facing price. Owners choose which categories to show on the booking page, then create priced items and enable the items they want to offer under those categories. Only items in an enabled category that are themselves enabled and have a positive owner-set price appear or can be checked out. Customers can select multiple items, and the selected items, total duration, total price, and 30% Paystack deposit are reflected in the booking.

If you already applied an earlier version of this schema, run the updated full [`supabase/schema.sql`](./supabase/schema.sql) script again to create the add-on table, booking snapshot column, clear legacy starter prices, and update the booking functions.

## Email confirmation redirect

Onboarding requests that Supabase redirect confirmed owners to `/login` on the same origin where they registered. In **Authentication → URL Configuration → Redirect URLs**, allow the login URL for each environment (for example, `http://localhost:3000/login` and `https://your-domain.example/login`). In the **Confirm signup** email template, the confirmation CTA should use Supabase's `{{ .ConfirmationURL }}` so Supabase can verify the account and then apply the requested redirect. Do not hardcode the landing page as the CTA destination.

Booka expires signup confirmation links after 15 minutes without shortening password-recovery link expiry. To enable this, rerun the full [`supabase/schema.sql`](./supabase/schema.sql) script so Supabase records when each signup confirmation email is sent, then update the **Confirm signup** template CTA to use Booka's confirmation endpoint instead of `{{ .ConfirmationURL }}`:

```html
<a href="{{ .SiteURL }}/auth/confirm-signup?token_hash={{ .TokenHash }}&amp;email={{ .Email | urlquery }}">
  Confirm your email
</a>
```

Set the Supabase **Site URL** to the deployed Booka origin. The endpoint accepts a link only within 15 minutes, verifies it once, and sends expired or already-used links to a page where the owner can request a new one. Keep Supabase's shared Email OTP expiry at 900 seconds or longer; lowering it also shortens password-recovery and other email OTP lifetimes.

If a confirmation email does not arrive, check spam/junk and inspect the Supabase project's Auth/email logs for delivery errors. Supabase's default SMTP service is restricted to project team addresses and has a low sending limit; configure a custom SMTP provider under **Authentication → SMTP Settings** to deliver to business-owner addresses reliably. The onboarding completion screen can request a resend, but cannot override provider delivery restrictions or rate limits.

## Test the app

1. Start the app with `pnpm dev`.
2. Create an account through Booka onboarding. If email confirmation is enabled, confirm the email first.
3. Log in and open **Services**. Enable the categories you offer, then add one or more priced items under each and enable the items you want to offer.
4. Open the booking link, select one or more enabled items, and confirm the total duration, price, and 30% deposit update.
5. Complete a sandbox payment and confirm the selected items, total, and deposit appear in the backoffice and the relevant Supabase tables.

The dashboard requires an authenticated user linked to a business profile. If an account was created before the schema was applied, the SQL script attempts to backfill its business and selected services from Auth user metadata. If metadata was not saved for that account, register through Booka onboarding with a new email.

The publishable key is expected in the browser. Never put a Supabase secret key in `.env.local` under a `NEXT_PUBLIC_` variable. RLS policies restrict dashboard table access to each authenticated owner; public pages use narrowly scoped database functions instead of direct access to private tables.

Logo images are stored in the business profile row as data URLs and are limited to 100 KB.

## Password recovery email

The reset page requests a recovery email from Supabase Auth and verifies the six-digit recovery code before changing the password. In **Authentication → Email Templates → Reset Password**, make sure the message includes the OTP placeholder `{{ .Token }}` (for example: `Your Booka password reset code is {{ .Token }}`). The default link-based template may not display a code. Also check spam/junk and your project's email provider or SMTP delivery settings if the message doesn't arrive.

Supabase's default SMTP service only delivers to email addresses belonging to the project's organization team and is currently limited to 2 messages per hour. For other Gmail recipients, configure a custom SMTP provider under the project's Auth SMTP settings. See [Supabase's SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp). After SMTP is configured, request a new recovery email.
