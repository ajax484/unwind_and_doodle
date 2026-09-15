# Bundle Media Management and Validation Fix

## What Changed
- **Unified Product Media on Bundles:** Upgraded the Bundle Edit page (`/admin/products/bundles/[id]/edit`) and Bundle Creation page (`/admin/products/bundles/new`) to use the unified `ProductMediaManager` component, supporting images, showcase videos, alt-text editing, and drag-and-drop reordering.
- **Bundle Media DB & Service Synchronization:** Added SQL migration `20260915183000_bundle_product_media_support.sql` and updated `admin-bundle.service.ts` to sync both `product_media` and `product_images` tables during bundle creation, updating, and detail retrieval.
- **Navigation & Routing Alignment:** In the main catalog table (`/admin/products`), updated the "Edit" action to route bundle items directly to the dedicated Bundle edit route (`/admin/products/bundles/${product.id}/edit`).
- **Product Edit Page Protection:** Added an automatic redirect in `/admin/products/[productId]` so that accessing a bundle ID automatically forwards to the bundle editor instead of attempting invalid product updates.
- **Bundle Detail View:** Updated the bundle detail overview card (`/admin/products/bundles/[id]`) to render both images and showcase videos with an "Edit Media ↗" shortcut.
- **Automated Tests:** Added test coverage for bundle media creation and updates in `tests/admin/admin-bundles.test.ts`.

## Why
- Previously, editing a bundle from the general catalog opened `/admin/products/[productId]`, which attempted to save `product_type: 'bundle'` to `/api/admin/products/[id]`. The schema rejected it with `Validation failed` because it only accepted `'physical'` or `'custom'`.
- On the bundle pages, admins were restricted to a legacy image uploader that bypassed `product_media`, preventing showcase videos, alt-text editing, or proper media synchronization with the storefront.

## Files Touched
- `src/types/admin-bundle.ts`
- `src/services/admin-bundle.service.ts`
- `src/app/admin/products/page.tsx`
- `src/app/admin/products/[productId]/page.tsx`
- `src/app/admin/products/bundles/[id]/edit/page.tsx`
- `src/app/admin/products/bundles/[id]/page.tsx`
- `src/app/admin/products/bundles/new/page.tsx`
- `supabase/migrations/20260915183000_bundle_product_media_support.sql`
- `tests/mocks/supabase.mock.ts`
- `tests/admin/admin-bundles.test.ts`
- `docs/changes/README.md`
- `docs/changes/admin/2026-09-15-bundle-media-and-validation-fix.md`

## Follow-ups / Known Issues
None

## Commit Message
feat(admin): unify bundle media management and fix product page validation redirect
