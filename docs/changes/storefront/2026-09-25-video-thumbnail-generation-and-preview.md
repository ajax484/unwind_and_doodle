# 2026-09-25 — Automatic Video Thumbnail Generation and Fallback Previews

## What Changed
- **Client-Side Video Thumbnail Capture & Auto-Upload** (`src/components/admin/ProductMediaManager.tsx`):
  - Added `captureVideoThumbnail` helper that seeks to `0.5s` (or middle/first keyframe) of a video using an in-memory HTML5 video and canvas element, exporting a compressed JPEG poster file.
  - Automatically captures and uploads this thumbnail to `/api/admin/products/upload-media` (`isThumbnail=true`) when an admin uploads a product video, setting `thumbnail_path` automatically.
  - Added a `⚡ Capture Frame` action in the video edit details modal allowing admins to re-extract or replace the poster frame at any time.
- **ProductImageGallery Thumbnail Strip Fallback** (`src/components/ProductImageGallery.tsx`):
  - Updated `deriveGalleryMedia` to avoid passing `.mp4` video URLs to `thumbnailUrl`.
  - In the thumbnail navigation strip, if a video has no static image thumbnail, it now renders a muted `<video src={`${url}#t=0.001`} preload="metadata" muted playsInline />` preview with the video indicator badge overlay (`▶`), preventing broken `<img>` tags and displaying a video preview frame.
- **ProductCard & Catalog Service Safety** (`src/components/ProductCard.tsx`, `src/services/catalog.service.ts`, `src/services/admin-product.service.ts`, `src/services/admin-bundle.service.ts`):
  - Ensured `primaryImage` in catalog and admin services only resolves to static images or video poster thumbnails (ignoring raw `.mp4` URLs).
  - Enhanced `ProductCard` to display a video element frame preview when a product has only a video without a thumbnail image.
- **Unit Test Coverage** (`tests/customer/product-image-gallery-video.test.ts`):
  - Added unit tests for video fallback previews in the gallery thumbnail strip when `thumbnailPath` is `null`.

## Why
When product videos were uploaded without an accompanying thumbnail image, `ProductImageGallery` attempted to pass the `.mp4` URL to `<img src="..." />`, which browsers cannot render, resulting in empty/broken boxes in thumbnail navigation strips and product cards. Automatic frame extraction during upload and inline `<video>` fallback rendering ensures every video always has a crisp visual preview.

## Files Touched
- `src/components/admin/ProductMediaManager.tsx`
- `src/components/ProductImageGallery.tsx`
- `src/components/ProductCard.tsx`
- `src/services/catalog.service.ts`
- `src/services/admin-product.service.ts`
- `src/services/admin-bundle.service.ts`
- `tests/customer/product-image-gallery-video.test.ts`

## Follow-ups / Known Issues
None

## Commit Message
```text
feat(media): auto-generate video poster thumbnails and support video frame previews in gallery strip and product cards
```
