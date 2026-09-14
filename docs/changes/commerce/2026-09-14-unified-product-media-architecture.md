# Unified Product Media Architecture

## What Changed
- **Database Schema**: Created the `product_media_type` PostgreSQL enum (`'image'`, `'video'`) and the `product_media` table with columns `id`, `product_id`, `type`, `storage_path`, `thumbnail_path`, `alt_text`, `sort_order`, `created_at`, `updated_at`.
- **Database Integrity & Security**: Attached foreign key cascade (`ON DELETE CASCADE` to `products`), non-negative sort order check constraint, updated_at trigger, indexes on `product_id` and `(product_id, sort_order)`, and enabled RLS with policies for published public reads (`product_media_public_read`) and organization admin CRUD (`product_media_admin_all`).
- **Data Migration & Backfill**: Safely backfilled all existing records from `product_images` into `product_media`, preserving primary keys, product foreign keys, sort order, and metadata. Retained `product_images` table for safe coexistence and backward compatibility.
- **Application Types**: Created `src/types/product-media.ts` with discriminated union types (`ProductMedia = ProductImageMedia | ProductVideoMedia`), type guards (`isProductVideo`, `isProductImage`), and Zod validation schemas. Updated `src/lib/supabase/types.ts` and `src/types/admin-product.ts`.
- **Storage Foundation**: Created `src/lib/product-media-storage.ts` defining hierarchical storage path construction (`products/{productId}/images/...`, `products/{productId}/videos/...`, `products/{productId}/thumbnails/...`), allowed MIME types (`video/mp4`, `video/webm`, `video/quicktime`), and size boundaries without transcoding in this step.
- **Data Access Layer**: Updated `src/services/catalog.service.ts` (`getPublishedCatalog`, `getProductDetailBySlug`) and `src/services/admin-product.service.ts` (`listAdminProducts`, `getAdminProductDetail`, `createAdminProduct`, `updateAdminProduct`) to retrieve and populate ordered `media[]` (`sort_order ASC`) while keeping legacy `primaryImage` and `images[]` fields intact.
- **Test Harness**: Enhanced `tests/mocks/supabase.mock.ts` with `product_media` support and created `tests/media/product-media.test.ts` to test ordering (video first, image first), mixed media, and storage helpers. Updated live integration test `tests/integration/supabase-live.test.ts`.

## Why
Product merchandising requires video capabilities (such as hover video previews on product cards, detail page media carousels, and admin video uploads). The previous architecture assumed products only had images stored in `product_images`. The new unified model represents both images and videos generically, respects arbitrary ordering, and provides a safe data foundation for future storefront and admin media features.

## Files Touched
- `supabase/migrations/20260914100000_unified_product_media.sql`
- `src/types/product-media.ts`
- `src/lib/supabase/types.ts`
- `src/lib/product-media-storage.ts`
- `src/services/catalog.service.ts`
- `src/services/admin-product.service.ts`
- `src/types/admin-product.ts`
- `tests/mocks/supabase.mock.ts`
- `tests/media/product-media.test.ts`
- `tests/integration/supabase-live.test.ts`
- `docs/changes/commerce/2026-09-14-unified-product-media-architecture.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
feat(catalog): implement unified product media architecture with image and video support
