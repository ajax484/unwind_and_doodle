# 2026-09-04 — Clean Code Phase 4: Next.js Performance & Admin Query Projections

## What Changed
1. **Self-Contained Client State for Newsletter (`src/components/home/NewsletterSection.tsx` & `src/app/page.tsx`)**:
   - Converted `NewsletterSection` into a self-contained client component (`'use client'`).
   - Moved local form state (`email`, `status`, `message`, `isLoading`, `handleSubmit`) into `NewsletterSection`, while keeping optional props (`email`, `onEmailChange`, `onSubmit`, `isSubmitting`, `message`) for custom or programmatic invocations.
   - Removed lifted state (`newsletterEmail`) and handler (`handleNewsletterSubmit`) from `src/app/page.tsx`.
   - Replaced `<NewsletterSection ...props>` in `src/app/page.tsx` with self-contained `<NewsletterSection />`.
   - **Performance Impact**: Eliminates wasteful re-renders of all homepage sections (`HeroSection`, `FeaturedProductsSection`, `CustomKeepsakeSection`, `CategoryGrid`, `BrandPhilosophySection`, `ReviewsSection`) on every keystroke in the newsletter input.

2. **Admin Orders Query Inefficiency Optimization (`src/services/admin-order.service.ts`)**:
   - Deferred payments fetching until after order IDs are collected.
   - When no payment status filter is requested (`!filters.paymentStatus`), payments are queried only for `paginatedOrderIds` instead of scanning all payments across the entire database.
   - Drastically cuts database payload size, PostgREST transfer latency, and node memory consumption when managing large volumes of orders.

3. **Admin Customer Management Query Projection Pruning (`src/services/admin-customer.service.ts`)**:
   - Changed order fetching from `select('*')` (which retrieved 29 columns including JSON payloads, full addresses, and internal tokens) to explicit projection `select('id, customer_id, total, status, created_at')`.
   - Preserves exact customer LTV and order count calculation logic without transferring unnecessary columns over the wire.

## Why
- Next.js and React best practices dictate pushing interactive state down to leaves in the component tree to avoid re-rendering entire page layouts on keystrokes.
- Minimizes network I/O and query memory footprint on backoffice admin routes by avoiding unbounded `select('*')` and fetching payments strictly for the paginated window of orders.

## Files Touched
- `src/components/home/NewsletterSection.tsx` (MODIFIED)
- `src/app/page.tsx` (MODIFIED)
- `src/services/admin-order.service.ts` (MODIFIED)
- `src/services/admin-customer.service.ts` (MODIFIED)
- `docs/changes/2026-09-04-clean-code-phase-4-nextjs-performance-and-architecture.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- Pre-existing flagged failure: `tests/api-routes.test.ts` (`GET /api/products/[slug]`) expects `test-coloring-book` which is absent in the live/mock test environment. Kept untouched outside task scope.

## Commit Message
```text
refactor(clean-code): optimize homepage re-renders and admin database query projections

- Convert NewsletterSection into self-contained client component with internal state
- Remove lifted newsletter email state from homepage to prevent tree re-renders
- Optimize payment fetching in admin-order.service.ts to scope to paginated IDs
- Prune orders query projection in admin-customer.service.ts from select(*)
```
