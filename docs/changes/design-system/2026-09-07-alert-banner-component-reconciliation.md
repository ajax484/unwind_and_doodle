# 2026-09-07 — Step 4H: AlertBanner Molecule Component Reconciliation

## What Changed
- **Canonical Design-System `AlertBanner` Molecule (`src/components/AlertBanner.tsx`)**:
  - Reconciled and built the inline feedback banner molecule directly adhering to canonical Figma specifications (`AlertBanner` Component Set `53:13000` with 32 variants and Documentation Board `53:13001` "Alert Banners" on the `Components` page).
  - Implemented Class Variance Authority (CVA) variants bound directly to design tokens:
    - `variant`:
      - `info`: `bg-status-info-bg` (`#EEF2FF`), `border-status-info-accent/35`, `text-status-info-text`.
      - `success`: `bg-status-success-bg` (`#EBF8F2`), `border-status-success-accent/35`, `text-status-success-text`.
      - `warning`: `bg-status-warning-bg` (`#FFFBEB`), `border-status-warning-accent/35`, `text-status-warning-text`.
      - `danger`: `bg-status-danger-bg` (`#FDF0F2`), `border-status-danger-accent/35`, `text-status-danger-text`.
    - `size`:
      - `md`: `py-3.5 px-4 gap-3.5 rounded-md` (14px radius / `Radius/MD`), 16px Fredoka SemiBold title, 14px body.
      - `sm`: `py-2.5 px-3 gap-2.5 rounded-sm` (8px radius / `Radius/SM`), 14px Fredoka SemiBold title, 12px body.
  - Dedicated Semantic Status Icons:
    - Embedded SVGs for all 4 states (`info` circle with `i`, `success` checkmark circle, `warning` alert triangle, `danger` alert circle with `×`).
  - Content Hierarchy:
    - Title: 16px/14px Fredoka SemiBold (`font-heading font-semibold`).
    - Description / Children: 14px/12px Plus Jakarta Sans Regular (`text-text-secondary` / variant status text).
  - Trailing Container & Interaction Controls:
    - Contextual action button or anchor link (`actionLabel`, `onAction`, `actionHref`) with underline style.
    - Accessible dismiss close cross `×` button (`dismissible={true}`, `onDismiss`, `aria-label="Dismiss alert"`).
  - Full WCAG 2.1 AA Accessibility:
    - `role="alert"`, `aria-live="polite"`, accessible close button labels, and 44px minimum touch targets.
- **Storybook Test & Documentation Suite (`src/components/AlertBanner.stories.tsx`)**:
  - Authored 12 canonical stories covering the full 32-variant matrix, colorways, sizing options, trailing control combinations, Vitest play tests, and token style checks:
    1. `Info` (MD, Info colorway, "Shipping & delivery update")
    2. `Success` (MD, Success colorway, "Payment verified")
    3. `Warning` (MD, Warning colorway, "Low stock notice")
    4. `Danger` (MD, Danger colorway, "Order fulfillment halted")
    5. `SmallSize` (SM, Info colorway, compact 8px radius)
    6. `SmallDanger` (SM, Danger colorway, "Upload failed")
    7. `WithAction` (MD, alert with action link "Details →")
    8. `WithDismiss` (MD, alert with dismiss close button)
    9. `WithActionAndDismiss` (MD, full trailing container with action link and dismiss button)
    10. `SemanticColorways` (4-colorway stack replicating Figma Section 02)
    11. `InteractivePlay` (Vitest play test verifying action click, dismiss click callback, and keyboard focus)
    12. `CssCheck` (Automated computed token verification for `rounded-md` 14px, `rounded-sm` 8px, and semantic background colors)
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- AlertBanner.stories.tsx`: 12/12 tests passed in 1.56s.
  - `npx vitest --project storybook run`: 330/330 tests passed across all 31 component story files (100% pass rate).
  - `npm run build-storybook`: Static production bundle compiled successfully in 20.44s.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-alertbanner--info`.

## Why
- Step 4H of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant feedback and alert molecule for inline status updates, form validations, checkout announcements, and order tracking notifications.
- Delineates inline persistent feedback (`AlertBanner`) from floating transient messages (`Toast`), fulfilling Figma Section 06 architectural guidance.

## Files Touched
- `src/components/AlertBanner.tsx` (NEW)
- `src/components/AlertBanner.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-alert-banner-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Future enhancement: Refactor inline alert banners in `OrderStatusTimeline.tsx` and admin forms to compose canonical `AlertBanner`.

## Commit Message
```text
feat(design-system): reconcile AlertBanner molecule component

- Implemented canonical AlertBanner adhering to Figma Set 53:13000 and Board 53:13001
- Integrated 4 semantic status colorways (info, success, warning, danger) with dedicated SVGs
- Bound sizing to Radius/MD (14px) on MD and Radius/SM (8px) on SM
- Added trailing action button and accessible dismiss cross button controls
- Full WCAG 2.1 AA accessibility with role="alert", aria-live="polite", and 44px touch targets
- Authored 12-story Storybook suite with automated Vitest play tests (330/330 tests passing)
```
