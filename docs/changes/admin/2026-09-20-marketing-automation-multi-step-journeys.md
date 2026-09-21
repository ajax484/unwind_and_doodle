# Step 14: Event Cancellation & Multi-Step Marketing Journeys

## What Changed

1. **Database Migration (`supabase/migrations/20260920180000_marketing_automation_journeys.sql`)**:
   - Added `current_step_id` (TEXT), `step_states` (JSONB, default `[]`), and `config_snapshot` (JSONB) to `marketing_automation_executions`.
   - Added performance index `idx_marketing_automation_executions_journey` on `(organization_id, status, current_step_id)`.

2. **TypeScript Domain Models (`src/types/marketing.ts`)**:
   - Defined `MarketingJourneyStep` supporting `send_email`, `delay`, and `wait_for_event` step types.
   - Defined `MarketingJourneyStepState` tracking step-by-step progress, timestamps, status (`pending`, `completed`, `skipped`, `cancelled`, `failed`), and output/skip reasons.
   - Extended `MarketingAutomationConfig` to accept `steps?: MarketingJourneyStep[]` alongside legacy single-step action/delay fields.
   - Extended `MarketingAutomationExecution` to include `current_step_id`, `step_states`, and `config_snapshot`.

3. **Automation Normalization & Deterministic Enrollment (`src/services/marketing-automation.service.ts`)**:
   - Implemented `normalizeAutomationSteps(config)` helper to translate legacy `{ delay, action }` automations into canonical `MarketingJourneyStep[]` representation.
   - Ensured backward compatibility for all existing single-step automations.

4. **Service-Level Execution & JIT Step Evaluation (`src/services/marketing-executor.service.ts`)**:
   - Added `executeJourneySendStep` and enhanced `executeSingleAutomation` with `options.targetCampaignId`, `options.stepId`, and `options.stepIndex`.
   - Implemented step-level state recording in `marketing_automation_executions.step_states`.
   - Enforced JIT checks before every single dispatch step: marketing consent, active automation status, and tenant isolation.
   - Handled terminal skips (`consent_revoked`, `automation_disabled`, `organization_mismatch`) to cleanly halt subsequent journey steps without infinite retry loops.

5. **Inngest Durable Workflow Orchestration (`src/inngest/functions/marketing.ts`)**:
   - Updated `marketingEventOrchestrator` to snapshot the full automation config and journey steps into `marketing_automation_executions.config_snapshot` upon enrollment.
   - Updated `marketingAutomationRunner` to sequentially iterate through snapshotted journey steps:
     - `delay`: calls `step.sleep('journey-step-delay-<id>', duration)`.
     - `wait_for_event`: uses `step.waitForEvent('wait-for-event-<id>', { event, timeout, match: 'data.domainEvent.customer_id', if: ... })` with tenant verification (`data.domainEvent.organization_id === organizationId`). If the matching cancellation event arrives, the journey immediately transitions to `cancelled` and records `event_cancelled`.
     - `send_email`: calls `step.run('journey-send-email-<id>')` executing `executeJourneySendStep`. If terminal skip is returned, halts remaining journey steps gracefully.
   - Emits standardized structured audit logs for observability: `[inngest_marketing.journey_started]`, `[inngest_marketing.journey_cancelled_by_event]`, `[inngest_marketing.journey_halted]`, `[inngest_marketing.journey_completed]`.

6. **Admin Dashboard UI Integration (`src/app/admin/marketing/automations/[id]/page.tsx`)**:
   - Updated execution history table to render multi-step journey progress badges displaying current step status, step IDs, and completion ratios.

7. **Comprehensive Inngest Journey Test Suite (`tests/inngest/inngest-marketing-workflow.test.ts`)**:
   - 8 integration tests covering step normalization, multi-step welcome sequences, mid-journey consent revocation halts, abandoned checkout event cancellation (`order.created`), multi-tenant isolation, and enrollment configuration snapshotting.

## Why

- To empower marketers with automated customer journeys (e.g., Abandoned Cart recovery, Welcome on-boarding sequences, Post-purchase follow-ups) that pause for customer reactions or cancel automatically when conversion goals (e.g., an order being placed) are reached.
- To prevent stale execution mutations by locking the automation definition at trigger time via `config_snapshot`.
- To guarantee strict multi-tenant boundaries and consent compliance at every point of communication.

## Files Touched

- `supabase/migrations/20260920180000_marketing_automation_journeys.sql`
- `src/types/marketing.ts`
- `src/services/marketing-automation.service.ts`
- `src/services/marketing-executor.service.ts`
- `src/inngest/functions/marketing.ts`
- `src/app/admin/marketing/automations/[id]/page.tsx`
- `tests/inngest/inngest-marketing-workflow.test.ts`

## Follow-ups / Known Issues

None

## Commit Message

feat(marketing): implement Step 14 event cancellation and multi-step marketing journeys
