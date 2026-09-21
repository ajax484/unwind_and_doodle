# Admin Manual Orders: Offline Payment & Admin-Controlled Payment Method (Step 10)

Implemented full admin-controlled payment method selection (Paystack, Flutterwave, Direct Bank Transfer) and offline payment confirmation ("Payment already received") during manual order creation, ensuring instant fulfillment, bank detail snapshotting, historical payment immutability, and tenant isolation.

## What Changed

- **Schema & Types**:
  - Updated `CreateManualOrderSchema` in `src/types/manual-order.ts` to accept `paymentMethod` (`paystack` | `flutterwave` | `manual`), `alreadyPaid` (`boolean`), and `paymentNote` (`string`).
  - Extended `PaymentRequestDetail` and `PaymentLinkResponse` to include `paymentMethod`, `paymentStatus`, `alreadyPaid`, and `bankDetails`.
- **Service Layer**:
  - In `src/services/manual-order.service.ts`:
    - Validated that the chosen `paymentMethod` is enabled for the organization via `getPaymentMethods`.
    - For `manual` orders: snapshotted active organization bank details (`bankName`, `accountName`, `accountNumber`, `instructions`) into payment metadata and initialized payment with `provider: 'manual'`, `status: 'pending'`.
    - For `alreadyPaid: true`: immediately executed `confirmManualPayment` with admin context, automatically transitioning payment to `successful`, order status to `pending` (in-processing), committing inventory reservations, and emitting domain events.
    - Added `createManualPaymentAttemptForOrder` allowing admins to create a manual payment attempt on an existing unpaid order without mutating historical payment records.
- **Admin UI**:
  - Updated `src/components/admin/manual-order/ManualOrderForm.tsx` with dynamic payment method radio selection (displaying enabled organization payment methods), an informational bank transfer helper, and a **"Payment already received (Mark as paid immediately)"** checkbox with an optional payment note field.
- **Customer Payment Page**:
  - Updated `src/app/pay/[token]/page.tsx` to display snapshotted Direct Bank Transfer instructions when `paymentMethod === 'manual'` and prevent re-initiation if the order has already been confirmed.
- **API Endpoints**:
  - Added `src/app/api/admin/orders/[id]/manual-payment/route.ts` to allow admins to attach a manual bank-transfer payment attempt to an existing unpaid order.
- **Tests**:
  - Added comprehensive test suite `tests/payment/admin-manual-order-payments.test.ts` (8 tests) covering Paystack, Flutterwave, Bank Transfer snapshotting, disabled method rejection, already-paid auto-fulfillment, historical immutability, and payment link handling.

## Why

To allow store administrators to create manual orders from phone, WhatsApp, in-person walk-ins, and social channels where the customer pays via direct bank transfer or has already paid offline, without requiring the customer to ever visit a payment link to switch the provider.

## Files Touched

- `src/types/manual-order.ts`
- `src/services/manual-order.service.ts`
- `src/components/admin/manual-order/ManualOrderForm.tsx`
- `src/app/pay/[token]/page.tsx`
- `src/app/api/admin/orders/[id]/manual-payment/route.ts`
- `tests/payment/admin-manual-order-payments.test.ts`
- `docs/changes/payments/2026-09-20-admin-manual-orders-offline-payment.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

feat(payments): admin-controlled payment methods and offline payment for manual orders
