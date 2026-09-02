# Bundle Support in Admin Order Info and Customer Tracking Pages

## Summary
Updated order creation, admin order details, and customer order tracking endpoints and UI pages to snapshot and render product bundle components.

## What Changed
1. **Checkout Service (`src/services/checkout.service.ts`)**:
   - Inserted historical snapshot records into `order_item_bundle_components` for bundle line items during checkout.
2. **Admin Order Types & Service (`src/types/admin-order.ts`, `src/services/admin-order.service.ts`)**:
   - Extended `AdminOrderDetailItem` with `productType` and `bundleComponents`.
   - Updated `getAdminOrderDetail` to query `order_item_bundle_components` (with fallback to `bundle_items` and `products`) and populate bundle components.
3. **Customer & Public Tracking APIs (`src/app/api/orders/[orderNumber]/route.ts`, `src/app/api/account/orders/[orderNumber]/route.ts`)**:
   - Updated order retrieval endpoints to query `order_item_bundle_components` with live fallback for legacy/mock data.
4. **UI Pages**:
   - **Admin Order Info (`src/app/admin/orders/[id]/page.tsx`)**: Added `📦 Bundle Set` badge and bundle component breakdown box.
   - **Guest Tracking (`src/app/order/[orderNumber]/page.tsx`)**: Rendered `📦 Bundle Includes` component breakdown box under bundle items.
   - **Customer Account Tracking (`src/app/account/orders/[orderNumber]/page.tsx`)**: Ensured seamless bundle component rendering.

## Files Touched
- `src/services/checkout.service.ts`
- `src/types/admin-order.ts`
- `src/services/admin-order.service.ts`
- `src/app/api/orders/[orderNumber]/route.ts`
- `src/app/api/account/orders/[orderNumber]/route.ts`
- `src/app/admin/orders/[id]/page.tsx`
- `src/app/order/[orderNumber]/page.tsx`
- `src/app/account/orders/[orderNumber]/page.tsx`
- `tests/checkout.test.ts`

## Commit Message
`feat: add product bundle support to admin order info and customer tracking pages`
