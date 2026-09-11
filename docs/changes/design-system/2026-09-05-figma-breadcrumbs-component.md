# 2026-09-05 — Phase 5G: Breadcrumbs Component in Figma

## What Changed

Built and integrated the **`Breadcrumbs`** component system on the **Components** page (`pageId: 16:2942`) in Row 3 (`y: 19,000`), establishing a lightweight, accessible hierarchy indicator for storefront navigation and backoffice administrative workflows.

### 1. Reusable Component Set: `Breadcrumbs`
- **Node ID**: `52:56481`
- **Position**: `x: 35,926, y: 19,000` (Row 3, following `Accordion`)
- **Total Variants**: 24 variants
- **Auto Layout**: Horizontal trail (`primaryAxisSizingMode: "AUTO"`, `itemSpacing: 8px` on MD / `6px` on SM)
- **Properties**:
  - `Size`: `MD` (Storefront default, 14px text / 16px icon), `SM` (Admin/dense, 12px text / 14px icon)
  - `State`: `Default` (navigable secondary text), `Current` (high-contrast leaf), `Disabled` (muted tertiary text)
  - `Home`: `Visible` (leads with home icon `⌂`), `Hidden` (omits leading icon)
  - `Truncation`: `None` (full path), `Middle` (collapses intermediate ancestors to `"…"`)
  - **Default Combination**: `Size=MD, State=Default, Home=Visible, Truncation=None`

### 2. Token & Foundation Compliance
- **Typography**:
  - MD: `Typography/Body/Small` (`Plus Jakarta Sans Regular 14px`, 20px line-height; `SemiBold` for Current Item)
  - SM: `Typography/Caption` (`Plus Jakarta Sans Regular 12px`, 16px line-height; `SemiBold` for Current Item)
- **Semantic Colors**:
  - Navigable links: `Semantic/Text/Secondary` (`#52657A`)
  - Active current page: `Semantic/Text/Primary` (`#243342`)
  - Separator chevrons: `Semantic/Text/Tertiary` (`#8295A8`)
  - Disabled destinations: `Semantic/Text/Disabled` (`#9DAFBF`)
  - Link hover state: `Color/Blue/Deep` / Brand (`#4A7A99` with text underline)
- **Icons**:
  - `Home`: 16×16 (`Size/Icon/SM`) on MD, 14×14 (`Size/Icon/XS`) on SM
  - `Chevron Right`: 14×14 on MD, 12×12 on SM; decorative, non-interactive
- **Spacing**: `Spacing/2` (8px between item and separator on MD; 6px on SM)

### 3. Documentation Frame: `Breadcrumbs`
- **Node ID**: `52:56482`
- **Position**: `x: 34,526, y: 19,000` (1200px width, Auto Layout Vertical, 48px padding)
- Built using the **Modular Master Template Architecture**:
  - **Hero Header**: Live instance of `_Module / Doc Header` (`Badge: "PHASE 5G · NAVIGATION COMPONENT"`, `Title: "Breadcrumbs"`)
  - **Section 01 · Anatomy & Structure**: Callouts for Home Item, Chevron Separators, Links, and Current Page.
  - **Section 02 · Interaction States**: Cards for Default, Hover, Current, and Disabled states.
  - **Section 03 · Sizing Scale**: Side-by-side comparison of MD (Storefront Standard) and SM (Admin & Compact).
  - **Section 04 · Home Display & Middle Truncation**: Permutations demonstrating Home visibility and `"…"` middle truncation.
  - **Section 05 · Real-World Contextual Demos**:
    1. Product Detail Page: `⌂ / Coloring Books / Custom Coloring Book`
    2. Collection View: `⌂ / Collections / Mindful Collection`
    3. Bundle Customizer: `⌂ / Bundles / Mindful Starter Bundle`
    4. Admin Order Fulfillment: `Admin / Orders / Order #1048`
    5. Deep Hierarchy: `⌂ / Collections / … / Custom Coloring Book`
  - **Section 06 · Responsive Desktop & Mobile Comparison**: 640px desktop full trail vs 360px mobile middle-truncated trail.
  - **Section 07 · Design System Foundation Rules**: Live instances of `_Module / Section Header` and `_Module / Rules Container`.

---

## Why

1. **Information Architecture Orientation**: Provides intuitive breadcrumb orientation across multi-level product categories, collections, checkout customization steps, and administrative views.
2. **Context-Preserving Mobile Responsiveness**: Middle truncation collapses intermediate steps to ensure trails fit cleanly on mobile viewports without unsightly line wraps or horizontal scrollbars.
3. **WAI-ARIA Accessibility**: Outlines accessible navigation landmark requirements (`nav aria-label="Breadcrumb"`), non-interactive leaf semantics (`aria-current="page"`), and decorative separator treatment.

---

## Files Touched
- Figma Document: `Components` page (`pageId: 16:2942`)
  - Created component set `Breadcrumbs` (`id: 52:56481`)
  - Created documentation frame `Breadcrumbs` (`id: 52:56482`)
- [docs/changes/2026-09-05-figma-breadcrumbs-component.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-breadcrumbs-component.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Commit Message
```text
feat(design-system): create reusable Breadcrumbs component and documentation in Figma

- Create 24-variant Breadcrumbs component set (id: 52:56481) in Row 3 of Components page
- Support Size (MD, SM), State (Default, Current, Disabled), Home (Visible, Hidden), and Truncation (None, Middle)
- Implement lightweight Auto Layout trails consuming foundation typography and semantic text colors
- Build 1200px Breadcrumbs documentation frame (id: 52:56482) using modular template architecture
- Include anatomy, interaction states, sizing, permutations, 5 real-world flows, and responsive desktop/mobile comparison
```
