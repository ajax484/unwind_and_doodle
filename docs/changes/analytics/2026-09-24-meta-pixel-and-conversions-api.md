# 2026-09-24 — Meta Pixel & Conversions API (CAPI) Integration

Implemented hybrid client-side Meta Pixel and server-side Conversions API (CAPI) tracking with SHA-256 customer data normalization and event deduplication via `event_id`.

## What Changed

1. **Meta Pixel Client Utilities (`src/lib/meta-pixel.ts`)**:
   - Created safe client helper functions for standard e-commerce events: `trackPageView`, `trackViewContent`, `trackAddToCart`, `trackInitiateCheckout`, `trackPurchase`, and custom events.
   - Integrated `eventID` parameter into event tracking payloads to enable deduplication with server-side CAPI events.

2. **Meta Pixel Script Component (`src/components/analytics/MetaPixel.tsx`)**:
   - Injected official Meta Pixel script via Next.js `next/script` with `strategy="afterInteractive"`.
   - Added automatic `PageView` tracking across client-side route transitions using `usePathname` and `useSearchParams`.
   - Added `<noscript>` pixel fallback image.

3. **Server-Side Conversions API (CAPI) Service (`src/services/meta-conversions.service.ts`)**:
   - Implemented Meta Graph API v19.0+ event dispatcher using native `fetch`.
   - Created SHA-256 data normalization helpers (`hashData`, `hashPhone`, `buildMetaUserData`) compliant with Meta specifications for hashing email, phone, name, city, state, zip, and country.
   - Handled test event code integration (`META_TEST_EVENT_CODE`) and graceful error boundaries.

4. **Meta CAPI API Route (`src/app/api/analytics/meta-capi/route.ts`)**:
   - Added endpoint for forwarding client events with IP address, user-agent, `_fbp`, and `_fbc` cookie enrichment to CAPI.

5. **Server & Client E-Commerce Funnel Integration**:
   - **Payment Fulfillment (`src/services/payment-fulfillment.service.ts`)**: Automatically dispatches a server-side `Purchase` event to CAPI upon verified payment fulfillment, using the order number as the deduplication `event_id`.
   - **Product Page (`src/app/products/[slug]/ProductDetailClient.tsx`)**: Dispatches client-side `ViewContent` on product view and `AddToCart` on cart add.
   - **Checkout Page (`src/app/checkout/page.tsx`)**: Dispatches client-side `InitiateCheckout` on cart load.
   - **Order Confirmation (`src/app/order/[orderNumber]/page.tsx`)**: Dispatches client-side `Purchase` event deduplicated with the server-side event.
   - **Root Layout (`src/app/layout.tsx`)**: Mounted `<MetaPixel />` across the application.

6. **Environment & Testing**:
   - Updated `.env.example` with `NEXT_PUBLIC_META_PIXEL_ID`, `META_CONVERSIONS_API_ACCESS_TOKEN`, and `META_TEST_EVENT_CODE`.
   - Added test suite in `tests/analytics/meta-tracking.test.ts`.

## Why

To improve conversion attribution accuracy, enable dynamic retargeting, and bypass ad-blocker signal loss by maintaining a redundant, deduplicated hybrid tracking pipeline between client-side pixel events and server-side Conversions API (CAPI).

## Files Touched

- `src/lib/meta-pixel.ts`
- `src/components/analytics/MetaPixel.tsx`
- `src/services/meta-conversions.service.ts`
- `src/app/api/analytics/meta-capi/route.ts`
- `src/services/payment-fulfillment.service.ts`
- `src/app/products/[slug]/ProductDetailClient.tsx`
- `src/app/checkout/page.tsx`
- `src/app/order/[orderNumber]/page.tsx`
- `src/app/layout.tsx`
- `.env.example`
- `tests/analytics/meta-tracking.test.ts`
- `docs/changes/analytics/2026-09-24-meta-pixel-and-conversions-api.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

feat(analytics): add hybrid Meta Pixel and Conversions API tracking
