# 2026-09-04 — Remove Redundant Client-Side Authentication Checks

## What Changed
1. **Customer Account Layout (`src/app/account/layout.tsx`)**:
   - Removed legacy client-side authentication redirect checks (`router.replace('/auth?next=...')` on 401, unauthenticated state, and fetch errors).
   - Removed blocking full-page loading spinner (`if (loading) return (...)`), allowing account layout and child pages to render immediately without layout shift or UI flicker.
   - Refactored session loading to asynchronously fetch customer profile details for the sidebar snippet without blocking page renders.
2. **Customer Order Detail Page (`src/app/account/orders/[orderNumber]/page.tsx`)**:
   - Removed redundant client-side `res.status === 401` redirect check in `loadOrder()`, delegating route-level access protection to Next.js Edge Middleware.
   - Cleaned up unused `useRouter` import and hook call.
3. **Admin Layout (`src/app/admin/layout.tsx`)**:
   - Removed redundant client-side unauthenticated check (`res.status === 401 || !json.authenticated`). Edge Middleware already redirects unauthenticated users to `/admin/login?next=...` before the layout mounts.
   - Retained organization role authorization verification (`res.status === 403 || !json.success` -> `/admin/unauthorized`) for verifying merchant/admin team credentials.
4. **Public Auth Page (`src/app/auth/page.tsx`)**:
   - Removed legacy client-side redirect (`if (nextPath.startsWith('/admin')) router.replace('/admin/login?next=...')`), as middleware directly routes unauthenticated admin attempts to `/admin/login`.

## Why
- Next.js Edge Middleware (`src/middleware.ts`) now intercepts all incoming requests matching `/account/:path*` and `/admin/:path*` at the edge server level.
- Client-side authentication checks in layouts and pages were redundant, causing unnecessary latency, duplicated network requests, and full-screen loading spinner flashes on navigation.

## Files Touched
- `src/app/account/layout.tsx` (MODIFIED)
- `src/app/account/orders/[orderNumber]/page.tsx` (MODIFIED)
- `src/app/admin/layout.tsx` (MODIFIED)
- `src/app/admin/settings/team/page.tsx` (MODIFIED)
- `src/app/auth/page.tsx` (MODIFIED)
- `tests/auth/middleware.test.ts` (NEW)
- `docs/changes/2026-09-04-remove-client-side-auth-checks.md` (NEW)

## Follow-ups / Known Issues
- Pre-existing failure flagged: `tests/api-routes.test.ts` (`returns product details with 200 OK for published slug`) received 404 for `'test-coloring-book'`. Kept untouched as it is an unrelated live DB/mock data mismatch outside task scope.

## Commit Message
```text
refactor(auth): remove redundant client-side auth checks and fix team page type error

- Remove client-side redirect guards and full-page loading spinner from AccountLayout
- Remove redundant 401 route redirect from customer order detail page
- Remove unauthenticated client-side redirect from AdminLayout while retaining 403 role check
- Remove obsolete admin nextPath redirect from auth page
- Remove orphaned successToast JSX block from team management page
- Add automated unit test suite for Next.js edge route protection middleware
```
