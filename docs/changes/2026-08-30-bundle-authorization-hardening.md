# Feature: RPC Authorization Hardening for Service Role & Org Admin

## What Changed
Resolved the `Unauthorized: organization admin access required` exception encountered during server-side bundle product creation and management.

### Root Cause
When Next.js backend API routes (such as `POST /api/admin/products/bundles`) call Supabase RPCs via `getServiceSupabaseClient()`, the request connects to PostgreSQL using the `service_role` key. Under `service_role`, `auth.role()` in PostgreSQL is `'service_role'` and `auth.uid()` is `NULL` (since session authentication was previously performed at the Next.js API layer via `getAuthenticatedAdmin(req)`).

Consequently, `public.is_organization_admin(p_org_id)` checks targeting `auth.uid()` alone evaluated to `FALSE`, throwing `Unauthorized: organization admin access required`.

### Fix Applied
1. **`public.is_organization_admin(p_org_id)` Helper**:
   - Updated definition to evaluate to `TRUE` if `auth.role() = 'service_role'` OR if `auth.uid()` belongs to an `admin` or `owner` of `p_org_id` in `organization_members`.
2. **RPC Function Guards**:
   - Updated `public.create_admin_bundle`, `public.update_admin_bundle`, `public.duplicate_admin_bundle`, and `public.create_admin_manual_order` to explicitly allow execution when `auth.role() = 'service_role'` OR when `is_organization_admin(p_org_id)` is satisfied.

---

## Files Touched
- `supabase/migrations/20260830000001_phase6h_bundle_admin_workflow.sql`
- `supabase/migrations/20260830000002_phase6i_manual_orders.sql`
- `docs/changes/2026-08-30-bundle-authorization-hardening.md` [NEW]

---

## Commit Message
```text
fix(auth): allow service_role and verified org admins in bundle & manual order RPCs

- Add is_organization_admin helper definition checking service_role OR org admin membership
- Update authorization check in create_admin_bundle, update_admin_bundle, duplicate_admin_bundle, and create_admin_manual_order
- Resolve Unauthorized: organization admin access required exception on API routes
```
