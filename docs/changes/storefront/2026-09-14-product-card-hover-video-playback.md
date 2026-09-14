# ProductCard Hover Video Playback

Desktop hover preview video playback enhancement for storefront product cards.

## What Changed
- **`ProductCard` Component Enhancement** (`src/components/ProductCard.tsx`):
  - Added optional `media?: ProductMedia[]` and `hoverVideoUrl?: string | null` to `ProductCardProps`.
  - Implemented `resolveProductCardMedia` helper that selects the first video from mixed media items regardless of order position.
  - Added pointer capability detection (`(hover: hover) and (pointer: fine)`) and `pointerType === 'mouse'` to strictly limit hover playback to desktop pointer devices, avoiding interference with touch navigation.
  - Added video player layer (`<video muted playsInline loop preload="none" tabIndex={-1} aria-hidden="true" />`) positioned over the static product image.
  - Implemented subtle opacity transition (`opacity-0` to `opacity-100`) triggered only after playback starts (`onPlaying`), avoiding blank frames or layout shifts.
  - Added pointer leave lifecycle handler pausing and resetting `currentTime = 0`.
  - Added graceful silent fallback to static image on load error or playback abortion.
  - Respected `prefers-reduced-motion` to bypass transition animations.
- **Storefront Integration**:
  - Passed `media={prod.media}` to `ProductCard` across catalog grid (`src/app/products/page.tsx`), homepage featured section (`src/components/home/FeaturedProductsSection.tsx`), and product detail related products (`src/app/products/[slug]/page.tsx`).
- **Storybook Stories**:
  - Added `WithHoverVideo` story to `src/components/ProductCard.stories.tsx`.
- **Testing**:
  - Created test suite `tests/customer/product-card-hover-video.test.ts` covering media resolution, rendering structure, variants preservation, and fallback behavior.

## Why
Customers browsing product catalogs and featured sections benefit from immediate, lightweight visual previews of coloring books and art products without navigating away from the grid. This enhancement brings catalog browsing to life while ensuring zero layout shift, zero N+1 database queries, and full accessibility on mobile and touch devices.

## Files Touched
- `src/components/ProductCard.tsx`
- `src/app/products/page.tsx`
- `src/components/home/FeaturedProductsSection.tsx`
- `src/app/products/[slug]/page.tsx`
- `src/components/ProductCard.stories.tsx`
- `tests/customer/product-card-hover-video.test.ts`

## Follow-ups / Known Issues
None

## Commit Message
```text
feat(storefront): add desktop hover video preview to ProductCard

- Add media prop and hover video playback to ProductCard
- Use pointer capability detection to prevent touch device interference
- Ensure graceful opacity transition and fallback to static image
- Pass media from catalog and featured sections with zero N+1 queries
```
