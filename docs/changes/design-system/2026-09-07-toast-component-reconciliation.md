# 2026-09-07 — Step 5E: Toast Component Molecule Reconciliation

## What Changed
- **Canonical `Toast` Molecule (`src/components/Toast.tsx`)**:
  - Reconciled the canonical floating transient feedback molecule directly adhering to live Figma Step 5E specifications (`Toast` component set `46:54032` at `x: 26190, y: 19000` and documentation board `47:54305` at `x: 132000, y: 0` on `Components` page).
  - Aligned architecture with canonical design tokens:
    - **Container**: Floating auto-layout surface with `rounded-2xl` (`Radius/LG` = 16px), drop shadow `shadow-card`, and 1px accent border.
    - **Variants**:
      - `success`: `bg-status-success-bg` (`#EBF8F2`), `border-status-success-accent` (`#10B981`), `text-status-success-text` (`#1F7A4D`), with checkmark vector icon.
      - `warning`: `bg-status-warning-bg` (`#FFFBEB`), `border-status-warning-accent` (`#F59E0B`), `text-status-warning-text` (`#B45309`), with alert triangle vector icon.
      - `error`: `bg-status-danger-bg` (`#FDF0F2`), `border-status-danger-accent` (`#EF4444`), `text-status-danger-text` (`#B33948`), with circle cross vector icon.
      - `info`: `bg-status-info-bg` (`#EEF2FF`), `border-status-info-accent` (`#6366F1`), `text-status-info-text` (`#4338CA`), with info circle vector icon.
    - **Scales**:
      - `MD`: 16px horizontal / 12px vertical padding (`px-4 py-3`), 12px gap, Fredoka SemiBold 15px headline, Plus Jakarta Sans 13px message, 32px dismiss touch target.
      - `SM`: 12px horizontal / 8px vertical padding (`px-3 py-2`), 10px gap, Plus Jakarta Sans Bold 13px headline, Plus Jakarta Sans 12px message, 24px dismiss touch target.
    - **Design System Atom Reuse**:
      - Composes canonical `<Spinner size="sm" color="current" />` during `state="loading"`.
      - Composes canonical `<Button variant="ghost" size="sm">` for contextual actions (`showAction` / `action`).
    - **Accessibility Semantics**:
      - `role="status"` (`role="alert"` for error).
      - `aria-live="polite"` (`aria-live="assertive"` for error).
      - Accessible dismiss button with `aria-label="Dismiss notification"`.
- **Global Sonner `<Toaster />` Alignment (`src/app/layout.tsx`)**:
  - Configured global `toastOptions` in root layout `<Toaster>` to automatically inject `rounded-2xl`, `shadow-card`, `font-heading font-semibold`, and `font-body` design tokens into all standard Sonner notifications across the entire application.
- **Storybook Suite (`src/components/Toast.stories.tsx`)**:
  - Authored 10 stories covering all Figma variants, scales, states, and interactive controls:
    - `SuccessMD` (Canonical default success notification)
    - `WarningMD` (Amber validation alert)
    - `ErrorMD` (High-priority assertive alert)
    - `InfoMD` (Cobalt status update)
    - `SizeSM` (Compact mobile/dialog scale)
    - `WithAction` (Includes canonical Button "View cart")
    - `WithoutDismiss` (Persistent notification mode)
    - `Loading` (Asynchronous loading state composing Spinner)
    - `InteractivePlay` (Automated play function verifying action click and dismiss callback)
    - `CssCheck` (Computed style verification for `#EBF8F2` background, `#10B981` border, 16px border-radius, and Fredoka typography).
- **Validation**:
  - `npx tsc --noEmit` passed with 0 errors.
  - `npx vitest --project storybook run` passed across all 14 story suites (149/149 tests passing, 10/10 for Toast).
  - `npm run build-storybook` completed successfully in 29.38s.

## Why
- Implements the canonical `Toast` molecule specified in Figma Step 5E (`46:54032`) with 100% token fidelity.
- Bridges the design system molecule with the application's runtime notification infrastructure (`sonner`), ensuring visual consistency across all customer and admin toast alerts.
- Adheres to WCAG 2.1 AA accessibility guidelines with ARIA live regions and minimum touch target sizes.

## Files Touched
- `src/components/Toast.tsx` (NEW)
- `src/components/Toast.stories.tsx` (NEW)
- `src/app/layout.tsx` (MODIFIED)
- `docs/changes/design-system/2026-09-07-toast-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(design-system): reconcile Toast molecule with Step 5E Figma specifications

- Implement canonical Toast molecule supporting all 16 Figma Step 5E variants
- Support 4 semantic status colorways, 2 scales (MD, SM), and async Loading state
- Compose canonical Button and Spinner primitives for contextual actions and spinners
- Align global Sonner Toaster in layout.tsx with design tokens (rounded-2xl, shadow-card)
- Add 10 Storybook stories covering all variants and Vitest interaction play tests
- Verify TypeScript compilation, Storybook vitest tests (149/149 passing), and static build
```
