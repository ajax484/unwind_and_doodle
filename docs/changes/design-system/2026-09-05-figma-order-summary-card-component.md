# 2026-09-05 Step 4H OrderSummaryCard Component System in Figma

## What Changed
Created the production **OrderSummaryCard** component set (`id: 41:28794`) and its comprehensive documentation board **Order Summary Cards** (`id: 41:28795`) in the Unwind & Doodle Figma design system on the `Components` page (`id: 16:2942`).

### 1. Component Architecture (`OrderSummaryCard`)
- **Single Component Set**: `OrderSummaryCard` containing all 48 variants across 5 variant axes:
  - `State`: `Default` | `Loading` | `Empty`
  - `Discount`: `None` | `Visible`
  - `Delivery`: `Visible` | `None`
  - `Action`: `Visible` | `Hidden`
  - `ItemCount`: `Multiple` | `One`
- **Default Variant**: `State=Default, Discount=None, Delivery=Visible, Action=Visible, ItemCount=Multiple`
- **Card Foundation**:
  - Auto Layout: `VERTICAL`, hug height (`primaryAxisSizingMode = 'AUTO'`), fixed width 400px (`counterAxisSizingMode = 'FIXED'`).
  - Background: `Semantic/Background/Surface` (`#FFFFFF`).
  - Border: `Border/Default` (`#EDF3F7`, 1px bound to `VariableID:15:2327`).
  - Corner Radius: `Radius/LG` (20px bound to `VariableID:13:1592`).
  - Padding: `Spacing/6` (24px bound to `VariableID:13:1574`).
  - Section Spacing: 20px.

### 2. Internal Structure & Reused Components
```text
OrderSummaryCard (Auto Layout: VERTICAL, Hug Height, Width: 400px)
├── Header (Auto Layout: HORIZONTAL, Space-Between)
│   ├── Title ("Order Summary", Typography/Heading/2, Semantic/Text/Primary #243342)
│   └── Item Count ("3 items" / "1 item", Typography/Body/Small, Semantic/Text/Secondary #52657A)
├── Items (Auto Layout: VERTICAL, layoutAlign: 'STRETCH', itemSpacing: 16)
│   ├── Order Item Summary 1 (Thumbnail 52×52 Radius/MD, Product Title, Configuration, Qty, Price)
│   ├── Order Item Summary 2 (if ItemCount=Multiple)
│   └── Add-on Companion Item (e.g. Gift Wrapping +₦2,000, if ItemCount=Multiple)
├── Divider (1px Divider/Default line, layoutAlign: 'STRETCH')
├── Pricing (Auto Layout: VERTICAL, layoutAlign: 'STRETCH', itemSpacing: 12)
│   ├── Subtotal Row (Label: Semantic/Text/Secondary, Value: Semantic/Text/Primary)
│   ├── Discount Row (if Discount=Visible, Value: Semantic/Status/Success/Text −₦5,000 / −₦3,000)
│   ├── Delivery Row (if Delivery=Visible, Value: ₦2,500 / Free)
│   ├── Pricing Divider (1px Divider/Default line)
│   └── Total Row (Label: Typography/Heading/3, Value: Typography/Heading/2, Semantic/Text/Primary)
└── Action (if Action=Visible, Auto Layout: VERTICAL, layoutAlign: 'STRETCH')
    └── Checkout Button (Reused Button / Primary / LG, layoutAlign: 'STRETCH', "Proceed to Checkout")
```

### 3. Lifecycle States
- **`Default`**: Full financial breakdown with configured item details, add-ons, subtotal, discount, delivery, total, and full-width checkout action.
- **`Loading`**: Reuses `Skeleton` representations mirroring the exact structure of the card (header skeleton, 52px image & text skeletons, subtotal/discount/delivery skeletons, and 48px action skeleton).
- **`Empty`**: Integrates the existing `EmptyState` component (`Size=SM`) with title `"No items in your order"`, description `"Add something to your cart before continuing to checkout."`, and an `"Explore Catalog"` action button.

### 4. Documentation Board (`Order Summary Cards`)
- **Canvas Location**: `x: 91000, y: 0`, width: 1200px, height: 3,617px, Auto Layout with 64px padding and 48px section spacing.
- **Sections**:
  1. **Document Header**: Eyebrow, Display Title, editorial description, and 6 property metadata badges.
  2. **Section 1 — Anatomy & Architecture**: Enlarged card paired with 8 numbered callout cards breaking down Header & Count, Compact Item Summary, Add-on Representation, Section Dividers, Subtotal, Promotional Discount, Delivery Fee, and Total & Checkout CTA.
  3. **Section 2 — Standard & Promotional Order Scenarios**: Canonical 3-item standard order specimen (₦68,500 total) versus an active ₦5,000 discount order specimen (₦63,500 total).
  4. **Section 3 — Single Item & Bundle Configurations**: Single personalized coloring book order summary (₦29,500 total) versus condensed multi-product bundle summary (`Mindful Starter Bundle`, ₦39,500 total).
  5. **Section 4 — Lifecycle States**: Three-column comparison of `Default`, `Loading` (skeleton structure), and `Empty` (reused `EmptyState` instance).
  6. **Section 5 — Contextual Action Variations**: Side-by-side comparison of `Action=Visible` (with Proceed to Checkout CTA) and `Action=Hidden` (for confirmation or review modals).

## Why
Checkout and order-review flows require a distinct summary card that aggregates all order components (items, custom options, add-ons, promo discounts, shipping fees) into a clear financial calculation before purchase. `OrderSummaryCard` provides this structural clarity without replacing `CartItemRow`, maintaining clean separation between individual item management and overall order totals.

## Files Touched
- `Figma Workspace`:
  - `Components` page (`id: 16:2942`)
  - Component Set: `OrderSummaryCard` (`id: 41:28794`, 48 variants)
  - Documentation Board: `Order Summary Cards` (`id: 41:28795`, 1200×3617px)
- `docs/changes/README.md`: Updated index to record Step 4H.
- `docs/changes/2026-09-05-figma-order-summary-card-component.md`: Created detailed change documentation.

## Follow-ups & Known Issues
- Step 4H is complete and fully validated.
- All existing components (`Button`, `EmptyState`, `Skeleton`, `AddonCompanionCard`, `ThemeSelectorCard`, etc.) remain intact.
- Stop condition respected: strictly Step 4H only.

## Commit Message
```text
feat(design-system): build OrderSummaryCard component system and documentation in Figma

- Create OrderSummaryCard component set with 48 variants across State, Discount, Delivery, Action, and ItemCount
- Implement vertical Auto Layout with compact item rows, configuration summaries, and financial pricing stack
- Integrate existing Button, EmptyState, and Skeleton component instances into variants
- Construct 1200px Order Summary Cards documentation board with anatomy callouts, standard specimen, discount, bundle, and lifecycle states
- Ensure 100% token compliance with Fredoka/Plus Jakarta Sans typography, semantic colors, and variables
```
