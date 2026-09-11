# 2026-09-05 — Phase 5E Toast Component System in Figma

## What Changed

Created the complete **Toast** component set (`id: 46:54032`) and accompanying **Toasts** documentation frame (`id: 47:54305`) in the Unwind & Doodle Figma design system (`pageId: 16:2942`).

### 1. Component Set: `Toast` (`id: 46:54032`)
- **Location**: `x: 133600, y: 0` (width: 1,660px, height: 890px).
- **Variant Count**: Exactly 64 variants across 5 component properties:
  - `Variant`: `Success` | `Warning` | `Error` | `Info` (4 options)
  - `Action`: `None` | `Visible` (2 options)
  - `Dismiss`: `Visible` | `Hidden` (2 options)
  - `State`: `Default` | `Loading` (2 options)
  - `Size`: `MD` | `SM` (2 options)
- **Default Variant**: `Variant=Success, Action=None, Dismiss=Visible, State=Default, Size=MD` (at index 0 of component set).

### 2. Visual Anatomy & Auto Layout Architecture
- **Floating Surface Container**:
  - Compact horizontal Auto Layout surface designed as an elevated floating element rather than an inline banner.
  - Padding:
    - `MD`: 16px horizontal (`Spacing/4`), 12px vertical (`Spacing/3`), item spacing 12px.
    - `SM`: 12px horizontal (`Spacing/3`), 8px vertical (`Spacing/2`), item spacing 10px.
  - Border radius: `Radius/LG` (16px).
  - Elevation: `Elevation/Card` drop shadow (`0 8px 16px -4px rgba(0,0,0,0.08)`).
  - Width: Content-hugged responsive layout with an approximate max width of 400px (MD) and 340px (SM).
- **Semantic Colorways**:
  - `Success`: Subtle mint background (`Semantic/Status/Success/Background`), 1px accent border (`Semantic/Status/Success/Accent`), checkmark icon (`M 4 10 L 8 14 L 16 6`), dark forest green headline/body text.
  - `Warning`: Warm amber background (`Semantic/Status/Warning/Background`), 1px accent border (`Semantic/Status/Warning/Accent`), alert triangle icon, amber headline/body text.
  - `Error`: Soft red background (`Semantic/Status/Danger/Background`), 1px accent border (`Semantic/Status/Danger/Accent`), circle cross icon, deep crimson headline/body text.
  - `Info`: Calming sky blue background (`Semantic/Status/Info/Background`), 1px accent border (`Semantic/Status/Info/Accent`), info circular glyph, cobalt blue headline/body text.
- **Content Hierarchy**:
  - Primary headline: `Typography/Heading/3` (15px Fredoka SemiBold on MD, 13px Plus Jakarta Sans Bold on SM).
  - Secondary message: `Typography/Body/Small` (13px Plus Jakarta Sans Regular on MD, 12px Regular on SM).
  - Text columns use `layoutGrow = 1` and `counterAxisSizingMode = "AUTO"` for natural multi-line wrapping without clipping.
- **Component Reuse**:
  - **Action Button**: Reuses existing `Button` (`Ghost / SM`, default text "Undo" / "View cart") when `Action=Visible`.
  - **Dismiss Trigger**: Accessible touch target (24×24px SM, 32×32px MD) with centered 1.5px stroke vector crossbar (`M 4 4 L 12 12 M 12 4 L 4 12`) when `Dismiss=Visible`.
  - **Loading Indicator**: Reuses existing `Spinner` (`Size=SM`) inheriting semantic accent colors when `State=Loading`.

