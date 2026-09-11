# Fix Checkout Theme Customization Forwarding

## What Changed
- Updated [`src/app/api/cart/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/cart/route.ts) (`POST` and `PATCH`) to extract and forward `themeCustomization` to `addItemToCart()` and `updateCartItemCustomization()`.
- Updated [`src/services/cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts) to support optional `themeCustomization` in `CartCustomizationInput` and preserve/update theme settings in `updateCartItemCustomization()`.
- Updated [`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx) to map `item.themeCustomization` in `handleSubmit` when building the items payload for `/api/checkout`, added client-side validation preventing checkout with un-themed coloring books, and added visual display of selected themes and custom cover name in the Order Summary sidebar.
- Updated [`src/app/cart/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx) to validate `supportsThemeCustomization` in `hasIncompleteCustomization`, display missing theme warnings on cart items requiring theme configuration, and disable checkout button when required themes are unselected.
- Updated [`src/components/CartDrawer.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx) to display missing themes warning badge.
- Fixed [`src/services/customer.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/customer.service.ts) removing redundant `marketing_consent` column reference in favor of `email_marketing_consent`.
- Added API route test in [`tests/api-routes.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/api-routes.test.ts) verifying cart addition with `themeCustomization`.

## Why
When customer added a customizable coloring book (which has `supports_theme_customization: true`) to cart and proceeded to checkout, the checkout endpoint returned an error:
`"Product requires theme customization (between 1 and 3 themes)."`
This was caused by `themeCustomization` being dropped at the `/api/cart` route handler and omitted during the mapping of `cart.items` into the checkout submission payload.

## Files Touched
- [`src/app/api/cart/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/cart/route.ts)
- [`src/services/cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts)
- [`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)
- [`tests/api-routes.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/api-routes.test.ts)
- [`docs/changes/2026-08-31-fix-checkout-theme-customization.md`](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-08-31-fix-checkout-theme-customization.md)

## Follow-ups / Known Issues
None. All 332 tests across 27 test suites pass.

## Suggested Commit Message
```text
fix: forward theme customization in cart routes and checkout payload

- Pass themeCustomization in POST and PATCH /api/cart
- Include themeCustomization when constructing checkout items payload in checkout page
- Render selected themes and custom cover badge in checkout order summary
- Add integration test for cart theme customization persistence
```
