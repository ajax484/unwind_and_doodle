# Phase 6G — Discounts & Coupons Implementation

## 1. What Changed
- **Database & Schema Migration**:
  - Added `20260830000000_phase6g_discounts.sql` migration adding `discount_id` and `discount_code` snapshot columns to `orders` and `checkout_sessions`.
  - Added PostgreSQL function `increment_discount_usage` for atomic concurrency-safe discount redemption tracking.
  - Defined RLS policies on `discounts`, `discount_products`, and `discount_categories`.
  - Updated `src/lib/supabase/types.ts` table definitions and RPC functions.
- **Core Discount Service (`src/services/discount.service.ts`)**:
  - Implemented `validateAndCalculateDiscount()` with code normalization (uppercase, trimmed), date window checking (`starts_at`, `expires_at`), usage limit verification, organization isolation, minimum order amount check against eligible merchandise subtotal before shipping/discount, percentage and fixed calculation capping, and deterministic OR logic for combined product + category scopes.
  - Implemented `incrementDiscountUsageAtomic()` to update `usage_count` safely without race conditions.
  - Created admin CRUD helpers: `getDiscounts`, `getDiscountById`, `createDiscount`, `updateDiscount`, `deleteDiscount`.
- **Pricing & Commerce Pipeline Integration**:
  - Updated `src/services/pricing.service.ts` to delegate discount validation and calculation to `validateAndCalculateDiscount()`.
  - Updated `src/services/checkout.service.ts` to snapshot `discount_id`, `discount_code`, and `discount_total` on `orders` and `checkout_sessions`.
  - Updated `src/services/webhook.service.ts` and `src/app/api/orders/verify/route.ts` to call `incrementDiscountUsageAtomic()` upon payment verification. Failed or unverified payments do not increment usage.
- **API Endpoints**:
  - Created `POST /api/discounts/validate` for customer promo code validation during checkout.
  - Created `GET /api/admin/discounts` (list with search and status filters) and `POST /api/admin/discounts` (create coupon with scope & audit log).
  - Created `GET`, `PUT`, `PATCH`, `DELETE /api/admin/discounts/[id]` for detail view, editing, and safe deletion.
- **Admin & Customer UIs**:
  - Created `/admin/discounts` list page with search, status tabs (Active, Inactive, Scheduled, Expired, Exhausted), stats bar, and quick actions.
  - Created `/admin/discounts/new` coupon form with real-time live preview card and searchable product/category pickers.
  - Created `/admin/discounts/[discountId]` detail and inline edit page with safe soft/hard deletion.
  - Updated `/checkout` customer page with interactive coupon apply/remove buttons, error messages, and discount line item in price summary.
- **Audit Logging**:
  - Logged `discount.created`, `discount.updated`, `discount.disabled`, `discount.deleted` events into `audit_logs`.
- **Testing & Verification**:
  - Enhanced `tests/mocks/supabase.mock.ts` with discount junction tables and `increment_discount_usage` RPC handler.
  - Created `tests/discounts.test.ts` covering 18 new automated unit & integration test scenarios.

## 2. Why
- To complete Phase 6G by making discounts fully functional from admin management through customer checkout, payment verification, order persistence, and audit logging while maintaining historical order integrity and strict organization isolation.

## 3. Files Touched
- `supabase/migrations/20260830000000_phase6g_discounts.sql`
- `src/lib/supabase/types.ts`
- `src/services/discount.service.ts`
- `src/services/pricing.service.ts`
- `src/services/checkout.service.ts`
- `src/services/webhook.service.ts`
- `src/app/api/orders/verify/route.ts`
- `src/app/api/discounts/validate/route.ts`
- `src/app/api/admin/discounts/route.ts`
- `src/app/api/admin/discounts/[id]/route.ts`
- `src/app/admin/discounts/page.tsx`
- `src/app/admin/discounts/new/page.tsx`
- `src/app/admin/discounts/[discountId]/page.tsx`
- `src/app/checkout/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/discounts.test.ts`
- `docs/changes/2026-08-30-discounts-and-coupons.md`

## 4. Follow-ups & Known Issues
- None. All 24 test suites (261 tests) pass with 0 errors.

## 5. Commit Message
```text
feat(discounts): implement Phase 6G complete discounts and coupons system

- Add database migration for discount order snapshots, atomic usage RPC, and RLS policies
- Build authoritative server-side discount engine for percentage, fixed, scope, and min order rules
- Snapshot discount_id and discount_code on created orders and checkout sessions
- Integrate atomic usage increment into payment verification and webhook pipelines
- Build admin discount management pages (/admin/discounts, /admin/discounts/new, /admin/discounts/[id])
- Integrate interactive promo code validation and discount summary display on checkout page
- Add audit logging for discount creation, updates, disabling, and deletion
- Add comprehensive Vitest test suite in tests/discounts.test.ts
```
