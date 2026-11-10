# Booka Service Platform
## System Documentation

**Version:** 1.0  
**Status:** Stage 4 implementation in progress; end-to-end QA and production readiness remain  
**Last updated:** November 2026

---

## 1. Product Overview

Booka is a service-booking platform for independent businesses. It helps businesses present their services, receive appointments, manage clients, track revenue, and understand booking activity through a business-owner backoffice.

The project has an interactive customer and business-owner experience, with Supabase Auth and database persistence integrated for core onboarding, dashboard, and booking flows.

### Product goals

- Help customers discover and book services quickly.
- Give business owners a clear operational command center.
- Make appointments, clients, revenue, and utilization easy to understand.
- Create a premium, trustworthy experience for independent service businesses.
- Provide a foundation for real authentication, persistence, notifications, and analytics.

---

## 2. Current SDLC Position

The project is in **Stage 4: Implementation**. Core Supabase authentication and persistence have been wired into the application; the project is not yet production-ready.

### Implemented or substantially defined

- Product direction and primary user types
- Landing page and brand direction
- Supabase email/password registration, login, and password recovery flows
- Supabase schema, owner-scoped row-level security, signup trigger, and public booking functions (`supabase/schema.sql`)
- Supabase-backed business settings, services, appointments, clients, and notifications
- Customer booking flow that reads public business/service data and persists bookings in Supabase
- Business-owner backoffice information architecture
- Persisted notifications and owner-profile interaction patterns
- Usage and utilization analytics concept
- Shared visual language, typography, spacing, and color direction
- Responsive prototype validation at the active desktop viewport
- TypeScript checks and production build pass

### Still required before production readiness

- Verify Supabase schema and policies against the deployed project, and complete end-to-end QA for signup, confirmation, login, password recovery, dashboard persistence, and public booking
- Harden appointment availability, collision prevention, cancellation, and rescheduling behavior
- Review public booking abuse protections and add rate limiting/CAPTCHA as appropriate
- Server-enforced route protection and login rate limiting
- Verify email delivery using configured SMTP; select and configure production email sending
- Payment and payout decisions, if required
- Automated tests, accessibility QA, and security/privacy review
- Deployment, monitoring, backups, and incident handling

---

## 3. Users and Roles

### Business owner

The business owner creates and manages a service business. They can:

- Complete business onboarding.
- Configure services and availability.
- View appointments and appointment statuses.
- Manage client relationships.
- Review revenue and utilization analytics.
- Receive booking notifications.
- Manage their account and log out.

### Customer

The customer discovers a business and books a service. The production customer experience should support:

- Browsing business information.
- Viewing available services.
- Selecting an available appointment time.
- Providing contact details.
- Receiving booking confirmation.
- Managing or cancelling a booking according to business policy.

### Platform administrator

An administrator role is not implemented in the current prototype. If required, it should be designed separately with access to platform health, businesses, users, disputes, and moderation tools.

---

## 4. Primary User Journeys

### 4.1 Business onboarding

1. Business owner opens the onboarding entry point.
2. Owner enters business and owner details.
3. Owner creates a password.
4. Owner selects offered services.
5. Owner reviews the setup and completes registration.
6. Owner is taken to the business backoffice.

### 4.2 Business-owner login

1. Owner opens the business login page.
2. Owner enters email and password.
3. The system authenticates the owner.
4. The owner is redirected to the backoffice overview.
5. Invalid credentials show a clear, accessible error state.

### 4.3 Appointment booking

1. Customer selects a business.
2. Customer chooses a service.
3. Customer selects an available date and time.
4. Customer submits contact details.
5. The system creates a booking.
6. The customer receives confirmation.
7. The business owner receives a notification.

### 4.4 Business-owner operations

1. Owner opens the overview dashboard.
2. Owner sees revenue, paid bookings, returning clients, and open availability.
3. Owner reviews the dynamic utilization chart.
4. Owner checks today’s schedule and payment states.
5. Owner opens notifications for new appointment activity.
6. Owner uses the profile menu to log out.

