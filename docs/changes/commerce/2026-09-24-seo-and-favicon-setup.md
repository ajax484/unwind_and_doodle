# SEO, Open Graph & Favicon Metadata Infrastructure

## What Changed
- Configured dynamic root metadata in `src/app/layout.tsx` including `metadataBase`, brand title template (`%s | Unwind & Doodle`), meta descriptions, SEO keywords, creator/publisher tags, and Open Graph / Twitter cards (`summary_large_image`).
- Added standard ICO and multi-format icon configurations (`/logo.ico`, `/logo.png`, `/logo.svg`, Apple Touch Icon) to root metadata, and added `src/app/favicon.ico` for direct browser root icon resolution.
- Added catalog collection metadata in `src/app/products/layout.tsx`.
- Refactored `src/app/products/[slug]/page.tsx` into a Server Component with dynamic `generateMetadata` that queries product details server-side to generate product-specific titles, descriptions, canonical URLs, and Open Graph previews.
- Injected Schema.org `Product` & `Offer` JSON-LD structured data into product detail pages for search engine rich results.
- Extracted interactive product detail client logic to `src/app/products/[slug]/ProductDetailClient.tsx`.
- Implemented dynamic `src/app/sitemap.ts` to generate XML sitemaps for static routes and published product catalog pages.
- Implemented `src/app/robots.ts` with standard indexing rules and crawl restrictions on private/internal endpoints (`/admin/*`, `/api/*`, `/account/*`, `/checkout/*`, etc.).

## Why
- Ensure the application is indexed properly by search engines with high search relevance and rich product snippets (prices, stock availability, descriptions).
- Enable high-quality social sharing previews across Twitter, Facebook, WhatsApp, and LinkedIn.
- Provide canonical URLs, favicon resolution, and XML sitemaps across standard web crawler protocols.

## Files Touched
- `src/app/layout.tsx`
- `src/app/products/layout.tsx`
- `src/app/products/[slug]/page.tsx`
- `src/app/products/[slug]/ProductDetailClient.tsx`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/favicon.ico`

## Follow-ups / Known Issues
None

## Commit Message
feat(seo): implement SEO metadata, dynamic product Open Graph tags, sitemap, robots, and favicon icons
