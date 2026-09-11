# 2026-09-07 — Step 5C: AddressCard Molecule Component Reconciliation

## What Changed
- **Canonical Design-System `AddressCard` Molecule (`src/components/AddressCard.tsx`)**:
  - Reconciled the storefront delivery address card molecule directly adhering to canonical Figma specifications (`AddressCard` Component Set `43:48157` with 8 variants and Documentation Board `43:49054` "Address Cards" on the `Components` page).
  - Strictly composed foundational design-system atoms:
    - `<Badge variant="tag" size="sm">Default</Badge>` for primary delivery address tagging.
    - `<Button variant="ghost" size="sm">` for contextual Edit and Remove actions.
  - Implemented Class Variance Authority (CVA) variants bound directly to canonical design tokens:
    - `size`: `'md'` (16px padding / `p-4`, 14px gap / `gap-3.5`, 16px heading, default) and `'sm'` (12px padding / `p-3`, 10px gap / `gap-2.5`, 14px heading).
    - `selected`: `true` (2px brand border `border-border-brand` `#A7C2D4`, surface fill `#FFFFFF`, 10px inner Rose radio dot `bg-action-primary` `#D99BA3`) vs `false` (1px default border `border-border-default` `#EDF3F7`, hover `bg-bg-subtle` `#F4F8FA` with subtle elevation `shadow-sm`).
    - `disabled`: `true` (`bg-bg-subtle` `#F4F8FA`, border `#EDF3F7`, 60% opacity, disabled action buttons).
  - 3-column architecture matching Figma:
    1. **Selection Indicator**: 20px circular radio indicator (`w-5 h-5 rounded-full`) with active inner Rose dot (`w-2.5 h-2.5 rounded-full bg-action-primary`).
    2. **Metadata Content**: Address category label (`Home`, `Office`, `Art Studio`), recipient name heading, default tag badge, multi-line street and locality lines, and contact phone number.
    3. **Contextual Actions**: Top-right ghost Edit and Remove buttons with event isolation (`e.stopPropagation()`) ensuring action clicks do not inadvertently trigger address selection.
  - Dual data binding interface: Supports either a structured `address: AddressData` object or flat convenience props (`recipientName`, `streetAddress`, `city`, `state`, etc.).
  - Full WCAG 2.1 AA accessibility: `role="radio"`, `aria-checked`, `tabIndex`, full keyboard navigation (`Enter` / `Space`), and 44px minimum touch targets.
- **Storybook Test & Documentation Suite (`src/components/AddressCard.stories.tsx`)**:
  - Authored 10 canonical stories covering the full 8-variant matrix, size comparisons, tag permutations, phone omission, read-only display, checkout radio group flow, automated Vitest play tests, and token style checks:
    1. `Default` (MD, unselected, Home label, Bilal Yusuf, Default badge)
    2. `Selected` (MD, selected state with 2px brand border and Rose inner dot)
    3. `SmallSize` (SM, 12px padding, compact typography)
    4. `WithoutDefaultBadge` (Secondary saved address)
    5. `WithoutPhone` (Clean address without contact phone line)
    6. `ReadOnlyDisplay` (Actions and selection indicator hidden)
    7. `DisabledState` (Disabled card with muted contrast)
    8. `CheckoutRadioGroup` (Realistic checkout step scenario with multiple interactive cards)
    9. `InteractivePlay` (Vitest play test verifying card selection, keyboard Space activation, and action click event isolation)
    10. `CssCheck` (Automated computed token verification for `rounded-2xl`, borders, and backgrounds)
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- AddressCard.stories.tsx`: 10/10 tests passed in 1.67s.
  - `npx vitest --project storybook run`: 284/284 tests passed across all 27 component story files (100% pass rate).
  - `npm run build-storybook`: Static production bundle compiled successfully in 21.48s.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-addresscard--default`.

## Why
- Step 5C of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant delivery address card for storefront checkout, saved-address management, account profiles, and administrative customer address inspection.
- Unifies address representations across the application while eliminating ad-hoc address markup.

## Files Touched
- `src/components/AddressCard.tsx` (NEW)
- `src/components/AddressCard.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-address-card-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(design-system): reconcile AddressCard molecule component

- Implemented canonical AddressCard adhering to Figma Set 43:48157 and Board 43:49054
- Composed Badge atom for default tag and Button atom for ghost actions
- Bound styles to design tokens (#EDF3F7 border, #A7C2D4 brand ring, #D99BA3 Rose dot, Radius/LG 20px)
- Full WCAG 2.1 AA accessibility with role="radio", aria-checked, keyboard activation, and action click isolation
- Authored 10-story Storybook suite with automated Vitest play tests (284/284 tests passing)
```
