# 2026-09-05 — Global Component Documentation Modular Template Upgrade

## What Changed

Upgraded all **26 component documentation frames** across Rows 1, 2, and 3 on the **Components** page (`pageId: 16:2942`) to use the newly established **Modular Master Component Template System** (`_Template / Modular System`).

Instead of rigid monolithic instances that cannot accommodate components with variable section counts (3 to 7 sections), the system decomposes the template into 4 reusable master components that are embedded into every documentation frame:

### 1. Master Modular Components (`_Template / Modular System` at `x: 2600, y: -3000`)
1. **`_Module / Doc Header`** (`id: 51:55609`):
   - Exposes 3 native Figma text component properties: `Badge`, `Title`, `Description`.
   - Controls top-level hero banner typography (`Fredoka Bold`, `Plus Jakarta Sans`), category pill styling, and responsive layout.
2. **`_Module / Divider`** (`id: 51:55611`):
   - Full-width auto-layout hairline divider (1104px STRETCH, 1px height, `Semantic/Border/Default`).
3. **`_Module / Section Header`** (`id: 51:55615`):
   - Exposes 2 native Figma text component properties: `Title`, `Description`.
   - Standardizes section numbering and typography across all documentation tiers.
4. **`_Module / Rules Container`** (`id: 51:55629`):
   - Contains the 3 universal Unwind & Doodle Design System guideline cards:
     - **Action Hierarchy**: Primary → Secondary → Outline → Ghost guidance.
     - **Motion & Feedback**: Standardized duration and easing token rules (`Motion/Duration/Fast`).
     - **Accessibility & Targets**: 44px minimum touch targets, focus rings, keyboard operability, and ARIA requirements.

---

### 2. Execution Batches (26 Frames Across 3 Rows)

#### Batch 1: Row 1 — Atoms, Controls & Feedback (`y = 0`)
Upgraded 11 frames:
- `Buttons` (`x: 0`)
- `Form Controls` (`x: 2,940`)
- `Badges` (`x: 9,276`)
- `Product Cards` (`x: 11,890`)
- `Cart Item Rows` (`x: 15,074`)
- `Ratings & Testimonials` (`x: 19,034`)
- `Skeletons` (`x: 22,218`)
- `Spinners` (`x: 29,144`)
- `Tabs` (`x: 31,284`)
- `Avatars` (`x: 35,440`)
- `Pagination` (`x: 38,088`)

#### Batch 2: Row 2 — Shell, Navigation & Commerce Cards (`y = 9,000`)
Upgraded 9 frames:
- `Navigation` (`x: 0`)
- `Footers` (`x: 6,780`)
- `Modals` (`x: 13,560`)
- `Empty States` (`x: 18,480`)
- `Cart Drawers` (`x: 25,160`)
- `Product Image Galleries` (`x: 29,392`)
- `Theme Selector Cards` (`x: 33,292`)
- `Addon Companion Cards` (`x: 36,252`)
- `Order Summary Cards` (`x: 39,644`)

#### Batch 3: Row 3 — Customization & Interactive Flows (`y = 19,000`)
Upgraded 6 frames:
- `Customization Uploaders` (`x: 0`)
- `Order Status Timelines` (`x: 7,930`)
- `Address Cards` (`x: 16,450`)
- `Review Modals` (`x: 19,910`)
- `Toasts` (`x: 24,790`)
- `Accordions` (`x: 30,273`)

---

### 3. Standardization Applied to Every Frame
- **Container Dimensions**: Exactly `1200px` width, Auto Layout Vertical (content-hugged height).
- **Padding & Spacing**: `48px` horizontal & vertical padding, `40px` item spacing between sections.
- **Surface Styling**: Corner radius `16px`, solid white surface (`#FFFFFF`), subtle border stroke (`#E0E2EA`, 1px).
- **Linked Header**: Every frame uses a live instance of `_Module / Doc Header` populated with its specific badge, title, and description.
- **Linked Dividers**: Every frame utilizes live instances of `_Module / Divider`.
- **Linked Foundation Rules**: Every frame concludes with an instance of `_Module / Rules Container`. Any global update to action hierarchy, motion durations, or accessibility cards in the master module automatically cascades across all 26 frames.

---

## Why

1. **Centralized Template Maintenance**: Modifying typography, divider colors, frame padding, or design system foundation rules in `_Template / Modular System` instantly propagates to every component documentation frame across the canvas.
2. **Preservation of Bespoke Multi-Section Content**: Avoids the limitations of rigid monolithic instance slots, allowing complex components with 6 to 7 sections (Uploaders, Timelines, Review Modals, Accordions, Toasts) to retain all their rich matrices, state demos, and interactive flow cards without truncation or detachment.
3. **100% Visual Consistency**: Guarantees identical 1200px framing, 48px padding, typography scales, and token borders across all 26 components in the design system.

---

## Files Touched
- Figma Document: `Components` page (`pageId: 16:2942`)
  - Created container `_Template / Modular System` (`id: 51:55603`) with 4 master components (`_Module / Doc Header`, `_Module / Divider`, `_Module / Section Header`, `_Module / Rules Container`)
  - Upgraded all 26 documentation frames across Rows 1, 2, and 3
- [docs/changes/2026-09-05-figma-all-components-documentation-modular-upgrade.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-all-components-documentation-modular-upgrade.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Commit Message
```text
feat(design-system): upgrade all 26 component documentation frames to modular template in Figma

- Create master modular components (_Module/Doc Header, Divider, Section Header, Rules Container) in Figma
- Upgrade all 11 documentation frames in Row 1 (Buttons, Form Controls, Badges, Product Cards, etc.)
- Upgrade all 9 documentation frames in Row 2 (Navigation, Footers, Modals, Cart Drawers, etc.)
- Upgrade all 6 documentation frames in Row 3 (Customization Uploaders, Timelines, Address Cards, Toasts, Accordions)
- Standardize all frames to 1200px width, 48px padding, 40px spacing, and 16px radius
- Connect all frames to universal Design System Rules and header modules for global cascading edits
```
