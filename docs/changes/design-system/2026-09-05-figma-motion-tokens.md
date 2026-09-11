# 2026-09-05 — Step 1F: Motion & Interaction Token System in Figma

## What Changed
1. **Motion Token Hierarchy in Figma Variables**:
   - Created native Figma Variable Collection `Motion Tokens` containing 13 tokens across three foundational dimensions:
     - **Duration Tokens (5, FLOAT)**:
       - `Motion/Duration/Instant` = `0ms` (Reduced-motion fallback & instant state changes)
       - `Motion/Duration/Fast` = `120ms` (Micro-interactions, hover feedback, icon shifts)
       - `Motion/Duration/Normal` = `200ms` (Default UI transitions, buttons, inputs, cards)
       - `Motion/Duration/Moderate` = `300ms` (Drawers, dropdowns, popovers, positional transitions)
       - `Motion/Duration/Slow` = `450ms` (Deliberate hero transitions, large overlays)
     - **Easing Tokens (4, STRING)**:
       - `Motion/Easing/Standard` = `cubic-bezier(0.2, 0, 0, 1)` (Default curve for general UI transitions)
       - `Motion/Easing/Enter` = `cubic-bezier(0, 0, 0.2, 1)` (Elements appearing/entering the viewport)
       - `Motion/Easing/Exit` = `cubic-bezier(0.4, 0, 1, 1)` (Elements disappearing/leaving the viewport)
       - `Motion/Easing/Emphasized` = `cubic-bezier(0.2, 0, 0, 1)` (High-visibility moments)
     - **Distance Tokens (4, FLOAT)**:
       - `Motion/Distance/XS` = `2px` (Optical nudges, micro hover feedback)
       - `Motion/Distance/SM` = `4px` (Button & icon micro-shifts)
       - `Motion/Distance/MD` = `8px` (Dropdown & card lift movements)
       - `Motion/Distance/LG` = `16px` (Drawer entrance & large surface travel)

2. **Visual Documentation Frame (`Page 1`)**:
   - Created `Motion` documentation frame (`1200px` width) positioned cleanly at `x: 5200, y: 0` alongside preceding foundational boards (`Color`, `Typography`, `Spatial`, `Iconography`).
   - Built six structured documentation sections:
     - **Core Interaction Principles**: Calm, Playful, Thoughtful, Refined motion philosophy.
     - **Duration Scale**: Timeline meters visually demonstrating relative length from 0ms to 450ms.
     - **Easing Curves**: Formatted curve tokens with mathematical cubic-bezier formulas and usage scenarios.
     - **Distance Scale**: Visual travel specimens illustrating calibrated displacement offsets (+2px, +4px, +8px, +16px).
     - **Interaction Guidance**: Practical composition rules for Hover, Press, and Enter/Exit states.
     - **Accessibility (`prefers-reduced-motion`)**: Prominent callout mandating immediate transitions and disabling non-essential motion.

## Why
- Provides an intentional, restrained, and accessible motion system tailored to Unwind & Doodle's warm e-commerce aesthetic.
- Guarantees predictable transitions across UI states without arbitrary timings or inconsistent curves.

## Files Touched
- `docs/changes/2026-09-05-figma-motion-tokens.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. All 13 variables and documentation sections verified in Figma. No component-specific animation tokens created; foundational layers remain intact.

## Commit Message
```text
feat(design-system): implement Step 1F motion and interaction token system in Figma

- Register 5 duration, 4 easing, and 4 distance variables in Figma Motion Tokens collection
- Create 1200px Motion documentation board on Page 1 with timeline meters and curve specs
- Document interaction principles, hover/press/enter/exit guidance, and reduced-motion rules
```
