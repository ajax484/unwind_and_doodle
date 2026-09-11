# Page-Level Design-Token Cleanup and Normalization (Step 7C.1)

## What Changed

Eliminated page-level design token drift across all storefront and admin pages, migrating hardcoded arbitrary hex values, ad-hoc palette shades, and non-canonical utilities to canonical semantic design tokens established in Step 7B.2 (`src/app/globals.css` and Tailwind v4 `@theme`).

1. **Homepage Data (`src/lib/homepage-data.ts`)**:
   - Normalized theme preview color tags to canonical tokens: Botanical `#7FA6BF` (`brand-blue-hover`), Floral `#D99BA3` (`brand-rose`), Mindful `#4A7A99` (`brand-blue-deep`), Whimsical `#C67D87` (`brand-rose-hover`).
   - Cleaned fallback gradient strings to match design token foundation.

2. **Storefront Product Browsing (`src/app/products/page.tsx`, `src/app/products/[slug]/page.tsx`)**:
   - Replaced raw hex text (`text-[#243342]`, `text-[#52657A]`, `text-[#8295A8]`) with semantic typography classes (`text-text-primary`, `text-text-secondary`, `text-text-tertiary`).
   - Replaced arbitrary borders (`border-[#EDF3F7]`, `border-[#DCE7EE]`) with `border-border-default` and `border-border-input`.
   - Replaced hardcoded badge / accent styling (`text-[#A7C2D4]`, `text-[#D99BA3]`, `bg-[#FBF0F2]`) with `text-brand-blue`, `text-brand-rose`, and `bg-bg-accent`.
   - Migrated legacy `btn-pink` class usages to canonical `btn-rose`.

3. **Cart & Checkout Pages (`src/app/cart/page.tsx`, `src/app/checkout/page.tsx`)**:
   - Replaced arbitrary hex borders, backgrounds, and action buttons (`bg-[#D99BA3]`, `hover:bg-[#C67D87]`, `text-[#243342]`) with `bg-action-primary`, `hover:bg-action-primary-hover`, `text-text-primary`, and `border-border-default`.
   - Replaced input focus rings with `focus:border-action-primary focus:ring-action-primary`.
   - Preserved legitimate copy placeholder (`#1234` text placeholder in delivery instructions).

4. **Customer Account Portal (`src/app/account/**`)**:
   - Normalized layout navigation tabs, status chips, profile inputs, and order history across:
     - `src/app/account/layout.tsx`
     - `src/app/account/page.tsx`
     - `src/app/account/profile/page.tsx`
     - `src/app/account/preferences/page.tsx`
     - `src/app/account/addresses/page.tsx`
     - `src/app/account/orders/page.tsx`
     - `src/app/account/orders/[orderNumber]/page.tsx`
     - `src/app/order/[orderNumber]/page.tsx`
     - `src/app/invite/[token]/page.tsx`
   - Unified all order status badges, action links, destructive buttons, and back buttons with design system tokens.

5. **Customer & Admin Authentication (`src/app/auth/**`, `src/app/admin/login/**`, `src/app/admin/unauthorized/**`)**:
   - Replaced form borders, card containers, inputs, toggle buttons, and submission buttons with `bg-action-primary`, `text-text-primary`, `border-border-default`, `border-border-input`, and `bg-bg-subtle`.
   - Preserved authentic 4-color Google OAuth brand SVG fills (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`).
   - Normalized admin dark mode surfaces to Tailwind `bg-slate-900` and `bg-slate-800` (`#0F172A` and `#1E293B`).

6. **Admin Back-Office (`src/app/admin/**`, `src/components/admin/**`)**:
   - Normalized active status filter tabs and action buttons in `src/app/admin/orders/page.tsx` and `src/app/admin/products/page.tsx` to `bg-neutral-charcoal text-text-inverse`.
   - Normalized assigned theme pills in `src/app/admin/products/[productId]/page.tsx` and `src/app/admin/products/new/page.tsx` to `bg-bg-accent text-brand-rose border-border-accent/30`.
   - Normalized modal action buttons in `ManualOrderForm.tsx` and `ManualOrderSuccessModal.tsx` to `bg-neutral-charcoal text-text-inverse`.
   - Bound custom SVG line charts in `AnalyticsCharts.tsx` to design tokens using CSS variables (`var(--color-brand-rose)`, `var(--color-border-default)`, `var(--color-text-tertiary)`).

7. **Shared Modals (`src/components/ReviewModal.tsx`)**:
   - Normalized star ratings, image dropzones, modal containers, and buttons to design system semantic tokens.

## Why

Following Step 7B.2 (Code Token Reconciliation), a comprehensive audit revealed lingering arbitrary hex values (`[#...]`), legacy utility classes (`btn-pink`), and inconsistent color shades embedded directly in page templates and components. This drift created visual discontinuities between Figma's approved token system and the live application. Cleaning up and standardizing these page-level styles establishes full design parity and ensures subsequent component migrations build upon an immaculate foundation.

## Files Touched

- `src/lib/homepage-data.ts`
- `src/components/ReviewModal.tsx`
- `src/components/admin/analytics/AnalyticsCharts.tsx`
- `src/components/admin/manual-order/ManualOrderForm.tsx`
- `src/components/admin/manual-order/ManualOrderSuccessModal.tsx`
- `src/app/products/page.tsx`
- `src/app/products/[slug]/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/account/layout.tsx`
- `src/app/account/page.tsx`
- `src/app/account/profile/page.tsx`
- `src/app/account/preferences/page.tsx`
- `src/app/account/addresses/page.tsx`
- `src/app/account/orders/page.tsx`
- `src/app/account/orders/[orderNumber]/page.tsx`
- `src/app/order/[orderNumber]/page.tsx`
- `src/app/invite/[token]/page.tsx`
- `src/app/auth/page.tsx`
- `src/app/auth/callback/page.tsx`
- `src/app/admin/unauthorized/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/products/page.tsx`
- `src/app/admin/products/[productId]/page.tsx`
- `src/app/admin/products/new/page.tsx`
- `src/app/admin/login/page.tsx`
- `docs/changes/README.md`
- `docs/changes/2026-09-06-page-level-token-normalization.md`

## Follow-ups / Known Issues

None

## Commit Message

feat(design-tokens): normalize page-level styling to locked semantic token system (Step 7C.1)
