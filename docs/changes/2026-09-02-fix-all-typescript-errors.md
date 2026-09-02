# Fix All TypeScript Errors Across Codebase

## What Changed
Resolved all TypeScript type-checking errors across the entire codebase (`src/` and `tests/`), achieving a clean `npx tsc --noEmit` exit code (0 errors).

Key changes:
1. **Application & Infrastructure Code**:
   - [src/lib/config.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/lib/config.ts): Added optional `flutterwaveSecretKey` and `flutterwaveSecretHash` to `AppConfig` and `getConfig()` to resolve missing configuration properties in Flutterwave payment provider.
   - [src/services/admin-order.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/admin-order.service.ts): Added `Json` import from `../lib/supabase/types` to resolve `Cannot find name 'Json'`.
   - [src/services/payment-revalidation.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/payment-revalidation.service.ts): Access `rawResponse` instead of non-existent `gatewayResponse` property on `PaymentVerification`.
   - [src/services/pricing.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/pricing.service.ts): Safely type-cast legacy product columns (`is_active`, `price`) on raw database records.
   - [src/services/admin-customer.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/admin-customer.service.ts): Added null guards for `customer_id` on orders when aggregating customer metrics.
   - [src/services/admin-customization.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/admin-customization.service.ts) and [src/types/admin-review-customization.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-review-customization.ts): Allowed `customerId: string | null` and added null guards when querying customer profiles.
   - [src/types/admin-inventory.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-inventory.ts): Added `'bundle'` to `AdminInventoryItem.productType` union; made `reference` optional on `CreateStockReceiptSchema` to support auto-generated GRN references.
   - [src/services/cart.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts): Cast image and asset properties safely, and added `themeCustomization` payload handling.
   - [src/services/reorder.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/reorder.service.ts): Aligned selected columns on `inventory` table with actual schema (`quantity, reserved_quantity`).
   - [src/services/theme.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/theme.service.ts): Cast RPC call and validated theme ID string; guarded nullable slug assignment in update payload.
   - [src/services/manual-order.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/manual-order.service.ts): Provided defaults for customer name, street address, and guarded location ID; cast idempotency key and safe payments update; provided empty `addons` default array for pricing calculation.
   - [src/types/manual-order.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/manual-order.ts): Added optional `subtotal`, `discountTotal`, `shippingFee`, `total` to `PaymentLinkResponse`.
   - [src/app/api/orders/[orderNumber]/route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/orders/%5BorderNumber%5D/route.ts): Safely cast access to customization notes.
   - [src/app/admin/products/[productId]/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/products/%5BproductId%5D/page.tsx): Added `'bundle'` to `productType` state type.
   - [src/app/api/admin/customers/export/route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/admin/customers/export/route.ts): Passed default `page` and `limit` to `exportAdminCustomersCsv`.
   - [src/components/admin/manual-order/ManualOrderSuccessModal.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/admin/manual-order/ManualOrderSuccessModal.tsx): Supported both `onClose` and `onReset` props.

2. **Schema Input Types (`z.input` vs `z.infer`)**:
   - Updated input type aliases across [src/types/admin-bundle.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-bundle.ts), [src/types/admin-product.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-product.ts), [src/types/admin-customer.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-customer.ts), [src/types/admin-inventory.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-inventory.ts), [src/types/admin-order.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-order.ts), [src/types/admin-review-customization.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-review-customization.ts), and [src/types/admin-theme.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-theme.ts) to use `z.input<typeof ...>` instead of `z.infer<typeof ...>`. This allows callers and tests to omit fields that have Zod defaults (e.g. `category_ids`, `images`, `cost_price`, `page`, `limit`, `isActive`, `sortOrder`).

3. **Test Suites**:
   - [tests/checkout-page.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/checkout-page.test.ts): Implemented `verifyWebhook` on `MockPaymentProvider`; added `marketingConsent` and `addons: []` to checkout payload.
   - [tests/checkout.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/checkout.test.ts): Aligned `bundleCheckoutReq` with `CheckoutRequest` schema (`marketingConsent`, `streetAddress`, `addons: []`).
   - [tests/coloring-books.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/coloring-books.test.ts): Replaced `accessCode` with `provider` in `initializeTransaction` mock; added `marketingConsent` and `addons: []` to order requests.
   - [tests/customer-payment-edit.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/customer-payment-edit.test.ts): Fixed order update payload type casting.
   - [tests/discounts.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/discounts.test.ts): Removed duplicated `id` property on object literal and added `addons: []` to items.
   - [tests/payment-revalidation.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/payment-revalidation.test.ts): Mocked `membership` instead of non-existent `adminUser` property on `AdminOrganizationContext`.
   - [tests/paystack.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/paystack.test.ts): Added non-null assertion on `newPayment` result.
   - [tests/transaction-pipeline.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/transaction-pipeline.test.ts): Added `marketingConsent` and `addons: []` to checkout request.

## Why
TypeScript strict checks caught multiple mismatched schemas, missing optional fields with defaults, missing imports, and outdated mock implementations. Resolving these ensures strict type safety, prevents runtime regressions, and brings the entire project into clean compilation.

## Files Touched
- `src/lib/config.ts`
- `src/services/admin-order.service.ts`
- `src/services/payment-revalidation.service.ts`
- `src/services/pricing.service.ts`
- `src/services/admin-customer.service.ts`
- `src/services/admin-customization.service.ts`
- `src/types/admin-review-customization.ts`
- `src/types/admin-inventory.ts`
- `src/services/cart.service.ts`
- `src/services/reorder.service.ts`
- `src/services/theme.service.ts`
- `src/services/manual-order.service.ts`
- `src/types/manual-order.ts`
- `src/app/api/orders/[orderNumber]/route.ts`
- `src/app/admin/products/[productId]/page.tsx`
- `src/app/api/admin/customers/export/route.ts`
- `src/components/admin/manual-order/ManualOrderSuccessModal.tsx`
- `src/types/admin-bundle.ts`
- `src/types/admin-product.ts`
- `src/types/admin-customer.ts`
- `src/types/admin-order.ts`
- `src/types/admin-theme.ts`
- `tests/checkout-page.test.ts`
- `tests/checkout.test.ts`
- `tests/coloring-books.test.ts`
- `tests/customer-payment-edit.test.ts`
- `tests/discounts.test.ts`
- `tests/payment-revalidation.test.ts`
- `tests/paystack.test.ts`
- `tests/transaction-pipeline.test.ts`

## Follow-ups / Known Issues
- An existing unit test in [tests/auth-redesign-matrix.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/auth-redesign-matrix.test.ts#L362) fails (`expected 'admin' to be 'staff'`). This test is unrelated to the TypeScript changes and pertains to the invitation acceptance endpoint returning role `'admin'` instead of `'staff'`. Per policy, this is flagged for follow-up and was not modified inline.

## Commit Message
```
fix(types): resolve all typescript errors across src and test suites

- Align Zod filter and creation input types with z.input to support schema defaults
- Add missing config, model, and modal properties in manual orders and inventory
- Fix mock signatures and checkout request schemas across unit test suites
```
