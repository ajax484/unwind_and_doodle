# Commerce Analytics System — Change Documentation

**Date:** 2026-09-02  
**Feature:** Production-Ready Organization-Scoped Analytics Dashboard

---

## 1. What Changed

Implemented a complete, production-ready, organization-scoped analytics system for the Unwind & Doodle commerce platform without introducing external BI tools or third-party event trackers.

### Database Layer
- Created database migration `supabase/migrations/20260902000002_analytics_system.sql`.
- Added targeted performance indexes on `payments(status, paid_at)`, `orders(organization_id, placed_at)`, `checkout_sessions(organization_id, created_at)`, `customers(organization_id, created_at)`, and join tables.
- Implemented 6 high-performance Postgres RPCs with `SECURITY DEFINER`, search path isolation, and explicit multi-tenant authorization validation (`auth.role() = 'service_role' OR is_organization_admin(p_org_id) OR is_organization_member(p_org_id)`):
  1. `get_analytics_overview`: Computes period and preceding comparison KPIs (collected revenue, orders, paid orders, AOV, new customers, gross order value, discounts given), sales by source, manual order channels, order status breakdown, top locations, and top products.
  2. `get_analytics_sales_series`: Produces zero-filled time series buckets (`day`, `week`, `month`) for revenue and orders.
  3. `get_analytics_products`: Computes top products from historical snapshot columns, parent bundle sales, bundle component inventory demand, coloring-book theme customizations popularity, and add-on sales & attach rates.
  4. `get_analytics_customers`: Computes customer purchasing cohorts (new vs returning, repeat purchase rate, guest vs registered orders, new customer accounts) and top customers by spend.
  5. `get_analytics_inventory`: Returns overall physical and available stock, low-stock (available $\le 5$), out-of-stock items, inventory movements breakdown, and warehouse distribution.
  6. `get_analytics_checkout`: Returns checkout session conversion rates, completed vs abandoned sessions, payment success rate, and provider revenue distribution.

### Service & Type Layer
- `src/types/analytics.ts`: Full TypeScript definitions for all metric payloads, comparison periods, series points, and tab datasets.
- `src/lib/date-utils.ts`: Centralized date range calculation for presets (`today`, `last_7_days`, `last_30_days`, `last_90_days`, `this_month`, `last_month`, `this_year`, `custom`), exact preceding comparison period resolution, adaptive time-series granularity, and zero-division safe percentage change computation.
- `src/services/analytics.service.ts`: Organization-scoped server service querying Postgres RPCs.

### API Route Layer
- `src/app/api/admin/analytics/route.ts`: Authenticated, RBAC-protected API route. Verifies admin session token, validates active organization membership, enforces `analytics.read` permission, and guarantees zero client-side tenant bypass.

### UI & Presentation Layer
- `src/components/admin/analytics/AnalyticsDateRangeSelector.tsx`: Dropdown preset selector with custom range date pickers.
- `src/components/admin/analytics/AnalyticsKpiCard.tsx`: Standardized KPI card with percentage change trend indicators, currency/count formatting, and metric definition tooltips.
- `src/components/admin/analytics/AnalyticsCharts.tsx`: Zero-dependency, responsive native SVG time-series area/line charts with hover tooltips, horizontal breakdown bars, and status distribution bars.
- `src/app/admin/analytics/page.tsx`: Main Analytics console with unified date range filtering, responsive tab navigation (**Overview**, **Products**, **Customers**, **Inventory**, **Checkout & Payments**), and loading/empty states.
- `src/app/admin/layout.tsx`: Added `Analytics` navigation link under `Commerce` in the sidebar and updated page title resolution.

### Automated Tests
- `tests/admin-analytics.test.ts`: 19 automated tests covering date calculations, safe zero-division, API route security & RBAC enforcement, live Supabase RPC execution, and controlled dataset validation for revenue, paid orders, AOV, join multiplication prevention, bundle sales isolation, and customer cohorts.

---

## 2. Why the Changes Were Made

- Merchants required accurate, consolidated visibility into revenue, sales trends, inventory health, and customer purchasing patterns.
- Existing dashboard metrics were limited to single-day counters calculated client-side or through raw queries.
- Moving aggregations into Postgres RPCs ensures high performance as order volumes grow, eliminates join multiplication bugs, guarantees multi-tenant security, and delivers already-aggregated payloads to the browser.

---

## 3. Files Touched

### Created
- `supabase/migrations/20260902000002_analytics_system.sql`
- `src/types/analytics.ts`
- `src/lib/date-utils.ts`
- `src/services/analytics.service.ts`
- `src/app/api/admin/analytics/route.ts`
- `src/components/admin/analytics/AnalyticsDateRangeSelector.tsx`
- `src/components/admin/analytics/AnalyticsKpiCard.tsx`
- `src/components/admin/analytics/AnalyticsCharts.tsx`
- `src/app/admin/analytics/page.tsx`
- `tests/admin-analytics.test.ts`
- `docs/changes/2026-09-02-commerce-analytics-dashboard.md`

### Modified
- `src/app/admin/layout.tsx`

---

## 4. Known Limitations & Follow-ups

1. **Profit & Margin COGS Snapshotting**: Standard `order_items` currently only store selling price snapshot (`unit_price`, `total`) and do not store historical cost price at the time of purchase (`products.cost_price` can change over time). Therefore, authoritative historical profit/margin analytics for standard products are withheld until a future migration adds `unit_cost_price` snapshot to `order_items` (bundle components already possess `unit_cost_price`).
2. **Cart Abandonment Lifecycle**: The `carts` table remains in default `'active'` status and does not record abandoned transitions. In accordance with specifications, checkout session completion and abandonment are used for reliable conversion metrics instead.
3. **Pre-existing Test Failure**: In `tests/auth-redesign-matrix.test.ts`, test 7 fails (`expected 'admin' to be 'staff'`) from prior work unrelated to analytics; untouched per workspace rules.

---

## 5. Commit Message

```text
feat(analytics): implement production-ready organization-scoped commerce analytics system

- Add Postgres analytics RPCs and indexes in migration 20260902000002_analytics_system.sql
- Implement analytics.service.ts and GET /api/admin/analytics with RBAC analytics.read enforcement
- Create responsive SVG time-series, horizontal breakdown, and status distribution charts
- Build full admin analytics console with Overview, Products, Customers, Inventory, and Checkout tabs
- Add comprehensive test suite in tests/admin-analytics.test.ts verifying metrics and multi-tenancy
```
