# Manual / Bank Transfer Payment Lifecycle + Admin Verification (Step 4)

## What Changed
- **Manual Payment Confirmation Service (`src/services/manual-payment.service.ts`)**:
  - Implemented `confirmManualPayment` providing authoritative server-side validation and handoff to the canonical payment fulfillment pipeline.
  - Enforces tenant isolation (`order.organization_id === adminContext.organizationId`), role verification, provider validation (`payment.provider === 'manual'`), and idempotent transition execution.
- **Admin Manual Payment Confirmation Endpoint (`src/app/api/admin/payments/manual/confirm/route.ts`)**:
  - Added secure `POST` route guarded with `getAuthenticatedAdmin`, returning structured response and error statuses (400, 403, 404, 500).
- **Admin Order Detail Page (`src/app/admin/orders/[id]/page.tsx`)**:
  - Enhanced payment card to distinguish between external gateway payments (showing "Revalidate with Gateway") and manual bank transfers.
  - Displays snapshotted bank details (Bank Name, Account Name, Account Number) from payment record metadata.
  - Added "Confirm Bank Transfer" button and confirmation modal requiring explicit admin confirmation with optional audit note.
- **Automated Lifecycle Test Suite (`tests/payment/manual-payment-lifecycle.test.ts`)**:
  - Added 10 end-to-end unit and integration tests covering:
    - `ManualPaymentProvider` contract adherence (unsupported gateway verification/webhook errors).
    - Customer checkout bank details snapshotting & historical snapshot immutability.
    - Admin manual payment confirmation and unified fulfillment side-effects (payment success, order status transition, inventory reservation commit, audit logs, and domain events).
    - Authorization & organization isolation enforcement.
    - Non-manual provider rejection (e.g. Paystack payments).
    - Non-pending status rejection (e.g. failed payments).
    - Idempotent double-confirmation prevention without duplicate fulfillment side-effects.

## Why
Customers choosing Direct Bank Transfer place an order in a pending state with snapshotted merchant bank instructions and a 45-minute inventory hold. Administrators must be able to review received funds and explicitly confirm the transfer through an authorized, idempotent action that enters the exact same canonical fulfillment pipeline as automated gateways (Paystack / Flutterwave), ensuring no divergent order fulfillment or inventory side-effects.

## Files Touched
- `src/services/manual-payment.service.ts`
- `src/app/api/admin/payments/manual/confirm/route.ts`
- `src/app/admin/orders/[id]/page.tsx`
- `tests/payment/manual-payment-lifecycle.test.ts`

## Follow-ups / Known Issues
None

## Commit Message
```text
feat(payments): implement manual bank transfer payment lifecycle and admin confirmation
```
