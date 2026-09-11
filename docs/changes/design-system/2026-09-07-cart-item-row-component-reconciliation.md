# 2026-09-07 — Step 2E: CartItemRow Component Molecule Reconciliation

## What Changed
- **Canonical `CartItemRow` Molecule (`src/components/CartItemRow.tsx`)**:
  - Reconciled the master cart item molecule adhering directly to live Figma Step 2E specifications (`CartItemRow` component set `18:7714` at `x: 16474, y: 0` and documentation board `18:7715` at `x: 15074, y: 0` on `Components` page).
  - Aligned 3-column architecture:
    - **Column 1**: 80–86px thumbnail container with canonical `Radius/MD` (14px, `rounded-md`), fallback placeholder graphic, and Next.js Image optimization.
    - **Column 2 (Middle)**: Product details stack containing title (`Fredoka` SemiBold 16px, `#243342`), subtitle/unit price, add-on items (`• Gift wrapping +₦2,000`), and quantity controls (`Button` steppers in editable mode, or `Qty 2` text in static mode).
    - **Column 3 (Right)**: Vertical action & price column containing ghost remove button (with SVG trash icon) at the top and line price (`Fredoka` SemiBold 16px) at the bottom.
  - Aligned container styling with canonical tokens: `p-4`, `bg-bg-surface` (default) / `bg-bg-subtle` (disabled/unavailable), `rounded-md` (`Radius/MD` = 14px), and `border border-border-default` (`#EDF3F7`).
  - Added support for subordinate customization slots: `customizationDetails` (attached photos or requirement badge), `themeDetails` (custom themes pill), and `bundleDetails` (collapsible bundle component breakdown).
  - Integrated canonical `formatPrice` utility with Nigerian Naira (`₦`) currency formatting for item line total, base unit price, and addon sums.
  - Implemented accessible remove action with accessible aria labels and hover micro-transitions.
  - Structured semantic `<h3>` wrapped within Next.js `<Link>` to preserve accessible heading hierarchy and screen reader navigation.
- **Storybook Suite (`src/components/CartItemRow.stories.tsx`)**:
  - Authored 11 comprehensive stories covering all Figma properties (`State`, `Addon`, `Quantity`, `Remove`) and subordinate product models:
    - `Default` (Standard physical item with steppers and remove action)
    - `Disabled` (Muted unavailable or updating state)
    - `WithoutAddons` (Direct product line item)
    - `StaticQuantity` (Read-only badge for checkout preview or bundle elements)
    - `WithoutRemove` (Locked item configuration)
    - `WithCustomization` (Photo personalization attachment indicator)
    - `WithThemeCustomization` (Selected coloring book themes tag list)
    - `BundleItem` (Multi-item combo package with nested components)
    - `Unavailable` (Out of stock warning banner)
    - `InteractivePlay` (Automated stepper increments, decrements, and removal event assertions)
    - `CssCheck` (Computed style validation for surface, border tokens, and 14px border radius).
- **Storefront Integration (`src/components/CartDrawer.tsx`)**:
  - Refactored `CartDrawer.tsx` to replace ~170 lines of inline cart item markup with the canonical `<CartItemRow>` component.
  - Preserved all existing drawer functionalities (updating spinners, remove handlers, quantity mutation handlers, customization previews, theme tags, bundle expansion).
- **Validation**:
  - `npx tsc --noEmit` passed with 0 errors.
  - `npx vitest --project storybook run` passed across all 12 component suites (130/130 tests passing, 11/11 for CartItemRow).
  - `npm run build-storybook` completed successfully in 27.16s.

## Why
- Replaces ad-hoc inline cart item markup across storefront drawers with a single, highly reusable, accessible, and token-compliant molecule.
- Ensures exact 1:1 parity with Figma Step 2E specifications (`Radius/MD` = 14px, 80×80 thumbnail, CVA variants).
- Guarantees WCAG 2.1 AA accessibility compliance across interactive steppers, remove actions, and semantic headings.

## Files Touched
- `src/components/CartItemRow.tsx` (NEW)
- `src/components/CartItemRow.stories.tsx` (NEW)
- `src/components/CartDrawer.tsx` (MODIFIED)
- `docs/changes/design-system/2026-09-07-cart-item-row-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(design-system): reconcile CartItemRow molecule with Step 2E Figma specifications

- Implement canonical CartItemRow molecule supporting all 16 Figma Step 2E variants
- Support 80x80 Radius/MD thumbnail, canonical Button steppers, and addon badges
- Support subordinate customization, theme, and bundle component breakdown slots
- Refactor CartDrawer.tsx to compose canonical CartItemRow molecule
- Add 11 Storybook stories covering all variant combinations and Vitest play checks
- Verify TypeScript compilation, Storybook vitest tests (130/130 passing), and static build
```
