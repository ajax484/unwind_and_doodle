# Order Management & Fulfillment Phase

## What Changed
1. **Server-Side Order State Machine (`src/services/order-state-machine.service.ts`)**:
   - Enforced strict state transitions:
     - `created` → `['pending', 'cancelled']`
     - `pending` → `['confirmed', 'cancelled', 'refunded']`
     - `confirmed` → `['shipped', 'cancelled', 'refunded']`
     - `shipped` → `['received', 'refunded']`
     - `received` → `['refunded']`
     - Terminal states `cancelled` and `refunded` with no transitions out.
   - Prevents illegal/arbitrary state skipping or backwards transitions.
   - Atomic side-effects on every transition:
     - Updates `orders.status` and `orders.updated_at`
     - Inserts `order_status_history` record with actor ID and transition note
     - Inserts `audit_logs` record (`action: 'order.status_transition'`)
     - Emits `order.status_changed` event into `domain_events`
     - Releases reservation holds if order is cancelled prior to payment.
2. **Organization Admin Authorization (`src/services/auth.service.ts`)**:
   - Guards admin operations by verifying active membership and roles (`owner`, `admin`, `manager`, `staff`) in `organization_members`.
   - Rejects unauthorized users or non-members with `403 Forbidden`.
3. **Admin Order Search & Detail Aggregation (`src/services/admin-order.service.ts`)**:
   - Order list query with multi-field search (order number, customer name, email, phone) and filtering by status, warehouse, location, and date range.
   - Comprehensive detail assembly: order summary, customer, shipping address, warehouse, location, line items, add-on products, customization assets, payment records, status history timeline, inventory reservations, audit logs, and domain events.
4. **Admin API Route Handlers**:
   - `GET /api/admin/orders` — List & search orders.
   - `GET /api/admin/orders/[id]` — Fetch full order details.
   - `PATCH /api/admin/orders/[id]/status` — Transition order status via the state machine.
5. **Comprehensive Test Suite (`tests/order-state-machine.test.ts`)**:
   - Added 13 tests covering all valid transitions, illegal transitions, authorization guards, atomic history/audit/event creation, and admin list/detail queries.
   - 51/51 tests passing across the entire project.

## Why
To give store admins secure, auditable, and reliable order fulfillment capabilities while preventing invalid lifecycle transitions, unauthorized access, or unreleased stock holds.

## Files Touched
- `src/types/admin-order.ts` [NEW]
- `src/services/auth.service.ts` [NEW]
- `src/services/order-state-machine.service.ts` [NEW]
- `src/services/admin-order.service.ts` [NEW]
- `src/app/api/admin/orders/route.ts` [NEW]
- `src/app/api/admin/orders/[id]/route.ts` [NEW]
- `src/app/api/admin/orders/[id]/status/route.ts` [NEW]
- `tests/order-state-machine.test.ts` [NEW]
- `tests/mocks/supabase.mock.ts` [MODIFIED]

## Follow-ups & Known Issues
- Frontend admin dashboard UI can now consume `GET /api/admin/orders`, `GET /api/admin/orders/[id]`, and `PATCH /api/admin/orders/[id]/status` with `x-user-id` session header.

## Commit Message
```text
feat(orders): implement order state machine, admin order querying, and fulfillment authorization

- Add server-side order state machine enforcing strict transition matrix
- Record order_status_history, audit_logs, and domain_events atomically on status change
- Implement organization role-based authorization for administrative routes
- Add admin order list with search/filtering and comprehensive detail inspection service
- Add API endpoints: GET /api/admin/orders, GET /api/admin/orders/:id, PATCH /api/admin/orders/:id/status
- Add comprehensive test suite covering all transitions and authorization guards
```