---

## 5. Interface Architecture

### Public and entry screens

- Landing page
- Business onboarding entry
- Business-owner login
- Business-owner reset password / account recovery
- Business-specific customer booking page (/[slug]) — private direct vanity link shared by studio owner (e.g., booka.app/the-cut-club)
- Frequently Asked Questions (FAQ)

### Business-owner screens

- Onboarding: owner details
- Onboarding: services
- Onboarding: completion
- Backoffice overview
- Appointments
- Clients
- Insights
- Notifications
- Owner profile menu

### Current visual system

- Warm cream canvas for primary surfaces
- Espresso background for navigation and high-contrast panels
- Terracotta for primary actions and important states
- Sage for healthy, confirmed, and successful states
- DM Sans for interface and paragraph text
- Fraunces for headings and editorial display text
- Rounded cards and pill controls
- Responsive flexbox and grid layouts

---

## 6. Backoffice Overview Design

The backoffice overview is the primary business-owner command center.

### Header

- Business identity indicator
- Workspace label and plan indicator
- Date and context label
- Owner greeting
- System health status
- Period selector
- New appointment action
- Notification bell
- Owner profile menu with logout

### KPI area

- Net revenue
- Paid bookings
- Returning clients
- Open slots

### Usage analytics

The prototype includes a dynamic GSAP-animated bar chart with:

- 7-day, 30-day, and 90-day ranges
- Total booking bars
- Paid session bars
- Utilization percentage
- Best-day summary
- Paid conversion summary

In production, this chart must use persisted booking and payment data rather than static prototype values.

### Operations area

- Today’s appointment schedule
- Appointment time
- Client name and initials
- Service name
- Payment amount
- Appointment status
- Calendar entry point

### Revenue and insight area

- Revenue mix by service category
- Client return activity
- Workspace setup checklist
- Recommended next business action

---

## 7. Proposed Production Data Model

The following entities should be reviewed and finalized before backend implementation.

### User

- `id`
- `email`
- `passwordHash` or external auth identifier
- `firstName`
- `lastName`
- `role`
- `createdAt`
- `updatedAt`

### Business

- `id`
- `ownerId`
- `name`
- `slug`
- `description`
- `location`
- `timezone`
- `status`
- `createdAt`
- `updatedAt`

### Service

- `id`
- `businessId`
- `name`
- `description`
- `durationMinutes`
- `price`
- `isActive`
- `createdAt`
- `updatedAt`

### Availability

- `id`
- `businessId`
- `dayOfWeek`
- `startTime`
- `endTime`
- `isActive`

### Appointment

- `id`
- `businessId`
- `serviceId`
- `customerId`
- `startAt`
- `endAt`
- `status`
- `paymentStatus`
- `amount`
- `notes`
- `createdAt`
- `updatedAt`

### Notification

- `id`
- `recipientUserId`
- `appointmentId`
- `type`
- `title`
- `message`
- `readAt`
- `createdAt`

### Analytics event

- `id`
- `businessId`
- `eventType`
- `appointmentId`
- `metadata`
- `createdAt`

---

## 8. Authentication and Authorization

Onboarding creates an email/password account through Supabase Auth. The submitted business profile and selected services are saved as user metadata, then a database trigger creates the business and service rows. Supabase handles password storage. Email confirmation behavior depends on the project's Auth settings. Password recovery requests and OTP verification use Supabase Auth; delivery depends on the project's email template and SMTP configuration.

The dashboard loads and saves business settings, services, appointments, clients, and notifications in Supabase. Public booking pages read public business/service details through a restricted database function and create appointments through a validated database function. Owner-scoped row-level security policies protect dashboard data. Dashboard routes redirect unauthenticated users to login.

Run `supabase/schema.sql` in the Supabase SQL Editor before testing. The script creates the tables, row-level security policies, signup trigger, public booking functions, and realtime publication entries. Dashboard changes and booking data are persisted in Supabase rather than browser local storage. The production security review should still validate the schema and public RPC functions in the target Supabase project.

