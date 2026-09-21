# Payment History, Provider-Aware Refunds & Admin Payment Management (Step 5)

## What Changed
- **Provider Label Centralization (`src/services/payment/provider.types.ts`)**:
  - Exported `getPaymentProviderLabel()` and `PAYMENT_PROVIDER_LABELS` to centralize user-facing provider representations (`Paystack`, `Flutterwave`, `Bank Transfer`) across admin and customer interfaces without scattered string conditionals.
- **Provider-Aware Refund Execution on Gateways (`src/services/payment/flutterwave.provider.ts`)**:
  - Implemented `refundTransaction` on `FlutterwavePaymentProvider` utilizing Flutterwave's `/transactions/{id}/refund` API, normalizing the response into `PaymentRefundResult`.
- **Payment Management Types & Domain Model (`src/types/payment-management.ts`)**:
  - Defined `AdminPaymentListItem`, `AdminPaymentDetail`, `PaymentRefundRecord`, `RefundPaymentParams`, and `RefundPaymentResult` types.
  - Defined query filter contracts (`AdminPaymentFilters`) supporting pagination, search, status filtering, provider filtering, and date range constraints.
- **Payment Management & Centralized Refund Service (`src/services/payment-management.service.ts`)**:
  - Implemented `listAdminPayments` with organization-scoping, multi-column search (order number, reference, payment ID, customer email/name), status/provider filters, and pagination.
  - Implemented `getAdminPaymentDetail` with rich event timeline constructed from authoritative `audit_logs` and payment metadata snapshots.
  - Implemented `refundPayment`:
    - Validates caller organization authorization.
    - Resolves original provider dynamically via `payment.provider` using `getPaymentProvider(payment.provider)` (historical provider integrity guarantee).
    - Enforces balance bounds (`refundAmount <= remainingRefundableBalance`) and prevents double full refunds.
    - Differentiates automated gateway refunds (Paystack/Flutterwave API execution) from administrative bank transfer records (`isManual: true`, no fake gateway calls).
    - Updates payment record and metadata refund history array.
    - Emits audit log events (`payment.refunded` / `manual_refund_recorded`) and domain events (`order.refunded`).
    - Updates order status to `refunded` when fully refunded.
- **Admin API Endpoints (`src/app/api/admin/payments/`)**:
  - `GET /api/admin/payments`: Organization-scoped payment list with filtering and search.
  - `GET /api/admin/payments/[id]`: Organization-scoped detailed payment summary with audit timeline and refund history.
  - `POST /api/admin/payments/[id]/refund`: Authorized full and partial refund processing.
- **Admin Payments Interface (`src/app/admin/payments/page.tsx`)**:
  - Built responsive payment management dashboard using canonical design system components (`Tabs`, `TextInput`, `Select`, `Button`, `Modal`, `Drawer`, `AlertBanner`, `Skeleton`, `EmptyState`, `OrderStatusBadge`).
  - Provides instant status tabs, multi-provider filtering, search input, detailed slide-out inspector, and explicit confirmation modal for gateway and manual refunds.
- **Admin Navigation (`src/app/admin/AdminLayoutClient.tsx`)**:
  - Added "Payments" link (`/admin/payments`) under "Orders & Customers".
- **Domain Event Constants (`src/lib/constants.ts`)**:
  - Added `DOMAIN_EVENT_TYPES.ORDER_REFUNDED` and `DOMAIN_EVENT_TYPES.PAYMENT_REFUNDED`.
- **Comprehensive Test Suite (`tests/payment/payment-management-and-refunds.test.ts`)**:
  - Added 12 tests covering provider display labels, organization-scoped listing & isolation, detailed views, Paystack refunds, Flutterwave refunds, historical provider integrity (when merchant disabled provider in settings), manual bank transfer refunds, partial refunds, balance boundaries, and invalid status rejection.

## Why
Admins require full operational visibility into payment transactions across all supported methods (Paystack, Flutterwave, Bank Transfer) with search, status filtering, and audit history. Furthermore, refunds must be executed through the exact provider used during the initial transaction (preserving historical provider integrity regardless of current merchant settings), while clearly distinguishing automated gateway refunds from manual bank transfer records.

## Files Touched
- `src/services/payment/provider.types.ts`
- `src/services/payment/flutterwave.provider.ts`
- `src/types/payment-management.ts`
- `src/services/payment-management.service.ts`
- `src/app/api/admin/payments/route.ts`
- `src/app/api/admin/payments/[id]/route.ts`
- `src/app/api/admin/payments/[id]/refund/route.ts`
- `src/app/admin/payments/page.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `src/lib/constants.ts`
- `tests/payment/payment-management-and-refunds.test.ts`

## Follow-ups / Known Issues
None

## Commit Message
```text
feat(payments): implement payment history, provider-aware refunds, and admin management
```
