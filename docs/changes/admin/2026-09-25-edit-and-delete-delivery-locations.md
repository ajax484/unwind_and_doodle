# Edit and Delete Delivery Locations

## What Changed
1. **Backend Service (`src/services/admin-warehouse.service.ts`)**:
   - Added `deleteLocation(supabase, locationId, adminUserId, organizationId)` to safely delete delivery locations with organization boundary validation and audit trail logging (`location.deleted`).
   - Ensured deletion properly cleans up linked warehouse assignments (`warehouse_locations`) and rates (`delivery_rates`) while maintaining historical data integrity.
2. **API Route Handler (`src/app/api/admin/inventory/locations/[locationId]/route.ts`)**:
   - Implemented `DELETE` HTTP handler with admin authentication, parameter validation, and appropriate error handling.
3. **Admin Settings Frontend (`src/app/admin/settings/locations/page.tsx`)**:
   - Added an **Edit Location Modal** allowing administrators to modify location name, state (powered by `ComboBox` with Nigerian states and custom support), and LGA.
   - Added a **Delete Location Modal** with cautionary notice about linked delivery rates and warehouse routes.
   - Added interactive search bar and state filter dropdown for fast lookups.
   - Added desktop table actions and mobile-friendly responsive cards with edit and delete operations.

## Why
Previously, the locations settings page only allowed administrators to create new locations without any ability to correct typos, update geographic boundaries (state/LGA), or remove obsolete or decommissioned delivery locations.

## Files Touched
- `src/services/admin-warehouse.service.ts`
- `src/app/api/admin/inventory/locations/[locationId]/route.ts`
- `src/app/admin/settings/locations/page.tsx`
- `docs/changes/admin/2026-09-25-edit-and-delete-delivery-locations.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
`feat(admin): add edit and delete capabilities for delivery locations`
