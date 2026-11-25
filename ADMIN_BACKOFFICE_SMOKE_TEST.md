# Admin Backoffice Smoke-Test Runbook

Use this manual runbook after deploying the admin app and applying the current Supabase schema. Run the tests in a sandbox or with clearly identified test records. Do not use real customer data or initiate live payments.

## 1. Record the test

- Date/time and timezone:
- Tester:
- Vercel deployment URL and deployment ID:
- Supabase project/environment:
- Paystack mode: **Sandbox**
- Result: Pass / Fail / Blocked

For each test, record the result, the time, and any relevant record ID. Do not include passwords, access tokens, API keys, or full payment details in evidence.

## 2. Pre-flight checks

- [ ] Latest Vercel deployment is **Ready** and serves the expected domain.
- [ ] Supabase reports the schema query completed successfully.
- [ ] Vercel has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, and `CRON_SECRET` configured for the production environment.
- [ ] `PAYSTACK_SECRET_KEY` is a sandbox key beginning with `sk_test_`.
- [ ] Paystack's sandbox webhook points to `https://<deployed-domain>/api/payments/webhook`.
- [ ] Supabase Auth's Site URL and redirect allowlist include the deployed admin-auth redirect if testing invitations.
- [ ] A superadmin account is available, with access to its MFA authenticator.
- [ ] A dedicated test studio and test customer are available. Do not restrict a real customer's account.

If an environment variable was added or changed, redeploy before continuing.

## 3. Admin login and access

1. Open `https://<deployed-domain>/admin/auth`.
2. Sign in as an active superadmin and complete the authenticator challenge.
3. Confirm the admin dashboard loads and the role-appropriate navigation appears.
4. Sign out, then sign in again to check the normal login flow.

**Pass:** Active admins can sign in; required MFA is enforced; the dashboard loads. Inactive or non-admin accounts cannot access admin functions.

## 4. Support tickets

1. Open **Support**.
2. Create a uniquely named test ticket, e.g. `SMOKE-YYYYMMDD-HHMM`.
3. Search for it, change its priority and status, add a resolution/internal note, and save.
4. Reload the page and confirm the changes persist.

**Pass:** The ticket is searchable and its updated fields persist. Record the ticket ID.

## 5. Customer booking restriction

1. Open **Customers** and find the dedicated test customer at the test studio.
2. Restrict booking access with a clear test reason.
3. Attempt a new booking at that studio using the same customer phone number or email.
4. Confirm the booking is rejected.
5. Restore the customer's booking access and confirm a new test booking can proceed; cancel it if the workflow allows.

**Pass:** The restriction blocks a new booking only for that studio and the restriction can be removed. Do not leave a test restriction active.

## 6. Financial reports and exports

1. Open **Financial reports** and generate a report for a known date range.
2. Confirm it appears in the saved reports list and inspect booking, deposit, refund, and payout totals against known test records.
3. Export saved reports and confirm the CSV opens and includes the expected columns.
4. Test exports from **Booking payments**, **Payouts**, and **Audit logs**. Confirm each file downloads and contains the records matching the selected filters.

**Pass:** Reports generate and exports contain coherent data with amounts labeled in the expected currency/units.

## 7. Sandbox payment webhook and monitoring

1. Complete a Paystack sandbox booking payment, or use Paystack's sandbox webhook test facility if available.
2. Open **System health** and refresh the event list.
3. Find the event and confirm it is marked `processed`; inspect any error details if it is `failed`.
4. If testing a sandbox refund, initiate it only against a dedicated test booking and confirm the refund event updates the refund and booking outcome.

**Pass:** The event is recorded and processed without an error. This page reports Booka's stored webhook processing; it is not a general Supabase or Paystack availability monitor.

## 8. Admin team access (optional; use a test account)

1. Invite a dedicated test email with a non-superadmin role.
2. Confirm the invitation arrives, accept it, and verify first sign-in and MFA setup.
3. Confirm the test admin sees only the navigation allowed for its role.
4. Deactivate the test admin and verify it can no longer use admin features; reactivate it if needed.

Never deactivate your own account or the last active superadmin.

## 9. Scheduled report check

- The Vercel Cron schedule is **08:15 UTC daily (09:15 Nigeria time)** and generates the previous day's report.
- Confirm `CRON_SECRET` is configured and check Vercel function logs after the scheduled run.
- Confirm the previous day's report appears in **Financial reports**.
- If testing before the next scheduled run, use the manual report-generation test in section 6; do not expose `CRON_SECRET` in a browser, screenshot, ticket, or chat.

## 10. Completion and incident notes

Mark the deployment **Pass** only if all required tests pass. Mark a test **Blocked** if it depends on an unavailable sandbox account, Auth email delivery, or scheduled run; note the dependency and retest later.

If a test fails:

1. Record the failing page/API, time, test record ID, and visible error.
2. Check the Vercel function/build logs and Supabase logs for the same time.
3. Do not retry an uncertain Paystack refund until its status is reconciled in Paystack; an uncertain refund reservation intentionally prevents a possible duplicate refund.
4. Keep secrets and personal customer details out of screenshots and reports.

Financial reports are stored in the backoffice; email delivery is not configured.
