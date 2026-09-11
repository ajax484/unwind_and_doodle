# 2026-09-05 Step 4G AddonCompanionCard Component System in Figma

## What Changed
Created the production **AddonCompanionCard** component set (`id: 41:25498`) and its comprehensive documentation frame **Addon Companion Cards** (`id: 41:26969`) in the Unwind & Doodle Figma design system on the `Components` page (`id: 16:2942`).

### 1. Component Architecture (`AddonCompanionCard`)
- **Single Component Set**: `AddonCompanionCard` containing all 32 variants across 4 variant axes:
  - `State`: `Default` | `Hover` | `Selected` | `Disabled`
  - `Size`: `MD` (380px width, Spacing/4 16px padding, 72×72px image, 24×24px indicator) | `SM` (320px width, Spacing/3 12px padding, 56×56px image, 20×20px indicator)
  - `Description`: `Visible` | `Hidden`
  - `Image`: `Visible` | `Hidden`
- **Default Variant**: `State=Default, Size=MD, Description=Visible, Image=Visible`
- **Layout Structure**: Horizontal Auto Layout (`layoutMode = 'HORIZONTAL'`, `counterAxisAlignItems = 'CENTER'`, `itemSpacing = 12` bound to `Spacing/3`):
  ```text
  AddonCompanionCard (Auto Layout: HORIZONTAL, Hug Height)
  ├── Image (Square 72×72 MD / 56×56 SM, Radius/MD, subtle fill #F4F8FA, clipsContent)
  │   ├── Motif / Gift (Pastel blue box, lid, rose ribbon, bow)
  │   ├── Motif / Card (Warm parchment folded card, note lines, rose heart seal)
  │   ├── Motif / Stickers (Sunshine gold star, rose sparkle, teal dot)
  │   └── Motif / Prints (Layered photo prints with landscape motif)
  ├── Content (Auto Layout: VERTICAL, layoutGrow: 1, itemSpacing: 4 MD / 2 SM)
  │   ├── Add-on Name (Typography/Heading/3, Fredoka SemiBold 16px, Semantic/Text/Primary)
  │   ├── Description (Typography/Body/Small, Plus Jakarta Sans Regular 14px, Semantic/Text/Secondary, multi-line wrap)
  │   └── Price (Typography/Body/Small, Plus Jakarta Sans SemiBold 14px, Semantic/Text/Primary, "+₦" syntax)
  └── Selection Indicator (Square checkbox 24×24 MD / 20×20 SM, cornerRadius 6/5)
      └── Check Icon (Vector path, stroke Semantic/Text/Inverse, round caps/joins)
  ```

### 2. State & Token Specifications
- **Default**: Surface fill (`#FFFFFF`), `Border/Default` (`#EDF3F7`, 1px), no elevation, primary text, secondary description, unselected indicator (surface bg, 1px default border, check hidden).
- **Hover**: `Semantic/Background/Subtle` (`#F4F8FA`), `Border/Default` (1px), `Elevation/Card` shadow, unselected indicator.
- **Selected**: Surface fill (`#FFFFFF`), `Border/Brand` (`#8230d5552ebc7fa8a2fdc89ebdfc20d065a343a0,`, 2px `Border/Width/Medium`), `Semantic/Action/Primary` (`#D99BA3`) checkbox fill with `Semantic/Text/Inverse` (`#FFFFFF`) checkmark vector. Selection is immediately obvious through both card border and indicator!
- **Disabled**: `Semantic/Background/Subtle` (`#F4F8FA`), `Border/Default` (1px), `Semantic/Text/Tertiary` (`#8295A8`) text, dimmed image preview (0.45 opacity), inactive indicator.
- **Adaptive Sizing & Collapse**:
  - `Image=Hidden`: Image node hides and Content smoothly grows across full card width without empty space.
  - `Description=Hidden`: Description hides and the card hugs vertical content cleanly.

### 3. Documentation Frame (`Addon Companion Cards`)
- **Canvas Location**: `x: 86000, y: 0`, width: 1200px, height: 2,722px, Auto Layout with 64px padding and 48px section spacing.
- **Sections**:
  1. **Document Header**: Eyebrow, Display Title, editorial description, and 5 property metadata badges.
  2. **Section 1 — Anatomy & Architecture**: Enlarged MD Selected card paired with 5 numbered callout cards breaking down Image, Add-on Name, Description, Additional Price (+₦), and Selection Indicator.
  3. **Section 2 — Interaction States**: 4 state variants (`Default`, `Hover`, `Selected`, `Disabled`) with captions detailing border, background, and indicator behavior.
  4. **Section 3 — Sizing Variants & Adaptive Collapse**: Side-by-side comparison of MD vs SM, plus demonstration of `Image=Hidden` full-width expansion and `Description=Hidden` compact single-line card.
  5. **Section 4 — Realistic Add-on Specimen Content**: The 4 canonical storefront add-ons in a 2×2 grid:
     - **Gift Wrapping**: `A simple gift-ready finish for your order.`, `+₦2,000` (`Selected`)
     - **Greeting Card**: `Add a personal message to your order.`, `+₦1,500` (`Default`)
     - **Sticker Pack**: `A small collection of matching stickers.`, `+₦1,000` (`Selected`)
     - **Extra Prints**: `Additional printed copies of your uploaded artwork.`, `+₦3,000` (`Default`)
  6. **Section 5 — Customization Flow Integration**: A realistic in-context customization panel titled *"Make it extra special"* with supporting text *"Add something extra to personalize your order."*, a live selected counter pill, a 2×2 responsive grid of add-on cards, and an order summary calculation footer.

## Why
Product and bundle customization in Unwind & Doodle requires an optional add-on mechanism that lets customers add complementary items (gift wrapping, cards, stickers, prints) to personalized items without confusing add-ons with standalone products. `AddonCompanionCard` establishes clear price delta communication (`+₦`), distinct selectable state semantics, and accessible states while maintaining a calm visual hierarchy that never competes with the primary product.

## Files Touched
- `Figma Workspace`:
  - `Components` page (`id: 16:2942`)
  - Component Set: `AddonCompanionCard` (`id: 41:25498`, 32 variants)
  - Documentation Board: `Addon Companion Cards` (`id: 41:26969`, 1200×2722px)
- `docs/changes/README.md`: Updated index to record Step 4G.
- `docs/changes/2026-09-05-figma-addon-companion-card-component.md`: Created detailed change documentation.

## Follow-ups & Known Issues
- Step 4G is complete and fully validated.
- All existing components (`Navbar`, `Footer`, `CartDrawer`, `ProductImageGallery`, `ThemeSelectorCard`, etc.) remain intact.
- Next step in design system progression: Step 4H / OrderSummaryCard.

## Commit Message
```text
feat(design-system): build AddonCompanionCard component system and documentation in Figma

- Create AddonCompanionCard component set with 32 variants across State, Size, Description, and Image properties
- Implement horizontal Auto Layout with adaptive collapse when image or description is hidden
- Integrate 4 dedicated vector add-on motifs (gift wrapping, greeting card, sticker pack, extra prints)
- Construct 1200px Addon Companion Cards documentation board with anatomy callouts, states, sizing, specimens, and live customization flow example
- Ensure 100% token compliance with Fredoka/Plus Jakarta Sans typography, semantic colors, and variables
```
