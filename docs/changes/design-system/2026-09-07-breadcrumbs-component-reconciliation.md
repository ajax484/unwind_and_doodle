# 2026-09-07 — Step 5G: Breadcrumbs Molecule Component Reconciliation

## What Changed
- **Canonical Design-System `Breadcrumbs` Molecule (`src/components/Breadcrumbs.tsx`)**:
  - Reconciled and built the hierarchical navigation molecule directly adhering to canonical Figma specifications (`Breadcrumbs` Component Set `52:56481` with 24 variants and Documentation Board `52:56482` "Breadcrumbs" on the `Components` page).
  - Implemented Class Variance Authority (CVA) variant definitions bound directly to design tokens:
    - Sizing:
      - `md`: 14px Plus Jakarta Sans Body/Small (`text-sm`), 16×16px Home icon, 14×14px chevron separator, 8px spacing (`gap-2`).
      - `sm`: 12px Plus Jakarta Sans Caption (`text-xs`), 14×14px Home icon, 12×12px chevron separator, 6px spacing (`gap-1.5`).
    - Semantic Colors & Typographic Weight:
      - Trailing links: `text-text-secondary` (`#52657A`), hover `text-action-primary` (`#D99BA3`) / `hover:underline`.
      - Active leaf page: `text-text-primary` (`#243342`), `font-semibold`, `aria-current="page"`.
      - Separators: `text-text-tertiary` (`#8295A8`) decorative SVG chevron with `aria-hidden="true"`.
      - Disabled item: `text-text-tertiary/60` (`#8295A8` at 60% opacity) with `aria-disabled="true"`.
  - Scalable Home Vector Icon:
    - Integrated clean SVG home icon matching Figma Token `Size/Icon/SM` (16px) on MD and `Size/Icon/XS` (14px) on SM, configurable via `showHome`, `homeHref`, and `homeLabel`.
  - Middle Truncation & Progressive Disclosure:
    - Implemented `maxItems` truncation collapsing intermediate ancestors into an accessible `"…"` expand button with `aria-label="Show all breadcrumbs"`. Clicking expands all intermediate crumbs dynamically.
  - Standard W3C / WAI-ARIA Semantics:
    - `<nav aria-label="Breadcrumb">` landmark wrapper with semantic `<ol>` and `<li>` elements.
    - Accessible focus-visible ring styles (`focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-1`).
    - 44px minimum touch target compliance for interactive links and buttons.
- **Storybook Test & Documentation Suite (`src/components/Breadcrumbs.stories.tsx`)**:
  - Authored 11 comprehensive stories covering the full variant matrix, sizing options, home toggle, truncation behaviors, production contexts, Vitest play tests, and token style checks:
    1. `Default` (MD, storefront trail with Home icon, 3 levels)
    2. `SmallSize` (SM, admin / compact trail, text-only)
    3. `WithoutHome` (MD, text-only trail without Home icon)
    4. `MiddleTruncated` (MD, 4 items collapsed to 3 with ellipsis button)
    5. `DisabledItem` (MD, trail containing an archived / disabled step)
    6. `CustomSeparator` (MD, custom slash `/` separator)
    7. `ProductDetailPage` (MD, storefront product detail page context)
    8. `AdminOrderFulfillment` (SM, backoffice order fulfillment context)
    9. `DeepHierarchy` (MD, 5 levels with middle truncation)
    10. `InteractivePlay` (Vitest play test verifying landmarks, `aria-current="page"`, ellipsis button click, and item expansion)
    11. `CssCheck` (Automated computed token verification for 14px typography and `#243342` active item color)
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- Breadcrumbs.stories.tsx`: 11/11 tests passed in 1.44s.
  - `npx vitest --project storybook run`: 341/341 tests passed across all 32 story suites (100% pass rate).
  - `npm run build-storybook`: Static production bundle compiled cleanly in 25.25s.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-breadcrumbs--default`.

## Why
- Step 5G of the Design System Reconciliation Roadmap.
- Establishes an accessible, responsive, token-compliant navigation molecule for storefront catalog exploration, product detail views, and administrative backoffice workflows.
- Eliminates ad-hoc inline breadcrumbs across storefront and admin views by centralizing semantic hierarchy patterns into a single canonical molecule.

## Files Touched
- `src/components/Breadcrumbs.tsx` (NEW)
- `src/components/Breadcrumbs.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-breadcrumbs-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Future enhancement: Refactor existing breadcrumb elements in storefront product pages and admin detail headers to consume the canonical `Breadcrumbs` component.

## Commit Message
```text
feat(design-system): reconcile Breadcrumbs molecule component

- Implemented canonical Breadcrumbs adhering to Figma Set 52:56481 and Board 52:56482
- Added CVA variants for MD (14px) and SM (12px) sizing with design token bindings
- Integrated scalable Home vector icon and decorative chevron separators
- Supported middle truncation with accessible progressive disclosure ("..." button)
- Adheres to W3C Breadcrumb pattern with nav, ol, li, and aria-current="page"
- Authored 11-story Storybook suite with automated Vitest play tests (341/341 tests passing)
```
