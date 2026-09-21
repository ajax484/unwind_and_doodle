# 2026-09-21 Marketing Automation Idempotency & Inngest Dispatch Fix

Fixes two critical issues preventing marketing automation emails from being dispatched:
1. Scopes the crash-recovery idempotency guard in `executeJourneySendStep` to the current execution window (`created_at >= execution.created_at`), allowing repeat orders from returning customers to properly receive marketing/post-purchase emails.
2. Removes illegal nesting of `await step.sendEvent(...)` inside `await step.run(...)` in `marketingEventOrchestrator`, preventing Inngest workflows from hanging in `RUNNING` status.

---

## What Changed

1. **`src/inngest/functions/marketing.ts`**:
   - Extracted `await step.sendEvent('fan-out-automation-runners', runnerEvents)` out of the `step.run` wrapper to comply with Inngest step generator lifecycle requirements.
2. **`src/services/marketing-executor.service.ts`**:
   - Guarded `executeJourneySendStep` so that:
     - If `execution.provider_message_id` is present, it skips resending (idempotent for retries).
     - Idempotency checks against `marketing_campaign_recipients` only match records created on or after `execution.created_at`, preventing historical sent records from suppressing repeat orders for the same customer.

---

## Why

1. Inngest SDK forbids calling `step.sendEvent` inside a `step.run` callback. Doing so caused `marketingEventOrchestrator` to stall indefinitely, preventing runner events (`marketing/automation.execute`) from being triggered.
2. The idempotency guard in `marketing-executor.service.ts` was doing a global campaign lookup on `(campaign_id, email, status = 'sent')`. This treated event-driven automations (which run on every customer purchase) like single-send broadcast newsletters, incorrectly suppressing all subsequent orders for returning customers.

---

## Files Touched

- `src/inngest/functions/marketing.ts`
- `src/services/marketing-executor.service.ts`

---

## Follow-ups / Known Issues

None.

---

## Commit Message

```text
fix(marketing): correct inngest sendEvent nesting and scope automation idempotency guard
```
