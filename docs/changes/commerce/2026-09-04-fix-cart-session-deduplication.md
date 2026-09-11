# Fix Cart Session Deduplication & Stranded Cart Items

## What Changed

1. **Replaced `.maybeSingle()` with Resilient Order + Consolidation Query (`src/services/cart.service.ts`)**:
   - Replaced `.eq('session_id', sessionId).maybeSingle()` and `.eq('customer_id', customerId)...maybeSingle()` with an ordered query: `.order('updated_at', { ascending: false })`.
   - Filtered active carts (`status === 'active' || !status`) in memory.
   - Added automatic consolidation logic: when multiple cart records exist for the same `session_id` or `customer_id`, all stranded `cart_items` from older duplicate carts are migrated to the primary active cart (`UPDATE cart_items SET cart_id = primaryCart.id WHERE cart_id IN (...)`), and the duplicate empty carts are deleted.

2. **Propagated `customerId` to Return Statements (`src/services/cart.service.ts`)**:
   - Updated `addItemToCart`, `updateCartItemQuantity`, `updateCartItemCustomization`, `removeCartItem`, and `clearCart` to pass `customerId` to `getCartDetails(supabase, sessionId, customerId)`.
   - Guaranteed that `sessionId` in `getCartDetails` returns `cart.session_id || sessionId`.

3. **Resolved Flash of Empty Cart on Cart Page (`src/app/cart/page.tsx`)**:
   - Added a skeleton loading state on `CartPage` when `loading && !cart` to prevent displaying "Your Cart is Empty" while the initial cart fetch request is in flight.

4. **Live Database Cleanup**:
   - Consolidated 85 duplicate carts for the active user session and moved 7 stranded cart items back into the primary active cart.
   - Deduplicated duplicate carts across all remaining sessions in the database.

5. **Automated Vitest Test Added (`tests/commerce/cart-drawer-and-page.test.ts`)**:
   - Added `10. Multi-Cart Deduplication & Item Consolidation` test suite asserting that multiple duplicate carts for a session are gracefully merged into the primary cart and duplicate rows are pruned.

## Why

When a customer added items, if duplicate cart records existed in the database for that `session_id`, PostgREST `.maybeSingle()` errored with `PGRST116: Results contain multiple rows, but 0 or 1 was expected` and returned `data: null`.
`getOrCreateCart` interpreted this as a non-existent cart and spawned a new empty cart on every subsequent request. Newly added items remained stranded in previous duplicate cart IDs, while any subsequent `GET /api/cart` call generated yet another empty cart, causing customers to see an empty cart after adding items.

## Files Touched

- [`src/services/cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts)
- [`src/app/cart/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx)
- [`tests/commerce/cart-drawer-and-page.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/commerce/cart-drawer-and-page.test.ts)

## Follow-ups / Known Issues

None. All cart items now persistently link to the primary active cart and survive navigation across drawer and cart page.

## Commit Message

`fix(cart): resolve session duplication and consolidate stranded cart items`
