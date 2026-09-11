# 2026-09-05 — Phase 5F Accordion Component System in Figma

## What Changed

Created the complete **Accordion** component set (`id: 49:54939`) and accompanying **Accordions** documentation frame (`id: 49:54955`) in the Unwind & Doodle Figma design system (`pageId: 16:2942`).

### 1. Component Set: `Accordion` (`id: 49:54939`)
- **Location**: `x: 137600, y: 0` (width: 2,360px, height: 860px).
- **Variant Count**: Exactly 24 variants across 4 component properties:
  - `State`: `Collapsed` | `Expanded` | `Disabled` (3 options)
  - `Size`: `MD` | `SM` (2 options)
  - `Icon`: `Leading` | `None` (2 options)
  - `Divider`: `Visible` | `Hidden` (2 options)
- **Default Variant**: `State=Collapsed, Size=MD, Icon=Leading, Divider=Visible` (at index 0 of component set).

### 2. Visual Anatomy & Auto Layout Architecture
- **Interactive Trigger Row**:
  - Full-width horizontal Auto Layout row acting as the primary interactive touch target (minimum 48px height on MD, 44px on SM).
  - Internal padding:
    - **MD**: 16px horizontal (`Spacing/4`), 16px vertical (`Spacing/4`), 12px item spacing.
    - **SM**: 12px horizontal (`Spacing/3`), 12px vertical (`Spacing/3`), 10px item spacing.
  - Structure:
    - **Leading Icon**: Optional 20px (MD) / 16px (SM) semantic glyph (`Size/Icon/SM`) rendered in `Semantic/Action/Primary` (#D99BA3 Rose) or muted gray for disabled state.
    - **Title / Question**: `Typography/Body/Base` (15px Medium) on MD; `Typography/Body/Small` (13px Medium) on SM. Configured with `layoutGrow = 1` for natural line wrapping and left alignment.
    - **Trailing Chevron**: 18px (MD) / 16px (SM) vector directional glyph pointing downward (`chevron-down`) when collapsed, and upward (`chevron-up`) when expanded.
- **Natural-Growing Expandable Content**:
  - Reveals below the trigger when `State=Expanded`.
  - Body text uses `Typography/Body/Small` (13px Regular on MD, 12px Regular on SM) with `Semantic/Text/Secondary` fill.
  - Configured with `layoutGrow = 1`, `layoutAlign = 'STRETCH'`, and content-hugged vertical sizing to ensure zero clipping.
  - Text indentation aligns cleanly with the trigger title rather than creating excessive margin gaps.
- **Subtle Divider Line**:
  - 1px hairline divider frame (`Semantic/Border/Default` / `Color/Neutral/Border-Soft`) when `Divider=Visible`.
  - Omits heavy card borders in favor of a clean, editorial, structured appearance.

### 3. Documentation Frame: `Accordions` (`id: 49:54955`)
- **Location**: `x: 136000, y: 0` (width: 1,200px, height: 3,275px).
- **Aesthetic**: Cream background (`Color/Neutral/Cream` #FFFDF7), 64px padding, 48px section spacing, 1px divider lines.
- **Sections**:
  1. **Hero Header**: Category badge (`PHASE 5F · DISCLOSURE & EXPANDABLE COMPONENT`), display title (40px Fredoka Bold), and editorial design summary.
  2. **01 · Anatomy & Structure**: MD Expanded specimen with 5 circular numbered callout pins (Leading Icon, Interactive Trigger & Title, Trailing Chevron, Subtle Divider Line, Expandable Content Body).
  3. **02 · Interaction States**: Side-by-side vertical comparisons of Collapsed, Expanded, and Disabled states.
  4. **03 · Sizes & Permutations**:
     - MD (Storefront, 16px padding) vs SM (Admin/Sidebar, 12px padding) scaling.
     - Permutations showing `Icon=None` and `Divider=Hidden`.
  5. **04 · Realistic Storefront Scenarios**:
     - 5 authentic production examples:
       1. FAQ: Delivery timeframes
       2. Product Information: Paper stock, weight (200gsm), and archival artist materials
       3. Customization Instructions: Customer photo uploads and formatting
       4. Shipping & Delivery: Regional and international coverage
       5. Order Tracking: Self-serve fulfillment status lookup
  6. **05 · Composition Guidance (Multi-Item Accordion List)**:
     - Realistic multi-item FAQ stack demonstrating how multiple Accordion instances naturally compose inside a parent container with mixed collapsed/expanded states.
  7. **06 · Accessibility & Motion Specifications**:
     - WAI-ARIA disclosure semantics (`aria-expanded`, `aria-controls`, `aria-labelledby`, role="region").
     - Keyboard navigation (Enter / Space activation, full row touch target, 2px focus offset).
     - Motion tokens: `Motion/Duration/Fast` (150ms) + `Motion/Easing/Standard` for chevron rotation and smooth disclosure animation.

---

## Why

1. **Progressive Disclosure**: Customers and administrators need clear, bite-sized access to rich secondary details (shipping, product specs, FAQs, custom instructions) without cognitive overload on long pages.
2. **Editorial & Lightweight Visual Language**: Avoids heavy drop shadows or card containers to maintain Unwind & Doodle's airy, refined aesthetic.
3. **Natural Responsiveness**: Auto Layout allows titles and answers to wrap cleanly without fixed-height clipping.
4. **Zero Token Drift**: Built entirely on existing foundation tokens (`Spacing/*`, `Border/*`, `Typography/*`) and standard iconography.

---

## Files Touched
- Figma Document: `Components` page (`pageId: 16:2942`)
  - Created `Accordion` Component Set (`id: 49:54939`, 24 variants)
  - Created `Accordions` Documentation Frame (`id: 49:54955`)
- [docs/changes/2026-09-05-figma-accordion-component.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-accordion-component.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Follow-ups / Known Issues
- None. Phase 5F is fully validated and self-contained. Stop condition met (do not proceed to Phase 5G).

---

## Commit Message
```text
feat(design-system): create Accordion component set and documentation frame in Figma (Phase 5F)

- Create Accordion component set with 24 variants across State, Size, Icon, and Divider properties
- Implement lightweight editorial architecture with full-row interactive trigger and natural-growing content
- Support Collapsed, Expanded, and Disabled states with directional chevron indicators
- Provide MD (16px padding, Body Base) and SM (12px padding, Body Small) scale variants
- Build 1200px Accordions documentation frame with anatomy breakdown, states, scaling, authentic FAQs, and multi-item stacking
```
