# Manual Orders Enhancements (Backend Core Logic & APIs)

## Summary of Changes
Implemented server-side business logic and APIs for manual orders enhancements:
1. **Manual Discount Support**: Added `discount_source` (`'code'`, `'manual_percentage'`, `'manual_fixed'`) column to `public.orders` and PostgreSQL RPC `create_admin_manual_order`. Added server-side validation for discount parameters (positive values, percentage ≤ 100%, fixed ≤ subtotal) and enforced mutual exclusivity between coupon codes and manual discounts.
2. **Canonical Delivery Fee Resolver**: Extracted `resolveDeliveryFee` canonical function in `pricing.service.ts` to be used across checkout, manual orders, and customer edit APIs.
3. **Inventory & Bundle Validation**: Added `computeAvailableStock` and `computeBuildableBundles` helpers in `inventory.service.ts`. Enforced server-authoritative stock checks accounting for reservations and component stock for product bundles.
4. **Secure Customer Order Edit API**: Implemented `updateCustomerOrderDetails` and `PATCH /api/pay/[token]` endpoint. Validates payment link token and order status (`'created'`), updates customer contact and location info, recalculates delivery fee and total using canonical resolver, and synchronizes payment request amounts atomically.

## Why Changes Were Made
- Ensure all pricing, discount calculations, delivery fee resolution, and inventory checks are strictly server-authoritative.
- Prevent invalid, negative, or excessive discount values from being applied to orders.
- Provide a unified canonical delivery fee resolution mechanism shared between public checkout and admin/customer order edit workflows.
- Allow customers paying via payment link tokens to edit their contact details and delivery location safely before payment without compromising price integrity.

## Files Touched
- [20260902000000_manual_orders_enhancements.sql](file:///c:/Users/USER/work/unwind_and_doodle/supabase/migrations/20260902000000_manual_orders_enhancements.sql)
- [manual-order.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/manual-order.ts)
- [types.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/lib/supabase/types.ts)
- [pricing.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/pricing.service.ts)
- [inventory.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/inventory.service.ts)
- [manual-order.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/manual-order.service.ts)
- [route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/pay/[token]/route.ts)
- [manual-orders.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/manual-orders.test.ts)

## Follow-ups / Known Issues
None.

## Suggested Commit Message
`feat(manual-orders): implement backend core logic, canonical delivery fee resolver, manual discounts, and customer edit API`
