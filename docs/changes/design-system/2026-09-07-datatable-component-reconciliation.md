# 2026-09-07 — Step 6A: DataTable Organism Component Reconciliation

## What Changed
- **Canonical Design-System `DataTable` Organism (`src/components/DataTable.tsx`)**:
  - Reconciled and built the administrative tabular data organism directly adhering to canonical Figma specifications (`DataTable` Component Set `52:60334` with 18 consolidated production variants and Documentation Board `Data Tables` `52:63775` on `Components` page `16:2942`).
  - Organic atomic composition consuming established design system primitives:
    - Composes canonical [`Checkbox`](src/components/Checkbox.tsx) for header select-all (with indeterminate dash state) and individual row selection checkboxes.
    - Composes canonical [`Pagination`](src/components/Pagination.tsx) for integrated bottom pagination controls (`size="sm"`).
    - Composes canonical [`EmptyState`](src/components/EmptyState.tsx) for zero-data callouts with customizable action buttons.
  - Generic TypeScript `<TData>` Architecture:
    - Type-safe column descriptors: `id`, `header`, `accessorKey`, `cell`, `align`, `width`, `sortable`, `className`.
    - Flexible row key extraction via `getRowId`.
  - Implemented Class Variance Authority (CVA) variant definitions bound directly to design tokens:
    - Vertical Density Scale:
      - `default`: ~52px row height, `py-3.5 px-4` cell padding, 14px body text (`text-sm`).
      - `compact`: ~40px row height, `py-2 px-3` cell padding, 12px caption text (`text-xs`).
    - State Lifecycle:
      - `default`: Renders populated data rows with hover and selection highlights.
      - `loading`: Renders animated pulse skeleton rows across all active columns.
      - `empty`: Renders centered `EmptyState` callout inside a full-width spanned row.
    - Selection Modes:
      - `none`: Standard table without selection column.
      - `single`: Single row selection with radio/checkbox control.
      - `multiple`: Multi-row selection with header select-all (with indeterminate support) and row highlight `bg-brand-blue-light/35`.
    - Column Sorting:
      - Integrated column sorting with dual chevron indicator vector and `aria-sort="ascending" | "descending"` announcements.
    - Container & Token Bindings:
      - Container: `bg-bg-surface` (`#FFFFFF`), `border border-border-default` (`#EDF3F7`), `rounded-2xl` (16px / `Radius/LG`), `shadow-xs`.
      - Header Row: `bg-bg-subtle/90` (`#FAFAFC`), border-b `border-border-default`, `text-xs font-semibold text-text-secondary uppercase tracking-wider`.
      - Rows: border-b `border-border-default`, `hover:bg-bg-subtle/50 transition-colors`.
    - Integrated Pagination Footer:
      - Displays range summary (`"Showing 1 to 10 of 48 orders"`) and canonical `Pagination` navigator.
    - Responsive Strategy:
      - Follows Figma Section 06 ("Responsive Desktop & Mobile Horizontal Scroll Simulator") using full-width presentation with an `overflow-x-auto` smooth horizontal scroll container, preventing column truncation or layout destruction on mobile screens.
- **Storybook Test & Documentation Suite (`src/components/DataTable.stories.tsx`)**:
  - Authored 12 comprehensive stories covering all variant combinations, density scales, selection modes, domain-specific administrative demos, Vitest play tests, and token style checks:
    1. `Default` (Admin orders table, default density, pagination footer)
    2. `CompactDensity` (Dense operational dataset with ~40px row height)
    3. `MultiSelect` (Multi-row selection with header select-all checkbox)
    4. `SingleSelect` (Single row selection)
    5. `LoadingState` (Animated skeleton loading rows)
    6. `EmptyStateStory` (Empty state callout with action button)
    7. `SortableColumns` (Interactive sorting across Order, Customer, Total, Date)
    8. `OrdersDomainDemo` (Replicating Figma Section 05 Orders demo with authentic `OrderStatusBadge` chips)
    9. `CustomersDomainDemo` (Replicating Figma Section 05 Customers demo with customer `Avatar` and lifetime value)
    10. `ProductsDomainDemo` (Replicating Figma Section 05 Products demo with category tags and stock badges)
    11. `InteractivePlay` (Vitest play test verifying table headers, select-all checkbox toggle, row selection state, column sort click handler, and pagination)
    12. `CssCheck` (Automated computed token verification for 16px radius, surface background, and border colors)
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- DataTable.stories.tsx`: 12/12 tests passed in 2.87s.
  - `npx vitest --project storybook run`: 363/363 tests passed across all 34 story suites (100% pass rate).
  - `npm run build-storybook`: Static production bundle compiled cleanly in 22.36s.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-organisms-datatable--default`.

## Why
- Step 6A of the Design System Reconciliation Roadmap.
- Administrative backoffice views previously lacked a centralized, authoritative tabular component pattern, causing visual drift across Orders, Customers, Inventory, and Reviews.
- `DataTable` establishes an accessible, responsive, token-compliant organism for all high-volume operational screens.

## Files Touched
- `src/components/DataTable.tsx` (NEW)
- `src/components/DataTable.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-datatable-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Future enhancement: Refactor existing hardcoded tables in `src/app/admin/orders/page.tsx` and `src/app/admin/products/page.tsx` to consume canonical `DataTable`.

## Commit Message
```text
feat(design-system): reconcile DataTable organism component

- Implemented generic canonical DataTable adhering to Figma Set 52:60334 and Board 52:63775
- Organically composed Checkbox, Pagination, and EmptyState design system primitives
- Implemented state lifecycle (default, loading skeleton, empty) and density modes (default, compact)
- Added single/multiple row selection with indeterminate select-all checkbox support
- Supported interactive column sorting with accessible ARIA sort announcements
- Authored 12-story Storybook suite with automated Vitest play tests (363/363 tests passing)
```
