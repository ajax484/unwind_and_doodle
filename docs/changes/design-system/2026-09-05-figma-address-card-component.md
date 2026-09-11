# 2026-09-05 — Step 5C AddressCard Component System in Figma

## What Changed

Created the complete **AddressCard** component set (`id: 43:48157`) and accompanying **Address Cards** documentation frame (`id: 43:49054`) in the Unwind & Doodle Figma design system (`pageId: 16:2942`).

### 1. Component Set: `AddressCard` (`id: 43:48157`)
- **Location**: `x: 116600, y: 0` (width: 1,660px, height: 2,802px).
- **Variant Count**: Exactly 128 variants across 6 component properties:
  - `State`: `Default` | `Hover` | `Selected` | `Disabled` (4 options)
  - `Size`: `MD` | `SM` (2 options)
  - `Actions`: `Visible` | `None` (2 options)
  - `Label`: `Visible` | `None` (2 options)
  - `Phone`: `Visible` | `Hidden` (2 options)
  - `DefaultBadge`: `None` | `Visible` (2 options)
- **Default Variant**: `State=Default, Size=MD, Actions=Visible, Label=Visible, Phone=Visible, DefaultBadge=None` (at index 0 of component set).

### 2. Visual Anatomy & Auto Layout Architecture
- **Card Foundation**:
  - Auto Layout horizontal container with top alignment (`counterAxisAlignItems = "MIN"`), hugging contents vertically and stretching horizontally.
  - Corner Radius: 16px bound to `Radius/LG` (`VariableID:13:1592`).
  - MD: 400px specimen width, 16px padding (`Spacing/4`), 14px item spacing.
  - SM: 340px specimen width, 12px padding (`Spacing/3`), 10px item spacing.
  - Default / Selected State: `Semantic/Background/Surface` (#FFFFFF fill).
  - Hover State: `Semantic/Background/Subtle` (#F4F8FA fill) + `Elevation/Card` shadow.
  - Disabled State: `Semantic/Background/Subtle` (#F4F8FA fill) + dimmed tertiary text hierarchy.
  - Border: 1px `Semantic/Border/Default` on Default/Hover/Disabled; 2px `Semantic/Border/Brand` (#A7C2D4) on Selected.
- **Selection Indicator**:
  - Accessible circular radio-style indicator (20×20px on MD, 18×18px on SM) with fixed sizing to prevent squashing.
  - Selected state: 2px `Semantic/Border/Brand` outer ring with an inner Rose action dot (`Semantic/Action/Primary` #D99BA3, 10px MD / 8px SM). Does not rely on color alone.
  - Default state: 1.5px `Semantic/Border/Input` stroke.
  - Disabled state: 1px `Semantic/Border/Default` stroke.
- **Content Metadata Column**:
  - Vertical Auto Layout with `layoutGrow = 1` allowing natural text wrapping without truncation.
  - Header:
    - Optional Label ("Home", "Office", "Art Studio") using `Typography/Caption` and `Semantic/Text/Tertiary`.
    - Recipient Name using `Typography/Heading/3` (16px SemiBold Fredoka on MD, 14px on SM).
    - Optional Default Address Badge: Instance of existing `Badge` (`Variant=Tag, Type=Default, Size=SM`).
  - Address Lines:
    - Street Address & City/Locality using `Typography/Body/Small` and `Semantic/Text/Secondary` (dimmed to Tertiary when Disabled).
  - Contact Phone Number:
    - Optional phone line using `Typography/Caption` and `Semantic/Text/Tertiary`.
- **Contextual Actions**:
  - Top-right horizontal cluster with 4px gap containing instances of existing `Button` (`Variant=Ghost, Size=SM`).
  - `Edit` and `Remove` text buttons.
  - Omitted when `Actions=None`.
  - When `State=Disabled`, uses `Variant=Ghost, State=Disabled, Size=SM` buttons.

### 3. Documentation Frame: `Address Cards` (`id: 43:49054`)
- **Location**: `x: 115000, y: 0` (width: 1,200px, height: 3,519px).
- **Aesthetic**: Cream background (`Color/Neutral/Cream` #FFFDF7), 64px padding, 48px item spacing, 1px divider lines.
- **Sections**:
  1. **Hero Header**: Category badge, display title (40px Fredoka Bold), and post-purchase / checkout usage overview.
  2. **01 · Anatomy & Architecture**: Enlarged MD AddressCard specimen with 7 circular numbered callout pins and breakdown cards.
  3. **02 · Interactive States**: 2×2 grid showing Default, Hover, Selected, and Disabled states.
  4. **03 · Size Comparison**: Side-by-side comparison of MD (16px padding, 20px indicator, 16px heading) and SM (12px padding, 18px indicator, 14px heading).
  5. **04 · Realistic Specimens**: Home (selected default), Office (multi-line corporate address), and Studio (custom recipient and label).
  6. **05 · Configuration Options**: Grid exhibiting property permutations (without phone, without actions, minimal without label).
  7. **06 · Checkout Integration**: Full checkout delivery address step composition with a radio group of AddressCards and an instance of existing `Button` (`Variant=Outline, Size=MD`) for `+ Add a new address`.
  8. **07 · Accessibility & Motion**: WCAG 2.1 AA compliance, Arrow navigation radio group semantics, 4.5:1 text contrast ratios, and design system motion tokens.

---

## Why

1. **Checkout & Customer Hub Need**: Customers need an intuitive, scannable control to select delivery destinations during checkout and manage saved addresses in account settings.
2. **Component Reuse**: Reuses existing `Badge` and `Button` components rather than introducing redundant one-off buttons or badges.
3. **Accessibility Compliance**: Radio-style selection indicator provides visual shape confirmation (inner dot + 2px stroke) so selection never relies on color alone. Actions are placed in the top right to prevent accidental selection triggers.
4. **Responsive Auto Layout**: Fixed sizing on indicator combined with `layoutGrow = 1` on content ensures fluid text wrapping across desktop 2-column grids and mobile 1-column layouts.

---

## Files Touched
- Figma Document: `Untitled` (Page: `Components`, `pageId: 16:2942`)
  - Created `AddressCard` Component Set (`id: 43:48157`, 128 variants)
  - Created `Address Cards` Documentation Frame (`id: 43:49054`)
- [docs/changes/2026-09-05-figma-address-card-component.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-address-card-component.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Follow-ups / Known Issues
- None. Step 5C is fully validated and self-contained.

---

## Commit Message
```text
feat(design-system): create AddressCard component set and documentation frame in Figma (Step 5C)

- Create AddressCard component set with 128 variants across State, Size, Actions, Label, Phone, and DefaultBadge properties
- Enforce fixed 20px/18px circular selection radio with brand border and inner Rose accent dot for non-color-reliant selection
- Implement responsive 3-column Auto Layout with layoutGrow content column for multi-line address text wrapping
- Reuse existing Badge and Button (Ghost SM, Outline MD) components
- Build 1200px Address Cards documentation frame with anatomy callouts, states, sizes, specimens, checkout composition, and a11y specs
```
