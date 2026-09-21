# Step 11: Productionize Marketing Automation Background Processing

## What Changed
- **Database Queue & Concurrency Migration (`supabase/migrations/20260920000000_marketing_automation_production_queue.sql`)**:
  - Added `retry_count` (int, default 0) and `max_retries` (int, default 3) columns to `marketing_automation_executions`.
  - Added indexes on `(status, scheduled_for, updated_at)` and `(organization_id, status, scheduled_for)`.
  - Introduced PostgreSQL function `claim_due_marketing_automation_executions(p_limit, p_stale_seconds, p_organization_id)` with `FOR UPDATE SKIP LOCKED` for atomic concurrency-safe job claiming and stale job recovery.
- **Execution & Retry Engine (`src/services/marketing-executor.service.ts`)**:
  - Implemented atomic job claiming via database RPC with fallback query.
  - Implemented transient error classification and exponential backoff retry scheduling (`calculateRetryDelaySeconds`) with retry count tracking.
  - Implemented stale-processing recovery (>5 mins) with pre-send verification against `marketing_campaign_recipients` to eliminate duplicate sends.
  - Differentiated terminal business skips (`consent_revoked`, `order_completed`, `automation_inactive`, `customer_not_found`, `organization_mismatch`) from transient provider failures.
  - Enforced bounded batch processing (default 50) and remaining queue count calculation.
- **Scheduled Campaign Dispatcher (`src/services/marketing-dispatcher.service.ts`)**:
  - Added bounded batching (limit 10) and graceful skip handling for concurrent dispatcher runs.
- **API Routes Hardening**:
  - `src/app/api/admin/marketing/automations/process-due/route.ts`: Strict authentication via `Authorization: Bearer ${CRON_SECRET}` or admin session, query parameter limit/org scoping, and operational response contract (`{ processed, completed, skipped, failed, retried, remaining }`).
  - `src/app/api/admin/marketing/campaigns/dispatch-scheduled/route.ts`: Strict authentication, bounded batching, and operational summary return.
- **Admin Audit Trail & UI**:
  - Updated `src/app/admin/marketing/automations/[id]/page.tsx` with dynamic badge rendering for retrying executions (`Retrying (N/M)`).
  - Updated `src/types/marketing.ts` with `retry_count`, `max_retries`, and extended `ProcessDueAutomationsResult`.
- **Testing & Mock Infrastructure**:
  - Updated `tests/mocks/supabase.mock.ts` with `claim_due_marketing_automation_executions` RPC handler.
  - Extended `tests/marketing/marketing-automation-execution.test.ts` to 25 tests covering authentication, atomic concurrency, transient retries, stale recovery, multi-tenant isolation, batch limits, and scheduled campaign dispatch.

## Why
Prepares the existing marketing automation and scheduled campaign background processing engines to run in production under external cron schedulers (QStash, Vercel Cron, GitHub Actions) every 1–5 minutes with zero risk of duplicate sends, race conditions, or unhandled crashes, establishing a clean execution foundation ready for Inngest orchestration later.

## Files Touched
- `supabase/migrations/20260920000000_marketing_automation_production_queue.sql`
- `src/types/marketing.ts`
- `src/services/marketing-executor.service.ts`
- `src/services/marketing-dispatcher.service.ts`
- `src/app/api/admin/marketing/automations/process-due/route.ts`
- `src/app/api/admin/marketing/campaigns/dispatch-scheduled/route.ts`
- `src/app/admin/marketing/automations/[id]/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/marketing/marketing-automation-execution.test.ts`
- `docs/changes/admin/2026-09-20-marketing-automation-background-processing.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
`feat(marketing): productionize background automation queue and scheduled campaign dispatcher with atomic claiming and retries`
