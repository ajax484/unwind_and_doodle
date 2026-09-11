# 2026-09-05 — Step 2A: Button Component System in Figma

## What Changed
1. **Master Button Component Set (`Button`)**:
   - Created native Figma Component Set `Button` (72 variants) on dedicated `Components` page at `x: 1300, y: 0`.
   - Renamed foundational page to `Tokens` containing all 6 foundation boards.
   - Structured with 5 standard component properties:
     - `Variant`: `Primary` | `Secondary` | `Outline` | `Ghost` | `Stepper`
     - `State`: `Default` | `Hover` | `Pressed` | `Disabled`
     - `Size`: `SM` (32px) | `MD` (40px) | `LG` (48px)
     - `Icon`: `False` | `True`
     - `Icon Position`: `None` | `Leading` | `Trailing` | `Icon Only`
   - Default variant configured to `Variant=Primary, State=Default, Size=MD, Icon=False, Icon Position=None`.

2. **Foundation Token Consumption**:
   - **Colors**: Bound directly to local paint styles:
     - Primary: `Semantic/Action/Primary` (`#D99BA3`) & `Semantic/Action/Primary-Hover` (`#C67D87`)
     - Secondary: `Semantic/Action/Secondary-Background` (`#EBF3F8`), `Semantic/Action/Secondary-Text` (`#4A7A99`), `Semantic/Action/Secondary` (`#A7C2D4`)
     - Outline & Ghost: `Semantic/Text/Primary` (`#243342`), `Semantic/Background/Subtle` (`#F4F8FA`), `Semantic/Border/Default` (`#EDF3F7`)
     - Stepper: `Semantic/Background/Surface` (`#FFFFFF`), `Semantic/Border/Default` (`#EDF3F7`)
     - Disabled: `Semantic/Background/Subtle` (`#F4F8FA`), `Semantic/Text/Tertiary` (`#8295A8`)
   - **Typography**: Applied `Typography/Button` (`Fredoka`, 600 SemiBold, 15px) to all text labels.
   - **Spatial & Elevation**:
     - Radii: Bound to native variable `Radius/Pill` (9999) for text buttons and `Radius/Circle` (9999) for Stepper buttons.
     - Horizontal Padding: Bound to `Spacing/3` (12px for SM), `Spacing/4` (16px for MD), and `Spacing/5` (20px for LG).
     - Gaps: Bound to `Spacing/2` (8px icon-label optical gap).
     - Elevation: Applied local effect styles `Elevation/Action/Rose` (Primary) and `Elevation/Action/Blue` (Secondary); removed for Pressed/Disabled/Outline/Ghost/Stepper.
   - **Auto Layout**: Content-driven width (`primaryAxisSizingMode: AUTO`) with centered content.

3. **Buttons Documentation Board (`Page 1`)**:
   - Created `Buttons` documentation board (`1200px × 1816px`) at `x: 7800, y: 0`.
   - Populated with **32 live component instances** of `Button`:
     - **Variant × State Matrix**: 5 variants across 4 states in MD size.
     - **Sizing Scale**: SM, MD, LG specimens showing proportional height and padding.
     - **Icon Configurations**: Text only, Leading icon, Trailing icon, and Icon-only layouts.
     - **Stepper Quantity Control Group**: Live cart quantity selector cluster (+ / −).
     - **Hierarchy & Consumption Guidelines**: Action hierarchy rules, motion timings (120ms Fast hover / 200ms Normal state changes), and 44px minimum touch target compliance.

## Why
- Implements the primary interactive component for the Unwind & Doodle design system.
- Demonstrates scalable token consumption across color, typography, spacing, border, radius, elevation, and motion without creating duplicate or component-specific tokens.

## Files Touched
- `docs/changes/2026-09-05-figma-button-component.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. All 72 variants and 32 live documentation instances verified in Figma. Foundational layers remain untouched.

## Commit Message
```text
feat(design-system): implement Step 2A Button component set and documentation in Figma

- Create Button component set with 72 variants covering 5 variants, 4 states, and 3 sizes
- Bind foundation tokens: Semantic Action colors, Fredoka typography, and Action elevation
- Support Leading, Trailing, and Icon-only configurations with Auto Layout
- Create Buttons documentation board on Page 1 with live instance matrix and guidelines
```
