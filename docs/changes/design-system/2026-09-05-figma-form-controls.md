# 2026-09-05 — Step 2B: Form Controls Component Family in Figma

## What Changed
1. **Form Controls Component Family Sets on `Components` Page**:
   - Created four production-ready Component Sets:
     - **`TextInput`** (19 variants): Single-line input supporting States (`Default`, `Hover`, `Focus`, `Error`, `Disabled`), Sizes (`SM` [32px], `MD` [40px], `LG` [48px]), Leading & Trailing icon slots, and Helper/Error message container.
     - **`Textarea`** (17 variants): Multi-line input supporting States (`Default`, `Hover`, `Focus`, `Error`, `Disabled`), Sizes (`SM` [80px], `MD` [104px], `LG` [128px]), `Resize` toggle (`Vertical`, `None`), and message slots.
     - **`Select`** (17 variants): Dropdown selection control supporting States (`Default`, `Hover`, `Focus`, `Error`, `Disabled`), Sizes (`SM`, `MD`, `LG`), Leading icon slot, and `Semantic/Text/Secondary` chevron down indicator.
     - **`Checkbox`** (4 variants): Selection control supporting States (`Unchecked`, `Checked`, `Indeterminate`, `Disabled`) with 20px visual box (`Radius/SM` = 8px) and optical label alignment.

2. **Foundation Token Consumption**:
   - **Colors**: Bound to local paint styles:
     - Surface: `Semantic/Background/Surface` (`#FFFFFF`)
     - Disabled Background: `Semantic/Background/Subtle` (`#F4F8FA`)
     - Borders: `Semantic/Border/Input` (`#DCE7EE`), `Semantic/Border/Brand` (`#A7C2D4`), `Semantic/Border/Default` (`#EDF3F7`)
     - Focus Ring: `Border/Brand` (`#A7C2D4`, 2px `Border/Width/Medium`)
     - Error Ring & Messaging: `Semantic/Status/Danger/Accent` (`#EF4444`, 2px) & `Semantic/Status/Danger/Text` (`#B33948`)
     - Text & Placeholder: `Semantic/Text/Primary` (`#243342`), `Semantic/Text/Placeholder` (`#9DB0C2`), `Semantic/Text/Tertiary` (`#8295A8`)
     - Checkbox Active: `Semantic/Action/Primary` (`#D99BA3`) & `Semantic/Text/Inverse` (`#FFFFFF`)
   - **Typography**: Bound to `Typography/Body/Base` (16px) for inputs and `Typography/Body/Small` (14px) for labels, helper messages, and error messages.
   - **Geometry**: Rectangular controls use `Radius/MD` (14px); Checkbox visual uses `Radius/SM` (8px).
   - **Heights**: SM (32px), MD (40px default), LG (48px); minimum touch target respects `Size/Touch/Min` (44px).

3. **`Form Controls` Documentation Board (`Components` Page)**:
   - Created `Form Controls` board (`1200px × 1906px`) at `x: 2600, y: 0` on `Components` page.
   - Populated with **31 live component instances**:
     - **TextInput Matrix**: Complete size × state matrix + icon and message configurations.
     - **Textarea Specimens**: Default, Focus (2px brand ring), and Error states with vertical resize grip.
     - **Select Specimens**: Default, Hover, Focus, Error, and Disabled dropdowns.
     - **Checkbox Family**: Unchecked, Checked, Indeterminate, and Disabled controls.
     - **Shared Principles & Guidelines**: Geometric consistency, focus/error rules, motion timings (120ms/200ms), and 44px tap target requirements.

## Why
- Establishes a synchronized, accessible form control language across storefront customer inputs and merchant backoffice forms.
- Reuses foundation tokens without introducing redundant control-specific styles.

## Files Touched
- `docs/changes/2026-09-05-figma-form-controls.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. All 4 component sets and 31 live documentation instances verified live in Figma.

## Commit Message
```text
feat(design-system): implement Step 2B Form Controls component family in Figma

- Create TextInput, Textarea, Select, and Checkbox component sets on Components page
- Support Default, Hover, Focus, Error, and Disabled states across SM, MD, and LG sizes
- Bind Radius/MD, Border/Input, Border/Brand focus ring, and Danger error states
- Build Form Controls documentation board on Components page with live instances
```
