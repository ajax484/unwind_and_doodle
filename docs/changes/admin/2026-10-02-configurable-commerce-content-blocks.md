# 2026-10-02 Configurable Commerce Content Blocks

## What Changed
- Transformed **Product** and **Product Grid** blocks in the Modular Email Builder into configurable commerce content blocks where the catalog remains the authoritative source of truth for commerce data (prices, inventory, availability, product slug routing) while the email campaign controls presentation.
- Implemented strictly discriminated TypeScript interfaces for `ProductPresentationConfig` (`image`, `badge`, `title`, `description`, `price`, `cta`, `_catalogSnapshot`, and `ProductCtaDestination`), alongside runtime safe normalization helper `normalizeProductPresentation`.
- Created a shared, reusable `ProductPresentationInspector` component used across both single Product and Product Grid item inspectors:
  - Visual catalog thumbnail image selector supporting multiple product images with active selection badges and missing/removed image resilience warnings (`⚠️ This product image is no longer available in the catalog`).
  - Badge visibility toggle (`Show badge`) and campaign-specific badge text override.
  - Product title visibility toggle (`Show title`) and campaign-specific title override.
  - Description visibility toggle (`Show description`) and campaign-specific blurb override.
  - Price visibility toggle (`Show price`) with read-only authoritative catalog price display (immutable in campaign editor).
  - CTA visibility toggle (`Show CTA`), custom button text, and destination selector (`● Product page` automatic routing vs `○ Custom URL` with destination link input).
- Upgraded `ProductGridBlock` editor UX in `ContextualSettings`:
  - List of selected products with Move Up / Move Down buttons for reordering.
  - In-place item editing via dedicated sub-inspector using `ProductPresentationInspector`.
  - Multiple-product selection and catalog search via updated `ProductPickerModal`.
- Updated canvas block previews (`CanvasProductBlock` and `CanvasProductGridBlock`) and email HTML compiler (`marketing-renderer.service.ts`) to render customized presentation overrides while resolving authoritative pricing and product page links.
- Updated V1 marketing email template presets (`Product Launch`, `Welcome Series`, `Editorial & Story`) to adopt the new schema.
- Added robust absolute URL resolution across all email HTML output via `toAbsoluteUrl` and `getBaseSiteUrl`, resolving all relative links (`/products/...`, buttons, social links) and asset paths to fully qualified URLs based on environment configuration (`NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` / `https://unwindanddoodle.com`).
- Configured canonical brand logo header across email compiler and canvas preview using authoritative Supabase public storage asset (`https://pexeuungdxbvcqtktwww.supabase.co/storage/v1/object/public/assets/logo.svg`).
- Sanitized product descriptions from the catalog using `stripHtml` across the HTML compiler (`marketing-renderer.service.ts`), runtime normalizers, and editor inspector panels to remove raw HTML tags (`<p>`, `<strong>`, `<em>`, `&nbsp;`) and format clean plain text in email cards.
- Wrapped all compiled marketing emails in a 2-tier responsive email layout: a 100% full-width outer container with a neutral backdrop (`#F8F9FA`) and a centered, fluid `max-width: 600px` content card (`#FFFFFF`, `border-radius: 16px`, `border: 1px solid #EDF3F7`) to prevent wide-screen stretching and ensure 1:1 visual fidelity with the admin builder canvas.
- Added comprehensive unit and regression tests in `tests/marketing/modular-email-blocks.test.ts`.

## Why
- Previously, product and product grid blocks had limited and disparate presentation controls, allowing minimal customization of copy, image selection, and destination links without clear architectural boundaries between catalog truth and campaign presentation.
- In sent emails, three critical issues were diagnosed and resolved:
  1. SVG logos were blocked/broken in email clients without absolute URLs and PNG support.
  2. Relative links (e.g. `/products/...`) failed in standalone email clients.
  3. Catalog descriptions containing rich-text HTML rendered unescaped raw markup inside email cards.
- The new architecture ensures marketers can tailor storytelling, imagery, badges, and CTAs for specific email audiences while safeguarding catalog integrity (prices and catalog items remain authoritative and uncorrupted) and rendering cleanly across all email clients.

## Files Touched
- `src/types/marketing-builder.ts`
- `src/components/admin/marketing/builder/panels/ProductPresentationInspector.tsx`
- `src/components/admin/marketing/builder/panels/ContextualSettings.tsx`
- `src/components/admin/marketing/builder/modals/ProductPickerModal.tsx`
- `src/components/admin/marketing/builder/canvas/blocks/CanvasBlocks.tsx`
- `src/services/marketing-renderer.service.ts`
- `src/components/admin/marketing/builder/EmailBuilder.tsx`
- `src/lib/marketing-templates.ts`
- `tests/marketing/modular-email-blocks.test.ts`
- `docs/changes/admin/2026-10-02-configurable-commerce-content-blocks.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
`feat(marketing): make product and product grid blocks configurable commerce content blocks`
