# Feature: Phase 6 Payment/Webhook Integration

## What Changed
Implemented production-ready payment initialization, provider redirect, HMAC SHA512 webhook signature verification, direct API cross-verification, and authoritative payment/order state transitions.

### Payment Infrastructure Reused & Hardened
1. **Canonical Payment Provider**:
   - Integrated `PaystackPaymentProvider` ([`src/services/payment/paystack.provider.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/payment/paystack.provider.ts)) implementing `PaymentProvider` interface (`initializeTransaction`, `verifyTransaction`, `verifyWebhook`).
   - Converts standard currency units (NGN) to smallest subunit (kobo = `amount * 100`) for API requests and back (`amount / 100`) for API responses.
2. **Server-Side Initialization Endpoint**:
   - `POST /api/pay/[token]/initialize`: Resolves `order_payment_requests` record by token, checks pending state, checks non-expired, resolves associated order, obtains DB-authoritative total amount (`detail.pricing.total`), creates/links `payments` record (`provider_reference`), and calls Paystack API for checkout URL.
3. **Webhook Verification Endpoint & Service**:
   - Public webhook endpoint: `POST /api/webhooks/paystack` ([`src/app/api/webhooks/paystack/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/webhooks/paystack/route.ts)).
   - Webhook processor: `processPaymentWebhook` ([`src/services/webhook.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/webhook.service.ts)).
   - Validates `x-paystack-signature` against raw body via HMAC SHA512 using `PAYSTACK_SECRET_KEY`.
   - Cross-verifies transaction directly with Paystack API (`verifyTransaction`).
   - Validates transaction amount (`Math.abs(verifiedTx.amount - payment.amount) < 0.01`).
   - Validates currency (`verifiedTx.currency === 'NGN'`).
4. **Atomic Payment Completion & Idempotency**:
   - Updates `payments.status = 'successful'`.
   - Updates `order_payment_requests.status = 'paid'` (`paid_at = NOW()`).
   - Updates `orders.status = 'pending'` (`payment_status = 'successful'`).
   - Finalizes inventory reservation via `commitOrderReservations()`.
   - Increments discount usage count via `incrementDiscountUsageAtomic()` if discount was applied.
   - Emits domain event `payment.completed` and writes audit log.
   - Idempotency guard: duplicate webhooks return `alreadyProcessed: true` without re-running state mutations or re-committing stock.
5. **Return Redirect Verification**:
   - `GET /api/orders/verify`: Return callback endpoint verifying transaction upon customer redirect, updating `order_payment_requests` status to `paid` and `orders.status` to `pending`.

---

## Files Touched
- `src/services/payment/provider.interface.ts`
- `src/services/payment/paystack.provider.ts`
- `src/services/webhook.service.ts`
- `src/app/api/webhooks/paystack/route.ts`
- `src/app/api/pay/[token]/initialize/route.ts`
- `src/app/api/orders/verify/route.ts`
- `src/services/manual-order.service.ts`
- `tests/manual-orders.test.ts`
- `docs/changes/2026-08-30-payment-webhook-integration.md` [NEW]

---

## Commit Message
```text
feat(payment): implement Phase 6 Paystack payment initialization and webhook integration

- Add server-side Paystack payment transaction initialization for payment link tokens
- Implement public POST /api/webhooks/paystack endpoint with HMAC SHA512 signature verification
- Add direct Paystack API verification, amount/currency matching, and idempotency check
- Implement atomic payment completion updating payment request, order status, discount usage, and committing inventory reservations
- Add unit test suite covering initialization, signature check, amount mismatch, currency check, and webhook idempotency
```
