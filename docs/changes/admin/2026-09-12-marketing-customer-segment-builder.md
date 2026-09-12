# 2026-09-12 — Marketing Customer Segment Builder

Implementation of the dedicated customer segment creation screen (`/admin/marketing/segments/new`), edit experience (`/admin/marketing/segments/[id]`), segment list view (`/admin/marketing/segments`), and supporting API endpoints (`POST /api/admin/marketing/segments`, `POST /api/admin/marketing/segments/preview`, `GET/PATCH/DELETE /api/admin/marketing/segments/[id]`).

## What Changed

1. **In-Flight Segment Preview Engine (`src/services/marketing-segmentation.service.ts`)**:
   - Refactored `resolveCohort` into `resolveCohortRules` to evaluate condition rules directly against customer profiles and purchase statistics without requiring prior persistence in the database.
   - Added `previewSegmentRules` with safe preview limits and total count resolution, strictly enforcing `email_marketing_consent = true` and multi-tenant organization boundaries.

2. **Segment API Endpoints**:
   - `POST /api/admin/marketing/segments`: Validates segment name (required, trimmed, max 100 characters), optional description, and rules via `validateSegmentRules`, persisting to `marketing_segments` with multi-tenant organization isolation.
   - `POST /api/admin/marketing/segments/preview`: Computes real-time dynamic audience counts and preview customer lists for draft rules before saving.
   - `GET /api/admin/marketing/segments/[id]`: Retrieves single segment detail scoped to the authenticated organization.
   - `PATCH /api/admin/marketing/segments/[id]`: Validates and updates segment details and rules.
   - `DELETE /api/admin/marketing/segments/[id]`: Deletes a segment scoped to the organization.

3. **SegmentForm Component (`src/components/admin/marketing/SegmentForm.tsx`)**:
   - Built a reusable, accessible, responsive form supporting both create and edit flows.
   - Match mode toggle (`All conditions` / `Any condition`) with visual feedback.
   - Field-dependent operator selectors for text (`contains`, `equals`, `not_equals`, `starts_with`, `ends_with`, `is_null`, `is_not_null`), boolean (`equals`, `not_equals` with `Yes`/`No` options), date (`after`, `before`, `equals`, `between`, `is_null`, `is_not_null` with `<input type="date">`), and numeric (`greater_than`, `less_than`, `greater_than_or_equal`, `less_than_or_equal`, `equals`, `not_equals`, `between` with `<input type="number">`).
   - Special handling for `is_null`/`is_not_null` (no value input required) and `between` (paired lower/upper inputs with range validation).
   - Debounced (400ms) server-side audience preview showing live matching customer count.
   - "View Matching Customers" modal previewing sample names and emails.
   - Clear informational notice regarding mandatory email marketing consent.

4. **Admin Pages & Navigation**:
   - Created `/admin/marketing/segments/new` (New Segment Page).
   - Created `/admin/marketing/segments/[id]` (Edit Segment Page).
   - Created `/admin/marketing/segments` (Segment List Dashboard with search and quick actions).
   - Added "Segments" to commerce sidebar navigation in `AdminLayoutClient.tsx`.

5. **Automated Testing (`tests/admin/marketing-segments.test.ts`)**:
   - Added 13 automated tests covering preview calculation, consent filtering, API validation errors (empty name, long name, invalid operators/fields), unauthenticated rejection (403), and CRUD operations.

## Why

To allow store administrators and marketers to visually define, preview, and persist customer audience segments using dynamic demographic, consent, and purchase behavior filters, directly powering targeted marketing campaigns without writing SQL or manual JSON payloads.

## Files Touched

- `src/services/marketing-segmentation.service.ts`
- `src/app/api/admin/marketing/segments/route.ts`
- `src/app/api/admin/marketing/segments/preview/route.ts`
- `src/app/api/admin/marketing/segments/[id]/route.ts`
- `src/components/admin/marketing/SegmentForm.tsx`
- `src/app/admin/marketing/segments/page.tsx`
- `src/app/admin/marketing/segments/new/page.tsx`
- `src/app/admin/marketing/segments/[id]/page.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `tests/admin/marketing-segments.test.ts`
- `docs/changes/admin/2026-09-12-marketing-customer-segment-builder.md`

## Follow-ups / Known Issues

None

## Commit Message

```git
feat(marketing): implement create segment screen and audience builder

- Refactor segmentation service to export in-flight rule preview
- Add POST /api/admin/marketing/segments and preview endpoint
- Add GET/PATCH/DELETE endpoints for segment administration
- Build responsive, accessible SegmentForm with field-dependent operators
- Add /admin/marketing/segments/new, /admin/marketing/segments/[id], and list page
- Integrate Segments into admin sidebar navigation
- Add comprehensive automated test suite for segment APIs and preview
```
