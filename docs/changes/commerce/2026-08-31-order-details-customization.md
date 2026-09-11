# Order Details Customization Display (Admin & Customer Pages)

## What Changed
- **Customer Order API** ([`src/app/api/orders/[orderNumber]/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/orders/%5BorderNumber%5D/route.ts)):
  - Added queries for `customization_assets` linked to `customizations`.
  - Added queries for `order_item_theme_customizations` and `order_item_theme_snapshots`.
  - Formatted and returned complete `customization` (notes, status, asset URLs, mime types) and `themeCustomization` (coverName, selected themes list) on each order item.
- **Admin Order Details Page** ([`src/app/admin/orders/[id]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/orders/%5Bid%5D/page.tsx)):
  - Added a responsive **Coloring Book Themes & Cover** card for items with theme customization, showcasing selected themes as badge chips and personalized cover names.
  - Enhanced the **Custom Keepsake Artwork** card with clickable photo thumbnails with hover zoom, customer dedication notes, and production status.
- **Customer Order Tracking Page** ([`src/app/order/[orderNumber]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/order/%5BorderNumber%5D/page.tsx)):
  - Added theme customization block displaying selected themes and personalized cover name.
  - Added photo customization block displaying customer dedication and thumbnail gallery of uploaded photos.
- **Customer Account Order Details Page** ([`src/app/account/orders/[orderNumber]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/account/orders/%5BorderNumber%5D/page.tsx)):
  - Updated `OrderItemDetail` interface and rendered matching coloring book theme tags, cover names, dedication notes, and photo previews.

## Why
Customers and store administrators need complete visibility into all personalized aspects of an order — including selected coloring book themes, personalized cover titles, dedication notes, and uploaded photos for keepsake portraits.

## Files Touched
- [`src/app/api/orders/[orderNumber]/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/orders/%5BorderNumber%5D/route.ts)
- [`src/app/admin/orders/[id]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/orders/%5Bid%5D/page.tsx)
- [`src/app/order/[orderNumber]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/order/%5BorderNumber%5D/page.tsx)
- [`src/app/account/orders/[orderNumber]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/account/orders/%5BorderNumber%5D/page.tsx)

## Commit Message
```text
feat(orders): add theme and photo customization display to admin and customer order tracking pages

- Include theme customization snapshots and photo assets in GET /api/orders/[orderNumber]
- Render theme chips and personalized cover name on admin order details page
- Render photo preview thumbnails and dedication notes on admin order details page
- Add theme and photo customization cards to customer order tracking and account order details pages
```