### 3. Documentation Frame: `Toasts` (`id: 47:54305`)
- **Location**: `x: 132000, y: 0` (width: 1,200px, height: 3,117px).
- **Aesthetic**: Cream background (`Color/Neutral/Cream` #FFFDF7), 64px padding, 48px section spacing, 1px divider lines.
- **Sections**:
  1. **Hero Header**: Step badge (`PHASE 5E · TRANSIENT FEEDBACK COMPONENT`), display title (40px Fredoka Bold), and design rationale.
  2. **01 · Anatomy & Architecture**: MD specimen instance with 5 circular numbered callout pins (Status Icon, Toast Title, Toast Message, Action Button, Dismiss Button).
  3. **02 · Semantic Status System**: 2×2 grid showing live instances for `Success`, `Warning`, `Error`, and `Info`.
  4. **03 · States, Scaling & Optional Elements**:
     - `Default` vs `Loading` state comparison.
     - `MD` vs `SM` viewport scale comparison.
     - 4-permutation Optional Elements matrix (`Action=None / Visible` × `Dismiss=Visible / Hidden`).
  5. **04 · Production Scenarios & Stacking**:
     - All 8 required production scenarios:
       1. `Added to cart` (Success, MD, Action "View cart")
       2. `Review submitted` (Success, MD)
       3. `Changes saved` (Success, MD)
       4. `Couldn't save changes` (Error, MD, Action "Retry")
       5. `Upload complete` (Info, MD)
       6. `Saving changes...` (Info, MD, State=Loading)
       7. `Undo` action (Warning, MD, Action "Undo")
       8. `Toast Stack`: Desktop top-right floating stack preview demonstrating vertical stacking (12px margins) with active instances.
  6. **05 · Architectural Guidance (Toast vs AlertBanner)**:
     - Side-by-side decision matrix comparing floating transient feedback (`Toast`) with inline persistent feedback (`AlertBanner`).
     - Includes live elevated `Toast` instance specimen and inline structural `AlertBanner` specimen with usage traits.
  7. **06 · Accessibility & Motion Specifications**:
     - ARIA live region policies (`aria-live="polite"` for Success/Info/Warning, `aria-live="assertive"` for Error).
     - Keyboard navigation, focus retention, and touch target standards.
     - Motion token specifications: `Motion/Duration/Normal` (250ms) + `Motion/Easing/Enter` (enter transition), `Motion/Duration/Fast` (150ms) + `Motion/Easing/Exit` (exit transition), and `prefers-reduced-motion` cross-fade.

---

## Why

1. **Short-Lived, Non-Blocking Feedback**: Storefront interactions (adding to cart, updating quantities, saving preferences, undoing removals) need immediate, reassuring feedback without displacing content or blocking the user's primary journey.
2. **Clear Separation of Concerns**: Explicitly delineates `Toast` (floating, transient, self-dismissing feedback) from `AlertBanner` (persistent, inline, form/page-level alerts).
3. **Strict Design System Token Compliance**: Built entirely on existing tokens (`Radius/LG`, `Elevation/Card`, `Spacing/3` & `Spacing/4`, semantic status colorways) and reused existing components (`Button`, `Spinner`), ensuring zero visual duplication or token drift.
4. **Accessible by Design**: Incorporates ARIA live region policies, minimum accessible hit targets, high contrast ratios, and accessible focus management.

---

## Files Touched
- Figma Document: `Components` page (`pageId: 16:2942`)
  - Created `Toast` Component Set (`id: 46:54032`, 64 variants)
  - Created `Toasts` Documentation Frame (`id: 47:54305`)
- [docs/changes/2026-09-05-figma-toast-component.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-toast-component.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Follow-ups / Known Issues
- None. Phase 5E is completely validated and self-contained. Stop condition met (do not proceed to Phase 5F).

---

## Commit Message
```text
feat(design-system): create Toast component set and documentation frame in Figma (Phase 5E)

- Create Toast component set with 64 variants across Variant, Action, Dismiss, State, and Size properties
- Support Success, Warning, Error, and Info semantic colorways with integrated iconography
- Reuse Button (Ghost SM) for contextual actions and Spinner (SM) for asynchronous loading states
- Enforce floating surface architecture using Radius/LG, Elevation/Card, and compact Auto Layout padding
- Build 1200px Toasts documentation frame detailing anatomy, states, scaling, options matrix, all 8 required examples, Toast vs AlertBanner comparison, and accessibility tokens
```
