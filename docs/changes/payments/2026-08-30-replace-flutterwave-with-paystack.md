# Replace Flutterwave with Paystack Integration

## What Changed
1. **Paystack Payment Provider Architecture (`src/services/payment/paystack.provider.ts`)**:
   - Implemented `PaystackPaymentProvider` adhering to `PaymentProvider` interface.
   - Transaction initialization converts authoritative standard Naira (NGN) amounts to smallest currency unit kobo (`Math.round(amount * 100)`) server-side.
   - Direct verification endpoint parses and converts kobo back to standard NGN currency amounts.
   - Strict webhook authentication verifying `x-paystack-signature` using HMAC SHA512 and `PAYSTACK_SECRET_KEY` with constant-time equality check (`crypto.timingSafeEqual`).
2. **Checkout & Order Service Adaptation (`src/services/checkout.service.ts`, `src/services/webhook.service.ts`)**:
   - Swapped default payment provider in `processCheckout()` and `processPaymentWebhook()` to `PaystackPaymentProvider`.
   - Maintained database schema (`payments` table with `provider = 'paystack'`).
   - Maintained state machine transition (`created → pending` on payment success; confirmed remains an admin-only fulfillment state).
3. **Environment & App Configuration (`.env.example`, `src/lib/config.ts`)**:
   - Configured `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` as primary payment environment variables.
   - Removed active usage of Flutterwave environment variables.
4. **Order Verification & Return Flow (`src/app/api/orders/verify/route.ts`, `src/app/order/callback/page.tsx`)**:
   - Updated payment return callback handler to verify transaction reference with Paystack API.
   - Updated customer feedback to neutral provider-agnostic messaging.
5. **Testing Suite (`tests/paystack.test.ts`, `tests/checkout.test.ts`, `tests/checkout-page.test.ts`, `tests/purchasing-journey.test.ts`)**:
   - Comprehensive test suite covering transaction initialization (kobo conversion), direct verification, amount mismatch rejection, currency verification, webhook signature security, idempotency against duplicate webhooks, inventory release upon failure, and retry tracing.
   - All 108 tests passing across 13 test suites.

## Why
Transitioned payment processing to Paystack using test keys while maintaining strict backend authorization, exact NGN kobo calculation, duplicate webhook idempotency, and clean separation of concerns.

## Files Touched
- `src/services/payment/paystack.provider.ts` [NEW]
- `src/services/paystack.service.ts` [MODIFIED]
- `src/services/checkout.service.ts` [MODIFIED]
- `src/services/webhook.service.ts` [MODIFIED]
- `src/app/api/orders/verify/route.ts` [MODIFIED]
- `src/app/checkout/page.tsx` [MODIFIED]
- `src/app/order/callback/page.tsx` [MODIFIED]
- `src/app/order/[orderNumber]/page.tsx` [MODIFIED]
- `src/components/Footer.tsx` [MODIFIED]
- `src/lib/config.ts` [MODIFIED]
- `.env.example` [MODIFIED]
- `tests/paystack.test.ts` [MODIFIED]
- `tests/checkout.test.ts` [MODIFIED]
- `tests/checkout-page.test.ts` [MODIFIED]
- `tests/purchasing-journey.test.ts` [MODIFIED]
- `tests/api-routes.test.ts` [MODIFIED]
- `docs/changes/2026-08-30-replace-flutterwave-with-paystack.md` [NEW]

## Follow-ups / Known Issues
- None. All Flutterwave references removed from active flows.

## Commit Message
```text
feat(payment): replace Flutterwave integration with Paystack

- Implement PaystackPaymentProvider with server-side kobo conversion and HMAC SHA512 validation
- Update checkout, return callback verification, and webhook services to use Paystack
- Preserve payments table schema, inventory reservation lifecycle, and created -> pending state machine
- Update environment variables and UI copy for Paystack
- Add comprehensive Paystack tests (108/108 tests passing)
```
