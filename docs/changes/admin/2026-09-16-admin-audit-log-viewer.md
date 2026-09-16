# Admin Audit Log Viewer (`/admin/audit-logs`)

## What Changed
- **Type Definitions & Validation (`src/types/admin-audit-log.ts`)**:
  - Implemented `AdminAuditLogFilterSchema` Zod validation schema supporting text search, action filter, entity type filter, actor type (`all`, `admin`, `system`), specific actor ID, date ranges (`startDate`, `endDate`), sort direction (`newest`, `oldest`), and pagination (`page`, `limit`).
  - Defined `AdminAuditLogItem`, `AdminAuditLogDetail`, `AuditLogActor`, and `AdminAuditLogListResponse` types.
- **Service Layer (`src/services/admin-audit-log.service.ts`)**:
  - Implemented `listAdminAuditLogs` to query the database `audit_logs` table scoped strictly to the authenticated organization.
  - Added multi-criteria server-side filtering, payload content text search, newest-first default sorting, and pagination offset calculation.
  - Implemented actor enrichment by cross-referencing `customers` and `organization_members` tables, distinguishing system-automated actions (`actor_id IS NULL`) from authenticated administrators.
  - Implemented dynamic extraction of distinct actions and entity types for UI filter dropdowns.
  - Implemented `getAdminAuditLogById` for single-record retrieval with full before/after state comparison.
- **API Endpoints (`src/app/api/admin/audit-logs/route.ts` & `src/app/api/admin/audit-logs/[id]/route.ts`)**:
  - Created `GET /api/admin/audit-logs` and `GET /api/admin/audit-logs/[id]` with role-based access control enforcing `owner` and `admin` privileges (aligning with database RLS policy `is_organization_admin`).
  - Enforced tenant isolation and error handling (401 unauthenticated, 403 forbidden, 400 invalid params, 404 not found).
- **Admin Navigation (`src/app/admin/AdminLayoutClient.tsx`)**:
  - Added "Audit Logs" (`📜`) to the settings navigation menu guarded by admin permissions.
  - Updated title resolver to display "Audit Logs".
- **Admin UI Page (`src/app/admin/audit-logs/page.tsx`)**:
  - Built responsive `/admin/audit-logs` dashboard page reusing design-system components: `DataTable`, `Badge`, `Modal`, `TextInput`, `Select`, `Button`, and `Breadcrumbs`.
  - Implemented responsive filter bar with debounced search, action/entity/actor dropdowns, date pickers, and clear filters.
  - Integrated `Modal` detail view rendering metadata summary cards, formatted JSON viewers for before and after states, and actor status indicators.
- **Integration Tests (`tests/admin/admin-audit-logs.test.ts`)**:
  - Added 21 tests covering authorization guards, filtering (action, entity, actor type, date range), search, sorting, pagination, detail retrieval, empty results, and error responses.

## Why
- Administrators need a secure, centralized, and filterable view into historical system mutations, order state changes, inventory adjustments, and automated system actions.
- Preserves the existing `audit_logs` schema and RLS boundaries while providing full transparency into who performed an action (or if it was automated by the system) without exposing sensitive backend data.

## Files Touched
- `src/types/admin-audit-log.ts`
- `src/services/admin-audit-log.service.ts`
- `src/app/api/admin/audit-logs/route.ts`
- `src/app/api/admin/audit-logs/[id]/route.ts`
- `src/app/admin/AdminLayoutClient.tsx`
- `src/app/admin/audit-logs/page.tsx`
- `tests/admin/admin-audit-logs.test.ts`
- `docs/changes/admin/2026-09-16-admin-audit-log-viewer.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
feat(admin): build system-wide audit log viewer at /admin/audit-logs
