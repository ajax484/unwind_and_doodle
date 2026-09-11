# 2026-09-04 — Refactor Admin Layout to Server Component

## What Changed
1. **Server-Side Admin Authentication Helper (`src/lib/auth-helpers-server.ts`)**:
   - Created `getAuthenticatedAdminServer()` helper designed for Next.js App Router Server Components using `next/headers` (`cookies()` and `headers()`).
   - Reuses existing server-side security checks (`requireOrganizationMember`) and role verification against the database with `getServiceSupabaseClient()`.
   - Supports test environment bypass headers (`x-admin-user-id`, `x-test-admin-id`) for automated test suites.

2. **Next.js Edge Middleware (`src/middleware.ts`)**:
   - Configured middleware to forward `x-pathname` in the request headers (`requestHeaders.set('x-pathname', pathname)`).
   - Allows server layouts to accurately identify public admin pages (`/admin/login`, `/admin/unauthorized`) on the server without client-side hydration or URL guessing.

3. **Admin Layout Client Component (`src/app/admin/AdminLayoutClient.tsx`)**:
   - Extracted all interactive layout state and presentation into `AdminLayoutClient`:
     - Responsive mobile drawer overlay and toggle state.
     - Active route highlighting (`usePathname`) and page header titles.
     - Role-based navigation filtering (`allNavSettings.filter` hiding Team Members/Settings for non-admin roles).
     - Store context badge, user profile indicator, notification bell, and sign out handler.
   - Receives pre-verified `session: AdminServerSession` as a prop from the Server Component layout, eliminating client-side loading spinners.

4. **Admin Layout Server Component (`src/app/admin/layout.tsx`)**:
   - Refactored `layout.tsx` into an `async` Server Component.
   - Bypasses auth checks and sidebar rendering on public admin routes (`/admin/login` and `/admin/unauthorized`).
   - Immediately calls `redirect('/admin/login?next=...')` on the server if no session is present.
   - Immediately calls `redirect('/admin/unauthorized')` on the server if the user is not in an authorized role (`owner`, `admin`, `manager`, `staff`).
   - Renders `<AdminLayoutClient session={session}>{children}</AdminLayoutClient>` once authorization is confirmed.
   - Completely eliminates the client-side loading spinner ("Verifying administrative access...") and client-to-server `fetch('/api/admin/session')` roundtrip on page load.

5. **Automated Unit Tests (`tests/auth/admin-layout-server.test.ts`)**:
   - Created comprehensive unit tests for `AdminLayout` covering:
     - Public page passthrough on `/admin/login` and `/admin/unauthorized`.
     - Unauthenticated redirects to `/admin/login` (with and without `next` parameter).
     - Unauthorized role redirects to `/admin/unauthorized`.
     - Successful server rendering of `AdminLayoutClient` for verified admin sessions.

## Why
- Previously, `src/app/admin/layout.tsx` was a client component with a `useEffect` that called `fetch('/api/admin/session')`.
- This caused a full-page loading spinner ("Verifying administrative access...") on every fresh load or page refresh, and added an unnecessary network roundtrip before rendering the admin shell.
- Converting it to a Server Component ensures authorization happens server-side before sending HTML to the browser, eliminating the loading flicker, preventing unauthorized UI leaks, and keeping the responsive client sidebar intact.

## Files Touched
- `src/lib/auth-helpers-server.ts` (NEW)
- `src/middleware.ts` (MODIFIED)
- `src/app/admin/AdminLayoutClient.tsx` (NEW)
- `src/app/admin/layout.tsx` (MODIFIED)
- `tests/auth/admin-layout-server.test.ts` (NEW)
- `docs/changes/2026-09-04-admin-layout-server-component.md` (NEW)

## Follow-ups / Known Issues
- None. All 6 new server layout tests pass, middleware tests pass (10/10), and existing admin authorization tests pass (15/15).

## Commit Message
```text
refactor(admin): convert admin layout to server component

- Add getAuthenticatedAdminServer helper utilizing next/headers
- Forward x-pathname header in Next.js edge route middleware
- Extract interactive admin sidebar and mobile drawer into AdminLayoutClient
- Refactor admin/layout.tsx to an async Server Component with server-side redirects
- Eliminate client loading spinner and roundtrip session fetch on admin page loads
- Add unit test suite for Admin Server Component layout
```
