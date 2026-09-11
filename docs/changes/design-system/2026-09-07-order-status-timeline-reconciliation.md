# 2026-09-07 — Step 5B: OrderStatusTimeline Molecule Component Reconciliation

## What Changed
- **Canonical `OrderStatusTimeline` Molecule (`src/components/OrderStatusTimeline.tsx`)**:
  - Reconciled the order status timeline molecule adhering directly to canonical Figma Step 5B specifications (`OrderStatusTimeline` component set `43:42961` and documentation board `Order Status Timelines` `43:46692` on `Components` page).
  - Implemented `class-variance-authority` (CVA) variant definitions (`orderStatusTimelineVariants`) and bound all styling to canonical `@theme` tokens:
    - Card Surface: `#FFFFFF` (`bg-bg-surface`), `#EDF3F7` border (`border-border-default`), `24px` radius (`rounded-[24px]`), and soft elevation (`shadow-card`).
    - Multi-scale padding: `MD` (`p-7` / `28px`, `gap-5`) and `SM` (`p-5` / `20px`, `gap-4`).
  - Implemented dual layout orientations:
    - **Horizontal Ribbon**: Evenly distributed 5-stage ribbon progression with segmented progress line boxes (3px MD / 2px SM height, rounded-full) between step columns.
    - **Vertical Stepper**: Left-aligned indicator column with continuous vertical progress line boxes (36px MD / 28px SM height, 3px MD / 2px SM width) paired with right-hand label and micro-timestamp column.
  - Implemented canonical indicator archetypes:
    - *Completed*: Circular `bg-brand-rose text-text-inverse` (#D99BA3) with vector checkmark icon.
    - *Current*: Circular `bg-brand-rose` with 3px `border-brand-blue` (#A7C2D4) ring and inner white dot (10px MD / 8px SM). Visually distinctive without relying solely on color.
    - *Upcoming*: Circular `bg-bg-subtle` (#F4F8FA) with 1.5px `border-border-default` stroke and subtle center dot.
    - *Cancelled*: Circular `bg-status-danger-text text-text-inverse` (#B33948) with white vector `✕` icon.
  - Implemented integrated top alert banners:
    - Replaced the legacy whole-card replacement with top alert banners sitting inside the card, allowing full progression history to remain visible:
      - *Active*: `bg-bg-brand`, `border-border-brand`, vector info icon ("Fulfillment in progress").
      - *Completed*: `bg-status-success-bg`, `border-status-success-accent`, vector checkmark icon ("Order delivered").
      - *Cancelled*: `bg-status-danger-bg`, `border-status-danger-accent`, vector warning icon ("Order cancelled").
      - *Refunded*: `bg-bg-brand`, `border-border-brand`, vector sync/refund arrows icon ("Order refunded").
  - Preserved 100% backward API compatibility:
    - Maintained `status` and `history` props for existing customer and account order detail pages (`src/app/order/[orderNumber]/page.tsx` and `src/app/account/orders/[orderNumber]/page.tsx`).
- **Storybook Suite (`src/components/OrderStatusTimeline.stories.tsx`)**:
  - Implemented 11 canonical stories covering all variant combinations and interaction tests:
    1. `Default` (Canonical horizontal progression, Confirmed status)
    2. `Vertical` (Mobile/sidebar vertical stepper mode)
    3. `AlternativeMode` (Compact SM scale variant)
    4. `WithAlertBanner` (Active fulfillment with integrated tracking banner)
    5. `Created` (Stage 1 initial submission)
    6. `Shipped` (Stage 4 in-transit courier dispatch)
    7. `Delivered` (Stage 5 completed fulfillment)
    8. `Cancelled` (Halted progression with danger alert banner)
    9. `Refunded` (Preserved history with refund confirmation banner)
    10. `InteractivePlay` (Automated Vitest play test verifying step DOM rendering, aria roles, and history items)
    11. `CssCheck` (Computed style assertions for surface, border, and 24px radius tokens)
- **Validation**:
  - `npx tsc --noEmit`: Passed with 0 errors.
  - `npm run test:story -- OrderStatusTimeline.stories.tsx`: 11/11 tests passed in 2.08s.
  - `npx vitest --project storybook run`: 202/202 tests passed across all 19 story files in 20.29s.
  - `npm run build-storybook`: Static production build succeeded in 25.88s.

## Why
- Elevates the ad-hoc order status timeline into a fully reconciled, accessible, token-compliant design-system molecule.
- Guarantees 1:1 visual fidelity with canonical Figma Component Set `43:42961` and Documentation Board `43:46692`.
- Eliminates emoji characters in favor of crisp, resolution-independent vector indicators and banners.
- Preserves full runtime compatibility with storefront order status and account history pages.

## Files Touched
- `src/components/OrderStatusTimeline.tsx` (MODIFIED)
- `src/components/OrderStatusTimeline.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-order-status-timeline-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(design-system): reconcile OrderStatusTimeline molecule with Step 5B Figma specifications

- Implement CVA variants for horizontal progression ribbons and vertical steppers in SM and MD scales
- Align design tokens with bg-bg-surface (#FFFFFF), border-border-default (#EDF3F7), and 24px radius
- Implement vector indicator archetypes for completed, current, upcoming, and cancelled steps
- Add integrated top alert banners for active, delivered, cancelled, and refunded statuses
- Author 11-story Storybook suite with Vitest play assertions and computed token checks
```
