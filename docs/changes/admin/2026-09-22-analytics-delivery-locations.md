# 2026-09-22: Delivery Location Resolution for Analytics & Order Management

## What Changed
- **Database Analytics RPC (`get_analytics_overview`)**: Updated the Top Delivery Locations aggregation query in `get_analytics_overview` to fall back to `shipping_address->>'city'` and `shipping_address->>'state'` when an order lacks a linked `location_id` from `public.locations`.
- **Database Migration (`20260922170000_analytics_delivery_location_fallback.sql`)**: Applied PostgreSQL migration updating `get_analytics_overview` with security definer and tenant isolation safeguards.
- **Admin Order Service (`src/services/admin-order.service.ts`)**:
  - In `listAdminOrders`, updated `location.name` and `location.state` to fall back to `shipping_address.city` and `shipping_address.state` (or `'Direct Delivery'`) rather than empty strings when `location_id` is null.
  - In `getAdminOrderById`, aligned `location.name` fallback to prefer `shippingAddrObj.city` followed by `shippingAddrObj.state`.
- **Admin Analytics UI (`src/app/admin/analytics/page.tsx`)**: Updated `Top Delivery Locations` chart label formatter to avoid rendering duplicate state annotations (e.g. `"Lagos (Lagos)"` renders cleanly as `"Lagos"` while `"Ikeja (Lagos)"` and `"Jabi (Abuja)"` preserve area context).

## Why
Orders without predefined storefront / warehouse hub IDs (such as all 508 historical Bumpa orders and direct delivery manual/online orders) previously lacked location association in analytics, collapsing over ₦11.1M in sales into a single uninformative `"Unknown / Other (N/A)"` bucket and displaying blank location fields on the order management lists.

## Files Touched
- `supabase/migrations/20260922170000_analytics_delivery_location_fallback.sql`
- `src/services/admin-order.service.ts`
- `src/app/admin/analytics/page.tsx`
- `docs/changes/admin/2026-09-22-analytics-delivery-locations.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
`feat(analytics): resolve delivery city and state in analytics overview and order list`
