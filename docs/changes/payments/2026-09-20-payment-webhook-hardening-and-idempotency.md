# Payment Webhook Hardening, Reconciliation & State Transitions (Step 6)

## What Changed
- **Database Idempotency Migration (`supabase/migrations/20260920200000_payment_events_and_idempotency.sql`)**:
  - Created `payment_events` table for webhook deduplication, tracking event IDs, status, normalized payloads, and timestamps.
  - Added unique constraint `(provider, provider_event_id)` preventing duplicate processing of concurrent webhook deliveries.
  - Added composite indexes `(status, created_at)` on `payments` to optimize pending-payment revalidation sweeps.
  - Added RLS policies for service role and tenant-isolated admin access.
- **Supabase Types (`src/lib/supabase/types.ts`)**:
  - Added `payment_events` schema definitions to `Database['public']['Tables']`.
- **Payment State Machine (`src/services/payment/payment-state-machine.ts`)**:
  - Established a strict state transition matrix enforcing legal payment transitions (`pending -> successful -> refunded`, `pending -> failed -> pending`) and rejecting illegal regressions (`successful -> failed`, `successful -> pending`, `refunded -> successful`).
  - Implemented `transitionPaymentStatus()` with compare-and-swap optimistic concurrency control to prevent race conditions during concurrent status mutations.
- **Unified Fulfillment Hardening (`src/services/payment-fulfillment.service.ts`)**:
  - Integrated `transitionPaymentStatus()` into `fulfillSuccessfulPayment()` so concurrent requests (e.g. webhook vs return callback) atomically resolve to exactly one execution pass.
  - Guarantees single execution of downstream side effects: inventory reservation commits, discount usage increment, order state transition, audit logs, and `payment.completed` domain events.
- **Webhook Service Hardening (`src/services/webhook.service.ts`)**:
  - Enforced strict cryptographic signature/hash verification before any database interaction or state mutation.
  - Added database-level event deduplication via `payment_events`, returning safe idempotent responses for duplicate webhook deliveries.
- **Revalidation & Sweep Hardening (`src/services/payment-revalidation.service.ts`)**:
  - Differentiated transient gateway network/timeout errors from explicit transaction failures: network timeouts leave payments in `pending` status for future retry without false failures.
  - Revalidation failure handling transitions payments atomically to `failed` and releases uncommitted reservations without overwriting concurrent successful payments.
- **Comprehensive Test Suite (`tests/payment/webhook-hardening-and-idempotency.test.ts`)**:
  - Added 17 integration tests covering valid/invalid Paystack signatures, valid/invalid Flutterwave hashes, duplicate webhook deliveries, webhook vs callback race conditions, atomic state transitions, timeout resilience, and failure handling.

## Why
In production ecommerce applications, webhooks and return callbacks often arrive concurrently or out of order, and gateways periodically retry deliveries. Hardening signature verification, introducing database-level event deduplication, centralizing atomic payment state transitions, and guarding fulfillment against concurrency races prevents overselling, duplicate billing side effects, and status corruption.

## Files Touched
- `supabase/migrations/20260920200000_payment_events_and_idempotency.sql`
- `src/lib/supabase/types.ts`
- `src/services/payment/payment-state-machine.ts`
- `src/services/payment/index.ts`
- `src/services/payment-fulfillment.service.ts`
- `src/services/webhook.service.ts`
- `src/services/payment-revalidation.service.ts`
- `tests/payment/webhook-hardening-and-idempotency.test.ts`

## Follow-ups / Known Issues
None

## Commit Message
```text
feat(payments): harden payment webhooks, idempotency, and atomic state transitions
```
