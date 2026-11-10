# Supabase data setup

The app's dashboard and public booking page use Supabase for persisted business data.

## Apply the database schema

1. Open the project in the Supabase Dashboard.
2. Open **SQL Editor** and create a new query.
3. Copy the full contents of [`supabase/schema.sql`](./supabase/schema.sql) into the editor and run it.
4. Confirm the query completes successfully before testing the app.

The script creates owner-scoped tables and RLS policies, creates business/service rows from Auth metadata for existing accounts, and installs a trigger for future signups. It also adds database functions used by public business pages and booking submissions.

## Test the app

1. Start the app with `pnpm dev`.
2. Create an account through Booka onboarding. If email confirmation is enabled, confirm the email first.
3. Log in and edit business settings or services in the dashboard.
4. Open the booking link and submit a test appointment.
5. Confirm the changes appear in the dashboard and in **Table Editor** for the relevant Supabase tables.

The dashboard requires an authenticated user linked to a business profile. If an account was created before the schema was applied, the SQL script attempts to backfill its business and selected services from Auth user metadata. If metadata was not saved for that account, register through Booka onboarding with a new email.

The publishable key is expected in the browser. Never put a Supabase secret key in `.env.local` under a `NEXT_PUBLIC_` variable. RLS policies restrict dashboard table access to each authenticated owner; public pages use narrowly scoped database functions instead of direct access to private tables.

Logo images are stored in the business profile row as data URLs and are limited to 100 KB.

## Password recovery email

The reset page requests a recovery email from Supabase Auth and verifies the six-digit recovery code before changing the password. In **Authentication → Email Templates → Reset Password**, make sure the message includes the OTP placeholder `{{ .Token }}` (for example: `Your Booka password reset code is {{ .Token }}`). The default link-based template may not display a code. Also check spam/junk and your project's email provider or SMTP delivery settings if the message doesn't arrive.

Supabase's default SMTP service only delivers to email addresses belonging to the project's organization team and is currently limited to 2 messages per hour. For other Gmail recipients, configure a custom SMTP provider under the project's Auth SMTP settings. See [Supabase's SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp). After SMTP is configured, request a new recovery email.
