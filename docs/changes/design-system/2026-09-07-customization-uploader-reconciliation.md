# 2026-09-07 — Step 5A: CustomizationUploader Molecule Component Reconciliation

## What Changed
- **Canonical `CustomizationUploader` Molecule (`src/components/CustomizationUploader.tsx`)**:
  - Reconciled the photo & dedication customization molecule adhering directly to live Figma Step 5A specifications (`CustomizationUploader` component set `43:29976` and documentation board `Customization Uploaders` `43:30904` on `Components` page).
  - Implemented `class-variance-authority` (CVA) variant definitions (`customizationUploaderVariants` and `dropzoneVariants`) and bound styling directly to canonical Tailwind `@theme` design tokens.
  - Aligned container architecture:
    - Replaced legacy pink container (`bg-bg-accent`, `border-brand-rose/25`) with canonical tokens: `bg-bg-surface` (`#FFFFFF`), `border border-border-default` (`#EDF3F7`), and 24px container radius (`rounded-[24px]`).
    - Aligned multi-scale layout padding: `SM` (`18px` pad, `12px` gap), `MD` (`24px` pad, `16px` gap), and `LG` (`28px` pad, `20px` gap).
  - Aligned upload dropzone target:
    - `20px` radius (`rounded-[20px]`), `border-2 border-dashed` with semantic state transitions:
      - *Empty / Uploaded / Disabled*: `bg-bg-subtle` (`#F4F8FA`), `border-border-input` (`#DCE7EE`).
      - *Ready (drag-over)*: `bg-bg-brand` (`#EBF3F8`), `border-border-brand` (`#A7C2D4`), active drag focus ring.
      - *Error*: `bg-status-danger-bg` (`#FDF0F2`), `border-status-danger-accent` (`#EF4444`).
    - Standardized dropzone padding: `SM` (`18px`), `MD` (`24px`), `LG` (`30px`).
    - Composed canonical `Button` (`variant="secondary"`) for upload actions ("Choose images", "Add more", "Try again").
    - Composed canonical `Spinner` (`size="md"`, `color="rose"`) paired with an accessible real-time progress bar (`role="progressbar"`) and upload count fraction copy.
  - Aligned thumbnail preview grid:
    - Staged image previews with 80×80px aspect-square thumbnails, `14px` radius (`rounded-[14px]`), and border `border-border-input` (`#DCE7EE`).
    - Count fraction metadata indicator (e.g. `3 / 5 images`).
    - High-contrast circular remove buttons (`✕`) with accessible labels (`aria-label="Remove image N"`).
  - Structured validation error banner:
    - Added dedicated danger alert banner with `role="alert"`, `⚠️` icon, title "Some images couldn't be uploaded.", and error copy.
  - Preserved backward compatibility:
    - 100% backward compatible with `src/app/products/[slug]/page.tsx` (`<CustomizationUploader onCustomizationChange={setCustomization} />`).
- **Storybook Suite (`src/components/CustomizationUploader.stories.tsx`)**:
  - Implemented standardized 10-story suite covering all Figma lifecycle states and properties:
    1. `Default` (Canonical baseline empty state, MD scale)
    2. `Ready` (Drag-over active drop target state)
    3. `AlternativeMode` (Single image mode, SM compact scale)
    4. `WithOptionalElements` (LG scale with custom notes section)
    5. `Loading` (Operational uploading state with Rose Spinner and progress fill)
    6. `Success` (Uploaded state with 3 thumbnails and count badge)
    7. `ErrorState` (Validation warning banner and retry button)
    8. `Disabled` (Muted dropzone and inputs)
    9. `AuthenticScenario` (Domain-authentic keepsake product customization flow)
    10. `InteractivePlay` (Automated play test verifying notes typing, removal, and callbacks)
    11. `CssCheck` (Computed style verification for surface, border, and 24px radius tokens)
- **Validation**:
  - `npx tsc --noEmit`: Exited with code 0 (zero errors).
  - `npm run test:story -- CustomizationUploader.stories.tsx`: 11/11 tests passed in 2.72s.
  - `npx vitest --project storybook run`: 191/191 tests passed across all 18 component story suites.
  - `npm run build-storybook`: Production static build succeeded in 17.99s.

## Why
- Elevates the ad-hoc customization uploader into a fully reconciled, accessible, token-compliant design-system molecule.
- Guarantees 1:1 visual fidelity with canonical Figma Component Set `43:29976` and Documentation Board `43:30904`.
- Enforces strict Atomic Design reuse by composing canonical `Button` and `Spinner` primitives.
- Preserves full runtime compatibility with storefront product detail pages and backend upload endpoints.

## Files Touched
- `src/components/CustomizationUploader.tsx` (MODIFIED)
- `src/components/CustomizationUploader.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-customization-uploader-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(design-system): reconcile CustomizationUploader molecule with Figma specifications

- Implement CVA variants for CustomizationUploader container and dropzone targets
- Align tokens with bg-bg-surface (#FFFFFF), border-border-default (#EDF3F7), and 24px radius
- Compose canonical Button and Spinner primitives with real-time progress bar
- Implement 80x80 thumbnail grid with count indicator and accessible remove buttons
- Create 10-story Storybook suite covering all 6 lifecycle states, Vitest play assertions, and token checks
```
