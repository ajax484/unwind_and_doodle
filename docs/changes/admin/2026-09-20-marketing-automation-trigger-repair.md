# Marketing Automation Trigger Pipeline Audit & Repair

## What Changed

1. **Canonical Event Mapping (`src/services/marketing-automation.service.ts`)**:
   - Updated `matchesAutomationTrigger` to canonically map the `payment.completed` commerce event to `order.paid` marketing automation triggers without publishing duplicate alias events.
   - Preserved original domain event IDs for idempotency while maintaining multi-tenant boundary checks.

2. **Customer Creation Domain Events (`src/services/customer.service.ts`, `src/services/customer-account.service.ts`)**:
   - Instrumented guest checkout customer creation (`resolveOrCreateCustomer`) and account registration (`linkOrCreateCustomerAccount`) to emit `customer.created` domain events upon new customer insertion.
   - Ensured existing customer lookup/update flows do not emit duplicate `customer.created` events.

3. **Abandoned Checkout & Inactive Customer Scanners (`src/services/marketing-scanner.service.ts`)**:
   - Created `scanAndEmitAbandonedCheckouts`: Identifies stale active carts older than 2 hours with items, atomically transitions `carts.status = 'abandoned'` for natural database idempotency, and emits `checkout.abandoned`.
   - Created `scanAndEmitInactiveCustomers`: Identifies customers inactive for $> 30$ days with active marketing consent, enforces a 30-day win-back cooldown against `domain_events`, and emits `customer.inactive`.

4. **Inngest Scheduled Cron Functions (`src/inngest/functions/marketing.ts`, `src/app/api/inngest/route.ts`)**:
   - Created and registered `scanAbandonedCheckoutsFunction` (runs every 15 minutes: `*/15 * * * *`).
   - Created and registered `scanInactiveCustomersFunction` (runs daily at 9:00 AM UTC: `0 9 * * *`).

5. **Automated Test Suite (`tests/marketing/marketing-trigger-pipeline.test.ts`)**:
   - 12 integration tests covering `payment.completed` $\rightarrow$ `order.paid` mapping, customer creation emissions, race-safe abandoned cart scanning, 30-day win-back cooldowns, and tenant isolation.

## Why

- To ensure all supported marketing automation triggers (`order.paid`, `customer.created`, `checkout.abandoned`, `customer.inactive`, `order.created`) reliably activate from real commerce activities.
- To prevent missed automations caused by event naming discrepancies between payment fulfillment and marketing orchestration.
- To provide resilient, idempotent background scanning for time-based triggers without custom polling queues.

## Files Touched

- `src/services/marketing-automation.service.ts`
- `src/services/customer.service.ts`
- `src/services/customer-account.service.ts`
- `src/services/marketing-scanner.service.ts`
- `src/inngest/functions/marketing.ts`
- `src/app/api/inngest/route.ts`
- `tests/marketing/marketing-trigger-pipeline.test.ts`

## Follow-ups / Known Issues

None

## Commit Message

feat(marketing): audit and repair marketing automation trigger pipeline and scanners
