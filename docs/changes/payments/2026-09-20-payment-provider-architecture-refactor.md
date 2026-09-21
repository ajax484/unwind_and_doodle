# Payment Provider Architecture Refactor & Centralized Factory

## What Changed
1. **Canonical Payment Provider Types (`src/services/payment/provider.types.ts`)**:
   - Introduced `PaymentProviderName = 'paystack' | 'flutterwave' | 'manual'` union type and `isPaymentProviderName` type guard.
2. **Minimal Manual Payment Provider (`src/services/payment/manual.provider.ts`)**:
   - Created `ManualPaymentProvider` implementing `PaymentProvider` interface for manual bank transfers and admin-verified orders.
3. **Centralized Provider Factory (`src/services/payment/provider.factory.ts`)**:
   - Implemented `getPaymentProvider(provider: PaymentProviderName | string): PaymentProvider`.
   - Mapped `paystack` $\rightarrow$ `PaystackPaymentProvider`, `flutterwave`/`flw` $\rightarrow$ `FlutterwavePaymentProvider`, `manual` $\rightarrow$ `ManualPaymentProvider`.
   - Implemented `UnsupportedPaymentProviderError` to explicitly fail on unsupported providers without silent fallback to Paystack.
4. **Decoupled Application Flows & Routes**:
   - Updated `/api/orders/verify` to resolve the provider dynamically from the persisted `payment.provider` record so historical payments are verified with their original gateway.
   - Updated `src/services/payment-revalidation.service.ts` to use `getPaymentProvider(payment.provider)`.
   - Updated `src/services/checkout.service.ts` to construct providers via `getPaymentProvider('paystack')` or injected provider.
   - Updated `src/services/webhook.service.ts` to use `getPaymentProvider('paystack')` and added strict provider mismatch guards against cross-provider payload spoofing.
   - Updated `src/services/manual-order.service.ts`, `src/services/admin-order.service.ts`, and `src/services/paystack.service.ts` to eliminate concrete direct provider instantiations.
   - Updated `/api/webhooks/paystack/route.ts` and `/api/webhooks/flutterwave/route.ts` to use `getPaymentProvider`.
5. **Comprehensive Tests (`tests/payment/provider-factory.test.ts`)**:
   - Added unit and integration tests verifying provider resolution, strict error throwing on unknown providers, historical payment verification independence, webhook provider matching, and checkout flow injection.

## Why
To make the ecommerce payment architecture genuinely provider-agnostic, eliminate hardcoded concrete provider instantiations from shared application flows, ensure historical payments are verified using the gateway they were created with, and provide a clean seam for Step 2 admin settings and multi-method checkout selection.

## Files Touched
- `src/services/payment/provider.types.ts` [NEW]
- `src/services/payment/manual.provider.ts` [NEW]
- `src/services/payment/provider.factory.ts` [NEW]
- `src/services/payment/index.ts` [NEW]
- `src/app/api/orders/verify/route.ts` [MODIFIED]
- `src/services/payment-revalidation.service.ts` [MODIFIED]
- `src/services/checkout.service.ts` [MODIFIED]
- `src/services/webhook.service.ts` [MODIFIED]
- `src/services/manual-order.service.ts` [MODIFIED]
- `src/services/admin-order.service.ts` [MODIFIED]
- `src/services/paystack.service.ts` [MODIFIED]
- `src/app/api/webhooks/paystack/route.ts` [MODIFIED]
- `src/app/api/webhooks/flutterwave/route.ts` [MODIFIED]
- `tests/payment/provider-factory.test.ts` [NEW]

## Follow-ups / Known Issues
- None. Ready for Step 2 (admin settings gateway configuration and customer checkout method selection).

## Commit Message
```text
refactor(payment): centralize payment provider resolver and decouple concrete providers

- Introduce PaymentProviderName canonical union type and getPaymentProvider factory
- Implement ManualPaymentProvider and UnsupportedPaymentProviderError
- Refactor /api/orders/verify and revalidation to verify historical payments using stored provider
- Enforce strict provider matching in webhook processing
- Add comprehensive provider factory and historical verification tests
```
