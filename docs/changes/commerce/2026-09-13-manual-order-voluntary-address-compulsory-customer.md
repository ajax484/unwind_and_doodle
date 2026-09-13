# 2026-09-13 Manual Orders: Voluntary Address for Admins & Compulsory Address for Customers

## What Changed
- **Voluntary Address & Location for Admins**:
  - Relaxed `ManualOrderShippingAddressSchema` in `src/types/manual-order.ts` so `addressLine1`, `city`, and `state` are optional/blank-allowed when an admin creates a manual order.
  - Made `locationId` and `warehouseId` optional strings in `CreateManualOrderSchema`.
  - Updated `createAdminManualOrder` in `src/services/manual-order.service.ts` to assign a default placeholder (`'To be provided by customer'`) to customer address records and order shipping addresses if omitted, and intelligently resolve an active warehouse with sufficient inventory when `locationId` is not provided.
  - Updated `previewManualOrderPricing` and `calculateOrderPricing` in `src/services/pricing.service.ts` to allow optional `locationId`, defaulting `deliveryFee` to 0 if no location is selected.
  - Updated `ManualOrderForm.tsx` to label `Delivery Location (Optional for Admin)` and `Address Line 1 (Optional for Admin)` with helpful placeholder text.
- **Compulsory Address & Location for Customers**:
  - Replaced the static read-only address block in `src/app/pay/[token]/page.tsx` with interactive, responsive form fields for `Delivery Location *`, `Street Address *`, and optional `Apartment, Suite, Unit`.
  - Updated `executeSaveChanges` on the customer payment page to pass `shippingAddress` into the `PATCH /api/pay/[token]` endpoint.
  - Added client-side validation in `handlePayNow` blocking checkout if `selectedLocationId` or `addressLine1` is empty.
  - Added server-side validation in `initializePaymentRequestTransaction` in `src/services/manual-order.service.ts` that throws if `location_id` is missing or `address_line1` contains a pending placeholder.
- **Admin Dashboard Visibility**:
  - Added `isAddressPending?: boolean` to `AdminOrderListItem` in `src/types/admin-order.ts`.
  - Computed `isAddressPending` in `src/services/admin-order.service.ts` whenever the street address is pending/placeholder or `location_id` is null.
  - Rendered a styled `<Badge variant="status" statusType="warning" size="sm">Address Pending</Badge>` in `src/app/admin/orders/page.tsx` across desktop and mobile tables.

## Why
Admins taking manual orders over social media channels (Instagram, WhatsApp, phone) frequently receive customer orders before the exact shipping address is settled. Forcing admins to input street addresses and locations created friction and submission errors. Conversely, customers must provide complete shipping details before completing payment so orders can be fulfilled accurately.

## Files Touched
- `src/types/manual-order.ts`
- `src/types/admin-order.ts`
- `src/services/manual-order.service.ts`
- `src/services/pricing.service.ts`
- `src/services/admin-order.service.ts`
- `src/components/admin/manual-order/ManualOrderForm.tsx`
- `src/app/pay/[token]/page.tsx`
- `src/app/admin/orders/page.tsx`
- `tests/commerce/customer-payment-edit.test.ts`
- `docs/changes/commerce/2026-09-13-manual-order-voluntary-address-compulsory-customer.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
`feat(commerce): make manual order address voluntary for admin and compulsory for customer`
