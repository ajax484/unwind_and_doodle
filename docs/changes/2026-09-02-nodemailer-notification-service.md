# Nodemailer Integration in Notification Service & Team Permissions Test Fix

## What Changed
- Installed `nodemailer` runtime dependency and `@types/nodemailer` dev dependency.
- Updated `src/lib/config.ts` and `.env.example` to support SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) with fallback to JSON transport in test/development environments.
- Updated `src/services/notification.service.ts` to replace placeholder email dispatching with genuine Nodemailer transactional delivery, including:
  - Responsive, styled HTML & plain-text email templates for `order_confirmation`, `order_shipped`, `stock_alert`, `team_invitation`, and `review_request`.
  - Configurable / injectable transporter with session idempotency tracking.
  - Error handling and logging.
- Fixed team permissions issue and test fixture:
  - Added `.gt()`, `.lt()`, and `.neq()` query operator support to `tests/mocks/supabase.mock.ts`.
  - Normalized mock fixture member properties in `tests/teams-and-permissions.test.ts`.
  - Ensured user self-role modification guard check takes precedence in `src/services/team.service.ts`.
- Added a full test suite `tests/notification.service.test.ts` covering HTML rendering, nodemailer transport dispatching, idempotency keys, error handling, and domain event handlers.

## Why
- Replace mock log statements with production-ready transactional email delivery using standard SMTP providers while guaranteeing offline development and testing work reliably with zero external network dependencies.
- Ensure all 31 test suites pass cleanly with proper outbox event listener coverage and robust query builder mocking.

## Files Touched
- `package.json`
- `package-lock.json`
- `.env.example`
- `src/lib/config.ts`
- `src/services/notification.service.ts`
- `src/services/team.service.ts`
- `tests/mocks/supabase.mock.ts`
- `tests/teams-and-permissions.test.ts`
- `tests/notification.service.test.ts`
- `docs/changes/2026-09-02-nodemailer-notification-service.md`

## Follow-ups / Known Issues
- In production, set live SMTP credentials (e.g., Mailgun, SendGrid, Amazon SES, Postmark) in the environment variables.

## Commit Message
```text
feat: integrate nodemailer for transactional email notifications and fix team permission test mocks

- install nodemailer and @types/nodemailer
- update AppConfig with SMTP configuration and .env.example
- implement responsive HTML and text email templates for order, shipping, stock, and team invitations
- wire dispatchTransactionalEmail to nodemailer transport with idempotency caching
- fix mock Supabase query operators (gt, lt, neq) and team permission self-update check order
- add unit tests in tests/notification.service.test.ts
```
