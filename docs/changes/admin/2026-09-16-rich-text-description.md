# Rich Text Product and Bundle Descriptions (TipTap & HTML Sanitization)

## What Changed
- **TipTap Rich Text Integration**: Installed `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, and `sanitize-html`.
- **Rich Text Core Utilities (`src/lib/rich-text.ts`)**:
  - `sanitizeRichText`: Sanitizes HTML using an allowlist suitable for product descriptions while stripping unsafe tags, script injections, and dangerous protocols.
  - `stripHtml`: Fast HTML tag remover and entity decoder for search indexing and text clamp calculations.
  - `extractPlainText`: Extracts plain text with word-boundary clamping and ellipsis for card snippets.
  - `isRichTextEmpty`: Validates whether markup represents empty text (e.g. `<p></p>` or whitespace).
  - `normalizeRichTextForEditor`: Auto-wraps legacy plain-text descriptions with paragraphs (`<p>`) without requiring database data migrations.
- **Components**:
  - `RichTextEditor.tsx`: Responsive TipTap editor with mobile-friendly toolbar supporting Bold, Italic, Strikethrough, Headings (H2/H3), Bullet/Numbered Lists, Blockquotes, Links, and Undo/Redo.
  - `RichTextContent.tsx`: Client component rendering sanitized rich text with design-token-aligned typography.
- **Admin Forms**:
  - Integrated `RichTextEditor` into `src/app/admin/products/new/page.tsx`, `src/app/admin/products/[productId]/page.tsx`, `src/app/admin/products/bundles/new/page.tsx`, and `src/app/admin/products/bundles/[id]/edit/page.tsx`.
- **Storefront & Detail Pages**:
  - Updated storefront product page `src/app/products/[slug]/page.tsx` and bundle detail view `src/app/admin/products/bundles/[id]/page.tsx` to render rich text using `RichTextContent`.
  - Updated `ProductCard.tsx` to display plain-text truncated summaries using `extractPlainText(description, 160)`.
- **Search & Services**:
  - Updated `catalog.service.ts` to filter search queries against stripped plain text to avoid matching HTML tag attributes.
  - Updated `admin-product.service.ts` and `admin-bundle.service.ts` to sanitize incoming HTML descriptions before persisting to the database.

## Why
Admins needed rich text formatting (bolding, lists, headings, links, blockquotes) to highlight product details, specifications, and bundle contents effectively. Plain text descriptions were limited in visual hierarchy and styling. The implementation adheres to security best practices with server/client HTML sanitization and ensures legacy plain-text descriptions render gracefully.

## Files Touched
- `package.json`
- `src/lib/rich-text.ts`
- `tests/lib/rich-text.test.ts`
- `src/components/admin/RichTextEditor.tsx`
- `src/components/RichTextContent.tsx`
- `src/components/ProductCard.tsx`
- `src/app/globals.css`
- `src/app/admin/products/new/page.tsx`
- `src/app/admin/products/[productId]/page.tsx`
- `src/app/admin/products/bundles/new/page.tsx`
- `src/app/admin/products/bundles/[id]/edit/page.tsx`
- `src/app/admin/products/bundles/[id]/page.tsx`
- `src/app/products/[slug]/page.tsx`
- `src/services/catalog.service.ts`
- `src/services/admin-product.service.ts`
- `src/services/admin-bundle.service.ts`

## Follow-ups / Known Issues
None

## Commit Message
`feat(catalog): replace product and bundle description textarea with responsive TipTap rich text editor and sanitized rendering`
