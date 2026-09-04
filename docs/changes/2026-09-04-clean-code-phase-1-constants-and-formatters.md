# 2026-09-04 — Clean Code Phase 1: Constants & Unified Formatters

## What Changed
1. **Centralized Organization Constant (`src/lib/constants.ts`)**:
   - Added and exported `DEFAULT_ORGANIZATION_ID = '88c7af2e-afd4-4504-a43f-b14cc45d6263'`.
   - Replaced all 10 hardcoded instances across service files and route handlers:
     - `src/services/customer.service.ts`
     - `src/services/webhook.service.ts`
     - `src/services/pricing.service.ts`
     - `src/services/order-state-machine.service.ts`
     - `src/services/in-app-notification.service.ts`
     - `src/services/events.service.ts`
     - `src/services/customer-account.service.ts`
     - `src/services/checkout.service.ts`
     - `src/services/cart.service.ts`
     - `src/app/api/discounts/validate/route.ts`
2. **Unified Formatting Utilities (`src/lib/format-utils.ts`)**:
   - Implemented `formatPrice`: Safe currency formatting that gracefully handles `null`, `undefined`, `NaN`, and numeric strings, producing consistent thousand-separated Naira values (e.g. `₦15,000`).
   - Implemented `formatDate`: Deterministic date formatting leveraging `'en-GB'` locale to eliminate Next.js server-vs-client hydration mismatches caused by `toLocaleDateString(undefined)`.
   - Implemented `formatDateTime`: Consistent date and time formatting with graceful fallbacks for invalid timestamps.
3. **Component & Notification Adoptions**:
   - Refactored `CartDrawer.tsx` to replace 3 ad-hoc `Intl.NumberFormat` instances with `formatPrice`.
   - Refactored `ProductCard.tsx` to use `formatPrice`.
   - Refactored customer order pages (`src/app/order/[orderNumber]/page.tsx` and `src/app/account/orders/[orderNumber]/page.tsx`) to use `formatPrice` and `formatDate`.
   - Refactored `src/services/notification.service.ts` to use `formatPrice` for email tables and in-app order notification messages.
4. **Unit Test Suite**:
   - Added `tests/lib/format-utils.test.ts` with 11 test cases covering numeric strings, nulls, NaNs, zero, custom currency symbols, and deterministic date outputs.

## Why
- Eliminate magic string anti-patterns and DRY violations across the data and business service layer.
- Standardize monetary and temporal formatting across the UI, preventing SSR-client hydration mismatch errors and display bugs (e.g. `₦NaN`).

## Files Touched
- `src/lib/constants.ts` (MODIFIED)
- `src/lib/format-utils.ts` (NEW)
- `tests/lib/format-utils.test.ts` (NEW)
- `src/services/customer.service.ts` (MODIFIED)
- `src/services/webhook.service.ts` (MODIFIED)
- `src/services/pricing.service.ts` (MODIFIED)
- `src/services/order-state-machine.service.ts` (MODIFIED)
- `src/services/in-app-notification.service.ts` (MODIFIED)
- `src/services/events.service.ts` (MODIFIED)
- `src/services/customer-account.service.ts` (MODIFIED)
- `src/services/checkout.service.ts` (MODIFIED)
- `src/services/cart.service.ts` (MODIFIED)
- `src/app/api/discounts/validate/route.ts` (MODIFIED)
- `src/components/CartDrawer.tsx` (MODIFIED)
- `src/components/ProductCard.tsx` (MODIFIED)
- `src/app/order/[orderNumber]/page.tsx` (MODIFIED)
- `src/app/account/orders/[orderNumber]/page.tsx` (MODIFIED)
- `src/services/notification.service.ts` (MODIFIED)
- `docs/changes/2026-09-04-clean-code-phase-1-constants-and-formatters.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- Pre-existing flagged failure: `tests/api-routes.test.ts` (`GET /api/products/[slug]`) expects `test-coloring-book` which is absent in the live/mock test environment. Kept untouched outside scope.

## Commit Message
```text
refactor(clean-code): centralize default organization ID and unify currency/date formatters

- Export DEFAULT_ORGANIZATION_ID from constants.ts and replace 10 hardcoded UUID occurrences across services
- Add formatPrice, formatDate, and formatDateTime utilities in format-utils.ts to resolve hydration issues
- Adopt formatPrice and formatDate across CartDrawer, ProductCard, order detail pages, and notification service
- Add comprehensive unit test suite in tests/lib/format-utils.test.ts
```
