# Order Status History, Audit Trail Logging & Timeline Display Fix

## What Changed
- **Aligned `order_status_history` table inserts**:
  - In `src/services/order-state-machine.service.ts` and `src/services/payment-fulfillment.service.ts`, removed non-schema properties (`status`, `previous_status`, `created_by`) that caused PostgREST to reject transition inserts with HTTP 400.
  - Insert payload now strictly conforms to the PostgreSQL table schema: `order_id`, `from_status`, `to_status`, `changed_by`, `note`.
- **Aligned `audit_logs` table inserts**:
  - In `src/services/order-state-machine.service.ts` and `src/services/payment-fulfillment.service.ts`, removed non-schema properties (`user_id`, `old_values`, `new_values`).
  - Set `action: 'update'` to comply with the PostgreSQL enum `audit_action` (`'create' | 'update' | 'delete'`), preserving granular operation names (`order.status_transition`, `payment.verified`) in `after_data.operation`.
- **Enhanced Admin Order Detail Timeline UI**:
  - In `src/app/admin/orders/[id]/page.tsx`, upgraded the "Status History & Audit Trail" section with responsive segmented filter tabs (`All`, `Status`, `Audit`).
  - Rendered a unified chronological stream combining order status transitions with rich audit trail events, displaying timestamps, status badges, operation badges, before/after diffs, and actor IDs.
- **Updated Test Assertions**:
  - In `tests/commerce/order-state-machine.test.ts`, updated assertions to check real PostgreSQL schema fields (`to_status`, `from_status`, `changed_by`, `action: 'update'`).

## Why
Order status transitions and audit logs were silently failing at runtime due to passing nonexistent column names and invalid enum values to Supabase PostgREST, leaving only the initial `created` record created at checkout or manual order initiation. Additionally, the admin order detail page only mapped over status history without rendering audit logs.

## Files Touched
- `src/services/order-state-machine.service.ts`
- `src/services/payment-fulfillment.service.ts`
- `src/app/admin/orders/[id]/page.tsx`
- `tests/commerce/order-state-machine.test.ts`
- `docs/changes/admin/2026-09-16-order-status-history-and-audit-trail-fix.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
`fix(admin): resolve order status history and audit trail logging schema mismatches and render audit events in timeline`
