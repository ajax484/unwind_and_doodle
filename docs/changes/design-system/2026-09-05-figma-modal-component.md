# 2026-09-05 — Step 3A: Modal Component System in Figma

## What Changed
1. **Master `Modal` Component Set on `Components` Page**:
   - Created a single unified Figma Component Set `Modal` (24 production variants) positioned at `x: 23400, y: 0` (`3120px × 2720px`) on the `Components` page.
   - Configured with 4 component properties:
     - `Size`: `SM` (360px target) | `MD` (480px target) | `LG` (640px target)
     - `Footer`: `Actions` | `None`
     - `Close`: `Visible` | `Hidden`
     - `Description`: `Visible` | `Hidden`
   - Default master variant configured to `Size=MD, Footer=Actions, Close=Visible, Description=Visible`.
   - **Backdrop Overlay**: Dedicated absolute `Overlay` layer (`rgba(0, 0, 0, 0.40)`) providing clean visual separation without introducing new tokens.
   - **Dialog Surface**:
     - Background: `Semantic/Background/Surface` (`#FFFFFF`)
     - Border: `Border/Default` (`#EDF3F7`, 1px `Border/Width/Thin`)
     - Radius: `Radius/LG` (18px)
     - Elevation: `Elevation/Card` (`0 8px 16px -4px rgba(0,0,0,0.08)`)
     - Internal Padding: `Spacing/6` (24px)
     - Layout Gap: `Spacing/6` (24px)
   - **Header**:
     - Title: `Typography/Heading/2` (`Fredoka` SemiBold 20px), `Semantic/Text/Primary` (`#243342`), auto-wrap.
     - Optional Description: `Typography/Body/Small` (`Plus Jakarta Sans` 14px), `Semantic/Text/Secondary` (`#52657A`), auto-wrap.
     - Close Action: Reuses real `Button` component instance (`Variant=Ghost, State=Default, Size=MD, Icon=True, Icon Position=Icon Only`).
   - **Flexible Body**:
     - Auto Layout vertical container with unrestricted content height.
     - Sample Body Text: `Typography/Body/Base` (`Plus Jakarta Sans` 16px), `Semantic/Text/Primary`.
   - **Footer Actions**:
     - Secondary Action: Reuses real `Button` instance (`Variant=Outline, State=Default, Size=MD`, label "Cancel").
     - Primary Action: Reuses real `Button` instance (`Variant=Primary, State=Default, Size=MD`, label "Confirm").
     - Disappears completely when `Footer=None` with zero layout gap left behind.

2. **`Modals` Documentation Board (`Components` Page)**:
   - Created a dedicated 1200px documentation frame (`1200px × 3074px`) at `x: 22000, y: 0` on the `Components` page.
   - Populated with **9 live component instances** of `Modal` across 4 structured sections:
     - **Header**: Section label, title, and descriptive subtitle.
     - **01 / Component Anatomy & Structure**: Side-by-side display of live modal instance and a 6-item breakdown table (Overlay, Dialog Surface, Header, Close Action, Flexible Body, Footer Actions).
     - **02 / Modal Scale & Target Sizes**: Showcases SM (360px confirmation), MD (480px default forms/reviews), and LG (640px product picker).
     - **03 / Optional Structure & Toggles**: Permutation matrix demonstrating `Description=Hidden`, `Footer=None`, and minimal configurations.
     - **04 / Realistic Application Examples**:
       - Example 01: Cart item removal confirmation (`Remove this item?` with `Cancel` and `Remove`).
       - Example 02: Customer review submission (`Share your experience` with 5-star rating feedback).
       - Example 03: Bundle multi-product selection (`Add products to your bundle` with item checklist).

## Why
- Standardizes the modal/dialog overlay pattern that was previously duplicated across 22 files in the codebase (`ReviewModal`, `ProductPickerModal`, `MultiProductPickerModal`, `DuplicateBundleModal`, address editing, customization photo viewers, and team management).
- Reuses existing Step 2A `Button` component instances rather than recreating one-off dialog buttons.
- Establishes a generic, un-opinionated modal shell that can house arbitrary form content, product pickers, and alerts.

## Files Touched
- `docs/changes/2026-09-05-figma-modal-component.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Programmatic validation passed 100% across all 16 criteria in Figma.

## Commit Message
```text
feat(design-system): implement Step 3A Modal component set and documentation in Figma

- Create master Modal component set with 24 production variants covering SM, MD, and LG sizes
- Support flexible Footer, Close action, and Description toggles with 0.40 backdrop overlay
- Reuse real Button component primitives for Close, Secondary, and Primary actions
- Build 1200px Modals documentation board on Components page with 9 live instances
- Standardize dialog pattern across storefront reviews, bundle builders, and admin dialogs
```
