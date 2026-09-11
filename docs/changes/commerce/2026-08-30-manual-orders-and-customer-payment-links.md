# Feature: Manual Orders & Customer Payment Links (Phase 6I)

## What Changed
Implemented the backend, database transaction layer, Paystack payment link workflow, customer-facing payment page (`/pay/[token]`), and API endpoints for **Admin-Created Manual Orders**.

### Database & RPC
- Created atomic PostgreSQL `SECURITY DEFINER` function `public.create_admin_manual_order` in `supabase/migrations/20260830000002_phase6i_manual_orders.sql`:
  - Validates caller admin authorization using `public.is_organization_admin(p_org_id)`.
  - Calculates DB-authoritative prices for physical products and bundles.
  - Inserts `orders` row with `order_source = 'manual'`, `manual_order_channel`, `status = 'created'`.
  - Inserts `order_items` and `order_item_bundle_components` snapshots.
  - Inserts secure payment link request into `order_payment_requests` with token `mpr_<hex>` and 24-hour expiration.

### Services & Webhook Integration
- Created `src/services/manual-order.service.ts`:
  - `createAdminManualOrder`: Resolves/creates customer, executes `create_admin_manual_order` RPC, reserves inventory via `reserveOrderInventory`, creates `payments` record, and emits domain event (`order.created`).
  - `getPaymentRequestByToken`: Public token lookup returning order details, items, pricing summary, and status.
  - `initializePaymentRequestTransaction`: Validates payment link token and initializes Paystack checkout transaction.
  - `cancelManualOrder`: Releases inventory reservations and cancels unpaid manual order and payment request.
- Updated `src/services/webhook.service.ts`:
  - `processPaymentWebhook` updates `order_payment_requests` status to `paid` (`paid_at = NOW()`) when Paystack verifies successful payment.

### API Routes & Public Payment Page
- `POST /api/admin/orders/manual`: Admin endpoint to create manual orders.
- `GET / POST /api/admin/orders/[id]/payment-link`: Admin endpoint to manage payment links.
- `GET /api/pay/[token]`: Public endpoint for payment request details.
- `POST /api/pay/[token]/initialize`: Public endpoint for Paystack payment initialization.
- `src/app/pay/[token]/page.tsx`: Responsive customer payment page displaying store branding, order items, customer details, pricing breakdown, expiration status, and Paystack checkout button.

---

## Why
Customers contacting the business through Instagram, WhatsApp, or phone need a seamless payment experience without being forced to register an account first. Admins can create the order on their behalf, reserve stock, and send a payment link.

---

## Files Touched
- `supabase/migrations/20260830000002_phase6i_manual_orders.sql`
- `src/types/manual-order.ts`
- `src/services/manual-order.service.ts`
- `src/services/webhook.service.ts`
- `src/app/api/admin/orders/manual/route.ts`
- `src/app/api/admin/orders/[id]/payment-link/route.ts`
- `src/app/api/pay/[token]/route.ts`
- `src/app/api/pay/[token]/initialize/route.ts`
- `src/app/pay/[token]/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/manual-orders.test.ts`
- `docs/changes/2026-08-30-manual-orders-and-customer-payment-links.md`

---

## Commit Message
```text
feat(orders): implement Phase 6I manual order creation and Paystack customer payment links

- Add atomic SQL RPC create_admin_manual_order for admin order creation with bundle snapshots
- Add manual order service layer for inventory reservation and Paystack link generation
- Update Paystack webhook handler to update order_payment_requests status to paid
- Add public /pay/[token] customer payment page and API endpoints
- Add 9 passing unit tests covering manual orders, discounts, inventory, Paystack, and webhooks
```
