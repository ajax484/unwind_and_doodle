# 2026-09-07 — Step 2B: Form Controls Component Family Reconciliation

## What Changed
- **Canonical Design-System Form Controls Family (`src/components/`)**:
  - Reconciled the foundational Form Controls component family directly adhering to Figma Component Sets `TextInput` (`16:3840`), `Textarea` (`16:3977`), `Select` (`16:4104`), `Checkbox` (`16:4121`), and Documentation Board `16:4122` ("Form Controls" on the `Components` page).
  - Built unified, tokenized React components with Class Variance Authority (CVA):
    1. **`TextInput` (`src/components/TextInput.tsx`)**:
       - Standardized sizing scale: `sm` (32px / `h-8`), `md` (40px / `h-10`, default), `lg` (48px / `h-12`).
       - Border tokens: `border-border-input` (`#DCE7EE`), hover `hover:border-border-brand/70`, focus ring `focus-within:ring-border-brand` (`#A7C2D4`).
       - Complete state matrix: `default`, `focus`, `error` (`border-status-danger-accent` `#EF4444` with `role="alert"`), `disabled` (`bg-bg-subtle` `#F8FAFB` with cursor-not-allowed).
       - Leading and trailing icon slots with proper optical spacing and alignment.
       - Accessible label binding using React 19 `useId()` and `htmlFor`, supporting optional `required` asterisk and `aria-describedby` helper/error linkage.
    2. **`Textarea` (`src/components/Textarea.tsx`)**:
       - Standardized sizing scale: `sm` (80px min-height), `md` (104px min-height, default), `lg` (128px min-height).
       - Resize modes: `vertical` (`resize-y`, default), `none` (`resize-none`), `both` (`resize`).
       - Dynamic character counter (`showCount` or explicit `characterCount` object) with live update tracking.
       - Tokenized borders, focus rings, disabled styling, and accessible messaging.
    3. **`Select` (`src/components/Select.tsx`)**:
       - Standardized sizing scale: `sm` (32px), `md` (40px, default), `lg` (48px).
       - Custom styled vector chevron down indicator (`#52657A`) with pointer-events-none overlay.
       - Optional leading icon slot for country/category selectors.
       - Structured `options` array support and native `<option>` child delegation.
       - Accessible placeholder option handling avoiding React DOM warnings.
    4. **`Checkbox` (`src/components/Checkbox.tsx`)**:
       - Optical 20px box (`w-5 h-5`) with `Radius/SM` (8px / `rounded-lg`).
       - Rose active fill token: `bg-action-primary` (`#D99BA3`) with crisp SVG checkmark vector in inverse text color (`#FFFFFF`).
       - Tri-state indeterminate support with horizontal dash SVG vector and underlying DOM input synchronization via `ref`.
       - Accessible label and description pairing with 44px touch target accessibility.
    5. **`FormControls` Barrel (`src/components/FormControls.tsx`)**:
       - Centralized export module re-exporting all 4 form primitives and their associated TypeScript interfaces.
- **Storybook Test & Documentation Suites (`src/components/*.stories.tsx`)**:
  - Authored standardized 10-story Storybook suites for each form control covering the entire variant matrix, size comparisons, icon slots, error states, disabled states, Vitest interactive play tests, and computed CSS token verification:
    - `src/components/TextInput.stories.tsx`: 11 tests passing (`Default`, `WithLabelAndHelper`, `RequiredField`, `SizingMatrix`, `WithLeadingIcon`, `WithTrailingIcon`, `WithBothIcons`, `ErrorState`, `DisabledState`, `InteractivePlay`, `CssCheck`).
    - `src/components/Textarea.stories.tsx`: 10 tests passing (`Default`, `WithLabelAndHelper`, `WithCharacterCounter`, `SizingMatrix`, `ResizeModes`, `RequiredField`, `ErrorState`, `DisabledState`, `InteractivePlay`, `CssCheck`).
    - `src/components/Select.stories.tsx`: 10 tests passing (`Default`, `WithLabelAndHelper`, `WithLeadingIcon`, `SizingMatrix`, `WithPlaceholder`, `RequiredField`, `ErrorState`, `DisabledState`, `InteractivePlay`, `CssCheck`).
    - `src/components/Checkbox.stories.tsx`: 10 tests passing (`Default`, `Checked`, `Indeterminate`, `WithDescription`, `ErrorState`, `DisabledUnchecked`, `DisabledChecked`, `StateMatrix`, `InteractivePlay`, `CssCheck`).
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story`: 274/274 tests passing across all 26 test files (100% pass rate, 0 regressions).
  - `npm run build-storybook`: Static production bundle compiled successfully in 25.11s.
  - Live Storybook preview links generated via MCP `stories-preview`.

## Why
- Step 2B of the Design System Reconciliation Roadmap.
- Replaces raw unstyled form inputs with design-token compliant, accessible, reusable form primitives.
- Guarantees WCAG 2.1 AA accessibility (programmatic label associations, aria-invalid, aria-describedby, visible focus rings, 44px minimum touch targets).
- Provides consistent inputs across checkout, reviews, newsletter signups, contact forms, and admin dashboards.

## Files Touched
- `src/components/TextInput.tsx` (NEW)
- `src/components/Textarea.tsx` (NEW)
- `src/components/Select.tsx` (NEW)
- `src/components/Checkbox.tsx` (NEW)
- `src/components/FormControls.tsx` (NEW)
- `src/components/TextInput.stories.tsx` (NEW)
- `src/components/Textarea.stories.tsx` (NEW)
- `src/components/Select.stories.tsx` (NEW)
- `src/components/Checkbox.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-form-controls-component-family-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(design-system): reconcile Form Controls component family (TextInput, Textarea, Select, Checkbox)

- Implemented canonical TextInput, Textarea, Select, and Checkbox components adhering to Figma Sets 16:3840, 16:3977, 16:4104, 16:4121
- Bound styles to design tokens (#DCE7EE input border, #A7C2D4 focus ring, #D99BA3 checkbox fill, 14px/8px radii)
- Full WCAG 2.1 AA accessibility with useId(), aria-invalid, aria-describedby, and 44px touch targets
- Created centralized FormControls.tsx barrel export
- Authored 4 comprehensive Storybook suites with 41 new automated Vitest play tests (274/274 tests passing)
```
