# 2026-09-02 — Authentication System Redesign & Implementation

## What Changed
1. **Canonical Server-Side User Context Resolution (`getAuthenticatedUserContext`)**:
   - Created `src/services/user-context.service.ts` to deterministically resolve whether an authenticated session is a Merchant/Admin, Customer, Unassigned user, or Anonymous visitor using a strongly typed discriminated union without unsafe type assertions.
2. **Strict User Journey Separation**:
   - **Merchant/Admin Login (`/admin/login`, `/api/auth/password`, `/api/auth/otp/verify`)**: Requires valid organization membership (`owner`, `admin`, `manager`, `staff`). Unauthorized users are rejected with `403 Forbidden` and no customer records are created.
   - **Admin Account Creation (`/invite/[token]`, `/api/invitations/[token]/accept`)**: Admin accounts can **only** be created when accepting a verified team invitation. Users can set their password directly on the invitation page. The backend verifies the invite, provisions the Supabase auth account (auto-confirmed via admin client without touching `customers` table), assigns the organization membership with the invited role, and establishes the admin session.
   - **Customer Authentication & Registration (`/auth`, `/api/auth/register/customer`)**: Dedicated customer registration and login flows. Customer registration creates a Supabase auth user and links to the `customers` database record, never granting organization-level privileges.
3. **Passwordless / Magic Link & OTP Hardening**:
   - Standardized Supabase OTP and magic link verification to support both email code entry and email link callback redirects with intent and destination preservation.
4. **Google OAuth Full Flow Integration**:
   - Updated Google OAuth initiation (`/api/auth/google`) and callback handling (`/api/auth/callback`) to exchange codes for sessions, inspect organization membership, link customer profiles when applicable, and set HTTP-only session cookies.
5. **Route Protection Middleware**:
   - Created Next.js Edge Middleware (`src/middleware.ts`) protecting `/admin/*` and `/account/*` routes at the edge level, eliminating unauthenticated UI flashes.
6. **Session Management & Logout**:
   - Hardened session retrieval (`/api/auth/session`) and session termination (`/api/auth/signout`) to reliably clear all session and Supabase project cookies.

## Why
- Previously, password login and OAuth callbacks indiscriminately invoked `linkOrCreateCustomerAccount`, polluting customer database tables when admins logged in.
- Lack of dedicated customer registration and team onboarding caused confusion between merchant/admin and customer roles.
- Magic link and OAuth callbacks lacked role resolution and failed to handle expired tokens or maintain return destinations.

## Files Touched
- `src/services/user-context.service.ts` (NEW)
- `src/middleware.ts` (NEW)
- `src/app/api/auth/register/customer/route.ts` (NEW)
- `src/app/api/auth/password/route.ts` (MODIFIED)
- `src/app/api/auth/otp/send/route.ts` (MODIFIED)
- `src/app/api/auth/otp/verify/route.ts` (MODIFIED)
- `src/app/api/auth/google/route.ts` (MODIFIED)
- `src/app/api/auth/callback/route.ts` (MODIFIED)
- `src/app/api/auth/token/route.ts` (MODIFIED)
- `src/app/api/auth/session/route.ts` (MODIFIED)
- `src/app/api/auth/signout/route.ts` (MODIFIED)
- `src/app/auth/page.tsx` (MODIFIED)
- `src/app/admin/login/page.tsx` (MODIFIED)
- `src/app/invite/[token]/page.tsx` (MODIFIED)
- `src/services/customer-account.service.ts` (MODIFIED)
- `tests/mocks/supabase.mock.ts` (MODIFIED)
- `tests/auth-redesign-matrix.test.ts` (NEW)

## Follow-ups / Known Issues
- Ensure Google OAuth client credentials and redirect URIs (`/api/auth/callback`) are configured in Supabase dashboard for production deployment.

## Commit Message
```text
feat(auth): complete authentication system redesign and flow separation

- Add canonical getAuthenticatedUserContext service for deterministic user context resolution
- Separate merchant/admin sign-in from customer registration and authentication
- Restrict admin account creation to verified team invitations
- Harden passwordless OTP, magic links, and Google OAuth flows
- Add Next.js route protection middleware for /admin and /account routes
- Update UI for customer sign-in/up, admin login, and team invitation onboarding
```
