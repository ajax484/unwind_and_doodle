# Phase 4: Commerce Transaction Pipeline

## What Changed
1. **Centralized Order State Machine (`src/services/order-state-machine.service.ts`)**:
   - Enforced authoritative status transition rules: `created → [pending, cancelled]`, `pending → [confirmed, cancelled, refunded]`, `confirmed → [shipped, cancelled, refunded]`, `shipped → [received, cancelled, refunded]`, `received → [refunded]`, `cancelled → [refunded]`, `refunded → []`.
   - Added automatic server-side timestamps on orders: `shipped_at`, `received_at`, `cancelled_at`, and `refunded_at`.
   - Guaranteed automatic generation of `order_status_history` and `audit_logs` records on all transitions.
   - Emits specific lifecycle outbox events (`order.pending`, `order.confirmed`, `order.shipped`, `order.received`, `order.cancelled`, `order.refunded`) alongside `order.status_changed`.
   - Automatically releases inventory reservations when uncommitted orders are cancelled.
2. **Inventory Lifecycle & 45-Minute Expiration Cleaner (`src/services/inventory.service.ts`)**:
   - Atomic reservation locking (`quantity - reserved_quantity >= requested`).
   - Idempotent finalization / commit (`quantity -= qty`, `reserved_quantity -= qty`, status set to `committed`).
   - Idempotent release (`reserved_quantity -= qty`, status set to `released`).
   - Automated expiration cleaner `expireOldReservations()` scanning for active reservations with `expires_at <= now()` and safely restoring available counts.
3. **Outbox Pattern & Event Processor (`src/services/events.service.ts`)**:
   - Outbox storage in `domain_events` table with `processed_at: null` inserted atomically within transactions.
   - Background/asynchronous event processor `processPendingDomainEvents()` claiming unhandled events, executing registered handlers (such as email notifications and analytics), setting `processed_at`, and gracefully leaving failed events for retry without crashing transactions.
4. **Integration Testing & Concurrency Suite (`tests/transaction-pipeline.test.ts`)**:
   - Added 8 end-to-end integration tests covering:
     - Full Happy Path (Checkout → Paystack → Webhook → Order Pending → Inventory Finalized).
     - Failed Payment & Reservation Release.
     - 45-Minute Reservation Expiration Cleaner.
     - Concurrency & Race condition handling (2 customers buying last unit concurrently).
     - Duplicate Webhooks and arrival races.
     - Outbox event handler failures and retry recovery.
     - Order state machine legal/illegal transition rules & timestamps.
   - 116/116 tests passing across all 14 test suites.

## Why
To ensure that orders, payments, inventory reservations, fulfillment, and domain events remain strictly consistent under network retries, duplicate requests, partial failures, and concurrency races.

## Files Touched
- `src/services/order-state-machine.service.ts` [MODIFIED]
- `src/services/inventory.service.ts` [MODIFIED]
- `src/services/events.service.ts` [MODIFIED]
- `tests/mocks/supabase.mock.ts` [MODIFIED]
- `tests/transaction-pipeline.test.ts` [NEW]
- `docs/changes/2026-08-30-commerce-transaction-pipeline.md` [NEW]

## Follow-ups / Known Issues
- None.

## Commit Message
```text
feat(commerce): implement Phase 4 commerce transaction pipeline

- Centralize order state transitions with server-side timestamps and audit logging
- Implement Outbox domain event pattern and retryable event processor
- Harden atomic inventory reservations with idempotent commit/release and 45-min cleaner
- Add concurrency protection against simultaneous checkout races
- Add transaction pipeline integration tests (116/116 tests passing)
```
