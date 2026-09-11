# 2026-09-05 — Figma Components Canvas 3-Row Reorganization

## What Changed

Reorganized all 56 design system component sets and documentation frames on the **Components** page (`pageId: 16:2942`) from a single 140,000px horizontal strip into **3 balanced, thematic rows**:

### 1. Row 1: Atoms, Controls & Core Feedback (`Y = 0`)
- **Horizontal Span**: `x: 0` to `x: 41,904px` (Max Height: 3,571px, Clearance to Row 2: 5,429px).
- **Items (26 total)**:
  1. `Buttons` + `Button`
  2. `Form Controls` + `TextInput` + `Textarea` + `Select` + `Checkbox`
  3. `Badges` + `Badge`
  4. `Product Cards` + `ProductCard`
  5. `Cart Item Rows` + `CartItemRow`
  6. `Ratings & Testimonials` + `RatingStars`
  7. `Skeletons` + `Skeleton`
  8. `Spinners` + `Spinner`
  9. `Tabs` + `Tab Item` + `Tabs`
  10. `Avatars` + `Avatar`
  11. `Pagination` + `Pagination`

### 2. Row 2: Shell, Navigation & Commerce Cards (`Y = 9,000`)
- **Horizontal Span**: `x: 0` to `x: 44,468px` (Max Height: 6,985px, Clearance to Row 3: 3,015px).
- **Items (18 total)**:
  1. `Navigation` + `Navbar`
  2. `Footers` + `Footer`
  3. `Modals` + `Modal`
  4. `Empty States` + `EmptyState`
  5. `Cart Drawers` + `CartDrawer`
  6. `Product Image Galleries` + `ProductImageGallery`
  7. `Theme Selector Cards` + `ThemeSelectorCard`
  8. `Addon Companion Cards` + `AddonCompanionCard`
  9. `Order Summary Cards` + `OrderSummaryCard`

### 3. Row 3: Customization & Interactive Flows (`Y = 19,000`)
- **Horizontal Span**: `x: 0` to `x: 32,010px` (Max Height: 6,346px).
- **Items (12 total)**:
  1. `Customization Uploaders` + `CustomizationUploader`
  2. `Order Status Timelines` + `OrderStatusTimeline`
  3. `Address Cards` + `AddressCard`
  4. `Review Modals` + `ReviewModal`
  5. `Toasts` + `Toast`
  6. `Accordions` + `Accordion`

### 4. Spacing & Organization Standards
- **Component Unit Pairing**: Every documentation frame sits immediately adjacent to its companion component set with a 200px gap.
- **Inter-Family Spacing**: 400px between consecutive component families.
- **Vertical Clearance**: 3,000px–5,400px of clean breathing room between rows, completely preventing any vertical bounding box collision.
- **Scratch Area**: Relocated loose debugging vectors to `x: -2000, y: -2000` to keep the primary canvas pristine.

---

## Why

1. **Canvas Usability & Navigation**: The single-row layout had stretched over 140,000px horizontally, making panning and zooming across components slow and disorienting in Figma.
2. **Logical Categorization**: Grouping by architectural tier (Atoms → Shell & Commerce → Complex Flows) provides immediate visual context for designers and engineers.
3. **Viewport Scale**: The new ~44,000px width fits much more naturally on standard display aspect ratios when zoomed out.

---

## Files Touched
- Figma Document: `Components` page (`pageId: 16:2942`)
  - Reorganized positions for 56 frames and component sets across 3 thematic rows
- [docs/changes/2026-09-05-figma-components-canvas-reorganization.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-components-canvas-reorganization.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Follow-ups / Known Issues
- Future component phases (e.g. Phase 5G) can append cleanly to Row 3 starting at `x = 32,410px, y = 19,000`.

---

## Commit Message
```text
feat(design-system): reorganize Figma components canvas into 3 thematic rows

- Reorganize 56 component sets and documentation frames across 3 structured rows
- Establish Row 1 (Atoms & Controls at Y=0), Row 2 (Shell & Commerce at Y=9000), and Row 3 (Flows at Y=19000)
- Reduce horizontal canvas spread from ~140,000px down to ~44,000px with 3,000px+ vertical clearance
- Standardize 200px intra-family and 400px inter-family horizontal spacing
```
