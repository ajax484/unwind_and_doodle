# 2026-09-07 — Step 4F: ThemeSelectorCard Molecule Component Reconciliation

## What Changed
- **Canonical Design-System `ThemeSelectorCard` Molecule (`src/components/ThemeSelectorCard.tsx`)**:
  - Reconciled and built the storefront customization molecule directly adhering to canonical Figma specifications (`ThemeSelectorCard` Component Set `41:24918` with 16 variants and Documentation Board `41:24919` "Theme Selector Cards" on the `Components` page).
  - Implemented Class Variance Authority (CVA) variants bound directly to design tokens:
    - `size`: `'md'` (260px standard fixed width/grid, 16px padding / `p-4`, 226×226px 1:1 preview viewport) and `'sm'` (200px compact fixed width/grid, 12px padding / `p-3`, 174×174px 1:1 preview viewport).
    - `selected`: `true` (2px brand border `border-border-brand` `#A7C2D4`, surface `#FFFFFF`, `ring-2 ring-brand-rose/20 shadow-xs`) vs `false` (1px default border `border-border-default` `#EDF3F7`, hover `bg-bg-subtle/60` with subtle elevation `shadow-xs`).
    - `disabled`: `true` (`bg-bg-subtle` `#F4F8FA`, 60% opacity, `cursor-not-allowed pointer-events-none`).
  - 1:1 Aspect Ratio Preview Viewport:
    - Bound to `Radius/MD` (14px / `rounded-md`) and `bg-bg-subtle` (`#F4F8FA`).
    - Graceful fallback: Features custom artistic motif SVG illustration when theme preview imagery is null or loading.
    - Dimmed to 50% opacity in `disabled` state.
  - Absolute-Positioned Circular Selection Indicator:
    - Pinned to top-right corner of preview (`w-6 h-6` on MD, `w-5 h-5` on SM).
    - Default/Hover: White surface fill (`#FFFFFF`), `border border-border-default` (`#EDF3F7`).
    - Selected: `bg-action-primary` (`#D99BA3`) with 2px Rose border and crisp white checkmark SVG (`text-text-inverse`).
    - Disabled: Muted subtle fill and border, no check icon.
  - Content Frame:
    - Theme Name: 16px Fredoka SemiBold (`font-heading font-semibold text-text-primary`), dimmed to `text-text-tertiary` when disabled.
    - Optional Description: 14px Plus Jakarta Sans Regular (`text-text-secondary text-sm line-clamp-2`), controlled via `showDescription` prop (defaults to `true`).
  - Full WCAG 2.1 AA Accessibility:
    - Supports `role="checkbox"` (multi-select up to 3 themes) or `role="radio"` (single theme selection).
    - Dynamic `aria-checked`, `aria-disabled`, `tabIndex`, full keyboard activation (`Space` / `Enter`), and 44px minimum touch targets.
- **Storybook Test & Documentation Suite (`src/components/ThemeSelectorCard.stories.tsx`)**:
  - Authored 11 canonical stories covering the full 16-variant matrix, sizing options, description toggling, catalog specimens, interactive storefront scenario, Vitest play tests, and token checks:
    1. `Default` (MD, unselected, Botanical theme with description)
    2. `Selected` (MD, Floral theme selected with 2px brand border and Rose checkmark)
    3. `Hover` (Simulated hover state with subtle elevation and border)
    4. `Disabled` (Muted contrast and pointer events disabled)
    5. `SmallSize` (SM, 200px width, 12px padding, compact typography)
    6. `SmallSelected` (SM selected state)
    7. `DescriptionHidden` (Clean card view without description text)
    8. `ThemeCatalog` (4-column specimen row replicating Figma Section 4: Botanical, Floral, Mindful, Abstract)
    9. `StorefrontCustomizationStep` (Interactive 3-card grid with live counter reproducing Figma Section 5)
    10. `InteractivePlay` (Vitest play test verifying click toggle, keyboard Space/Enter activation, and callback invocations)
    11. `CssCheck` (Automated computed token verification for `rounded-lg` 20px card radius, `rounded-md` 14px preview radius, `#A7C2D4` border, and `#D99BA3` Rose check indicator)
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- ThemeSelectorCard.stories.tsx`: 11/11 tests passed in 1.32s.
  - `npx vitest --project storybook run`: 306/306 tests passed across all 29 component story files (100% pass rate).
  - `npm run build-storybook`: Static production bundle compiled successfully in 25.54s.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-themeselectorcard--default`.

## Why
- Step 4F of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant card molecule for theme selection across storefront product detail pages (`src/app/products/[slug]/page.tsx`), custom keepsake creation, and bundle builder workflows.
- Eliminates one-off inline theme button markup and unifies theme representations across the application.

## Files Touched
- `src/components/ThemeSelectorCard.tsx` (NEW)
- `src/components/ThemeSelectorCard.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-theme-selector-card-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Future enhancement: Adopt `ThemeSelectorCard` in `src/app/products/[slug]/page.tsx` during the next storefront integration phase.

## Commit Message
```text
feat(design-system): reconcile ThemeSelectorCard molecule component

- Implemented canonical ThemeSelectorCard adhering to Figma Set 41:24918 and Board 41:24919
- Built 1:1 aspect ratio preview with Radius/MD (14px) and artistic SVG fallback
- Added circular indicator with Semantic/Action/Primary (#D99BA3) checkmark for active state
- Bound card to Radius/LG (20px) and Semantic/Border/Brand (#A7C2D4)
- Full WCAG 2.1 AA accessibility with role="checkbox"/"radio", keyboard activation, and 44px touch targets
- Authored 11-story Storybook suite with automated Vitest play tests (306/306 tests passing)
```
