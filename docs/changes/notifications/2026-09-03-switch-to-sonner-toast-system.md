# Switch to Sonner Toast Notification System

## What Changed
1. **Installed Sonner Package**:
   - Added `sonner` (`^2.0.8`) to `package.json` and locked with `npm install sonner`.

2. **Purged Custom Bespoke Toast System**:
   - Completely deleted [`src/context/ToastContext.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/context/ToastContext.tsx) and removed the `src/context/` directory.
   - Removed custom `@keyframes toast-progress` animation from [`src/app/globals.css`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css).
   - Removed `<ToastProvider>` from [`src/app/layout.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx).

3. **Integrated Sonner `<Toaster />` in Root Layout**:
   - Mounted `<Toaster position="top-right" richColors closeButton />` inside the root `<body>` in [`src/app/layout.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx).

4. **Direct Native Sonner Imports Across All Call Sites**:
   - Replaced `useToast()` hook with direct singleton `import { toast } from 'sonner'` across:
     - [`src/components/CartDrawer.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx)
     - [`src/app/products/[slug]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/[slug]/page.tsx)
     - [`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)
     - [`src/app/pay/[token]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/pay/[token]/page.tsx)
     - [`src/app/cart/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx)
     - [`src/app/admin/reviews/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/reviews/page.tsx)
     - [`src/app/admin/discounts/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/discounts/page.tsx)
     - [`src/app/admin/settings/team/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/settings/team/page.tsx)

5. **Updated Test Suite**:
   - Replaced context boundary unit test with Sonner API verification in [`tests/commerce/toast-notification.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/commerce/toast-notification.test.ts).

## Why
- Transitioned to the industry-standard, lightweight, accessible `sonner` toast library, eliminating React Context boundary overhead, Fast Refresh desync issues, and maintaining zero-friction direct calls across the application.

## Files Touched
- `package.json`
- `package-lock.json`
- [`src/app/layout.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx)
- [`src/app/globals.css`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css)
- [`src/context/ToastContext.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/context/ToastContext.tsx) (Deleted)
- [`src/components/CartDrawer.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx)
- [`src/app/products/[slug]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/[slug]/page.tsx)
- [`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)
- [`src/app/pay/[token]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/pay/[token]/page.tsx)
- [`src/app/cart/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx)
- [`src/app/admin/reviews/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/reviews/page.tsx)
- [`src/app/admin/discounts/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/discounts/page.tsx)
- [`src/app/admin/settings/team/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/settings/team/page.tsx)
- [`tests/commerce/toast-notification.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/commerce/toast-notification.test.ts)
- [`docs/changes/2026-09-03-switch-to-sonner-toast-system.md`](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-03-switch-to-sonner-toast-system.md)
- [`docs/changes/README.md`](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md)

## Follow-ups / Known Issues
- None.

## Suggested Commit Message
```text
feat(notifications): replace bespoke toast system with sonner

- Install sonner dependency
- Mount Toaster in root layout with richColors, closeButton, and top-right positioning
- Replace useToast hook calls with direct sonner toast across all customer and admin pages
- Delete bespoke ToastContext and custom progress keyframe styles
- Update toast test suite for Sonner integration
```
