# Fix: API 500 Errors and Tailwind v4 Styling Integration

## Summary

Resolved API 500 errors caused by database column mismatches between the live Supabase PostgreSQL schema and application query definitions, and configured the Tailwind CSS v4 PostCSS compilation pipeline.

---

## 1. What Changed and Why

### API 500 Errors Root Cause & Fix
* **Column Mismatch on `products`**: The live Supabase schema uses `status` (`'published' | 'draft' | 'archived'`) and `selling_price` / `cost_price` instead of `is_active` and `price`. Queries referencing `products.is_active` caused PostgreSQL to throw error `column products.is_active does not exist`.
* **Carts `organization_id` Constraint**: In PostgreSQL, the `carts` table requires `organization_id` (NOT NULL constraint). Updated `getOrCreateCart` in `cart.service.ts` to resolve and supply the default organization ID.
* **Pricing & Catalog Service Alignment**: Updated `catalog.service.ts`, `pricing.service.ts`, `cart.service.ts`, and `src/lib/supabase/types.ts` to seamlessly support `status = 'published'`, `selling_price`, and `organization_id`.

### Tailwind CSS v4 Configuration
* Installed `@tailwindcss/postcss` and configured `postcss.config.mjs` with the `@tailwindcss/postcss` plugin.
* Updated `src/app/globals.css` with `@import "tailwindcss";`, `@theme` tokens, Google Fonts (`Fredoka`, `Plus Jakarta Sans`, `Pacifico`), and brand colors.
* Added explicit width and height dimensions to all SVGs across `Navbar.tsx` and `Footer.tsx`.

---

## 2. Files Touched

* [`src/lib/supabase/types.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/lib/supabase/types.ts)
* [`src/services/catalog.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/catalog.service.ts)
* [`src/services/pricing.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/pricing.service.ts)
* [`src/services/cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts)
* [`postcss.config.mjs`](file:///c:/Users/USER/work/unwind_and_doodle/postcss.config.mjs)
* [`tailwind.config.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tailwind.config.ts)
* [`src/app/globals.css`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css)
* [`tests/mocks/supabase.mock.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/mocks/supabase.mock.ts)
* [`tests/supabase-live.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/supabase-live.test.ts)

---

## 3. Verification & Validation

* `npm test`: **59/59 tests passing** across all 8 test suites (including live Supabase DB queries).
* `npx tsc --noEmit`: **0 errors**.

---

## 4. Commit Message

```text
fix: align product and cart queries with live supabase schema and configure tailwind v4 postcss
```
