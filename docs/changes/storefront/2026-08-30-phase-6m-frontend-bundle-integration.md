# Phase 6M — Frontend Bundle Integration

## What Changed
- **Service Layer**:
  - Extended [`CatalogProductItem`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/catalog.service.ts) and [`ProductDetail`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/catalog.service.ts) interfaces to support `productType` (`'bundle'`), `bundleComponentsCount`, and `bundleItems` (`BundleComponentDetail[]`).
  - Extended [`CartItemDetail`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts) to carry `productType` and resolved `bundleComponents`.
  - Updated [`/api/account/orders/[orderNumber]`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/account/orders/[orderNumber]/route.ts) to query `order_item_bundle_components` and expose `bundleComponents` for historical order snapshots.
- **Storefront & Product Detail**:
  - Updated [`ProductCard`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/ProductCard.tsx) to display a purple `📦 Bundle • X Items` badge.
  - Updated [`/products/[slug]`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/[slug]/page.tsx) to calculate bundle savings and render a dedicated **"What's Included"** section listing component products and component quantities.
- **Cart, Checkout & Order History**:
  - Updated [`CartDrawer`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx) and [`/cart`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx) to render component breakdowns beneath cart line items.
  - Updated [`/checkout`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx) order summary sidebar to include component lists under bundle cart items.
  - Updated [`/account/orders/[orderNumber]`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/account/orders/[orderNumber]/page.tsx) to display historical snapshot component breakdowns.

## Why
Integrate bundle products into the customer-facing experience following the unified product model (`product_type === 'bundle'`) while ensuring authoritative pricing, 1-item cart semantics, and accurate historical order snapshots.

## Files Touched
- [`src/services/catalog.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/catalog.service.ts)
- [`src/services/cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts)
- [`src/app/api/account/orders/[orderNumber]/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/account/orders/[orderNumber]/route.ts)
- [`src/components/ProductCard.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/ProductCard.tsx)
- [`src/app/products/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/page.tsx)
- [`src/app/products/[slug]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/[slug]/page.tsx)
- [`src/components/CartDrawer.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx)
- [`src/app/cart/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx)
- [`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)
- [`src/app/account/orders/[orderNumber]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/account/orders/[orderNumber]/page.tsx)

## Commit Message
`feat(storefront): implement Phase 6M customer-facing bundle integration across catalog, PDP, cart, checkout, and order history`
