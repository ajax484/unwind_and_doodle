# Fix Add to Cart Session Race Condition & Zero-Quantity Addons

## What Changed
1. **Client-Side Cart Session Manager (`src/lib/cart-client.ts`)**:
   - Added client-side session ID persistence using browser `localStorage` (`uad_cart_session`).
   - Standardized `getCartHeaders()` helper supplying `x-cart-session` header across all cart fetch requests (`GET`, `POST`, `PATCH`, `DELETE`).
   - Implemented `dispatchCartUpdated(cart, openDrawer)` which passes the full cart payload in custom event detail and optionally triggers slide-over drawer opening.

2. **Frontend UI Integration**:
   - Updated [`src/app/products/[slug]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/%5Bslug%5D/page.tsx) to filter zero-quantity add-ons and dispatch `dispatchCartUpdated(json.data, true)` on successful add-to-cart.
   - Updated [`src/components/Navbar.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/Navbar.tsx) and [`src/components/CartDrawer.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx) to listen for `CustomEvent<{ cart: CartResponse }>` and immediately update `cartCount` and `cart` state from `event.detail` without waiting for secondary GET network requests.
   - Updated [`src/app/cart/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx) and [`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx) to include `getCartHeaders()` in cart requests.

3. **Backend Service & Route Hardening**:
   - Updated [`src/services/cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts) to filter out zero/negative quantity add-ons in `addItemToCart`.

## Why
When adding an item on initial visit, `POST /api/cart` generated a session ID (`sess_A`) and returned a `Set-Cookie` header. Immediate parallel `GET /api/cart` requests triggered by `cart-updated` events ran before cookie jar processing completed, causing `GET` to generate a second session ID (`sess_B`) with an empty cart and overwrite the browser cookie.

## Files Touched
- [`src/lib/cart-client.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/lib/cart-client.ts) [NEW]
- [`src/services/cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts)
- [`src/app/products/[slug]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/%5Bslug%5D/page.tsx)
- [`src/components/Navbar.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/Navbar.tsx)
- [`src/components/CartDrawer.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx)
- [`src/app/cart/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx)
- [`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)
- [`tests/cart-drawer-and-page.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/cart-drawer-and-page.test.ts)

## Follow-ups / Known Issues
None.

## Commit Message
`fix(cart): resolve session race condition and auto-open drawer on item addition`
