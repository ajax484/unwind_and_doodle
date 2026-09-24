# Order Notification Dispatch & Enrichment Fix

## What Changed
- **Immediate Outbox Handler Dispatch**: Enhanced `publishDomainEvent` in `src/services/events.service.ts` to execute registered in-process domain event handlers directly (such as notifications and alerts) across serverless API routes while updating `processed_at` in the `domain_events` table upon completion.
- **Payment Fulfillment Domain Events**: Updated `src/services/payment-fulfillment.service.ts` to prefetch customer records and order items, emitting both `payment.completed` and `order.pending` domain events with comprehensive itemized and customer metadata payloads.
- **Resilient Notification Payload Enrichment**: Updated `initializeNotificationEventHandlers()` in `src/services/notification.service.ts` to handle both `order.pending` and `payment.completed` events, dynamically fetching missing customer details or order items from Supabase if an event payload has minimal data.

## Why
1. In live serverless webhook environments (e.g. Flutterwave `/api/webhooks/flutterwave`), domain events were written to the outbox table with `processed_at: null`, but no inline execution took place.
2. Webhook payment fulfillment emitted `payment.completed` without order items or email, while notification handlers were solely listening to `order.pending`.
3. This prevented both customer order confirmation emails and admin new order notifications from dispatching automatically upon customer payment.

## Files Touched
- `src/services/events.service.ts`
- `src/services/payment-fulfillment.service.ts`
- `src/services/notification.service.ts`
- `docs/changes/notifications/2026-09-24-order-notification-dispatch-fix.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
fix(notifications): resolve order confirmation and admin notification dispatch in payment fulfillment
