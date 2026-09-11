# 2026-09-07 — Spinner & Skeleton Atoms Reconciliation

## What Changed
- **Canonical Design-System Spinner Atom**:
  - Implemented `src/components/Spinner.tsx` using `class-variance-authority` (CVA) and `cn()`, reconciling Figma component set `Spinner` (9 production variants at `x: 42800, y: 0`) and documentation board `Spinners` (17 live instances at `x: 41200, y: 0`).
  - Supports 3 canonical sizes (`sm`: 16px, `md`: 24px, `lg`: 40px) with calibrated stroke widths (2px/3px), 5 semantic colorways (`rose`, `blue`, `charcoal`, `white`, `current`), 360° circular track with low opacity, 270° active arc rotating with `animate-spin`, `role="status"`, `<title>` accessible label, and `data-testid` support.
- **Canonical Design-System Skeleton Atom**:
  - Implemented `src/components/Skeleton.tsx` using CVA and `cn()`, reconciling Figma component set `Skeleton` (36 variants at `x: 35600, y: 0`) and documentation board `Skeletons` (30 live instances at `x: 34000, y: 0`).
  - Supports 5 placeholder types (`text`, `image`, `card`, `tableRow`, `custom`), 3 scale tiers (`sm`, `md`, `lg`), organic multi-line rags (`lines={1 | 2 | 3}` with 100%, 75%, 50% line widths), `--color-bg-subtle` token surface (`#F4F8FA`), and `animate-pulse`.
- **Storybook Stories**:
  - Implemented `src/components/Spinner.stories.tsx` (9 stories covering sizes, colors, play test, and token `CssCheck`).
  - Implemented `src/components/Skeleton.stories.tsx` (9 stories covering text lines, image cards, table rows, custom blocks, play test, and token `CssCheck`).
- **Component Composition**:
  - Refactored `src/components/Button.tsx` to compose canonical `<Spinner size="sm" color="current" />` instead of an inline SVG.
  - Refactored `src/components/home/FeaturedProductsSection.tsx` to compose canonical `<Skeleton type="card" />` in place of ad-hoc animated pulse boxes.

## Why
- Part of Step 2C & 2D (Atom Layer) of the 5-tier design system reconciliation roadmap.
- Replaces fragmented, hand-coded spinners and arbitrary `animate-pulse` boxes across the codebase with standardized, accessible loading primitives.
- Ensures zero cumulative layout shift (CLS) during asynchronous data fetching by matching placeholder geometries to real component anatomy.

## Files Touched
- `src/components/Spinner.tsx`
- `src/components/Skeleton.tsx`
- `src/components/Spinner.stories.tsx`
- `src/components/Skeleton.stories.tsx`
- `src/components/Button.tsx`
- `src/components/home/FeaturedProductsSection.tsx`

## Follow-ups / Known Issues
- None

## Commit Message
feat(design-system): reconcile Spinner and Skeleton atom components with CVA and Storybook suites
