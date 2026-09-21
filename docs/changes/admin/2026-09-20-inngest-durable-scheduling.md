# Migrate Delayed Marketing Automations to Inngest Durable Scheduling

## What Changed

- **Database Engine Migration**: Created migration [20260920120000_marketing_automation_inngest_scheduling.sql](file:///c:/Users/USER/work/unwind_and_doodle/supabase/migrations/20260920120000_marketing_automation_inngest_scheduling.sql) adding the `engine` column (`inngest` vs `legacy`) to `marketing_automation_executions`, updated index `idx_marketing_automation_executions_engine_status_due`, and updated RPC `claim_due_marketing_automation_executions` to strictly filter for legacy records (`engine IS NULL OR engine = 'legacy'`).
- **Fan-Out Orchestration**: Updated [marketing.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/inngest/functions/marketing.ts) so `marketingEventOrchestrator` matches active tenant automations, creates `marketing_automation_executions` records with `status: 'pending'` and `engine: 'inngest'` enforcing uniqueness on `(automation_id, domain_event_id)`, and fans out independent events (`marketing/automation.execute`) via `step.sendEvent()`.
- **Per-Execution Durable Runner**: Implemented `marketingAutomationRunner` in [marketing.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/inngest/functions/marketing.ts):
  - **Zero-Delay Automations**: Skips `step.sleep` and immediately invokes `executeSingleAutomation()`.
  - **Delayed Automations**: Validates delay formats and executes durable sleep `step.sleep('durable-delay', duration)`.
  - **Abandoned Checkout Event Waiting**: Uses `step.waitForEvent()` to detect qualifying purchases during the sleep window and skips sending if completed.
  - **Just-In-Time Execution on Wake**: Executes `executeSingleAutomation()` verifying customer marketing consent, active automation status, tenant boundary, cart purchase completion, and duplicate-send protection.
- **Next.js Inngest Endpoint**: Registered `marketingAutomationRunner` alongside `marketingEventOrchestrator` in [route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/inngest/route.ts).
- **Migration & Isolation Safety**: Updated [marketing-executor.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/marketing-executor.service.ts) to support `isMarketingAutomationInngestEnabled()` and isolate legacy polling from Inngest-managed records.
- **Automated Tests**: Updated [inngest-marketing-workflow.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/inngest/inngest-marketing-workflow.test.ts) with 14 comprehensive tests covering delay formatting, fan-out, zero-delay, durable sleep, abandoned checkout cancellation, JIT checks on wake, and legacy queue isolation.

## Why

To migrate delayed marketing automation executions from database cron polling to Inngest durable sleeps and event coordination, while keeping `marketing_automation_executions` as the database source-of-truth and preserving all business logic inside `marketing-executor.service.ts`.

## Files Touched

- `supabase/migrations/20260920120000_marketing_automation_inngest_scheduling.sql`
- `src/types/marketing.ts`
- `src/inngest/client.ts`
- `src/inngest/functions/marketing.ts`
- `src/app/api/inngest/route.ts`
- `src/services/marketing-executor.service.ts`
- `tests/mocks/supabase.mock.ts`
- `tests/inngest/inngest-marketing-workflow.test.ts`
- `docs/changes/admin/2026-09-20-inngest-durable-scheduling.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

`feat(marketing): migrate delayed marketing automations to Inngest durable scheduling`
