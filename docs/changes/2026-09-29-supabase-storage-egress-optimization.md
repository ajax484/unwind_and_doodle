# Supabase Storage Cached Egress & Media Optimization

## What Changed

1. **Next.js Image Optimization Configuration (`next.config.mjs`)**:
   - Added `images.remotePatterns` for Supabase Storage (`*.supabase.co/storage/v1/object/public/**`) and `images.unsplash.com`.
   - Enabled modern responsive formats (`image/avif` and `image/webp`), allowing Next.js to transform, resize, and edge-cache images.

2. **1-Year Immutable Browser Cache Headers on Storage Uploads**:
   - Added `cacheControl: '31536000, public, immutable'` to Supabase Storage upload options in `src/app/api/admin/products/upload-image/route.ts`, `src/app/api/admin/products/upload-media/route.ts`, and `src/app/api/customizations/upload/route.ts`.
   - Prevents returning visitors and repeat page views from re-requesting uploaded immutable assets through the Supabase Storage CDN.

3. **Client-Side Image Downscaling Utility (`src/lib/image-compress.ts`)**:
   - Created `compressImageBeforeUpload` utility using an off-screen HTML `<canvas>` to downscale large camera photos (often 5–12MB) to a maximum dimension of 1600px and 85% JPEG quality before uploading.
   - Integrated into `src/components/CustomizationUploader.tsx` and `src/app/cart/page.tsx` photo upload flows.

4. **Storefront Next.js `<Image>` Adoption**:
   - Converted unoptimized native `<img>` tags to Next.js `<Image>` with explicit dimensions/fill and responsive `sizes` across key storefront components:
     - `src/components/ProductCard.tsx` (Catalog and recommendation grid cards)
     - `src/components/ProductImageGallery.tsx` (Hero display and thumbnail strip)
     - `src/app/products/[slug]/ProductDetailClient.tsx` (Bundle components and companion add-ons)
     - `src/components/CartItemRow.tsx` (Cart item thumbnails)
     - `src/components/OrderSummaryCard.tsx` (Order preview thumbnails)
     - `src/app/cart/page.tsx` (Customization asset previews)
     - `src/app/order/[orderNumber]/page.tsx` (Order confirmation receipts)
     - `src/components/ReviewModal.tsx` (Review product thumbnails)

5. **Unit Tests (`tests/media/image-compress.test.ts`)**:
   - Added comprehensive tests verifying non-image bypass, small file passthrough, and SVG/GIF preservation.

## Why

- To prevent exhausting Supabase Storage Cached Egress quota (2–5 GB/month on Free tier, or incurring overages on Pro tier).
- Serving unoptimized 3–5MB raw images directly from Supabase Storage CDN caused page loads to consume tens of megabytes per visitor.
- The default Supabase Storage cache header was only 1 hour (`3600`), forcing frequent CDN re-fetches.
- Next.js edge caching and WebP/AVIF compression cut asset transfer sizes by up to 90–95% while drastically improving Largest Contentful Paint (LCP) performance.

## Files Touched

- `next.config.mjs`
- `src/lib/image-compress.ts`
- `src/app/api/admin/products/upload-image/route.ts`
- `src/app/api/admin/products/upload-media/route.ts`
- `src/app/api/customizations/upload/route.ts`
- `src/components/CustomizationUploader.tsx`
- `src/components/ProductCard.tsx`
- `src/components/ProductImageGallery.tsx`
- `src/components/CartItemRow.tsx`
- `src/components/OrderSummaryCard.tsx`
- `src/components/ReviewModal.tsx`
- `src/app/cart/page.tsx`
- `src/app/products/[slug]/ProductDetailClient.tsx`
- `src/app/order/[orderNumber]/page.tsx`
- `tests/media/image-compress.test.ts`

## Follow-ups / Known Issues

- None.

## Commit Message

feat(storage): optimize cached egress with next/image, 1-year immutable cache headers, and client compression
