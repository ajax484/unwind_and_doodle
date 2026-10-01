# Modular Email Blocks and Figma Template Presets

## What Changed
- **Store Product Catalog Modal & Multi-Product Picker (`src/components/admin/marketing/EmailBlockEditor.tsx`)**: Built a full catalog modal picker that connects directly to our store catalog (`/api/products` and `/api/admin/products`). Supports:
  - **Single Product Selection**: 1-click select for `product_card` that automatically populates the title, Naira price (`formatPrice`), cover image URL, description, and `/products/[slug]` CTA link.
  - **Multi-Product Selection**: Searchable checkbox grid for `product_grid` allowing admins to pick 2, 3, 4, or more store products to display in the email grid, with individual remove controls.
- **Button Styling & HTML Sanitization Fix (`src/lib/sanitize-html.ts`, `src/services/marketing-renderer.service.ts`)**: Fixed an issue where `sanitizeHtml` was stripping `style` and `class` attributes from `<a>` and `<img />` tags. Added bulletproof table-based button compilation and a live visual button preview right in the block editor.
- **Campaign Block Data Model (`src/types/marketing.ts`)**: Added typed discriminated union for `CampaignBlock` supporting `header`, `text`, `image`, `button`, `product_card`, `product_grid`, `highlight_box`, `dynamic_recommendation`, and `divider`.
- **Figma-Aligned HTML Email Compiler (`src/services/marketing-renderer.service.ts`)**: Implemented `compileCampaignBlocksToHtml` that transforms modular blocks into responsive, email-client safe HTML tables using Unwind & Doodle design tokens (`#D99BA3` Brand Rose, `#A7C2D4` Brand Blue, `#243342` Charcoal, `#FFFDF7` Cream).
- **Figma Design System Template Presets (`src/lib/marketing-templates.ts`)**: Created 1-click starter presets directly mapped from the Figma `Email Templates` canvas (Product Launch "For the Girls", Editorial Nurture, Welcome Story, Blank Canvas).
- **Campaign Composer & Live Preview Upgrades (`src/components/admin/marketing/CampaignComposer.tsx`, `EmailPreview.tsx`)**: Added a mode switcher between "Modular Blocks" and "Rich Text", Figma template preset starter buttons, and dynamic compilation in the desktop/mobile preview pane.
- **Unit Test Suite (`tests/marketing/modular-email-blocks.test.ts`)**: Created tests covering block compiling, personalization token replacements, and Figma template preset integrity.

## Why
To enable admins to visually select live store products (single or multiple) directly from the catalog without manually typing URLs or prices, and ensure that email CTA buttons and image banners retain their exact brand styling without being stripped by the HTML sanitizer.

## Files Touched
- `src/lib/sanitize-html.ts`
- `src/types/marketing.ts`
- `src/services/marketing-renderer.service.ts`
- `src/lib/marketing-templates.ts`
- `src/components/admin/marketing/EmailBlockEditor.tsx`
- `src/components/admin/marketing/EmailPreview.tsx`
- `src/components/admin/marketing/CampaignComposer.tsx`
- `tests/marketing/modular-email-blocks.test.ts`


## Follow-ups / Known Issues
None

## Commit Message
`feat(marketing): implement modular email block builder and figma template presets`
