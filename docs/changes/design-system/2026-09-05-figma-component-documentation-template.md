# 2026-09-05 — Master Component Documentation Template in Figma

## What Changed

Created the official **`_Template / Component Documentation`** master **`COMPONENT`** (`id: 51:55457`) on the **Components** page (`pageId: 16:2942`) in Figma, modeled directly after the canonical **`Buttons`** documentation frame.

Because it is a master Figma `COMPONENT`, modifying the template's background, padding, headers, dividers, or design system rules automatically cascades and updates all component documentation instances across the entire design system.

### 1. Master Component Overview
- **Node Name**: `_Template / Component Documentation`
- **Node Type**: `COMPONENT` (Master Component)
- **Location**: `x: 0, y: -3000` (sits prominently above Row 1, aligned directly above `Buttons` at x: 0, y: 0).
- **Companion Slots Frame**: `_Template Slots` (Frame at `x: 1300, y: -3000` containing default placeholder components).
- **Dimensions**: `1200px` width × `1,576px` height (Auto Layout Vertical, content-hugged).
- **Visual Style**:
  - Padding: `48px` (horizontal & vertical).
  - Spacing: `40px` item spacing between sections.
  - Corner Radius: `16px`.
  - Fill: White surface (`Semantic/Background/Surface`).
  - Border: 1px subtle stroke (`Semantic/Border/Default`).

### 2. Native Component Properties
The Master Component exposes 7 native Figma component properties for instant customization from the right-hand sidebar or via API:
- `Badge` (`TEXT`): Default `"COMPONENT TEMPLATE"`
- `Title` (`TEXT`): Default `"[Component Name]"`
- `Description` (`TEXT`): Default component overview summary
- `Matrix Slot` (`INSTANCE_SWAP`): Swappable slot for primary specimen & cross-variant grid
- `Size Slot` (`INSTANCE_SWAP`): Swappable slot for SM, MD, LG sizing scales
- `Configurations Slot` (`INSTANCE_SWAP`): Swappable slot for permutations & iconography
- `Composite Patterns Slot` (`INSTANCE_SWAP`): Swappable slot for real-world storefront demos

### 2. Standardized Section Hierarchy (5 Canonical Sections)
The template reproduces the exact 5-section architecture established in `Buttons`:

1. **Header Frame**:
   - `Category Badge`: Rounded pill tag (`11px Fredoka SemiBold`, subtle background, action primary text).
   - `Component Title`: `36px Fredoka Bold` (`Semantic/Text/Primary`).
   - `Component Description`: `16px Plus Jakarta Sans Regular` (`Semantic/Text/Secondary`).
   - Full-width `1104px` hairline divider line (`Semantic/Border/Default`).

2. **01 / Variant & State Matrix**:
   - Section Header: Title (20px Fredoka SemiBold) + Description.
   - `Slot 01: Matrix Table`: Pre-configured 1104px auto-layout container with dashed placeholder guide for primary component specimen and cross-variant grid.
   - Full-width divider line.

3. **02 / Sizing Scale**:
   - Section Header: Title + Description.
   - `Slot 02: Size Container`: 3 discrete sizing cards for **Small (SM)**, **Medium (MD)**, and **Large (LG)** with instance injection slots.
   - Full-width divider line.

4. **03 / Configurations & Anatomy**:
   - Section Header: Title + Description.
   - `Slot 03: Configurations Container`: 4 permutation cards (**Standard**, **Icon / Media Leading**, **Action / Badge Trailing**, **Minimal / Compact**) with instance slots.
   - Full-width divider line.

5. **04 / Composite Patterns & Real-World Demos**:
   - Section Header: Title + Description.
   - `Slot 04: Composite Patterns Container`: Pre-configured container for realistic contextual patterns (cards, drawers, forms, stacks).
   - Full-width divider line.

6. **05 / Design System Rules & Accessibility**:
   - Section Header: Title + Description.
   - `Slot 05: Rules Container`: 3 standardized guideline cards matching the `Buttons` specification:
     - **Action Hierarchy**: Primary → Secondary → Outline → Ghost guidance.
     - **Motion & Feedback**: Standardized duration/easing token rules (`Motion/Duration/Fast`).
     - **Accessibility & Targets**: 44px touch targets, focus rings, keyboard operability, and ARIA requirements.

---

## How to Use the Template

Because `_Template / Component Documentation` is a Figma **`COMPONENT`**, child documentation frames are created as **instances** via `createInstance()`. Any edit made to the master component (styling, spacing, section dividers, Section 05 rules cards) cascades automatically to all documentation frames across the canvas.

```javascript
// 1. Locate the master template component
const template = figma.currentPage.findOne(n => n.name === '_Template / Component Documentation' && n.type === 'COMPONENT');

// 2. Spawn an instance for the new component documentation
const docInstance = template.createInstance();
docInstance.name = "MyComponent Documentation";
docInstance.x = targetX;
docInstance.y = targetY;

// 3. Set text properties directly via component properties (or layer selection)
docInstance.setProperties({
  'Badge#51:4': 'PHASE 5G · COMPONENT',
  'Title#51:5': 'MyComponent',
  'Description#51:6': 'High-fidelity component description consuming Unwind & Doodle tokens.'
});

// 4. Swap slots with component-specific content components
// (Slots are connected to native INSTANCE_SWAP properties)
docInstance.setProperties({
  'Matrix Slot#51:7': myMatrixComponent.id,
  'Size Slot#51:8': mySizeComponent.id,
  'Configurations Slot#51:9': myConfigComponent.id,
  'Composite Patterns Slot#51:10': myDemosComponent.id
});
```

---

## Files Touched
- Figma Document: `Components` page (`pageId: 16:2942`)
  - Created master component `_Template / Component Documentation` (`id: 51:55457`)
  - Created companion slot container `_Template Slots` (`id: 51:55420`) with 4 swappable default slot components (`_Slot/MatrixTable`, `_Slot/SizeContainer`, `_Slot/Configurations`, `_Slot/CompositePatterns`)
- [docs/changes/2026-09-05-figma-component-documentation-template.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-component-documentation-template.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Commit Message
```text
feat(design-system): convert component documentation template to master component in Figma

- Create native master COMPONENT `_Template / Component Documentation` (id: 51:55457) at (x: 0, y: -3000)
- Expose native TEXT properties for Badge, Title, and Description
- Expose native INSTANCE_SWAP properties for Matrix, Sizing, Configurations, and Contextual Demos slots
- Embed companion placeholder components in `_Template Slots` (id: 51:55420)
- Enable centralized updates to typography, dividers, spacing, and design rules across all instances
```

