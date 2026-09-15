# Auth Session Longevity & Sliding Refresh Token Rotation

## What Changed

- **Standardized Auth Cookie Management**: Added centralized helpers in `src/lib/auth-helpers.ts` (`setAuthCookies`, `clearAuthCookies`, `extractRefreshToken`, `refreshSupabaseSession`) supporting both `sb-access-token` and companion `sb-refresh-token` with 30-day sliding expiration, `httpOnly: true`, `secure: isProd`, `sameSite: 'lax'`, and `path: '/'`.
- **Automatic Fallback Token Refresh**:
  - In `getAuthenticatedCustomer` and `getAuthenticatedAdmin`: when Supabase JWT access token verification fails due to expiration, the helper automatically attempts a session refresh via `supabase.auth.refreshSession` using `sb-refresh-token` before failing authentication.
  - In `getAuthenticatedAdminServer`: extracts `sb-refresh-token` from cookie store and seamlessly refreshes the session during server-side rendering if the access token has expired.
  - In `getAuthenticatedUserContext`: transparently recovers expired access tokens using the refresh token, attaching `refreshedSession` for seamless downstream cookie rotation.
- **Dedicated Refresh Route & Endpoint Rotation**:
  - Created `src/app/api/auth/refresh/route.ts` to support explicit POST session refreshes with automatic cookie rotation or clean cookie wipe on revocation.
  - Updated `src/app/api/auth/session/route.ts` to dynamically rotate `sb-access-token` and `sb-refresh-token` when a refreshed session is generated, or wipe cookies cleanly via `clearAuthCookies` if a session was revoked.
- **Comprehensive Auth Routes Updated**:
  - Updated `/api/auth/password`, `/api/auth/otp/verify`, `/api/auth/token`, `/api/auth/callback`, `/api/auth/register/customer`, and `/api/invitations/[token]/accept` to persist both `sb-access-token` and `sb-refresh-token`.
  - Updated `/api/auth/signout` and `/api/auth/delete-account` to clear all auth cookies including `sb-refresh-token`.
- **Middleware & Client Foreground Keep-Alive**:
  - Updated `src/middleware.ts` to recognize `sb-refresh-token` (and chunked tokens) so active users navigating to protected `/admin/*` and `/account/*` pages are not prematurely redirected to login.
  - Updated `src/components/Navbar.tsx` and `src/app/admin/AdminLayoutClient.tsx` with a 25-minute background heartbeat interval and a `visibilitychange` window focus listener that pings `/api/auth/session` to keep long-running browser tabs active.
- **Unit & Integration Test Coverage**:
  - Added new test suite `tests/auth/auth-session-refresh.test.ts` covering 12 test scenarios for token rotation, cookie lifetime, invalid token cleanup, and middleware resilience.

## Why

Supabase JWT access tokens default to a 1-hour expiration lifespan (`jwt_expiry = 3600`). Previously, login routes only saved `access_token` in `sb-access-token` and discarded `refresh_token`. Consequently, users were logged out after approximately 1 hour of activity or when returning to an idle browser tab. This implementation implements sliding 30-day sessions with automated refresh token rotation, ensuring seamless user experiences without compromising security.

## Files Touched

- `src/lib/auth-helpers.ts`
- `src/lib/auth-helpers-server.ts`
- `src/services/user-context.service.ts`
- `src/middleware.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/auth/refresh/route.ts`
- `src/app/api/auth/password/route.ts`
- `src/app/api/auth/otp/verify/route.ts`
- `src/app/api/auth/token/route.ts`
- `src/app/api/auth/callback/route.ts`
- `src/app/api/auth/register/customer/route.ts`
- `src/app/api/invitations/[token]/accept/route.ts`
- `src/app/api/auth/signout/route.ts`
- `src/app/api/auth/delete-account/route.ts`
- `src/components/Navbar.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `tests/auth/auth-session-refresh.test.ts`
- `docs/changes/auth/2026-09-15-auth-session-longevity-and-refresh.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

feat(auth): implement 30-day sliding sessions and refresh token rotation
