# 2026-09-05 — Step 2E: CartItemRow Component Molecule in Figma

## What Changed
1. **Master `CartItemRow` Component Set on `Components` Page**:
   - Created a single unified Figma Component Set `CartItemRow` (16 production variants) positioned at `x: 14700, y: 0` on the `Components` page.
   - Configured with 4 clean component properties:
     - `State`: `Default` | `Disabled`
     - `Addon`: `Visible` | `None`
     - `Quantity`: `Editable` | `Static`
     - `Remove`: `Visible` | `Hidden`
   - Default master variant configured to `State=Default, Addon=Visible, Quantity=Editable, Remove=Visible`.

2. **Molecule Composition from Existing Primitives**:
   - **Button Stepper Integration**: Reuses real `Button` component Stepper instances (Step 2A, `Variant=Stepper, Size=MD`) for minus and plus quantity controls, providing an accessible `Size/Touch/Min` (44px) touch target.
   - **Button Ghost Remove Action Integration**: Reuses real `Button` component Ghost instances (Step 2A, `Variant=Ghost, Size=MD, Icon=True, Icon Position=Icon Only`) with iconography-compliant trash icon for item removal.
   - **Disabled State Treatment**: Directly maps `State=Disabled` button variants for both Stepper and Ghost actions, maintaining visual clarity without relying purely on low opacity.

3. **Foundation Token Compliance & Structural Layout**:
   - **Row Container**:
     - Background: `Semantic/Background/Surface` (`#FFFFFF`) in Default state; `Semantic/Background/Subtle` (`#F4F8FA`) in Disabled state.
     - Divider / Border: `Semantic/Border/Default` (`#EDF3F7`, 1px `Border/Width/Thin`).
     - Elevation: None (`effects = []`), maintaining an intentionally lighter feel than `ProductCard`.
     - Internal Padding: `Spacing/4` (16px) vertical and horizontal.
     - Corner Radius: `Radius/MD` (14px).
   - **Product Thumbnail**:
     - Dimensions: `80px × 80px` (fixed 1:1 aspect ratio).
     - Corner Radius: `Radius/MD` (14px).
     - Background: `Semantic/Background/Subtle` with subtle 1px border and replaceable book mockup artwork.
   - **Product Details & Typography**:
     - Product Name: `Typography/Heading/3` (`Fredoka` 600, 16px), `Semantic/Text/Primary` (`#243342`), multi-line auto-wrap (`textAutoResize = HEIGHT`).
     - Supporting Info: `Typography/Body/Small` (`Plus Jakarta Sans` 14px), `Semantic/Text/Secondary` (`#52657A`).
     - Add-on List: `Typography/Body/Small`, `Spacing/1` (4px gap) between items (`• Gift wrapping +₦2,000`, `• Personal note +₦1,000`), cleanly collapses when `Addon=None`.
     - Static Quantity: `Typography/Body/Small` (`Qty 2`) for non-interactive order reviews.
     - Price: `Typography/Heading/3`, `Semantic/Text/Primary` (e.g. `₦40,000` with add-ons, `₦18,500` base).

4. **`Cart Item Rows` Documentation Board (`Components` Page)**:
   - Created `Cart Item Rows` documentation frame (`1200px × 2370px`) at `x: 13400, y: 0` on `Components` page.
   - Populated with **11 live component instances** of `CartItemRow`:
     - **01 / Component Anatomy & Structure**: Annotated live card instance paired with a 7-item anatomical breakdown (thumbnail, product name, supporting info, add-on list, quantity stepper, price, remove action).
     - **02 / Interaction States: Default vs Disabled**: Active interactive row vs muted disabled row (subtle background, tertiary text color, disabled buttons).
     - **03 / Content Options & Slot Visibility**: 4 specimens demonstrating collapsing behavior: Without Add-ons, Static Quantity, Without Remove Action, and Minimal Row.
     - **04 / Storefront Context & Responsive Layouts**: Demonstration inside Cart Drawer (~400px wide) and Checkout Order Review column (~680px wide).

## Why
- Represents individual e-commerce items in Cart Drawer, Cart Page, and Checkout Review pipelines.
- Integrates existing Step 2A Button primitives (Stepper and Ghost) rather than recreating one-off controls.
- Ensures accessible touch targets (≥44px), readable disabled treatments, dynamic add-on price calculations, and responsive horizontal fluid expansion.

## Files Touched
- `docs/changes/2026-09-05-figma-cart-item-row-component.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. All 16 variants and 11 live documentation instances verified in Figma.

## Commit Message
```text
feat(design-system): implement Step 2E CartItemRow molecule and documentation in Figma

- Create unified CartItemRow component set with 16 production variants
- Compose from existing Button Stepper and Ghost remove component primitives
- Implement Default and Disabled states with fluid Addon, Quantity, and Remove toggles
- Support 80x80 replaceable thumbnail, multi-line titles, and add-on price integration
- Build Cart Item Rows documentation board on Components page with 11 live instances
```
