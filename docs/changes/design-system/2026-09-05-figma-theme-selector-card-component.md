# 2026-09-05 Step 4F ThemeSelectorCard Component System in Figma

## What Changed
Created the unified, production-ready `ThemeSelectorCard` storefront customization component set in Figma along with its comprehensive `Theme Selector Cards` documentation board.

### 1. `ThemeSelectorCard` Component Set (`id: 41:24918`, `x: 83600, y: 0`)
- **16 Variants** covering a complete 3-dimensional property matrix:
  - `State`: `Default` (Default) | `Hover` | `Selected` | `Disabled`
  - `Size`: `MD` (Default) | `SM`
  - `Description`: `Visible` (Default) | `Hidden`
- **Default Variant**: `State=Default, Size=MD, Description=Visible`
- **Architecture**:
  - `ThemeSelectorCard` Root: Vertical Auto Layout with `primaryAxisSizingMode = 'AUTO'`, `counterAxisSizingMode = 'FIXED'` (`260px` on MD, `200px` on SM), padding `Spacing/4` (16px) on MD, `Spacing/3` (12px) on SM, corner radius `Radius/LG` (20px, `VariableID:13:1592`).
  - `Preview`: Square 1:1 aspect ratio viewport (`226×226px` on MD, `174×174px` on SM), Auto Layout centered with `Radius/MD` (14px, `VariableID:13:1591`), subtle background `Semantic/Background/Subtle` (`#F4F8FA`), clipping content, containing theme artwork/motif. Dimmed to 50% opacity in `Disabled` state.
  - `Content`: Vertical Auto Layout frame (`itemSpacing = 8` bound to `Spacing/2`) containing:
    - `Theme Name`: `Typography/Heading/3` (16px Fredoka SemiBold) in `Semantic/Text/Primary` (`#243342`), dimmed to `Semantic/Text/Tertiary` (`#8295A8`) when disabled.
    - `Optional Description`: `Typography/Body/Small` (14px Plus Jakarta Sans Regular) in `Semantic/Text/Secondary` (`#52657A`), multi-line natural wrapping, toggled via `Description` property.
  - `Selection Indicator`: Absolute-positioned top-right circular badge (`layoutPositioning = 'ABSOLUTE'`, pinned `constraints: MAX, MIN`, `24×24px` on MD, `20×20px` on SM):
    - Unselected (`Default` / `Hover`): Surface fill (`#FFFFFF`), `Border/Default` (`#EDF3F7`, 1px).
    - `Hover`: Card background shifts to `Semantic/Background/Subtle` with `Elevation/Card` shadow.
    - `Selected`: Card border receives `Border/Brand` (2px), circular indicator receives `Semantic/Action/Primary` (`#D99BA3`) with crisp white checkmark vector (`Semantic/Text/Inverse`).
    - `Disabled`: Inactive subtle fill and border, no check icon.

### 2. `Theme Selector Cards` Documentation Board (`id: 41:24919`, `x: 82000, y: 0`)
- Standardized `1200px` wide Auto Layout documentation board (`1200 × 2964px`) containing:
  - **Header & Meta**: Title, description, Step 4F badge, storefront customization badge, and interactive property matrix pills.
  - **Section 1 — Anatomy & Architecture**: Deconstructed view detailing 1:1 Preview, Theme Name, Optional Description, and Selection Indicator.
  - **Section 2 — Interaction States**: Side-by-side comparison of Default, Hover (`Elevation/Card`), Selected (`Border/Brand 2px`), and Disabled states.
  - **Section 3 — Sizing Options**: Full comparison between MD (260px standard) and SM (200px compact drawer/panel).
  - **Section 4 — Content Variations & Theme Catalog**: Specimens for Botanical, Floral, Mindful (Description: Hidden), and Abstract with customized palette styling.
  - **Section 5 — Storefront Customization Step**: Live customization step container ("Choose a theme", counter pill "1 / 3 themes selected", responsive 3-card grid).

## Why
Standardizes the visual theme selection card audited in product customization flows (`src/app/products/[slug]/page.tsx`), providing an accessible, responsive, token-bound selection asset that functions across standalone products and bundle customization without requiring one-off card variations.

## Files Touched
- `Figma: Untitled > Components page`:
  - Created `ThemeSelectorCard` Component Set (`41:24918`)
  - Created `Theme Selector Cards` Documentation Board (`41:24919`)
- `docs/changes/2026-09-05-figma-theme-selector-card-component.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
- None. Automated validation confirmed 1 component set, exactly 16 variants, 14 real component instances in documentation, 0 detached frames, and 0 Playfair Display usage (strictly Fredoka and Plus Jakarta Sans). Ready for Step 4G/5 milestones.

## Commit Message
```text
feat(design-system): build ThemeSelectorCard component set and documentation in Figma

- Create reusable ThemeSelectorCard component set (16 variants) with State, Size, and Description properties
- Implement square 1:1 aspect ratio preview with Radius/MD (14px) and scalable theme artwork
- Build circular selection indicator with Semantic/Action/Primary checkmark for active state
- Provide MD (260px) and SM (200px) responsive sizes with Radius/LG (20px) card foundation
- Construct 1200px Theme Selector Cards documentation board with 5 structured sections and 14 real instances
- Ensure 100% typography compliance with Fredoka and Plus Jakarta Sans
```