Production follow-up still includes server-enforced route protection, login rate limiting, and operational review of public booking abuse controls. Every query that touches business-owner data must be scoped to the authenticated owner and business.

---

## 9. Notification Requirements

The notification bell reads persisted notifications from Supabase, and customer bookings create notification rows. Production behavior should also include:

- A notification when a customer books an appointment.
- A notification when an appointment is cancelled or rescheduled.
- Unread count on the bell.
- Read and unread states.
- Notification list with timestamps.
- Deep link to the relevant appointment.
- Optional email notification preferences.

Notifications are currently persisted in Supabase and refreshed through Realtime. Delivery of optional email notifications and deep links to appointments remain follow-up work.

---

## 10. API and Backend Boundaries

Suggested server capabilities:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/businesses/:businessId`
- `PATCH /api/businesses/:businessId`
- `GET /api/businesses/:businessId/services`
- `POST /api/businesses/:businessId/services`
- `GET /api/businesses/:businessId/appointments`
- `POST /api/businesses/:businessId/appointments`
- `PATCH /api/appointments/:appointmentId`
- `GET /api/businesses/:businessId/notifications`
- `PATCH /api/notifications/:notificationId/read`
- `GET /api/businesses/:businessId/analytics`

All routes must validate input, authorize the requester, and return consistent error responses.

---

## 11. Security and Privacy Requirements

- Use secure, httpOnly session cookies.
- Enforce same-site and secure cookie attributes in production.
- Validate all user-controlled input on the server.
- Use parameterized database queries.
- Scope data by authenticated user and business.
- Avoid exposing private client data in public responses.
- Rate-limit authentication and booking endpoints.
- Add baseline security headers.
- Record security-sensitive events without storing secrets.
- Define data retention and deletion behavior.
- Provide a privacy policy and terms before public launch.

---

## 12. Testing Strategy

### Unit tests

- Pricing and duration calculations
- Availability calculations
- Appointment status transitions
- Notification creation
- Analytics aggregation
- Form validation

### Integration tests

- Registration and login
- Protected route access
- Appointment creation
- Appointment cancellation
- Notification read state
- Owner data scoping

### End-to-end tests

- Business onboarding to backoffice
- Customer booking journey
- Owner notification journey
- Profile logout journey
- Dashboard chart range switching

### Non-functional QA

- Responsive layouts
- Keyboard navigation
- Screen-reader labels
- Color contrast
- Browser compatibility
- Performance and layout stability
- Security and privacy review

---

## 13. Deployment and Operations

Before production release, define:

- Production hosting and domain
- Database and backup strategy
- Environment-variable management
- Preview and production environments
- CI/CD checks
- Migration process
- Error monitoring
- Application logs
- Uptime monitoring
- Incident response
- Rollback process

The current preview is a design and interaction environment, not a production deployment.

---

## 14. Open Decisions

The following decisions still require confirmation:

1. Which database and authentication provider will power production?
2. Are payments required at booking time or only recorded manually?
3. What are the cancellation, rescheduling, and refund rules?
4. Can one owner manage multiple businesses?
5. Will businesses have staff members with separate permissions?
6. Should customers create accounts or book as guests?
7. Which notification channels are required: in-app, email, SMS, or all three?
8. What timezone and currency rules apply per business?
9. What analytics events and reporting periods are required?
10. What privacy, retention, and deletion requirements apply?

---

## 15. Recommended Next Steps

1. Approve this documentation and resolve the open decisions.
2. Finalize the database schema and authentication architecture.
3. Connect the required production integrations.
4. Replace prototype data with server-backed data.
5. Implement booking and notification workflows.
6. Add automated tests for critical journeys.
7. Run security, accessibility, and responsive QA.
8. Configure deployment, monitoring, and backups.
9. Release to a controlled production beta.
10. Review feedback and iterate.
