# Fix Bundle Checkout Warehouse Inventory Resolution

## What Changed
1. **Physical Product Item Resolution Helper (`src/services/warehouse.service.ts`)**:
   - Added `resolveRequiredPhysicalItems(supabase, items)`:
     - Identifies bundle products (`product_type === 'bundle'`) in checkout items.
     - Fetches component definitions from `bundle_items` table.
     - Explodes bundle items into physical component items (`component_product_id`, `quantity * component_quantity`).
     - Retains physical product IDs for standard items and add-ons.

2. **Checkout & Manual Order Services**:
   - Updated [`src/services/checkout.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/checkout.service.ts) to resolve physical component requirements prior to `findCapableWarehouse` and `reserveOrderInventory`.
   - Updated [`src/services/manual-order.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/manual-order.service.ts) to resolve physical component requirements for admin manual orders.

3. **Automated Testing**:
   - Added integration test in [`tests/checkout.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/checkout.test.ts) validating end-to-end bundle checkout, warehouse selection against physical component stock, and atomic component inventory reservations.

## Why
Bundles do not have direct physical inventory rows stored under the bundle's product ID in the `inventory` table. Previously, checkout evaluated warehouse stock directly against the bundle product ID, resulting in 0 stock and throwing `"Insufficient stock in any single warehouse serving your location"`.

## Files Touched
- [`src/services/warehouse.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/warehouse.service.ts)
- [`src/services/checkout.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/checkout.service.ts)
- [`src/services/manual-order.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/manual-order.service.ts)
- [`tests/checkout.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/checkout.test.ts)

## Follow-ups / Known Issues
None.

## Commit Message
`fix(checkout): resolve bundle components into physical items for warehouse capability and inventory reservation`
