# 2026-09-12 — Marketing Native Email Open Pixel & Click Tracking

Implemented native self-hosted 1x1 open pixel and click redirect tracking for email campaigns sent via SMTP without requiring external email service provider (ESP) webhooks.

## What Changed

1. **HMAC Tracking Token Generation & Verification (`src/lib/marketing-token.ts`)**:
   - Implemented `generateMarketingTrackingToken` and `verifyMarketingTrackingToken` using HMAC-SHA256 signatures with base64url encoding.
   - Encodes `campaignId`, `recipientId`, and optional `customerId` into tamper-proof signed tokens.

2. **Open Pixel Route (`src/app/api/marketing/track/open/route.ts`)**:
   - Endpoint `GET /api/marketing/track/open`: Decodes and verifies the signed token.
   - Idempotently updates recipient milestone (`opened_at = NOW()`) and advances status to `opened` adhering to non-regression rules.
   - Records an event in `marketing_email_events` with `event_type = 'opened'` and user-agent metadata.
   - Always returns a valid 42-byte transparent 1x1 GIF binary with strict `Cache-Control: no-store, no-cache, must-revalidate` headers, preventing email client caching or broken image placeholders.

3. **Click Redirect Route (`src/app/api/marketing/track/click/route.ts`)**:
   - Endpoint `GET /api/marketing/track/click`: Decodes and verifies token and destination URL.
   - Sanitizes destination URLs to prevent open redirect vulnerabilities, blocking `javascript:`, `data:`, and malformed protocols while allowing valid HTTP/HTTPS URLs and relative app paths.
   - Updates recipient milestone (`clicked_at = NOW()`) and status to `clicked`.
   - Records an event in `marketing_email_events` with `event_type = 'clicked'`.
   - Issues a `302 Found` HTTP redirect to the destination URL.

4. **Campaign Dispatcher HTML Enrichment (`src/services/marketing-dispatcher.service.ts`)**:
   - Added `rewriteMarketingLinks`: Rewrites outbound `<a href="...">` links to route through `/api/marketing/track/click`, skipping in-page anchors (`#`), `mailto:`, `tel:`, and unsubscribe URLs.
   - Added `injectOpenTrackingPixel`: Injects the 1x1 `<img src="/api/marketing/track/open?token=...">` before `</body>` or at the end of HTML.
   - Generates tracking tokens and applies link rewriting and pixel injection during `dispatchCampaign`.

5. **Automated Unit Testing (`tests/marketing/native-email-tracking.test.ts`)**:
   - 11 tests covering HMAC token generation and tamper detection, link rewriting, pixel injection, open tracking response and database updates, click tracking redirect, and URL sanitization.

## Why

Standard SMTP servers (Gmail, Hostinger, Zoho, private mail relays) do not provide delivery/open webhooks. Without native tracking, campaign open and click rates would remain at 0%. This native system allows store operators to track live opens, clicks, and engagement directly through the application domain with zero external dependencies, while remaining fully compatible with ESP webhooks if connected.

## Files Touched

- `src/lib/marketing-token.ts`
- `src/services/marketing-dispatcher.service.ts`
- `src/app/api/marketing/track/open/route.ts`
- `src/app/api/marketing/track/click/route.ts`
- `tests/marketing/native-email-tracking.test.ts`
- `docs/changes/admin/2026-09-12-marketing-native-email-tracking.md`

## Follow-ups / Known Issues

None

## Commit Message

```git
feat(marketing): add native 1x1 open pixel and click redirect tracking

- Implement HMAC-SHA256 tracking token generator and validator in marketing-token.ts
- Create GET /api/marketing/track/open endpoint returning transparent 1x1 GIF with cache-busting headers
- Create GET /api/marketing/track/click endpoint with URL sanitization and 302 redirect
- Update marketing-dispatcher.service.ts to inject open pixel and rewrite outbound email links
- Add comprehensive vitest coverage for tokens, pixel tracking, and click redirection
```
