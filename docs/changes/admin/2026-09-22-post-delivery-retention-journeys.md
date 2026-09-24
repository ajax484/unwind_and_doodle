# 2026-09-22 - Post-Delivery Retention Journeys & Delivery Fallback

## What Changed
- Reconfigured the post-purchase marketing lifecycle so retention journeys start upon order receipt/delivery (`order.received`), keeping payment events (`order.paid`, `payment.completed`) strictly reserved for transactional confirmations.
- Extended domain event publishing in `order-state-machine.service.ts` to include top-level and payload `organizationId` and explicit `deliverySource` (`'actual' | 'estimated'`).
- Added canonical 3-step post-delivery retention journey helper (`+2d` engagement/review, `+10d` product discovery/cross-sell with Step 17A recommendations, and `+21d` long-term nurture).
- Created pure delivery estimation service (`delivery-estimate.service.ts`) enforcing business configuration rules for untracked Nigerian orders: +2 days for Lagos/Abuja, +6 days for other states, and +3 days production delay for custom items.
- Added scheduled delivery fallback scanner (`scanAndEmitEstimatedDeliveries`) with a bounded 14-day lookback window that protects historical orders from being triggered.
- Added database migration `20260922140000_post_delivery_retention_idempotency.sql` introducing `order_id`, `delivery_source`, and a partial unique index on `(automation_id, order_id)` to enforce execution uniqueness at the database engine level.
- Implemented delivery source superseding: when an estimated delivery journey is scheduled or executing, subsequent arrival of real `order.received` updates `delivery_source = 'actual'` and `domain_event_id` without duplicating or restarting the journey.
- Updated `AutomationForm.tsx` with human-readable labels and lifecycle explanations distinguishing `order.paid` from `order.received`.
- Added comprehensive test suite (`tests/marketing/marketing-post-delivery.test.ts`) covering trigger semantics, multi-step journey timing, fallback calculations, idempotency, superseding, and JIT consent/status safety checks.

## Why
- Payment confirms a financial transaction; delivery starts the customer retention relationship. Inviting reviews or recommending complementary products before a customer has physically received and used their items degrades the user experience and increases churn.
- Untracked courier shipments legitimately lack real-time delivery confirmation webhooks. A location- and customization-aware delivery fallback ensures these customers enter the retention lifecycle safely without fabricating false delivery status in the core database orders table.

## Files Touched
- `supabase/migrations/20260922140000_post_delivery_retention_idempotency.sql`
- `src/types/marketing.ts`
- `src/lib/constants.ts`
- `src/services/order-state-machine.service.ts`
- `src/services/marketing-automation.service.ts`
- `src/services/delivery-estimate.service.ts`
- `src/services/marketing-scanner.service.ts`
- `src/services/marketing-executor.service.ts`
- `src/inngest/functions/marketing.ts`
- `src/components/admin/marketing/AutomationForm.tsx`
- `tests/marketing/marketing-post-delivery.test.ts`
- `tests/marketing/marketing-automation.test.ts`
- `tests/marketing/marketing-trigger-pipeline.test.ts`

## Follow-ups / Known Issues
None

## Commit Message
feat(marketing): post-delivery retention journeys and delivery estimation fallback
