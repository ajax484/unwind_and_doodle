# 2026-09-07 — Badge Atom Component Reconciliation & OrderStatusBadge Unification

## What Changed
- **Canonical Design-System Badge Atom**:
  - Implemented `src/components/Badge.tsx` using `class-variance-authority` (CVA) and `@/lib/utils` `cn()`, reconciling the canonical Figma component set `Badge` (45 variants at `x: 9600, y: 0` on `Components` page) and documentation board `Badges` (30 live instances at `x: 8300, y: 0`).
  - Implemented 5 variants (`status`, `bundle`, `tag`, `accent`, `brand`), 6 semantic status types (`success`, `warning`, `danger`, `info`, `purple`, `neutral`), 2 canonical sizes (`sm`: 24px, `md`: 28px), optical status indicator dot (`dot`), pulse animation (`pulse`), leading/trailing icon slot (`icon`), disabled state, and `ref` forwarding.
  - Bound styling directly to Tailwind CSS `@theme` design tokens (`--color-status-*-bg`, `--color-status-*-text`, `--color-status-*-accent`, `--color-bg-subtle`, `--color-text-*`, `--font-heading`).
- **Storybook Setup & Canonical Stories**:
  - Implemented `src/components/Badge.stories.tsx` with 14 stories covering all variants, status colors, sizes, indicators, interactive controls, play smoke test (`InteractivePlay`), and token style verification (`CssCheck`).
- **Admin OrderStatusBadge Composition**:
  - Refactored `src/components/admin/OrderStatusBadge.tsx` to compose the canonical `<Badge>` primitive with `dot`, `statusType`, and `pulse` instead of duplicated inline styles.
- **Storefront ProductCard Composition**:
  - Refactored `src/components/ProductCard.tsx` to compose canonical `<Badge variant="bundle">`, `<Badge variant="accent">`, and `<Badge variant="status" statusType="danger">` instead of ad-hoc and unstyled spans.

## Why
- Part of Step 2B (Atom Layer) of the design system reconciliation roadmap.
- Eliminates duplicated and ad-hoc badge implementations across storefront product cards and administrative order tables.
- Standardizes all badge rendering on CVA and design-system status tokens.

## Files Touched
- `src/components/Badge.tsx`
- `src/components/Badge.stories.tsx`
- `src/components/admin/OrderStatusBadge.tsx`
- `src/components/ProductCard.tsx`

## Follow-ups / Known Issues
- None

## Commit Message
feat(design-system): reconcile Badge atom component and compose in OrderStatusBadge and ProductCard
