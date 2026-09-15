# Admin Category Management & Dynamic Homepage Collections

Comprehensive category management in the admin backoffice with dedicated UI, database migration for category descriptions, API CRUD routes, and dynamic homepage storefront collections.

## What Changed

1. **Database Schema & Migration**:
   - Added `description text DEFAULT NULL` to `public.categories` via migration [`20260915170000_add_category_description.sql`](file:///c:/Users/USER/work/unwind_and_doodle/supabase/migrations/20260915170000_add_category_description.sql).
   - Updated TypeScript database definitions in [`types.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/lib/supabase/types.ts).

2. **Backend & Services**:
   - Enhanced `listCategories` in [`admin-product.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/admin-product.service.ts) to calculate real-time `product_count` for each category.
   - Enhanced `createCategory` to accept custom slugs and descriptions.
   - Added `updateCategory` with slug validation, organization boundary checks, and description updates.
   - Added `deleteCategory` returning counts of detached products and discounts.
   - Created admin route [`/api/admin/categories/[id]/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/admin/categories/%5Bid%5D/route.ts) handling `PATCH` and `DELETE`.
   - Created public route [`/api/categories/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/categories/route.ts) for storefront access.

3. **Admin UI & Navigation**:
   - Built dedicated Category Management page [`/admin/categories/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/categories/page.tsx) with search filtering, sorting, product count badges, create modal, edit modal, and delete confirmation modal with product detachment warnings.
   - Added "Categories" link to "Catalog & Stock" in [`AdminLayoutClient.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/AdminLayoutClient.tsx).
   - Added "Categories" navigation shortcut button to the product catalog header in [`/admin/products/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/products/page.tsx).
   - Added "Manage all categories ↗" link in the category selector on [`/admin/products/new/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/products/new/page.tsx) and [`/admin/products/[productId]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/products/%5BproductId%5D/page.tsx).

4. **Storefront Dynamic Categories**:
   - Updated [`CategoryGrid.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/CategoryGrid.tsx) on the homepage to fetch live categories and descriptions from `/api/categories`, with skeleton loading and graceful fallback states.

5. **Automated Testing**:
   - Added comprehensive unit and service test suite [`admin-categories.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/admin/admin-categories.test.ts) covering listing, counting, creation, slug uniqueness, updating, and cascade deletion.

## Why

Admins previously could only add new category names inline from product forms, with no way to edit typos, modify descriptions, customize URL slugs, or delete obsolete categories. Furthermore, the storefront homepage category section was statically hardcoded rather than reflecting real catalog categories and descriptions.

## Files Touched

- [`supabase/migrations/20260915170000_add_category_description.sql`](file:///c:/Users/USER/work/unwind_and_doodle/supabase/migrations/20260915170000_add_category_description.sql)
- [`src/lib/supabase/types.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/lib/supabase/types.ts)
- [`src/types/admin-product.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/types/admin-product.ts)
- [`src/services/admin-product.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/admin-product.service.ts)
- [`src/app/api/admin/categories/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/admin/categories/route.ts)
- [`src/app/api/admin/categories/[id]/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/admin/categories/%5Bid%5D/route.ts)
- [`src/app/api/categories/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/categories/route.ts)
- [`src/app/api/products/route.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/products/route.ts)
- [`src/app/admin/categories/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/categories/page.tsx)
- [`src/app/admin/AdminLayoutClient.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/AdminLayoutClient.tsx)
- [`src/app/admin/products/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/products/page.tsx)
- [`src/app/admin/products/new/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/products/new/page.tsx)
- [`src/app/admin/products/[productId]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/products/%5BproductId%5D/page.tsx)
- [`src/components/home/CategoryGrid.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/CategoryGrid.tsx)
- [`tests/admin/admin-categories.test.ts`](file:///c:/Users/USER/work/unwind_and_doodle/tests/admin/admin-categories.test.ts)

## Follow-ups / Known Issues

None

## Commit Message

feat(admin): category management with edit, delete, descriptions and dynamic homepage cards
