# Booka

Booka is a service-booking platform for independent businesses. Business owners can set up a business profile, manage services and appointments, and share a booking page with their customers.

## Features

- Business onboarding and Supabase email/password authentication
- Business dashboard for managing business details, services, appointments, and clients
- Public booking pages for individual businesses
- Password recovery flow
- Responsive landing page and product information pages
- Paystack checkout endpoints currently restricted to sandbox test mode

## Tech stack

- Next.js 16 and React 19
- TypeScript
- Supabase Auth and Postgres
- Tailwind CSS
- Paystack sandbox integration

## Getting started

### Prerequisites

- Node.js compatible with the installed Next.js version
- pnpm
- A Supabase project

### Install dependencies

```bash
pnpm install
```

### Configure environment variables

Create a `.env.local` file in the project root and set the variables needed by the features you want to run:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Keep secret values private. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `PAYSTACK_SECRET_KEY` in browser code, commit them to GitHub, or assign them to a `NEXT_PUBLIC_` variable. The `.gitignore` file excludes `.env*` files.

Browser Supabase sessions are stored in browser storage rather than request cookies to avoid oversized Vercel request headers. After upgrading from a cookie-based deployment, clear the site's existing cookies once and sign in again.

### Set up Supabase

1. In your Supabase project, open **SQL Editor**.
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql).
3. Configure Auth email confirmation and password recovery email settings as needed.

See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for the full setup and manual testing instructions.

### Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
pnpm build
pnpm start
```

## Project status

The project is in the implementation stage. Core authentication, persistence, dashboard, and booking flows are implemented, but end-to-end testing and production-readiness work remain. Before serving real users, verify the deployed Supabase schema and policies, test the complete user flows, review security and accessibility, and configure production email, monitoring, and backups. Payment processing is currently limited to Paystack sandbox mode.

## Documentation

- [Supabase setup and testing](./SUPABASE_SETUP.md)
- [System documentation and current SDLC status](./SYSTEM_DOCUMENTATION.md)

## License

No license has been specified yet.
