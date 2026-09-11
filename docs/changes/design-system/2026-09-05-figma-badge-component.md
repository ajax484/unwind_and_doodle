# 2026-09-05 — Step 2C: Badge Component System in Figma

## What Changed
1. **Master `Badge` Component Set on `Components` Page**:
   - Created a single unified Figma Component Set `Badge` (45 variants) positioned at `x: 9600, y: 0` on `Components` page.
   - Configured with 5 clean component properties:
     - `Variant`: `Status` | `Stock` | `Bundle` | `Tag`
     - `Type`: `Success` | `Warning` | `Danger` | `Info` | `In Stock` | `Low Stock` | `Out of Stock` | `Default`
     - `Size`: `SM` (24px height, 8px padding) | `MD` (28px height, 12px padding)
     - `Icon`: `None` | `Leading` (16px `Size/Icon/XS`)
     - `State`: `Default` | `Disabled`
   - Default master variant configured to `Variant=Status, Type=Success, Size=MD, Icon=None, State=Default`.

2. **Audited Badge Use Cases & Foundation Token Consumption**:
   - **Stock Availability**:
     - `In Stock`: `Semantic/Status/Success/Background` + `Text` with checkmark icon.
     - `Low Stock`: `Semantic/Status/Warning/Background` + `Text` with alert icon.
     - `Out of Stock`: `Semantic/Status/Danger/Background` + `Text` with danger icon.
   - **System Status**:
     - `Success`, `Warning`, `Danger`, `Info` mapped to corresponding `Semantic/Status/*` tokens.
   - **Bundle Offers**:
     - Background: `Color/Purple/Base` (`#7E22CE`)
     - Text/Icon: `Color/Neutral/White` (`#FFFFFF`) with package icon.
   - **Neutral Tag**:
     - Background: `Semantic/Background/Subtle` (`#F4F8FA`)
     - Text: `Semantic/Text/Secondary` (`#52657A`)
     - Border: `Semantic/Border/Default` (`#EDF3F7`, 1px `Border/Width/Thin`) with tag icon.
   - **Disabled State**:
     - `Semantic/Background/Subtle` (`#F4F8FA`) with `Semantic/Text/Tertiary` (`#8295A8`) text and icon.
   - **Typography & Geometry**:
     - Applied `Typography/Caption` (`Plus Jakarta Sans`, 500 Medium, 12px / 16.8px).
     - Applied `Radius/Pill` (9999).
     - Gaps bound to `Spacing/1` (4px icon-label optical gap).
     - Paddings bound to `Spacing/2` (8px for SM) and `Spacing/3` (12px for MD).

3. **`Badges` Documentation Board (`Components` Page)**:
   - Created `Badges` documentation frame (`1200px × 1526px`) at `x: 8300, y: 0` on `Components` page.
   - Populated with **30 live component instances** of `Badge`:
     - **Core Variants**: Stock, Status, Bundle, and Tag showcase.
     - **Stock States**: In Stock, Low Stock, and Out of Stock across SM and MD sizes.
     - **Status Spectrum**: Success, Warning, Danger, and Info live badges.
     - **Sizing Scale**: SM (24px) vs MD (28px) side-by-side comparison.
     - **Disabled State & Accessibility**: Muted disabled specimens, hug-contents text expansion, and non-color-dependent status guidelines.

## Why
- Provides a compact, versatile labeling primitive for upcoming Product Cards, Cart Drawers, Order Status Timelines, and Admin tables.
- Eliminates duplicate component sets by unifying all badge use cases under a single, token-bound component architecture.

## Files Touched
- `docs/changes/2026-09-05-figma-badge-component.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. All 45 variants and 30 live documentation instances verified in Figma.

## Commit Message
```text
feat(design-system): implement Step 2C Badge component set and documentation in Figma

- Create unified Badge component set with 45 variants covering Stock, Status, Bundle, Tag
- Bind Semantic Status colors, Color/Purple/Base for bundles, and Typography/Caption
- Support SM (24px) and MD (28px) sizes with optional 16px leading icon
- Build Badges documentation board on Components page with 30 live instances
```
