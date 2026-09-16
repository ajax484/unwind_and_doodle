# Marketing Step 2B: Marketing Automation Execution

## What Changed
- **Database Schema**: Added migration `supabase/migrations/20260916120000_marketing_automation_executions.sql` introducing `marketing_automation_executions` table with strict uniqueness constraint `UNIQUE (automation_id, domain_event_id)` and status state machine (`pending`, `processing`, `completed`, `failed`, `skipped`). Includes indexes on `(status, scheduled_for)` and RLS policies for tenant organization scoping.
- **Execution Service (`src/services/marketing-executor.service.ts`)**:
  - Implemented server-side delay calculation (`calculateScheduledTime`) supporting minutes, hours, and days.
  - Implemented customer context resolution (`resolveEventCustomer`) resolving contact details and current marketing consent from `customer.created`, `order.created`, `checkout.abandoned`, and `review.submitted` domain events.
  - Implemented event trigger ingestion (`handleMarketingAutomationEvent`) with pre-flight and database-level idempotency checks to prevent duplicate scheduling/execution.
  - Implemented just-in-time safety verification (`executeSingleAutomation`):
    - Concurrency protection claiming pending runs.
    - Live marketing consent re-verification to prevent delivery if consent was revoked between scheduling and execution.
    - Abandoned checkout safety check verifying no completed orders occurred for the customer after checkout abandonment.
  - Integrated email delivery with `getMarketingEmailProvider().sendEmail(...)`, link rewriting, and open tracking pixel injection.
  - Implemented cron queue worker (`processDueMarketingAutomations`) with failure isolation to execute scheduled due jobs.
- **Domain Event Ingestion Hook (`src/services/events.service.ts`)**:
  - Wired `publishDomainEvent` to asynchronously invoke `handleMarketingAutomationEvent` after domain event creation without blocking transaction commits.
- **Cron / Scheduler Endpoint (`src/app/api/admin/marketing/automations/process-due/route.ts`)**:
  - Exposes POST endpoint to process due automations, authenticated via `Bearer ${CRON_SECRET}` or admin session.
- **Executions History API & Admin UI**:
  - Added `src/app/api/admin/marketing/automations/[id]/executions/route.ts` returning real execution history.
  - Added live audit trail table on `/admin/marketing/automations/[id]` showing real status badges, execution timestamps, recipient email, and skip reasons without mock analytics.
- **Mock & Test Coverage**:
  - Updated `tests/mocks/supabase.mock.ts` with `marketing_automation_executions` store support.
  - Added comprehensive test suite `tests/marketing/marketing-automation-execution.test.ts` (17 tests covering delay calculation, immediate/delayed executions, idempotency, consent races, abandoned checkout safety, cron processing, and API route security).

## Why
Step 2A delivered the automation builder and trigger matching foundation, but automations could not yet execute. Step 2B closes the loop by connecting commerce domain events directly to the marketing delivery pipeline with production-grade idempotency, scheduling, just-in-time consent compliance, and real-time execution audit visibility.

## Files Touched
- `supabase/migrations/20260916120000_marketing_automation_executions.sql`
- `src/types/marketing.ts`
- `src/services/marketing-executor.service.ts`
- `src/services/events.service.ts`
- `src/app/api/admin/marketing/automations/process-due/route.ts`
- `src/app/api/admin/marketing/automations/[id]/executions/route.ts`
- `src/app/admin/marketing/automations/[id]/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/marketing/marketing-automation-execution.test.ts`
- `docs/changes/README.md`
- `docs/changes/admin/2026-09-16-marketing-automation-execution.md`

## Follow-ups / Known Issues
None

## Commit Message
`feat(marketing): implement step 2B marketing automation execution with domain events and JIT checks`
