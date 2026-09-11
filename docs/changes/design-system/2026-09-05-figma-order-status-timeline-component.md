# 2026-09-05 — Step 5B OrderStatusTimeline Component System in Figma

## What Changed

Created and refined the complete **OrderStatusTimeline** component set (`id: 43:42961`) and accompanying **Order Status Timelines** documentation frame (`id: 43:46692`) in the Unwind & Doodle Figma design system (`pageId: 16:2942`).

### 1. Component Set: `OrderStatusTimeline` (`id: 43:42961`)
- **Location**: `x: 107600, y: 0` (width: 6,720px, height: 6,040px).
- **Variant Count**: Exactly 160 variants across 5 component properties:
  - `CurrentStep`: `Created` | `Pending` | `Confirmed` | `Shipped` | `Delivered` (5 options)
  - `State`: `Active` | `Completed` | `Cancelled` | `Refunded` (4 options)
  - `Orientation`: `Horizontal` | `Vertical` (2 options)
  - `Size`: `MD` | `SM` (2 options)
  - `Alerts`: `None` | `Visible` (2 options)
- **Default Variant**: `CurrentStep=Confirmed, State=Active, Orientation=Horizontal, Size=MD, Alerts=None` (positioned at index 0 of component set).

### 2. Visual Anatomy & Auto Layout Architecture
- **Step Indicators**:
  - `Completed`: Circular `Semantic/Action/Primary` (#D99BA3 Rose) with vector checkmark icon (`M 3.5 7.5 L 6.5 10.5 L 12.5 4.5`). Fixed 32x32px (MD) / 26x26px (SM) round dimensions with `Radius/Circle`.
  - `Current`: Circular `Semantic/Action/Primary` with 3px `Semantic/Border/Brand` (#A7C2D4) emphasized ring, inner white dot (10px MD / 8px SM), and bold `Semantic/Text/Primary` label. Identifiable without relying solely on color.
  - `Upcoming`: Circular `Semantic/Background/Subtle` with 1.5px `Semantic/Border/Default` stroke and subtle center dot.
  - `Cancelled`: Circular `Semantic/Status/Danger/Accent` (#B33948) with white vector cancel icon (`M 4 4 L 10 10 M 10 4 L 4 10`).
- **Connecting Progress Lines**:
  - Horizontal: Connecting stroke sitting inside a `Line Box` matching indicator height (`32px` MD / `26px` SM) with `counterAxisAlignItems = "CENTER"`, `primaryAxisSizingMode = "FIXED"` and `layoutGrow = 1`, ensuring connecting lines expand evenly across viewports and maintain perfect center-to-center indicator alignment.
  - Vertical: Continuous vertical line box (`36px` MD / `28px` SM height, `3px` MD / `2px` SM width) centered within the 32px/26px indicator column; omitted on the final Delivered step.
  - Color Tokens: `Semantic/Action/Primary` (Rose) for completed segments, `Semantic/Border/Default` for incomplete segments.
- **Micro-Timestamps**:
  - `Typography/Caption` with `Semantic/Text/Tertiary` positioned directly beneath status labels (e.g. `Sep 2, 10:30 AM`).
- **Integrated Alert Banners**:
  - Replaces arbitrary emojis with native Figma vector icons:
    - `Cancelled`: `Semantic/Status/Danger/Background` fill, `Semantic/Status/Danger/Accent` border, vector warning icon, "Order cancelled — This order is no longer being processed."
    - `Refunded`: `Color/Blue/Light` fill, `Semantic/Border/Brand` border, vector sync/refund arrows icon, "Order refunded — Your refund has been processed."
    - `Completed`: `Semantic/Status/Success/Background` fill, vector checkmark icon, "Order delivered".
    - `Active`: `Color/Blue/Light` fill, vector info icon, "Fulfillment in progress".
- **Card Styling & Elevation**:
  - 24px corner radius, `Semantic/Background/Surface` white fill, 1px `Semantic/Border/Default` stroke, and subtle drop shadow (`0px 4px 16px rgba(0,0,0,0.04)`).

### 3. Documentation Frame: `Order Status Timelines` (`id: 43:46692`)
- **Location**: `x: 106000, y: 0` (width: 1,200px, height: 6,121px).
- **Layout**: Auto Layout, vertical flow, 64px padding, 40px spacing, cream background, 1px divider lines.
- **Sections**:
  1. **Hero Header**: Step badge, display heading, and fulfillment tracking system overview.
  2. **01 · Anatomy & Structure**: Enlarged MD horizontal timeline with callout breakdown for Step Indicators, Progress Lines, Specimen Labels, Micro-Timestamps, and Alert Banners.
  3. **02 · Fulfillment Progression**: Live instances depicting stages 1 through 5 (Created, Pending, Confirmed, Shipped, Delivered).
  4. **03 · Responsive Orientations**: Desktop Horizontal ribbon vs Mobile Vertical stepper with responsive adaptation notes.
  5. **04 · Exception Management**: Standalone cards demonstrating Cancelled (halted progress + vector error alert) and Refunded (preserved context + vector info alert) states without artificial 6th steps.
  6. **05 · Sizes and Dates**: Comparison of Medium (MD, 32px indicators, 3px line) and Small (SM, 26px indicators, 2px line) with timestamps.
  7. **06 · Compliance & Governance**: WCAG 2.1 AA accessibility guidelines, ARIA region patterns, and motion duration/easing tokens.

---

## Why

1. **Auto Layout Sizing Fix**: The previous variant generation had Auto Layout primary axis sizing set to `AUTO` on indicator frames and timelines, causing indicators to squash into 6px tall pills and step columns to collapse into a narrow 84px left cluster. Setting `primaryAxisSizingMode = "FIXED"` and `counterAxisSizingMode = "FIXED"` on indicators and `layoutGrow = 1` on line boxes ensures true 32x32px circular indicators and evenly spaced 5-step horizontal distribution.
2. **Vertical Stepper Alignment**: Fixed `Content Column` collapsing by applying explicit `layoutAlign = "STRETCH"` and `layoutGrow = 1` across step rows.
3. **Professional Iconography**: Replaced text/emoji characters with clean, resolution-independent vector shapes for alerts and indicators.
4. **Design System Consistency**: Aligned documentation frame aesthetic with preceding components (cream background, section dividers, numbered callouts, and clean typographic scale).

---

## Files Touched
- Figma Document: `Untitled` (Page: `Components`, `pageId: 16:2942`)
  - Rebuilt `OrderStatusTimeline` Component Set (`id: 43:42961`, 160 variants)
  - Rebuilt `Order Status Timelines` Documentation Frame (`id: 43:46692`)
- [docs/changes/2026-09-05-figma-order-status-timeline-component.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-order-status-timeline-component.md) [MODIFY]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Follow-ups / Known Issues
- None. Step 5B is fully validated, polished, and self-contained.

---

## Commit Message
```text
fix(design-system): resolve Auto Layout sizing and polish OrderStatusTimeline component in Figma (Step 5B)

- Fix indicator squashing by enforcing FIXED primary/counter axis sizing on circle frames (32x32 MD, 26x26 SM)
- Fix horizontal timeline distribution using layoutGrow progress line boxes stretching across full card width (700px MD, 560px SM)
- Fix vertical stepper column collapse by applying layoutAlign STRETCH and layoutGrow 1 on content columns
- Replace text emoji alert icons with clean resolution-independent vector graphics
- Rebuild 1200px Order Status Timelines documentation frame with section dividers and balanced spacing
```
