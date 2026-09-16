# Production Error Monitoring & Runtime Diagnostics (Sentry)

## What Changed
- **Sentry SDK Installation & Next.js Architecture Configuration**:
  - Installed official `@sentry/nextjs` SDK (`^10.74.0`).
  - Created `next.config.mjs` wrapping the Next.js build with `withSentryConfig` from `@sentry/nextjs/config` with tree-shaking and silent build options.
  - Created root-level `instrumentation.ts` implementing Next.js `register()` to dynamically load server and edge Sentry configurations.
  - Created runtime Sentry initialization modules:
    - `sentry.client.config.ts`: Client-side error tracking with PII scrubbing.
    - `sentry.server.config.ts`: Node.js server-side error tracking with header and payload redaction.
    - `sentry.edge.config.ts`: Edge runtime error tracking with identical security filters.
- **Centralized Error Monitoring & Privacy Scrubber (`src/lib/observability/error-monitoring.ts`)**:
  - Implemented `sanitizeData` and `sanitizeHeaders` to deeply redact sensitive fields (`password`, `token`, `secret`, `key`, `authorization`, `cookie`, `card`, `cvv`, `pin`, `x-paystack-signature`, `verif-hash`) and mask Bearer authorization strings.
  - Implemented `captureError` and `recordBreadcrumb` with structured diagnostic tagging (`operation`, `eventId`, `orderId`, `executionId`, `provider`).
  - Implemented `isMonitoringEnabled` ensuring offline determinism and zero network calls in test environments (`NODE_ENV === 'test'` or `VITEST=true`) or when DSN is unset.
- **Error Boundaries for Unhandled Exceptions**:
  - Created `src/app/global-error.tsx` for root unhandled application exceptions.
  - Created `src/app/error.tsx` for storefront route errors using the design system's `EmptyState` component.
  - Created `src/app/admin/error.tsx` for backoffice portal error recovery with retry actions.
- **High-Severity Domain & Integration Diagnostics**:
  - `src/services/events.service.ts`: Added operational breadcrumbs and Sentry exception capture on domain event processing failures.
  - `src/app/api/webhooks/paystack/route.ts` & `src/app/api/webhooks/flutterwave/route.ts`: Added breadcrumbs and structured error capturing for payment webhook processing exceptions.
  - `src/services/order-state-machine.service.ts`: Added order transition breadcrumbs and error capture for inventory reservation release/commit failures.
  - `src/services/marketing-executor.service.ts`: Captured automation execution failures and immediate dispatch errors.
- **Environment & Testing**:
  - Updated `.env.example` with `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, and `SENTRY_RELEASE`.
  - Created `tests/observability/error-monitoring.test.ts` verifying data sanitization, header redaction, test isolation, and production dispatch.

## Why
- Provide enterprise-grade observability and runtime diagnostics for production incidents without exposing customer passwords, payment details, or authentication credentials.
- Preserve the existing `audit_logs` and `domain_events` transactional architectures without introducing external event buses or modifying database schemas.

## Files Touched
- `package.json`
- `next.config.mjs`
- `instrumentation.ts`
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `.env.example`
- `src/lib/observability/error-monitoring.ts`
- `src/app/global-error.tsx`
- `src/app/error.tsx`
- `src/app/admin/error.tsx`
- `src/services/events.service.ts`
- `src/services/order-state-machine.service.ts`
- `src/services/marketing-executor.service.ts`
- `src/app/api/webhooks/paystack/route.ts`
- `src/app/api/webhooks/flutterwave/route.ts`
- `tests/observability/error-monitoring.test.ts`
- `docs/changes/quality-and-tests/2026-09-16-sentry-error-monitoring.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
feat(observability): implement Sentry production error monitoring and runtime diagnostics
