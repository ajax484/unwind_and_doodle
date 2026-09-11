# Phase 3C: Product Catalog (`/products`)

## What Changed
1. **Catalog Service & API Enhancements (`src/services/catalog.service.ts`, `src/app/api/products/route.ts`)**:
   - Added multi-field search across product name, description, and SKU.
   - Added sorting support for `featured`, `newest`, `price-asc` (Low to High), and `price-desc` (High to Low).
   - Added `inStockOnly` availability filtering.
   - Added pagination support (`page`, `limit`) and returned metadata (`total`, `page`, `totalPages`, `categories`).
2. **Product Catalog Page (`src/app/products/page.tsx`)**:
   - Implemented editorial header: *"Shop — Everything made for your creative moments."*
   - Added dynamic category filter pills with live selection state.
   - Added debounced live search with clear button.
   - Added sorting dropdown and in-stock toggle.
   - Added dynamic product counter and active filter tags with quick removal and clear-all controls.
   - Responsive grid rendering: 4 columns on desktop (`lg:grid-cols-4`), 3 columns on tablet (`md:grid-cols-3`), 2 columns on mobile (`grid-cols-2`).
   - Integrated previous/next pagination controls.
   - Synchronized all search, category, sort, stock, and pagination state with browser URL query parameters (`?q=...&category=...&sort=...&inStock=...&page=...`), preserving back/forward navigation and shareability.
   - Built skeleton loading cards and empty state with clear filters button.
3. **Automated Testing Suite (`tests/catalog-page.test.ts`)**:
   - 8 new unit/integration tests validating multi-field search, category filtering, stock availability filtering, price sorting, newest sorting, and pagination.
   - 96/96 tests passing across all 11 test suites in the workspace.

## Why
To empower customers to discover, search, filter, and sort products across desktop, tablet, and mobile devices while keeping the URL state shareable and persistent across navigation.

## Files Touched
- `src/services/catalog.service.ts` [MODIFIED]
- `src/app/api/products/route.ts` [MODIFIED]
- `src/app/products/page.tsx` [MODIFIED]
- `tests/catalog-page.test.ts` [NEW]
- `docs/changes/2026-08-30-product-catalog.md` [NEW]

## Follow-ups / Known Issues
- None.

## Commit Message
```text
feat(storefront): build Phase 3C customer product catalog page

- Implement multi-field search (name, description, SKU) in catalog service
- Add sorting (featured, newest, price asc/desc) and in-stock availability filtering
- Build responsive 2/3/4-column catalog page with category pills and toolbar
- Synchronize all search, category, sort, and pagination state with URL query parameters
- Add comprehensive catalog test suite (96/96 tests passing)
```
