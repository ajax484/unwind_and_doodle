# Feature: Manual Orders & Customer Payment Links Hardening Pass (Phase 6I)

## What Changed
Performed a final production-hardening pass on Phase 6I `public.create_admin_manual_order` PostgreSQL RPC migration [`supabase/migrations/20260830000002_phase6i_manual_orders.sql`](file:///c:/Users/USER/work/unwind_and_doodle/supabase/migrations/20260830000002_phase6i_manual_orders.sql).

### Production Hardening Corrections
1. **Canonical `reserve_inventory` Integration**:
   - Explicitly verified parameter signature: `public.reserve_inventory(p_order_id uuid, p_inventory_id uuid, p_quantity integer, p_expiration_minutes integer DEFAULT 30)`.
   - Called inside the RPC transaction for physical products and bundle component items with 1440 minutes (24 hours) expiration.
   - If stock is insufficient, an exception is raised and PostgreSQL cleanly rolls back the entire manual order creation transaction (leaving no orphan orders, order items, bundle component snapshots, or payment requests).
2. **Product Status Policy**:
   - Documented intentional admin business rule: manual orders allow products with status `'published'` or `'draft'` (enabling admins to process private custom/draft items for clients over DM/phone before public catalog listing), while strictly excluding `'archived'` products.
3. **Concurrent Idempotency Race Guard**:
   - Wrapped order creation `INSERT INTO public.orders` in a `BEGIN ... EXCEPTION WHEN unique_violation THEN ... END;` block against unique index `idx_orders_org_idempotency` (`organization_id, idempotency_key`).
   - If two concurrent requests arrive simultaneously with the same `(organization_id, idempotency_key)`, the second call catches the race and safely returns the existing order result (`'idempotent': true`) instead of failing.
4. **Payment Request Token Uniqueness**:
   - Added unique index `idx_order_payment_requests_token` on `public.order_payment_requests(token)`.

---

## Files Touched
- `supabase/migrations/20260830000002_phase6i_manual_orders.sql`
- `tests/mocks/supabase.mock.ts`
- `tests/manual-orders.test.ts`
- `docs/changes/2026-08-30-manual-orders-hardening-pass.md`

---

## Commit Message
```text
fix(orders): production-harden Phase 6I create_admin_manual_order RPC

- Reconcile reserve_inventory invocation with canonical signature (order_id, inventory_id, qty, expiration)
- Add concurrent idempotency unique_violation exception handler on (organization_id, idempotency_key)
- Add unique index on order_payment_requests token
- Document product status rule allowing draft/published items and rejecting archived items
```
