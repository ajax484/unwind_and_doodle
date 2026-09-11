# 2026-09-05 — Step 1D: Border & Divider Token System in Figma

## What Changed
1. **Border Width Variables in Figma**:
   - Created native Figma Variable Collection `Border Tokens` with 3 numeric `FLOAT` variables:
     - `Border/Width/None` = `0px` (Absence of border, flat/borderless elements)
     - `Border/Width/Thin` = `1px` (Default UI boundary across inputs, cards, list items, and dividers)
     - `Border/Width/Medium` = `2px` (Focus rings, high-emphasis active/selected states)

2. **Border Color Semantic Mappings (Reused Existing Foundation)**:
   - Formally codified and documented 5 semantic border color tokens referencing existing Step 1A Paint Styles without creating duplicate styles or colors:
     - `Border/Default` → `Semantic/Border/Default` (`#EDF3F7`)
     - `Border/Input` → `Semantic/Border/Input` (`#DCE7EE`)
     - `Border/Brand` → `Semantic/Border/Brand` (`#A7C2D4`)
     - `Border/Accent` → `Semantic/Border/Accent` (`#D99BA3`)
     - `Border/Inverse` → `Semantic/Border/Inverse` (`#36495C`)

3. **Structural Divider System**:
   - Codified structural divider standards (1px width, structural separation):
     - `Divider/Default` = `Border/Default` (`#EDF3F7`) + `Border/Width/Thin` (`1px`)
     - `Divider/Inverse` = `Border/Inverse` (`#36495C`) + `Border/Width/Thin` (`1px`)

4. **Composable Focus Rings**:
   - Established focus recipes from foundational tokens without creating redundant `Border/Focus` tokens:
     - Standard Focus: `Border/Width/Medium` (`2px`) + `Border/Brand` (`#A7C2D4`)
     - Accent Focus: `Border/Width/Medium` (`2px`) + `Border/Accent` (`#D99BA3`)

5. **Visual Documentation Board (`Page 1`)**:
   - Built `◻ Border Tokens` documentation frame (`1200px` width) placed at `x: 3900, y: 0`, restoring sequential order across foundation boards (`Color` at 0 → `Typography` at 1300 → `Spatial` at 2600 → `Border` at 3900 → `Iconography` shifted to 5200 → `Motion` shifted to 6500).
   - Documented border swatches, stroke width rules, live light/dark divider list specimens, interactive focus rings, component consumption matrix, and accessibility/contrast guidelines.

## Why
- Completes the foundational border and structural separation rules needed prior to Phase 2 component construction.
- Keeps focus and active states composable while preserving the existing foundation token architecture.

## Files Touched
- `docs/changes/2026-09-05-figma-border-tokens.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. All 3 variables, 5 semantic color mappings, 2 divider specifications, and documentation specimens verified live in Figma.

## Commit Message
```text
feat(design-system): implement Step 1D border and divider token system in Figma

- Create Border Tokens collection with Border/Width/None, Thin, and Medium variables
- Map Border/Default, Input, Brand, Accent, and Inverse to existing semantic paint styles
- Specify Divider/Default and Divider/Inverse with 1px stroke specimens
- Document composable focus rings and component consumption matrix on Page 1
```
