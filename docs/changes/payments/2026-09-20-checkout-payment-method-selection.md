# Checkout Payment Method Selection & Dynamic Payment Initialization (Step 3)

Connects the merchant payment-method configuration to the customer checkout flow. Customers can dynamically select their preferred payment method (`paystack`, `flutterwave`, `manual` / Bank Transfer) from enabled merchant options, with server-side authoritative validation and immutable payment provider attribution.

## What Changed

1. **Checkout Schema & Types (`src/types/checkout.ts`)**:
   - Extended `CheckoutRequestSchema` to accept optional `paymentMethod: 'paystack' | 'flutterwave' | 'manual'`.
   - Updated `CheckoutResult` with `provider: PaymentProviderName`, `paymentType: 'redirect' | 'manual'`, and `bankDetails?: BankTransferConfig | null`.

2. **Core Checkout Service (`src/services/checkout.service.ts`)**:
   - Integrated authoritative server-side validation against `getEnabledPaymentMethods(supabase, orgId)` to ensure requested payment methods cannot bypass merchant settings.
   - Replaced static provider assumptions with dynamic resolution via `getPaymentProvider(requestedPaymentMethod)`.
   - Enhanced `payments` record insertion with authoritative `provider: paymentProvider.name`, `status: pending`, and `bank_details` metadata for direct bank transfers.
   - Maintained 45-minute inventory reservation for both gateway and manual transfer orders.

3. **Customer Checkout UI (`src/app/checkout/page.tsx`)**:
   - Fetches active merchant payment methods from `/api/payment-methods` on mount.
   - Renders interactive radio cards with customer-friendly descriptions and icons.
   - Added a Bank Transfer Confirmation Screen revealing verified store bank details (Bank Name, Account Name, Account Number with copy button, Amount, Order Reference) upon order placement with manual payment.
   - Dynamic CTA button text reflecting the active payment method.

4. **Testing Suite (`tests/payment/checkout-payment-selection.test.ts`)**:
   - Added unit & integration tests covering single provider defaults, multiple provider dynamic routing, rejection of disabled providers, direct bank transfer initialization, and historical payment record immutability.

## Why

Merchants need customer checkout to reflect their active payment configuration dynamically. Server-side validation ensures security against client tampering, while manual bank transfer orders require a direct confirmation experience with bank details and hold times without faking gateway redirects.

## Files Touched

- `src/types/checkout.ts`
- `src/services/checkout.service.ts`
- `src/app/checkout/page.tsx`
- `tests/payment/checkout-payment-selection.test.ts`
- `docs/changes/payments/2026-09-20-checkout-payment-method-selection.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None (Ready for Step 4: Complete Manual / Bank Transfer Payment Lifecycle + Admin Payment Verification).

## Commit Message

feat(checkout): implement customer payment method selection and dynamic provider initialization
