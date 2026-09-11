# Fix TypeScript Errors in Order Status Page and Manual Orders Test

## What Changed
- In [`src/app/order/[orderNumber]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/order/[orderNumber]/page.tsx):
  - Added `streetAddress` to the `ShippingAddress` interface definition.
  - Safely typed `shippingAddr` and added fallback to `shippingAddr.addressLine1` when `streetAddress` is not present.
- In [`src/types/manual-order.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/types/manual-order.ts):
  - Changed exported input type aliases (`CreateManualOrderInput`, `ManualOrderShippingAddressInput`, `UpdateCustomerOrderInput`, etc.) to use `z.input<typeof ...>` instead of `z.infer<typeof ...>` so optional/defaulted schema fields (e.g. `country: z.string().default('Nigeria')`) are correctly optional on input objects.
- In [`tests/manual-orders.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/manual-orders.test.ts):
  - Added non-null assertion operators (`!`) and `toBeDefined()` checks on mock Supabase query result variables (`order`, `items`, `bundleItem`, `bundleComps`, `payment`, `history`, `cancelledOrder`, `req`, `snapshots`, etc.) resolving all `TS18047: '...' is possibly 'null'` errors.

## Why
- Fix compile-time TypeScript errors when running `tsc --noEmit` and ensure strict type-safety across order viewing and manual order test fixtures.

## Files Touched
- `src/app/order/[orderNumber]/page.tsx`
- `src/types/manual-order.ts`
- `tests/manual-orders.test.ts`
- `docs/changes/2026-09-02-fix-order-page-and-manual-orders-types.md`

## Commit Message
```text
fix(types): resolve typescript errors in order status page and manual orders test

- add streetAddress to ShippingAddress interface and address rendering in order status page
- use z.input in manual-order.ts to allow defaulted schema properties to be optional on input
- add non-null assertions and guards across tests/manual-orders.test.ts
```
