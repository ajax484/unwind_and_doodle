# Brand Philosophy 2-Column Grid Layout

## What Changed
1. **Asset Addition**:
   - Added [public/images/brand-philosophy.png](file:///c:/Users/USER/work/unwind_and_doodle/public/images/brand-philosophy.png) representing the mindful coloring illustration provided by the user.

2. **2-Column Layout Redesign**:
   - Updated [src/components/home/BrandPhilosophySection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/BrandPhilosophySection.tsx):
     - Converted the section from a centered single-column layout into a responsive 2-column grid (`grid grid-cols-1 md:grid-cols-2`).
     - Displayed the illustration on one side inside a rounded container with a 2px light gray border (`border-2 border-slate-200`).
     - Aligned the brand philosophy text on the other side, slightly offset to the left (`md:-translate-x-4 lg:-translate-x-8`).
     - Retained full responsiveness across mobile viewports.

## Why
- Implemented the user's design update for the homepage Brand Philosophy section to visually showcase mindful coloring and establish a balanced editorial flow.

## Files Touched
- [src/components/home/BrandPhilosophySection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/BrandPhilosophySection.tsx)
- [public/images/brand-philosophy.png](file:///c:/Users/USER/work/unwind_and_doodle/public/images/brand-philosophy.png)
- [docs/changes/2026-09-03-brand-philosophy-2col-layout.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-03-brand-philosophy-2col-layout.md)
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md)

## Suggested Commit Message
```text
feat(home): convert brand philosophy section to 2-column grid layout

- Add mindful coloring illustration with 2px light gray border
- Position copy in adjacent column offset slightly to the left
- Maintain seamless mobile responsive stacking
```
