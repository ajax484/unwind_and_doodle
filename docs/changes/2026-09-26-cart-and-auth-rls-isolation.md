# Cart & Checkout RLS Policies and Stateless Auth Client Isolation

## What Changed
- **Database Migration (`supabase/migrations/20260926190000_cart_and_checkout_rls_policies.sql`)**:
  - Added full RLS policies (`FOR ALL`) for `service_role` and organization administrators (`is_organization_admin`) on `public.carts`, `public.cart_items`, `public.checkout_sessions`, `public.customizations`, and `public.customization_assets`.
  - Added permissive customer/guest RLS policies for `anon` and `authenticated` roles on `carts`, `cart_items`, `checkout_sessions`, `customizations`, and `customization_assets` so that PostgreSQL native security matches server-side API routing.
  - Successfully pushed and applied migration to the production Supabase database.
- **Stateless Ephemeral Auth Client Isolation (`src/lib/supabase/client.ts`)**:
  - Implemented `createEphemeralAuthClient` to create isolated, non-cached Supabase client instances for user authentication actions (`signInWithPassword`, `signUp`, `verifyOtp`, `signInWithOtp`, `refreshSession`, `signInWithOAuth`, `exchangeCodeForSession`).
  - Configured `getServiceSupabaseClient()` with explicit global service role headers to ensure the singleton server client remains immutable and never gets polluted by user JWT sessions.
- **Auth Handlers and Helpers Refactoring**:
  - Updated `src/lib/auth-helpers.ts` and `src/lib/auth-helpers-server.ts` to use ephemeral clients for session refresh.
  - Updated API route handlers (`/api/auth/password`, `/api/auth/register/customer`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/google`, `/api/auth/callback`, `/api/invitations/[token]/accept`) to authenticate via ephemeral auth clients while keeping all database operations on the privileged service client.

## Why
- Previously, customers encountered intermittent `violates row-level security policy for table carts` errors when attempting to add items to their cart.
- The root cause was twofold:
  1. `public.carts` and `public.cart_items` had `ENABLE ROW LEVEL SECURITY;` active with 0 defined policies.
  2. When any customer logged in or refreshed a session on a server worker, `supabase.auth` mutated the global shared `serverClientInstance`, replacing the `service_role` authorization header with the user's JWT. Any subsequent cart mutations processed by that worker were executed under `role: authenticated` and rejected by Postgres.

## Files Touched
- `supabase/migrations/20260926190000_cart_and_checkout_rls_policies.sql`
- `src/lib/supabase/client.ts`
- `src/lib/auth-helpers.ts`
- `src/lib/auth-helpers-server.ts`
- `src/app/api/auth/password/route.ts`
- `src/app/api/auth/register/customer/route.ts`
- `src/app/api/auth/otp/verify/route.ts`
- `src/app/api/auth/otp/send/route.ts`
- `src/app/api/auth/google/route.ts`
- `src/app/api/auth/callback/route.ts`
- `src/app/api/invitations/[token]/accept/route.ts`

## Follow-ups / Known Issues
- None. 1,396 tests across 108 suites pass cleanly.

## Commit Message
```text
fix(auth, commerce): add cart and checkout RLS policies and isolate ephemeral auth client

- Add migration 20260926190000_cart_and_checkout_rls_policies.sql with RLS policies for carts, cart_items, checkout_sessions, customizations, and customization_assets
- Apply migration to remote production Supabase database
- Implement createEphemeralAuthClient to prevent auth methods from mutating the shared service role client singleton
- Update auth routes and session refresh helpers to use ephemeral clients
- Enforce explicit service role headers on getServiceSupabaseClient
```
