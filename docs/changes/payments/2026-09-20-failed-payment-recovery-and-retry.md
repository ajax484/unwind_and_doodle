# Failed Payment Recovery & Retry (Step 7)

## What Changed
- **Payment Retry & Recovery Service (`src/services/payment/payment-retry.service.ts`)**:
  - Implemented `getPaymentRetryEligibility()` for server-side verification of retry eligibility, validating customer/session authorization, order status (`created`, `pending`, not cancelled/confirmed/shipped/refunded), inventory availability, and active merchant payment method configurations.
  - Implemented `retryPayment()` to execute safe multi-attempt payment recovery without overwriting historical failed payment records (`orders -> payments[]`).
  - Integrated dynamic payment provider switching (e.g. Paystack failed -> Flutterwave retry -> Direct Bank Transfer).
  - Integrated inventory reservation reuse/renewal: prevents duplicating active 45-minute reservations on retry; safely checks stock and re-reserves if reservations have expired.
  - Handled Direct Bank Transfer resuming: reuses active pending manual payment attempts and preserves historical snapshot bank details rather than creating duplicate manual payment records.
  - Handled gateway initialization failures gracefully: marks the specific attempt as `failed` while leaving the order in a payable state for subsequent retries.
- **Payment Retry API Endpoint (`src/app/api/orders/[orderNumber]/retry/route.ts`)**:
  - `GET /api/orders/[orderNumber]/retry`: Returns server-derived retry eligibility, payable amount, current status, and available enabled payment methods.
  - `POST /api/orders/[orderNumber]/retry`: Validates requested payment provider against organization settings, customer context, and triggers `retryPayment()`, returning checkout redirect URL or bank details.
- **Order Retrieval API Update (`src/app/api/orders/[orderNumber]/route.ts`)**:
  - Orders payments by `created_at DESC` and prioritizes returning the authoritative successful payment attempt (or latest attempt) alongside full `paymentAttempts` history and snapshotted bank transfer instructions.
- **Customer Order Status & Recovery UI (`src/app/order/[orderNumber]/page.tsx`)**:
  - Added an interactive **Payment Recovery Card** displayed when an order is unpaid/failed.
  - Allows customers to select from all currently enabled payment methods (Paystack, Flutterwave, Direct Bank Transfer) and retry with one click.
  - Seamlessly displays snapshotted Direct Bank Transfer details when manual payment is selected or resumed.
  - Displays payment attempt history timeline when multiple attempts exist.
- **Comprehensive Test Suite (`tests/payment/payment-retry-and-recovery.test.ts`)**:
  - Added 9 comprehensive integration tests covering eligibility verification, failed payment retry, multi-attempt historical immutability, gateway switching (Paystack -> Flutterwave -> Manual), disabled provider rejection, reservation non-duplication, and initialization failure handling.

## Why
Customers frequently experience payment gateway hiccups, card declines, network interruptions, or preferred channel outages. Enabling safe server-side payment retries and provider switching allows customers to recover and complete their purchases seamlessly without creating duplicate orders or duplicate inventory reservations, and without mutating historical payment attempt records.

## Files Touched
- `src/services/payment/payment-retry.service.ts`
- `src/services/payment/index.ts`
- `src/app/api/orders/[orderNumber]/retry/route.ts`
- `src/app/api/orders/[orderNumber]/route.ts`
- `src/app/order/[orderNumber]/page.tsx`
- `tests/payment/payment-retry-and-recovery.test.ts`

## Follow-ups / Known Issues
None

## Commit Message
```text
feat(payments): implement failed payment recovery, retry, and provider switching
```
