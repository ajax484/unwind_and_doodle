# Customer Purchasing Journey Phase 3

## What Changed
1. **Design System & Visual Aesthetics (`src/app/globals.css`, `src/components/Navbar.tsx`, `src/components/Footer.tsx`)**:
   - Replicated the pastel mindful aesthetic with warm cream backgrounds (`#FFFDF7`), pastel pink accents (`#F472B6`), pastel blue buttons & badges (`#93C5FD`), wavy section transitions, custom card elevations, and Google Fonts (`Fredoka`, `Plus Jakarta Sans`, and `Pacifico`).
   - Implemented responsive navigation header with dynamic cart counter badge and full footer with brand story, social icons, and Nigerian contact details.
2. **Product Catalog & Details Services (`src/services/catalog.service.ts`, `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts`)**:
   - Server-side active/published products filtering with live search and category slug filtering.
   - Slug lookup with images, inventory availability across warehouses, and eligible active add-ons with `price_override`.
3. **Guest Cart System (`src/services/cart.service.ts`, `src/app/api/cart/route.ts`)**:
   - Cookie-backed guest cart session (`uad_cart_session`) storing cart items, child add-on items, and customization associations in Supabase.
   - Endpoints for `GET /api/cart`, `POST /api/cart`, `PATCH /api/cart` (quantity), and `DELETE /api/cart` (remove item).
4. **Photo Customization Uploader (`src/components/CustomizationUploader.tsx`, `src/app/api/customizations/upload/route.ts`)**:
   - Handles client upload of personal photos for customizable coloring books (`requires_customization = true`).
   - Enforces format validation (JPEG, PNG, WebP) and 5MB size limit.
   - Uploads to Supabase Storage `customizations` bucket.
5. **Customer Purchasing Pages (`src/app/page.tsx`, `src/app/products/page.tsx`, `src/app/products/[slug]/page.tsx`, `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`)**:
   - Storefront homepage matching the layout with hero, product showcase, story, customer reviews, contact info, and CTA.
   - Full product catalog with search bar and category filter pills.
   - Product detail page with image gallery, quantity stepper, add-ons selector, customization uploader, and instant add-to-cart feedback.
   - Cart page with itemized summary, quantity adjustments, and subtotal.
   - Checkout page collecting Nigerian customer contact, delivery location dropdown, address, marketing consent, server-calculated delivery fees, and Flutterwave payment initiation.
6. **Payment Return & Order Confirmation (`src/app/order/callback/page.tsx`, `src/app/order/[orderNumber]/page.tsx`, `src/app/api/orders/verify/route.ts`, `src/app/api/orders/[orderNumber]/route.ts`)**:
   - Return verification handler querying Flutterwave API and committing reservations on callback.
   - Customer-friendly order status timeline (`Order Placed` -> `Payment Confirmed` -> `Processing` -> `Shipped` -> `Delivered`) and itemized receipt.
7. **Comprehensive Test Suite (`tests/purchasing-journey.test.ts`)**:
   - 7 end-to-end tests validating catalog publishing, slug detail assembly, guest cart persistence, quantity modifications, add-on bundling, and Flutterwave checkout orchestration.
   - 58/58 tests passing across the repository.

## Why
To deliver the complete, end-to-end customer purchasing experience for Unwind & Doodle, enabling customers in Nigeria to browse books, customize products, manage a cart, pay securely via Flutterwave, and track order fulfillment.

## Files Touched
- `src/services/catalog.service.ts` [NEW]
- `src/services/cart.service.ts` [NEW]
- `src/app/api/products/route.ts` [NEW]
- `src/app/api/products/[slug]/route.ts` [NEW]
- `src/app/api/cart/route.ts` [NEW]
- `src/app/api/customizations/upload/route.ts` [NEW]
- `src/app/api/locations/route.ts` [NEW]
- `src/app/api/orders/[orderNumber]/route.ts` [NEW]
- `src/app/api/orders/verify/route.ts` [NEW]
- `src/components/Navbar.tsx` [NEW]
- `src/components/Footer.tsx` [NEW]
- `src/components/ProductCard.tsx` [NEW]
- `src/components/CustomizationUploader.tsx` [NEW]
- `src/components/OrderStatusTimeline.tsx` [NEW]
- `src/app/layout.tsx` [NEW]
- `src/app/globals.css` [NEW]
- `src/app/page.tsx` [NEW]
- `src/app/products/page.tsx` [NEW]
- `src/app/products/[slug]/page.tsx` [NEW]
- `src/app/cart/page.tsx` [NEW]
- `src/app/checkout/page.tsx` [NEW]
- `src/app/order/callback/page.tsx` [NEW]
- `src/app/order/[orderNumber]/page.tsx` [NEW]
- `tests/purchasing-journey.test.ts` [NEW]
- `tests/mocks/supabase.mock.ts` [MODIFIED]

## Follow-ups / Known Issues
- Image-to-coloring-page generation pipeline will be implemented in Phase 4.
- Customer authentication / user account portal and order history dashboards are planned for a subsequent milestone.
- Multi-warehouse order splitting is not supported in V1; entire cart must be fulfillable by a single warehouse.

## Commit Message
```text
feat(storefront): implement customer purchasing journey and mindful pastel storefront

- Add global design system and styling matching the Unwind & Doodle visual identity
- Implement published catalog and product detail services with active add-ons and price overrides
- Add guest cart system backed by secure httpOnly cookie session
- Implement image upload handler for customizable coloring books
- Build storefront homepage, catalog, product details, cart, and checkout pages
- Implement Flutterwave return callback verification and customer order status timeline
- Add comprehensive purchasing journey test suite
```
