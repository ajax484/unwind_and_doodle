# 2026-09-07 — Step 2D: ProductCard Component Molecule Reconciliation

## What Changed
- **Canonical `ProductCard` Molecule (`src/components/ProductCard.tsx`)**:
  - Reconciled the master browsing molecule adhering directly to Figma Step 2D specifications (`x: 11900, y: 0`, 24 production variants).
  - Aligned media container corner radius with canonical token `Radius/MD` (14px, `rounded-md`).
  - Switched category/eyebrow text styling from `text-brand-blue` (`#A7C2D4`, 1.85:1 contrast) to `text-text-brand` (`#4A7A99` / `var(--color-brand-blue-deep)`), achieving full WCAG 2.1 AA contrast compliance (4.8:1).
  - Aligned subordinate capability metadata dot with `bg-text-brand/60`.
  - Removed container `opacity-95` on `out_of_stock` variant to maintain 100% text contrast and crisp typography.
  - Enhanced action button composition: dynamically renders interactive `<button>` when `onActionClick` callback is provided, and accessible Next.js `<Link role="button">` when navigating to `/products/${slug}`.
- **Storybook Suite (`src/components/ProductCard.stories.tsx`)**:
  - Authored 13 comprehensive stories covering all 6 Figma properties (`Variant`, `State`, `Image`, `Badge`, `Rating`, `Action`) and 2 sizes (`sm`, `md`):
    - `Default` (Standard catalog item)
    - `Custom` (Photo personalization edition)
    - `Bundle` (Multi-item combo package)
    - `OutOfStock` (Inventory depletion state)
    - `PlaceholderImage` (Branded fallback graphic)
    - `WithRating` (High review volume display)
    - `CustomBadge` (Marketing override badge)
    - `InlineAction` (Compact side-by-side action layout)
    - `WithoutAction` (Presentation catalog mode)
    - `SizeSM` (Compact padding density: `p-3 sm:p-3.5`)
    - `WithoutRating` (Canonical Figma `Rating=None` variant)
    - `InteractivePlay` (Automated heading, Naira price `₦2,100`, and click event assertion)
    - `CssCheck` (Computed style validation for `#FFFFFF` surface, `#EDF3F7` border, `Fredoka` font, and 14px media `borderRadius`).
- **Validation**:
  - `npx tsc --noEmit` passed with 0 errors.
  - `npx vitest --project storybook run` passed across all 11 component suites (119/119 tests passing, 13/13 for ProductCard).
  - `npm run build-storybook` completed successfully in 20.61s.

## Why
- Eliminates hardcoded arbitrary media radii and resolves serious WCAG 2.1 AA color contrast violations on light card surfaces.
- Ensures seamless visual and behavioral agreement between the Figma Step 2D specification, active storefront catalog grids, and Storybook interactive documentation.

## Files Touched
- `src/components/ProductCard.tsx` (MODIFIED)
- `src/components/ProductCard.stories.tsx` (MODIFIED)
- `docs/changes/design-system/2026-09-07-product-card-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- `RatingStars` review count text uses `text-text-tertiary` (`#8295A8`, 3.08:1 contrast on `#FFFFFF`). As `RatingStars.tsx` is an external atom reconciled in Step 2F, it was left untouched per the out-of-scope files rule and is logged for the design token audit.

## Commit Message
```text
feat(design-system): reconcile ProductCard molecule with Step 2D Figma specifications

- Align media container corner radius with Radius/MD (14px)
- Update category eyebrow to text-text-brand for WCAG 2.1 AA color contrast compliance
- Remove out_of_stock container opacity to maintain crisp typography
- Enhance action button composition to support interactive callbacks alongside navigation links
- Expand Storybook test suite with SizeSM, WithoutRating, and Naira price assertion
- Verify TypeScript compilation, Storybook vitest tests (119/119 passing), and static build
```
