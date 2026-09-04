# Cart System Hardening: Validation, Query Optimization, State Unification, & Lifecycle Integrity

## What Changed

1. **Zod Cart Input Validation Schemas (`src/types/cart.ts`)**:
   - Created `AddToCartSchema`, `UpdateCartItemSchema`, `CartAddonInputSchema`, and `CartThemeCustomizationInputSchema`.
   - Guaranteed integers for quantities (positive for addition, non-negative for updates) to prevent fractional quantities or malformed addons.
   - Refined `UpdateCartItemSchema` to mandate at least one actionable field (`quantity`, `customization`, or `themeCustomization`).

2. **Cart Service Query Optimization & Domain Logic (`src/services/cart.service.ts`)**:
   - **Query Scoping**: Replaced the duplicate full-table scan on `product_addons` with a query scoped to parent product IDs (`.in('parent_product_id', parentIds)` with backwards-compatible fallback to `product_id`).
   - **Deterministic Imagery**: Added explicit `.order('sort_order', { ascending: true })` and sorting prioritizing `is_primary` to eliminate image flicker on cart renders.
   - **Customization Equality**: Hardened `areCustomizationsEqual` to trim whitespace notes, treat empty notes as equal, and ignore empty addon/theme arrays.
   - **Availability Flag**: Added `isAvailable: boolean` to `CartItemDetail` reflecting `is_active` status of the product.
   - **Customer Account Association**: Enhanced `getOrCreateCart`, `getCartDetails`, and mutations to accept optional `customerId`, associating authenticated customer accounts with `carts.customer_id` and ensuring `status: 'active'`.

3. **API Route Hardening (`src/app/api/cart/route.ts`)**:
   - Integrated Zod parsing for `POST` and `PATCH` requests, returning clear 400 Bad Request responses on schema validation failures.
   - Resolved authenticated user context (`getAuthenticatedUserContext(req)`) to seamlessly link carts to customer IDs.
   - Supported combined PATCH updates allowing simultaneous modification of customization and quantity in a single transaction.

4. **Cart Checkout Conversion (`src/app/api/orders/verify/route.ts`)**:
   - Updated payment verification to atomically mark associated carts as `status = 'converted'`, preventing carts from lingering indefinitely as active post-purchase and enabling abandoned cart tracking.

5. **Post-Payment Callback Cleanup (`src/app/order/callback/page.tsx`)**:
   - Added `getCartHeaders()` to `DELETE /api/cart?clearAll=true` and dispatched `dispatchCartUpdated(undefined, false)` to guarantee accurate cross-tab and drawer state synchronization.

6. **Unified Client Cart State Management (`src/context/CartContext.tsx`)**:
   - Created `CartProvider` and `useCart()` custom hook, unifying cart fetching, caching, drawer state (`isOpen`, `openDrawer`, `closeDrawer`), and mutation dispatchers.
   - Eliminated race conditions and duplicate concurrent `GET /api/cart` requests fired by `Navbar` and `CartDrawer` on initial mount.
   - Integrated centralized error handling with toast notifications.

7. **Root Layout Provider Injection (`src/app/layout.tsx`)**:
   - Wrapped application body in `<CartProvider>` to make cart state ubiquitously available.

8. **Component Refactoring (`src/components/Navbar.tsx`, `src/components/CartDrawer.tsx`, `src/app/cart/page.tsx`)**:
   - **`Navbar.tsx`**: Consumes `useCart()` for `cartCount` and `openDrawer()`, eliminating redundant `useEffect` and duplicate GET calls.
   - **`CartDrawer.tsx`**: Refactored to `useCart()` actions (`updateQuantity`, `removeItem`, `closeDrawer`). Added visual alert badges for unavailable items (`isAvailable === false`) and disabled the checkout CTA when unavailable items are present.
   - **`CartPage.tsx`**: Refactored to `useCart()` actions. Added `getCartHeaders()` to `handleSaveCustomization`. Added unavailable item banner warning and disabled checkout button.

9. **Comprehensive Test Suite Extension (`tests/commerce/cart-drawer-and-page.test.ts`)**:
   - Added tests for customization equality with whitespace/empty notes.
   - Added tests for active (`isAvailable: true`) and inactive/archived (`isAvailable: false`) product flagging.
   - Added cross-session cart retrieval test using `customerId`.
   - Added comprehensive schema validation tests for `AddToCartSchema` and `UpdateCartItemSchema`.

## Why

- **Performance**: The full table scan on `product_addons` caused unnecessary database load that would degrade as the catalog scaled.
- **Data Integrity**: Unvalidated decimal quantities and malformed addons caused runtime 500 errors.
- **User Experience**: Duplicate initial `GET` requests caused network waste and race conditions; silent UI mutation failures left users confused when network or server errors occurred; missing unavailable badges allowed customers to proceed to checkout with discontinued items.
- **CRM & Abandoned Cart Analytics**: Carts were never marked as `converted` upon checkout completion, leaving all carts indefinitely in `active` state and preventing accurate abandoned cart detection. Authenticated customers could not share cart state across devices.

## Files Touched

- [`src/types/cart.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/types/cart.ts) [NEW]
- [`src/services/cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts)
- [`src/app/api/cart/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/cart/route.ts)
- [`src/app/api/orders/verify/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/orders/verify/route.ts)
- [`src/app/order/callback/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/order/callback/page.tsx)
- [`src/context/CartContext.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/context/CartContext.tsx) [NEW]
- [`src/app/layout.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx)
- [`src/components/Navbar.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/Navbar.tsx)
- [`src/components/CartDrawer.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx)
- [`src/app/cart/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx)
- [`tests/commerce/cart-drawer-and-page.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/commerce/cart-drawer-and-page.test.ts)

## Follow-ups / Known Issues

- In `tests/api-routes.test.ts`, the live test `GET /api/products/[slug] returns product details with 200 OK for published slug` failed because the test hardcodes the slug `'test-coloring-book'`, which does not exist in the active live Supabase database environment. Per repository rules, this unrelated test fixture issue is flagged rather than modified inline.

## Commit Message

`fix(cart): harden validation, optimize queries, unify state, and link customer sessions`
