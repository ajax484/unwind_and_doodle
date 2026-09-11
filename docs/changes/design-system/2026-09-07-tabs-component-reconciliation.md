# 2026-09-07 — Step 3E: Tabs Molecule Component Reconciliation

## What Changed
1. **Canonical `Tabs` Molecule (`src/components/Tabs.tsx`)**:
   - Built a design-token compliant, CVA-driven `Tabs` molecule adhering to Figma Step 3E (`Tab Item` primitive with 32 variants and parent `Tabs` container with 4 variants).
   - Implemented `style` variants:
     - `underline`: Editorial and storefront content navigation featuring transparent baseline container, `border-b border-border-default`, `Semantic/Text/Secondary` inactive labels, and semibold active state with a 2px Brand Rose bottom border indicator (`border-action-primary`, `#D99BA3`).
     - `segmented`: Compact filtering pill container featuring `bg-bg-subtle` (`#F4F8FA`), `Radius/Pill` geometry, `border border-border-default`, `p-1`, and elevated `bg-bg-surface` (`#FFFFFF`) with `Elevation/XS` shadow for the active item.
   - Implemented `size` variants:
     - `sm`: Min 32px height, `text-xs`, compact padding.
     - `md`: Approx 40px height, `text-sm`, standard padding.
   - Integrated semantic count badge chips:
     - Underline style: `bg-bg-subtle` for inactive, `bg-action-secondary-bg text-action-secondary-text` for active.
     - Segmented style: `bg-border-default/70` for inactive, `bg-action-secondary-bg text-action-secondary-text` for active.
   - Added full WAI-ARIA tab semantics (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `tabIndex`), and interactive keyboard navigation (Left/Right arrow cycling, Home/End jumping).
   - Fully documented all interfaces and props with JSDoc comments for Storybook Autodocs generation.

2. **Storybook Interactive Catalog & Automated Tests (`src/components/Tabs.stories.tsx`)**:
   - Added story suite under `'Design System/Molecules/Tabs'` with autodocs enabled.
   - Created permutations: `UnderlineDefault`, `SegmentedDefault`, `Sizes` (SM vs MD), `WithCounts`, `WithIcons`, `DisabledTabs`, `FullWidthSegmented`.
   - Implemented automated Vitest play interaction tests in `InteractivePlay`:
     - Verifies initial `aria-selected` states and panel rendering.
     - Simulates tab selection via clicks and checks callback triggers.
     - Simulates keyboard navigation (ArrowRight, ArrowLeft wrapping, Home, End) skipping disabled tabs.
   - Implemented automated computed CSS token tests in `CssCheck`:
     - Verifies Brand Rose bottom border color (`rgb(217, 155, 163)`).
     - Verifies font typography inheritance (`Fredoka`).
     - Verifies semantic text primary (`rgb(36, 51, 66)`) and secondary (`rgb(82, 101, 122)`).

3. **Application Consumers Refactored**:
   - `src/app/products/[slug]/page.tsx`: Replaced ad-hoc tab buttons in Product Specifications and Shipping with canonical `<Tabs style="underline" size="md">`.
   - `src/components/NotificationBell.tsx`: Replaced ad-hoc filter buttons with canonical `<Tabs style="segmented" size="sm">` passing live notification counts.

## Why
- Eliminates ad-hoc button and div tab rows duplicated across storefront and notification components.
- Enforces strict design-token fidelity matching Figma Step 3E specifications and WAI-ARIA tab patterns.
- Guarantees keyboard accessibility and visual alignment across all screen sizes and viewports.

## Files Touched
- `src/components/Tabs.tsx` (NEW)
- `src/components/Tabs.stories.tsx` (NEW)
- `src/app/products/[slug]/page.tsx` (MODIFIED)
- `src/components/NotificationBell.tsx` (MODIFIED)
- `docs/changes/design-system/2026-09-07-tabs-component-reconciliation.md` (NEW)

## Follow-ups / Known Issues
- None. All 97 Vitest storybook tests passing and static Storybook bundle builds cleanly.

## Commit Message
```text
feat(design-system): reconcile Step 3E Tabs molecule with Figma and Storybook

- Implement canonical Tabs molecule with underline and segmented styles, sm/md sizes, and count chips
- Add full WAI-ARIA tablist semantics and arrow-key keyboard navigation
- Create comprehensive Storybook stories with autodocs, keyboard play tests, and token css checks
- Refactor Product Detail specifications and NotificationBell filter tabs to compose canonical Tabs
```
