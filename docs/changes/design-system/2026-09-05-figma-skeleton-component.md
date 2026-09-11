# 2026-09-05 — Step 3C: Skeleton Component System in Figma

## What Changed
1. **Master `Skeleton` Component Set on `Components` Page**:
   - Created a single unified Figma Component Set `Skeleton` with **36 production variants** located at `x: 35600, y: 0` (`5126px × 968px`) on the `Components` page.
   - Configured with 3 standardized component properties:
     - `Type`: `Text` | `Image` | `Card` | `Table Row`
     - `Size`: `SM` (compact drawers/metadata) | `MD` (standard body/catalog default) | `LG` (prominent headings/hero media)
     - `Lines`: `One` | `Two` | `Three`
   - Default master variant configured to:
     - `Type=Text, Size=MD, Lines=One`
   - **Visual Slot & Geometry Standards**:
     - Base Surface: Bound to existing token `Color/Blue/Subtle` (`#F4F8FA`), providing a calm, soft, unobtrusive appearance without gradients or jarring contrast.
     - Radii: Bound to native tokens:
       - `Text` Lines: `Radius/Pill` (9999px)
       - `Image` Containers: `Radius/MD` (14px)
       - `Card` Container: `Radius/LG` (18px)
       - `Table Row` Cell Placeholders: `Radius/SM` (8px)
     - Sizing & Line Heights:
       - `Text`: SM (10px height, 4px gap), MD (14px height, 8px gap), LG (20px height, 8px gap). Trailing lines have natural rag widths (100%, 75%, 50%). Zero text characters inside placeholder layers.
       - `Image`: SM (120×120px), MD (240×180px), LG (360×240px).
       - `Card`: Composite structure containing `Media`, `Title`, and `Supporting Content` (1, 2, or 3 lines).
       - `Table Row`: Horizontal Auto Layout with 4 flexible cell placeholders and bottom border separator.
     - Layout Behavior:
       - Strict Auto Layout throughout with `primaryAxisSizingMode = 'AUTO'` (Hug contents vertically).
       - In every variant, only the active `Type` container is visible; inactive types are toggled hidden and consume zero layout space.

2. **`Skeletons` Documentation Board (`Components` Page)**:
   - Built a comprehensive 1200px documentation board (`1200px × 2995px`) at `x: 34000, y: 0` on the `Components` page.
   - Populated with **30 live component instances** of `Skeleton` across 4 structured sections:
     - **Header**: Step pill badge (`STEP 3C · SKELETON LOADING SYSTEM`), title, and descriptive subtitle.
     - **01 / SKELETON TYPES**: 4 cards displaying live instances and token specs for Text, Image, Card, and Table Row primitives.
     - **02 / SCALE & SIZES**: Side-by-side scale comparison cards for `SM` (compact), `MD` (standard default), and `LG` (prominent).
     - **03 / TEXT LINE VARIANTS**: Demonstration of One, Two, and Three lines illustrating organic trailing rags.
     - **04 / REALISTIC USAGE EXAMPLES**: 4 composite loading state patterns:
       - Example 01: Storefront Product Card loading state (catalog grid preview with media, title, and supporting lines).
       - Example 02: Customer Account Order History loading state (thumbnail image + multi-line order description rows).
       - Example 03: Admin Inventory & Orders Data Table (table header with 4 columns + 3 stacked Table Row skeleton instances).
       - Example 04: Customer Profile Loading State (avatar placeholder + multi-line customer info + contact & activity cards).

## Why
- Replaces ad-hoc, hand-coded skeleton implementations identified across **26 codebase files** (frequently using arbitrary `animate-pulse bg-[#F4F8FA] rounded-2xl` classes with inconsistent dimensions).
- Standardizes placeholder geometry against existing typography, radius, and spatial tokens so that layouts experience zero cumulative layout shift (CLS) when real data loads.
- Maintains the brand's calm, soft aesthetic while supporting versatile compositions for storefront customer journeys and administrative tables.

## Files Touched
- `docs/changes/2026-09-05-figma-skeleton-component.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Programmatic validation passed 100% across all 17 criteria in Figma.

## Commit Message
```text
feat(design-system): implement Step 3C Skeleton component set and documentation in Figma

- Create master Skeleton component set with 36 production variants covering Text, Image, Card, and Table Row
- Standardize loading placeholders across 26 files with Color/Blue/Subtle (#F4F8FA) and token-mapped radii
- Support SM, MD, and LG scale tiers and 1-3 line counts with organic typographic rags
- Build 1200px Skeletons documentation board on Components page with 30 live instances
- Demonstrate realistic loading compositions for product cards, order history, admin tables, and user profiles
```
