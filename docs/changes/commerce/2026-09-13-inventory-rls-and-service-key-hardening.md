# 2026-09-13 — Inventory RLS & Service Key Hardening

Resolution for production catalog out-of-stock anomaly caused by missing service role credentials degrading to anonymous client, blocked by PostgreSQL Row Level Security (RLS).

## What Changed

1. **Configuration & Server Client Hardening (`src/lib/config.ts`, `src/lib/supabase/client.ts`)**:
   - Added `hasServiceRoleKey: boolean` to `AppConfig` to explicitly track whether `SUPABASE_SERVICE_ROLE_KEY` is present in the environment rather than silently conflating it with the anonymous key.
   - Added explicit, high-visibility server diagnostic warnings when running in development or production without `SUPABASE_SERVICE_ROLE_KEY`, warning that RLS policies will constrain queries and cause empty stock/inventory returns.

2. **Database Defense-in-Depth RLS Policies (`supabase/migrations/20260913000000_inventory_and_bundle_public_read.sql`)**:
   - Enabled RLS idempotently and created public `SELECT` policies for `public.inventory`, `public.bundle_items`, `public.warehouses`, and `public.product_addons`.
   - Ensures storefront public catalog browsing and stock availability calculations never fail with empty datasets even if server credentials degrade or are temporarily missing in hosting provider environment variables.

## Why

In production, all catalog products were displaying as "Out of Stock" because `getServiceSupabaseClient()` was falling back to the anonymous key due to a missing `SUPABASE_SERVICE_ROLE_KEY` in production hosting environment variables. PostgreSQL RLS on `inventory` and `bundle_items` silently returned 0 rows to anonymous clients, causing available stock to be calculated as 0. Adding explicit server diagnostics and public read policies eliminates both the diagnostic opacity and the storefront failure mode.

## Files Touched

- `src/lib/config.ts`
- `src/lib/supabase/client.ts`
- `supabase/migrations/20260913000000_inventory_and_bundle_public_read.sql`
- `docs/changes/README.md`
- `docs/changes/commerce/2026-09-13-inventory-rls-and-service-key-hardening.md`

## Follow-ups / Known Issues

The migration `20260913000000_inventory_and_bundle_public_read.sql` must be executed in the Supabase Dashboard SQL Editor, and `SUPABASE_SERVICE_ROLE_KEY` must be verified in the production hosting dashboard (e.g. Vercel Project Settings > Environment Variables).

## Commit Message

```text
fix(commerce): harden server supabase client and add public read RLS for inventory and bundle items
```
