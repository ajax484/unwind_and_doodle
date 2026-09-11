# Cart Item Deduplication and Checkout Schema Fixes

## 1. What Changed
- **Cart Deduplication**: Updated `addItemToCart` in `src/services/cart.service.ts` to check for existing cart items with matching product IDs, add-ons, and customizations. Re-adding an item now increments its quantity instead of creating duplicate line items.
- **Cart Clearing**: Added `clearCart` method in `src/services/cart.service.ts` and updated `DELETE /api/cart` to support clearing all items on checkout completion (`?clear=true`).
- **Postgres Schema Alignment in Checkout**:
  - `src/services/customer.service.ts`: Removed invalid columns (`city`, `street_address`, `postal_code`) from `customer_addresses` insert. Address text is stored in `address_line_1`, while city/district maps to `lga`.
  - `src/services/checkout.service.ts`: Removed invalid columns (`add_ons_total`, `delivery_fee`, `total_amount`, `shipping_address_id`, `currency`, `notes`) from `orders` insert. Updated `order_items`, `order_item_addons`, `customizations`, and `customization_assets` inserts to match table columns.
  - `src/app/api/orders/verify/route.ts`: Fixed select query from `total_amount` to `total`.
  - `src/services/admin-customer.service.ts`: Updated order queries and LTV calculations to use `total` with fallback to `total_amount`.
  - `src/app/checkout/page.tsx`: Added `callbackUrl: \`${window.location.origin}/order/callback\`` to the checkout payload.
  - `src/app/order/callback/page.tsx`: Clears the active cart session upon verified order payment return.

## 2. Why
- PostgREST rejected inserts on `customer_addresses` and `orders` because non-existent column names (`city`, `add_ons_total`, `total_amount`) were present in the payloads.
- Repeated additions to the cart were generating multiple individual entries rather than aggregating item quantities.
- After completing payments, the cart was not clearing, leaving purchased items in the drawer.

## 3. Files Touched
- `src/services/cart.service.ts`
- `src/app/api/cart/route.ts`
- `src/services/customer.service.ts`
- `src/services/checkout.service.ts`
- `src/app/api/orders/verify/route.ts`
- `src/services/admin-customer.service.ts`
- `src/services/webhook.service.ts`
- `src/app/checkout/page.tsx`
- `src/app/order/callback/page.tsx`
- `tests/cart-drawer-and-page.test.ts`
- `tests/checkout.test.ts`
- `tests/purchasing-journey.test.ts`

## 4. Follow-ups & Known Issues
- None. All 22 test suites (237 tests) pass with 0 errors.

## 5. Commit Message
```text
fix(checkout): deduplicate cart items and align checkout queries with postgres schema

- Merge duplicate cart items when adding products with matching configuration
- Add clearCart helper and clear cart upon successful payment return
- Remove invalid columns from customer_addresses, orders, and order_items inserts
- Add callbackUrl to checkout payload for automatic Paystack return
```
