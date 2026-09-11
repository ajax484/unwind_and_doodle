# Category and Theme Retrieval & Creation Fixes

**Date**: 2026-08-31  
**Feature**: Admin Product & Theme Management  

## What Changed
1. **Organization ID Resolution in API Routes**:
   - Fixed `admin.organizationId` resolving to `undefined` across `/api/admin/themes`, `/api/admin/themes/[themeId]`, and `/api/admin/products/[productId]/themes` by extracting `const orgId = admin.organization?.id || admin.membership?.organizationId`.
2. **Category & Theme Listing Fallback Queries**:
   - Updated `listCategories` and `listOrganizationThemes` to query items matching `organization_id.eq.${orgId}` as well as unassigned/global `organization_id.is.null` items.
3. **Admin Product Creation Page (`/admin/products/new`)**:
   - Added complete Themes subsystem support (theme fetch, toggle, theme assignment on creation, and inline "+ Create New Theme" modal with auto-slug generation).
   - Added response fallback parsing for category and theme endpoints.

## Files Touched
- `src/app/api/admin/themes/route.ts`
- `src/app/api/admin/themes/[themeId]/route.ts`
- `src/app/api/admin/products/[productId]/themes/route.ts`
- `src/services/admin-product.service.ts`
- `src/services/theme.service.ts`
- `src/app/admin/products/new/page.tsx`
- `src/app/admin/products/[productId]/page.tsx`

## Commit Message
`fix: resolve category and theme retrieval scoping and add themes to product creation page`
