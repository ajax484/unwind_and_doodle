# Payment Provider Migration: Decoupled PaymentProvider Interface & Flutterwave Integration

## What Changed
1. **Provider Abstraction (`src/services/payment/provider.interface.ts`)**:
   - Introduced a provider-agnostic `PaymentProvider` interface with standard methods:
     - `generateReference(prefix?)`
     - `initializeTransaction(input)`
     - `verifyTransaction(reference, transactionId?)`
     - `verifyWebhook(rawBody, headers)`
2. **Flutterwave Payment Provider (`src/services/payment/flutterwave.provider.ts`)**:
   - Implemented `FlutterwavePaymentProvider` targeting official Flutterwave v3 endpoints:
     - Payment initialization: `POST https://api.flutterwave.com/v3/payments`
     - Transaction verification: `GET https://api.flutterwave.com/v3/transactions/:id/verify` and `GET https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=:reference`
     - Webhook security: timing-safe secret hash comparison on `verif-hash` header against `FLUTTERWAVE_SECRET_HASH`.
3. **Decoupled Checkout Service (`src/services/checkout.service.ts`)**:
   - Checkout now accepts and relies entirely on the `PaymentProvider` interface (defaulting to `FlutterwavePaymentProvider`).
   - Sets `payments.provider = 'flutterwave'` and `payments.provider_reference = reference`.
4. **Decoupled Webhook Handler & Audit Logging (`src/services/webhook.service.ts` & `src/app/api/webhooks/flutterwave/route.ts`)**:
   - Endpoint: `POST /api/webhooks/flutterwave`
   - Validates webhook authentication hash.
   - Enforces idempotency on payment status.
   - Cross-verifies transaction with Flutterwave API directly.
   - Checks amount and `NGN` currency.
   - Transitions payment to `successful` and commits inventory reservation.
   - Transitions order to `pending` and logs `order_status_history`.
   - Inserts audit log entry into `audit_logs` (`action: 'payment.verified'`).
   - Publishes `payment.completed` domain event.
5. **Environment Configuration (`src/lib/config.ts`, `.env.example`)**:
   - Added `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`, and `FLUTTERWAVE_SECRET_HASH`.
6. **Automated Tests (`tests/flutterwave.test.ts`, `tests/checkout.test.ts`)**:
   - Added comprehensive tests for Flutterwave initialization, webhook hash verification, API cross-verification, mismatch rejection, duplicate webhook idempotency, and audit logging.
   - All 38 tests passing across the test suite.

## Why
To support Flutterwave payments while fully decoupling checkout and payment workflows from any single provider, preventing future vendor lock-in without altering the database schema.

## Files Touched
- `src/services/payment/provider.interface.ts` [NEW]
- `src/services/payment/flutterwave.provider.ts` [NEW]
- `src/app/api/webhooks/flutterwave/route.ts` [NEW]
- `tests/flutterwave.test.ts` [NEW]
- `src/services/checkout.service.ts` [MODIFIED]
- `src/services/webhook.service.ts` [MODIFIED]
- `src/services/paystack.service.ts` [MODIFIED]
- `src/app/api/webhooks/paystack/route.ts` [MODIFIED]
- `src/lib/constants.ts` [MODIFIED]
- `src/lib/config.ts` [MODIFIED]
- `src/types/checkout.ts` [MODIFIED]
- `.env.example` [MODIFIED]
- `tests/checkout.test.ts` [MODIFIED]
- `tests/paystack.test.ts` [MODIFIED]
- `tests/mocks/supabase.mock.ts` [MODIFIED]

## Follow-ups & Known Issues
- Configure `FLUTTERWAVE_SECRET_HASH` in Flutterwave Dashboard under Settings > Webhooks to match your environment variable.

## Commit Message
```text
feat(payment): implement Flutterwave provider abstraction and webhook handler

- Introduce PaymentProvider interface for vendor-agnostic payment processing
- Implement FlutterwavePaymentProvider with official v3 APIs and verif-hash validation
- Update checkout and webhook services to depend on PaymentProvider
- Add audit logging and domain events on successful payment verification
- Add Flutterwave webhook route at /api/webhooks/flutterwave
- Add test coverage for Flutterwave checkout and webhook processing
```
