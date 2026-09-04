# Bespoke Toast Notification System & Event Notification Architecture

## What Changed
1. **Bespoke React Context & Toast System ([src/context/ToastContext.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/context/ToastContext.tsx))**:
   - Created a zero-dependency, React 19-native `ToastContext` and `<ToastProvider>` component.
   - Built support for 4 core toast variants (`success`, `error`, `warning`, `info`) styled with Unwind & Doodle's aesthetic:
     - Soft pastel background colors, branded border accents, and SVG status icons.
     - Fredoka font for bold friendly headings and Plus Jakarta Sans for body messages.
     - Progress timer countdown bar with pause-on-hover capability.
     - Dismiss '✕' button and keyboard accessibility (ESC key to dismiss).
     - ARIA live region (`aria-live="polite"` / `role="status"` or `"alert"`).
     - Responsive positioning: fixed top-right on desktop (`sm:top-6 sm:right-6`) and centered with safe padding on mobile (`top-4 inset-x-4 max-w-sm mx-auto z-[9999]`).
     - Session flash support (`toast.flash(msg, type)`): writes to `sessionStorage` and automatically triggers a celebratory toast on the next route mount after page redirects (e.g. payment completion).
   - Exported convenient `useToast()` hook with helper dispatchers: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`, and `toast.dismiss()`.

2. **Global Mount in [src/app/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx)**:
   - Wrapped `<ToastProvider>` around `<Navbar />`, `<main>`, `<Footer />`, and `<CartDrawer />` so that notifications can be dispatched anywhere across the client component hierarchy.

3. **Keyframe Animation in [src/app/globals.css](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css)**:
   - Added `@keyframes toast-progress` for smooth countdown timer visualization.

4. **Replaced Native `alert(...)` Calls Across Core Customer Touchpoints**:
   - **[CartDrawer.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx)**: Replaced raw alerts on quantity updates and item removals with `toast.error(...)`.
   - **[products/[slug]/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/[slug]/page.tsx)**:
     - Replaced photo upload alerts with `toast.warning(...)`.
     - Replaced theme selection validation alerts with `toast.warning(...)`.
     - Added `toast.success(...)` on adding to cart with a direct action button `"View Cart"` to open `CartDrawer`.
     - Replaced add-to-cart error alert with `toast.error(...)`.
   - **[checkout/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)**: Replaced empty cart and missing required photo alerts with non-blocking `toast.warning(...)`.
   - **[pay/[token]/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/pay/[token]/page.tsx)**: Replaced payment initialization and processing alerts with `toast.error(...)`.
   - **[cart/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx)**: Replaced quantity and remove error alerts with `toast.error(...)`.

5. **Replaced Native `alert(...)` Calls Across Admin Screens**:
   - **[admin/reviews/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/reviews/page.tsx)**: Replaced moderation error alerts with `toast.error(...)` and added `toast.success(...)` on review approval/rejection.
   - **[admin/discounts/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/discounts/page.tsx)**: Replaced status and deletion error alerts with `toast.error(...)` and added `toast.success(...)`.
   - **[admin/settings/team/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/settings/team/page.tsx)**: Replaced unrendered local `showToast` state and error `alert(...)` calls with unified `toast.success(...)` and `toast.error(...)`.

6. **Unit Test Suite ([tests/commerce/toast-notification.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/commerce/toast-notification.test.ts))**:
   - Added unit tests verifying context boundary enforcement, flash notification persistence, and toast type mapping.

## Why
- The application previously relied on intrusive browser `alert(...)` dialogs across more than 57 locations, creating a jarring, thread-blocking user experience that broke on mobile devices.
- By introducing a custom React 19 context with zero third-party dependencies, we avoid peer dependency conflicts while providing a polished, branded, and accessible notification experience.

## Files Touched
- [src/context/ToastContext.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/context/ToastContext.tsx) (New)
- [src/app/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx)
- [src/app/globals.css](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css)
- [src/components/CartDrawer.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/CartDrawer.tsx)
- [src/app/products/[slug]/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/products/[slug]/page.tsx)
- [src/app/checkout/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)
- [src/app/pay/[token]/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/pay/[token]/page.tsx)
- [src/app/cart/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/cart/page.tsx)
- [src/app/admin/reviews/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/reviews/page.tsx)
- [src/app/admin/discounts/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/discounts/page.tsx)
- [src/app/admin/settings/team/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/settings/team/page.tsx)
- [tests/commerce/toast-notification.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/commerce/toast-notification.test.ts) (New)
- [docs/changes/2026-09-03-bespoke-toast-notification-system.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-03-bespoke-toast-notification-system.md) (New)
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md)

## Follow-ups / Known Issues
- Option 2 will build upon this foundation by establishing a persistent in-app notifications database table and connecting background domain events (`order.shipped`, `inventory.low_stock`, `review.approved`) to live client feeds and unread notification badges.

## Suggested Commit Message
```text
feat(notifications): add bespoke React 19 toast system and migrate native alerts

- Introduce ToastContext and ToastProvider with responsive styling and accessibility
- Support success, error, warning, and info variants with auto-dismiss timers and flash persistence
- Wrap application root layout in ToastProvider
- Replace native alert() calls across cart, product detail, checkout, pay, and admin management pages
- Add unit test suite in toast-notification.test.ts
```
