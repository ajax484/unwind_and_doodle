# 2026-09-05 — Step 2D: ProductCard Component Molecule in Figma

## What Changed
1. **Master `ProductCard` Component Set on `Components` Page**:
   - Maintained a single unified Figma Component Set `ProductCard` (24 production variants) positioned at `x: 11900, y: 0` on the `Components` page.
   - Configured with 6 clean component properties:
     - `Variant`: `Standard` | `Custom` | `Bundle` | `OutOfStock`
     - `State`: `Default` | `Hover`
     - `Image`: `Image` | `Placeholder`
     - `Badge`: `None` | `Visible`
     - `Rating`: `Visible` | `None`
     - `Action`: `Button` | `None`
   - Default master variant configured to `Variant=Standard, State=Default, Image=Image, Badge=None, Rating=Visible, Action=Button`.

2. **Full Alignment with Product Capability Model & Supabase Schema**:
   - Grounded directly in live Supabase database tables (`public.products`, `public.bundle_items`, `public.themes`):
     - `supports_theme_customization`: Allows selecting 1 to 3 curated themes (`floral`, `nature`, `objects`, `fantasy`).
     - `requires_customization`: Customer image upload pipeline for personalized line-art creation.
     - `bundle_items`: Multi-item combo bundles (e.g. Unwind Kit with 3 components).
     - Customer name/dedication personalization on front cover keepsakes.
     - Add-on accessories availability (coloring pencils, pens, gift wrapping).
   - Embedded compact, subordinate **`Capability Metadata`** slot (`Typography/Caption`, `Semantic/Text/Secondary`, dot icon):
     - **Custom**: `Choose a theme · Add a name · Add images`
     - **Bundle**: `Includes 3 products · Add-ons available`
     - **Standard**: `Add-ons available`
     - **OutOfStock**: Hidden (`visible = false`) to avoid presenting unavailable actions as actionable.

3. **Molecule Composition from Existing Primitives**:
   - **Badge Primitive Integration**: Uses real `Badge` component instances (Step 2C) inside the top-left media overlay slot (`Spacing/3` = 12px inset):
     - `Standard`: `Variant=Tag, Type=Default, Size=SM` ("New" / "Popular")
     - `Custom`: `Variant=Tag, Type=Default, Size=SM` ("Customizable")
     - `Bundle`: `Variant=Bundle, Type=Default, Size=SM` ("Bundle" in `Color/Purple/Base`)
     - `OutOfStock`: `Variant=Stock, Type=Out of Stock, Size=SM` ("Out of Stock")
   - **Button Primitive Integration**: Uses real `Button` component instances (Step 2A, Primary MD) in the action slot:
     - Full container width stretching (`layoutAlign = STRETCH`)
     - Contextual button copy: "Add to cart" (Standard), "Customize" (Custom), "View bundle" (Bundle), "Out of stock" (OutOfStock)
     - `OutOfStock` uses the official `State=Disabled` button variant.

4. **Foundation Token Consumption & Responsiveness**:
   - **Card Container**:
     - Surface: `Semantic/Background/Surface` (`#FFFFFF`)
     - Border: `Semantic/Border/Default` (`#EDF3F7`, 1px `Border/Width/Thin`)
     - Corner Radius: `Radius/LG` (20px)
     - Elevation: `Elevation/Card` (Default) transitioning smoothly to `Elevation/Card-Hover` (Hover)
     - Internal Padding: `Spacing/4` (16px)
   - **Media Container**:
     - Aspect ratio approximately 1:1, filling card content width
     - Radius: `Radius/MD` (14px)
     - Placeholder state: `Semantic/Background/Subtle` (`#F4F8FA`)
   - **Typography & Text Colors**:
     - Category / Eyebrow: `Typography/Overline`, `Semantic/Text/Tertiary`
     - Product Name: `Typography/Heading/3` (`Fredoka` 600, 16px), `Semantic/Text/Primary`
     - Description: `Typography/Body/Small` (`Plus Jakarta Sans`, 14px), `Semantic/Text/Secondary`
     - Capability Metadata: `Typography/Caption` (12px), `Semantic/Text/Secondary`
     - Rating Row: Compact `[Star] 4.9 (24)` row, `Size/Icon/XS` (16px), `Typography/Caption`, `Semantic/Text/Secondary`
     - Price: `Typography/Heading/3`, `Semantic/Text/Primary`
   - **Responsiveness**:
     - All text nodes configured with `layoutAlign = STRETCH` and `textAutoResize = HEIGHT`
     - Card width is flexible to parent grids (fills container horizontally, hugs vertically)
     - No hardcoded content heights, zero text clipping across 2, 3, and 4-column storefront grids.

5. **`Product Cards` Documentation Board (`Components` Page)**:
   - Updated `Product Cards` documentation frame (`1200px × 3571px`) at `x: 10600, y: 0` on `Components` page.
   - Populated with **16 live component instances** of `ProductCard`:
     - **01 / Audited Core Variants**: 4 cards showing Standard, Custom, Bundle, and Out of Stock.
     - **02 / Product Capability Model**: 4 live instances demonstrating Theme Customization, Name Personalization, Photo Upload to Linework, and Add-ons.
     - **03 / Content Options & Slot Resilience**: 4 cards demonstrating layout resilience: With Badge, Without Rating, Without Capabilities, and Without Action.
     - **04 / Component Anatomy & Token Mapping**: Annotated live custom card paired with a 9-item breakdown (media, badge, eyebrow, title, description, capability metadata, rating, price, action).
     - **05 / Responsive Storefront Grids**: Demonstration of fluid card sizing across 4-column (~250px), 3-column (~330px), and 2-column (~450px) storefront grid scenarios.

## Why
- Establishes the foundational e-commerce browsing molecule for the Unwind & Doodle storefront.
- Fully represents the product capability model (themes, names, photo uploads, bundles, add-ons) discovered in Supabase and the active Next.js application.
- Keeps capability indicators visually subordinate to avoid card visual overload.
- Composes previously audited Button (Step 2A) and Badge (Step 2C) primitives rather than re-implementing them.

## Files Touched
- `docs/changes/2026-09-05-figma-product-card-component.md` (MODIFIED)
- `docs/changes/README.md` (VERIFIED)

## Follow-ups / Known Issues
- None. All 24 variants and 16 live documentation instances verified in Figma.

## Commit Message
```text
feat(design-system): enhance Step 2D ProductCard with product capability model in Figma

- Integrate product capabilities: theme selection, name personalization, photo uploads, add-ons
- Align capability metadata with Supabase schema (supports_theme_customization, bundle_items)
- Insert subordinate Capability Metadata layer into ProductCard variant architecture
- Rebuild Product Cards documentation board with capability specimens and 9-item anatomy
```
