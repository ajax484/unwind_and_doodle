# 2026-09-07 — Avatar Atom Component Reconciliation

## What Changed
- **Canonical Design-System Avatar Atom**:
  - Implemented `src/components/Avatar.tsx` using `class-variance-authority` (CVA) and `cn()`, reconciling Figma component set `Avatar` (32 production variants at `x: 50200, y: 0`) and documentation board `Avatars` (28 live instances at `x: 48600, y: 0`).
  - Supports 4 canonical sizes (`sm`: 32px, `md`: 40px [default], `lg`: 48px, `xl`: 64px) with strict 1:1 aspect ratio and `rounded-full` circular geometry.
  - Supports both `image` and `initials` content modes with automatic fallback:
    - `Image`: High-fidelity image fill with graceful `onError` fallback to monogram initials.
    - `Initials`: Centered 2-letter monogram in `font-body font-bold text-text-primary` on `bg-bg-subtle` (`#F4F8FA`) with scaled typography (12px Caption, 14px Body, 16px Subheading, 20px Heading/3).
  - Supports 4 presence/status indicator states (`none`, `online`, `offline`, `away`):
    - Anchored bottom-right indicator with white knockout ring (`ring-white`).
    - Semantic token bindings: `online` (`bg-status-success`), `away` (`bg-status-warning`), `offline` (`bg-text-tertiary`).
    - Accessible screen-reader announcement (`role="status"`, `aria-label`) avoiding color-only status communication.
- **Storybook Stories Suite**:
  - Implemented `src/components/Avatar.stories.tsx` with 14 stories covering default canonical variant, initials mode, SM/MD/LG/XL scales, online/away/offline statuses, status matrix, broken image fallback, interactive play test, and computed token `CssCheck`.
- **Component Composition**:
  - Refactored `src/app/account/layout.tsx` to compose canonical `<Avatar size="lg" />` in the customer account profile sidebar snippet.
  - Refactored `src/app/admin/AdminLayoutClient.tsx` to compose canonical `<Avatar size="sm" status="online" />` in the admin top navigation header.
  - Refactored `src/components/Navbar.tsx` to compose canonical `<Avatar size="sm" />` in the customer authenticated pill.

## Why
- Step 2E (Atom Layer) of the 5-tier design system component reconciliation roadmap.
- Replaces fragmented, ad-hoc avatar boxes, raw character slices, and hardcoded dimensions across storefront account views, navigation bars, and administrative layouts.
- Unifies user identity representations under a single, token-bound, accessible primitive matching the canonical Figma specification.

## Files Touched
- `src/components/Avatar.tsx`
- `src/components/Avatar.stories.tsx`
- `src/app/account/layout.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `src/components/Navbar.tsx`

## Follow-ups / Known Issues
- None

## Commit Message
feat(design-system): reconcile Avatar atom component with CVA and compose across layouts
