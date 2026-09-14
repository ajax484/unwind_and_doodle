# Admin Product Media Management

Unified media management interface and APIs for administering product images and videos within the Unwind & Doodle product catalog.

## What Changed
- **Schema & Types**:
  - Defined `ProductMediaItemInputSchema` and `AdminMediaItem` types in `src/types/admin-product.ts`.
  - Added `media` array support to `CreateProductSchema` and `UpdateProductSchema`.
- **Backend API & Data Layer**:
  - Created `POST /api/admin/products/upload-media` to handle authenticated uploads for images (up to 10MB) and videos (up to 100MB), plus thumbnail management and storage cleanup on `DELETE`.
  - Created `DELETE /api/admin/products/[id]/media/[mediaId]` to delete individual persisted media records, clean up Supabase Storage objects (`storage_path` and `thumbnail_path`), and resequence `sort_order`.
  - Updated `createAdminProduct` and `updateAdminProduct` in `src/services/admin-product.service.ts` to persist `media` into `product_media` while continuing to synchronize `product_images` for backward compatibility.
  - Implemented `deleteAdminProductMedia` service helper with organization boundary checks and storage cleanup.
- **Admin UI Components**:
  - Built `src/components/admin/ProductMediaManager.tsx` using canonical design-system primitives (`Button`, `Badge`, `Modal`, `EmptyState`, `TextInput`, `Spinner`).
  - Added media cards with 1:1 aspect ratio, Cover Media badge, Image vs Video badges, play button overlay, and inline sequence numbering.
  - Implemented HTML5 drag-and-drop reordering with accessible touch/keyboard fallback buttons (Move Left / Move Right).
  - Implemented Video Preview Modal with `<video muted playsInline controls poster={thumbnail_path} />`.
  - Implemented Media Details Modal allowing editing of image alt text, video accessibility descriptions, and custom poster thumbnail upload/replacement/removal.
  - Added delete confirmation modal with atomic DB and storage cleanup.
  - Integrated into both `src/app/admin/products/new/page.tsx` and `src/app/admin/products/[productId]/page.tsx`.
- **Testing**:
  - Added comprehensive test suite `tests/admin/admin-product-media-management.test.ts` verifying file validation, path construction, mixed media persistence, reordering, thumbnail updates, and deletion.

## Why
Previously, product management only handled static images and lacked video upload, video previews, custom poster thumbnails, and unified reordering. This feature gives administrators complete control over mixed product media from a single responsive interface.

## Files Touched
- `src/types/admin-product.ts`
- `src/services/admin-product.service.ts`
- `src/app/api/admin/products/upload-media/route.ts`
- `src/app/api/admin/products/[id]/media/[mediaId]/route.ts`
- `src/components/admin/ProductMediaManager.tsx`
- `src/app/admin/products/new/page.tsx`
- `src/app/admin/products/[productId]/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/admin/admin-product-media-management.test.ts`

## Follow-ups / Known Issues
None

## Commit Message
```text
feat(admin): implement unified product media management UI and API

- Add upload-media and media deletion API routes with storage cleanup
- Build ProductMediaManager component with drag-and-drop, video preview, thumbnail management, and alt text editing
- Integrate unified media manager into product creation and edit pages
- Maintain backward compatibility with product_images
```
