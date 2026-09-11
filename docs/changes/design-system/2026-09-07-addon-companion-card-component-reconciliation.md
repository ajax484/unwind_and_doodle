# 2026-09-07 — Step 4G: AddonCompanionCard Molecule Component Reconciliation

## What Changed
- **Canonical Design-System `AddonCompanionCard` Molecule (`src/components/AddonCompanionCard.tsx`)**:
  - Reconciled and built the storefront companion card molecule directly adhering to canonical Figma specifications (`AddonCompanionCard` Component Set `41:25498` with 32 variants and Documentation Board `41:26969` "Addon Companion Cards" on the `Components` page).
  - Implemented Class Variance Authority (CVA) variants bound directly to design tokens:
    - `size`: `'md'` (380px standard fixed width/grid, 16px padding / `p-4`, 72×72px image/motif, 24×24px indicator) and `'sm'` (320px compact fixed width/grid, 12px padding / `p-3`, 56×56px image/motif, 20×20px indicator).
    - `selected`: `true` (2px brand border `border-border-brand` `#A7C2D4`, surface `#FFFFFF`, `ring-2 ring-brand-rose/20 shadow-xs`, Rose check indicator) vs `false` (1px default border `border-border-default` `#EDF3F7`, hover `bg-bg-subtle/60` with subtle elevation `shadow-xs`).
    - `disabled`: `true` (`bg-bg-subtle` `#F4F8FA`, 60% opacity, `cursor-not-allowed pointer-events-none`).
  - Adaptive Sizing & Collapse Modes:
    - `showImage={false}` (`Image=Hidden` in Figma): Image viewport hides and content smoothly expands full width without dead space.
    - `showDescription={false}` (`Description=Hidden` in Figma): Description hides, yielding a compact single-row card.
  - Image Viewport & Built-In Vector Motifs:
    - 72×72px (MD) or 56×56px (SM) square viewport with `Radius/MD` (14px / `rounded-md`) and `bg-bg-subtle` (`#F4F8FA`).
    - Built-in vector motifs for zero-asset fallback matching Figma Section 4: `gift` (Gift Wrapping), `card` (Greeting Card), `stickers` (Sticker Pack), and `prints` (Extra Prints).
  - Selection Indicator (Checkbox):
    - Square checkbox with rounded corners (24×24px on MD, 20×20px on SM).
    - Selected: `bg-action-primary` (`#D99BA3`) fill, 2px Rose stroke, and crisp white SVG checkmark (`text-text-inverse`).
  - Content Area:
    - Add-on Name: 16px Fredoka SemiBold (`font-heading font-semibold text-text-primary`), dimmed to tertiary when disabled.
    - Description: 14px Plus Jakarta Sans Regular (`text-text-secondary text-sm line-clamp-2`).
    - Price: 14px Plus Jakarta Sans SemiBold (`font-semibold text-text-primary text-sm`), formatted with `+₦` prefix.
  - Full WCAG 2.1 AA Accessibility:
    - `role="checkbox"`, `aria-checked`, `aria-disabled`, `tabIndex`, full keyboard navigation (`Space` / `Enter`), and 44px minimum touch targets.
- **Storybook Test & Documentation Suite (`src/components/AddonCompanionCard.stories.tsx`)**:
  - Authored 12 canonical stories covering all variant combinations, sizing options, adaptive collapse modes, the 4 canonical specimens from Figma Section 4, a live interactive customization panel reproducing Figma Section 5, Vitest play tests, and token style checks:
    1. `Default` (MD, unselected, Gift Wrapping with image and description, `+₦2,000`)
    2. `Selected` (MD, selected state with 2px brand border and Rose checkmark indicator)
    3. `Hover` (Simulated hover state with subtle elevation)
    4. `Disabled` (Disabled state with muted contrast and pointer events disabled)
    5. `SmallSize` (SM, 320px width, 12px padding, 56×56px image)
    6. `SmallSelected` (SM size in selected state)
    7. `DescriptionHidden` (Compact layout with description omitted)
    8. `ImageHidden` (Full-width text content expansion with image omitted)
    9. `CanonicalSpecimens` (4 canonical storefront add-ons in a 2×2 grid: Gift Wrapping, Greeting Card, Sticker Pack, Extra Prints)
    10. `InteractiveCustomizationFlow` (Live customization panel "Make it extra special" with live selected counter pill and order total summary)
    11. `InteractivePlay` (Vitest play test verifying click toggle, keyboard Space/Enter activation, and callback invocations)
    12. `CssCheck` (Automated computed token verification for `rounded-lg` 20px card radius, `rounded-md` 14px image radius, `#A7C2D4` border, and `#D99BA3` Rose check indicator)
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- AddonCompanionCard.stories.tsx`: 12/12 tests passed in 1.91s.
  - `npx vitest --project storybook run`: 318/318 tests passed across all 30 component story files (100% pass rate).
  - `npm run build-storybook`: Static production bundle compiled successfully in 27.25s.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-addoncompanioncard--default`.

## Why
- Step 4G of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant companion card for selecting complementary accessories, gift packaging, and coloring tools in storefront customization flows (`src/app/products/[slug]/page.tsx`) and bundle builder experiences.
- Replaces ad-hoc inline companion markup and unifies add-on representations across the application.

## Files Touched
- `src/components/AddonCompanionCard.tsx` (NEW)
- `src/components/AddonCompanionCard.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-addon-companion-card-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Future enhancement: Adopt `AddonCompanionCard` in `src/app/products/[slug]/page.tsx` during the next storefront integration phase.

## Commit Message
```text
feat(design-system): reconcile AddonCompanionCard molecule component

- Implemented canonical AddonCompanionCard adhering to Figma Set 41:25498 and Board 41:26969
- Built 4 dedicated vector add-on motifs (gift, card, stickers, prints) for zero-asset fallback
- Added adaptive collapse when image or description is hidden
- Bound card to Radius/LG (20px), Radius/MD (14px), and Border/Brand (#A7C2D4)
- Full WCAG 2.1 AA accessibility with role="checkbox", keyboard activation, and 44px touch targets
- Authored 12-story Storybook suite with automated Vitest play tests (318/318 tests passing)
```
