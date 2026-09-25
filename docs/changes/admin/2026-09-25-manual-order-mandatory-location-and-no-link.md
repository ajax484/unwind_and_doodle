# Manual Orders: Mandatory Delivery Location & Omitting Payment Link for Confirmed Orders

## What Changed
- **Schema Validation (`src/types/manual-order.ts`)**: Added a Zod `.refine()` rule to `CreateManualOrderSchema` enforcing that `locationId` is provided whenever `alreadyPaid` is `true`.
- **Backend Service (`src/services/manual-order.service.ts`)**: When an order is created with `alreadyPaid: true` (and `paymentMethod === 'manual'`), `paymentUrl` and `expiresAt` are omitted from the response (`paymentUrl: ''`, `expiresAt: null`) since offline payment has already been verified and confirmed.
- **Admin Form UI (`src/components/admin/manual-order/ManualOrderForm.tsx`)**:
  - Dynamically marked the Delivery Location field as required with an indicator (`* Required for confirmed payment`) and disabled `allowBlank` when `alreadyPaid` is checked.
  - Added pre-submit client-side validation preventing order creation without a delivery location when `alreadyPaid` is true.
  - Dynamically updated the submission button label to **"Create & Confirm Order"** when marking payment as already received.
- **Success Modal (`src/components/admin/manual-order/ManualOrderSuccessModal.tsx`)**:
  - Supported confirmed order state displaying **"Manual Order Confirmed"** and a verified payment badge instead of generating or prompting to copy a customer payment link.
  - Provided a direct **"View Order Details"** button navigating to `/admin/orders/[id]`.
- **Automated Tests (`tests/payment/admin-manual-order-payments.test.ts`)**: Added assertions ensuring `locationId` is mandatory when `alreadyPaid: true` and that `paymentUrl` is empty for confirmed orders.

## Why
When an admin creates an order that is already paid offline (e.g. cash, direct wire, POS), generating a customer checkout payment link (`/pay/[token]`) is redundant and confusing. Furthermore, because the customer will not visit the payment link to supply their delivery location, the store administrator must specify the delivery location upfront to ensure accurate delivery fee calculations, warehouse routing, and inventory fulfillment.

## Files Touched
- `src/types/manual-order.ts`
- `src/services/manual-order.service.ts`
- `src/components/admin/manual-order/ManualOrderForm.tsx`
- `src/components/admin/manual-order/ManualOrderSuccessModal.tsx`
- `tests/payment/admin-manual-order-payments.test.ts`
- `docs/changes/admin/2026-09-25-manual-order-mandatory-location-and-no-link.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
`feat(admin-orders): enforce mandatory delivery location and omit payment link for confirmed manual orders`
