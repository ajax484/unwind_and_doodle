# Reusable Delivery Rate Templates & Bulk Setup Integration

## What Changed

1. **Database Schema & Migration** (`supabase/migrations/20260914160000_delivery_rate_templates.sql`):
   - Created `delivery_rate_templates` table scoped to `organization_id` with `name`, `description`, `amount`, `currency`, `is_active`, `created_at`, and `updated_at`.
   - Added `delivery_rate_templates_admin_all` Row-Level Security policy enforcing organization boundaries.
   - Added optional nullable `template_id` foreign key referencing `delivery_rate_templates(id) ON DELETE SET NULL` on `delivery_rates`.

2. **Backend Services & CRUD Operations** (`src/services/admin-warehouse.service.ts`):
   - Implemented `listDeliveryRateTemplates`, `createDeliveryRateTemplate`, `updateDeliveryRateTemplate`, and `deleteDeliveryRateTemplate`.
   - Upgraded `bulkCreateDeliveryZones` to resolve template amounts server-side, validate template ownership and active status, record `template_id` on `delivery_rates`, and support mix-and-match manual pricing.
   - Enforced safe deletion: deleting a template nullifies foreign keys on existing delivery rates, ensuring existing shipping pricing and checkout calculations are never disrupted.

3. **API Endpoints**:
   - `GET /api/admin/settings/delivery-rate-templates`: Lists templates for the authenticated admin's organization.
   - `POST /api/admin/settings/delivery-rate-templates`: Creates a template with Zod schema validation and audit logging.
   - `PATCH /api/admin/settings/delivery-rate-templates/[templateId]`: Updates template fields or active status.
   - `DELETE /api/admin/settings/delivery-rate-templates/[templateId]`: Safely deletes template.

4. **Delivery Management UI** (`src/app/admin/settings/delivery/page.tsx`, `src/components/admin/delivery/DeliveryRateTemplatesManager.tsx`):
   - Introduced tabbed view switching between **Delivery Zones** and **Rate Templates**.
   - Built `DeliveryRateTemplatesManager` with responsive table/card layout, search, active toggle, compact creation/edit modals, and deletion confirmation dialog.
   - Prefetched rate templates for the bulk modal.

5. **Bulk Delivery Zone Setup Enhancements** (`src/components/admin/delivery/BulkDeliveryZonesModal.tsx`):
   - Added **Use rate template** mode in Step 2 with active template dropdown and estimated cost calculation.
   - Added **Batch template assignment** in Individual mode allowing admins to select multiple locations in the table and apply a template to all of them at once.
   - Added **Conflict handling for existing rates** with per-location and bulk controls (`Keep existing` vs `Replace with template/new rate`).
   - Enhanced Step 3 Review with grouped template breakdown (e.g. *Mainland template: 6 locations × ₦2,000*), custom rate count, and explicit existing rate replacement warnings.

## Why

Setting delivery fees repeatedly across dozens of locations was tedious and prone to pricing inconsistencies. Introducing reusable delivery-rate templates allows admins to define standard pricing tiers once (e.g., Mainland, Island, Interstate) and apply them quickly to single or multiple delivery zones, while maintaining 100% backward compatibility with existing checkout calculation and database schemas.

## Files Touched

- `supabase/migrations/20260914160000_delivery_rate_templates.sql`
- `src/lib/supabase/types.ts`
- `src/types/admin-inventory.ts`
- `src/services/admin-warehouse.service.ts`
- `src/app/api/admin/settings/delivery-rate-templates/route.ts`
- `src/app/api/admin/settings/delivery-rate-templates/[templateId]/route.ts`
- `src/components/admin/delivery/DeliveryRateTemplatesManager.tsx`
- `src/components/admin/delivery/BulkDeliveryZonesModal.tsx`
- `src/app/admin/settings/delivery/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/admin/admin-delivery-zones.test.ts`
- `docs/changes/admin/2026-09-14-delivery-rate-templates.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

feat(admin): add reusable delivery rate templates and bulk setup integration
