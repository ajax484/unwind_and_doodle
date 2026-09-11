# 2026-09-08 — Step 8B: Design System Post-Audit Cleanups & Token Consolidation

## What Changed

1. **`ReviewModal` Component Atomic Composition (`src/components/ReviewModal.tsx`)**:
   - Refactored `ReviewModal` to directly compose core design system input atoms `TextInput` and `Textarea`, along with `AlertBanner`.
   - Replaced custom inline error `<div>` and validation prompt with standard `<AlertBanner variant="danger" size="sm" ...>` and `<AlertBanner variant="warning" size="sm" ...>`.
   - Replaced raw `<input>` and `<textarea>` elements and manual label wrappers with `<TextInput label="..." size="md" ... />` and `<Textarea label="..." size="md" resize="none" ... />`.
   - Preserved all state management, character limits, error feedback, accessibility labels, and `data-testid` attributes.

2. **`AdminLayoutClient` Header Breadcrumbs Integration (`src/app/admin/AdminLayoutClient.tsx`)**:
   - Integrated the canonical `Breadcrumbs` molecule into the administrative top header bar.
   - Added dynamic `getBreadcrumbs()` route generator mapping Next.js `pathname` to section hierarchy (e.g. `Dashboard`, `Orders`, `Products > Bundles`, `Settings > Warehouses`).
   - Rendered responsive `<Breadcrumbs size="sm" showHome homeHref="/admin" homeLabel="Admin" items={...} />` on desktop and tablet viewports, fulfilling the canonical Figma Phase 6B specification (`52:101391`).

3. **`OrderStatusBadge` Direct Import Consolidation**:
   - Updated `src/app/admin/orders/page.tsx`, `src/app/admin/orders/[id]/page.tsx`, and `src/app/admin/page.tsx` to import directly from `@/components/OrderStatusBadge`.
   - Deleted the redundant 4-line compatibility alias `src/components/admin/OrderStatusBadge.tsx`.

4. **Static Button Class Consolidation (`src/app/globals.css` & `src/app/order/callback/page.tsx`)**:
   - Removed deprecated, untokenized `.btn-terracotta` and `.btn-pink` CSS utility classes from `src/app/globals.css`.
   - Updated the single remaining `.btn-pink` callsite in `src/app/order/callback/page.tsx` to canonical `.btn-primary`.
   - Consolidated `.btn-primary, .btn-rose`, `.btn-secondary, .btn-blue`, and `.btn-outline` rules with design tokens and focus states.

---

## Why

- **Composition Consistency**: Eliminates local reimplementation of form input fields and alert banners in `ReviewModal`, ensuring all form fields adhere to the canonical border, focus ring, and typography tokens.
- **Specification Parity**: Restores `Breadcrumbs` to the administrative header bar as specified in Figma Component Set `AdminLayout` (`52:101390`).
- **Namespace Cleanliness**: Removes redundant component stubs (`src/components/admin/OrderStatusBadge.tsx`) and legacy un-tokenized button utility classes (`.btn-pink`, `.btn-terracotta`), reducing dead code.

---

## Files Touched

- `src/components/ReviewModal.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/orders/[id]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/order/callback/page.tsx`
- `src/app/globals.css`
- `src/components/admin/OrderStatusBadge.tsx` (DELETED)

---

## Follow-ups / Known Issues

None.

---

## Commit Message

```text
refactor(design-system): post-audit component composition and legacy cleanup

- Compose TextInput, Textarea, and AlertBanner in ReviewModal
- Integrate Breadcrumbs navigation into AdminLayoutClient header
- Update admin pages to import OrderStatusBadge directly and remove legacy stub
- Consolidate legacy .btn-* classes in globals.css and update order callback page
```
