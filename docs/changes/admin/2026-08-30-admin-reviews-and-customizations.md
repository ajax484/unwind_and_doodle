# Change Document: Phase 6F — Reviews & Customer Customization Management

**Date:** 2026-08-30  
**Feature:** Phase 6F — Reviews & Customer Customization Management  
**Status:** Completed & Verified  

---

## 1. What Changed

1. **Admin Review & Customization Types and Zod Schemas**:
   - Created `src/types/admin-review-customization.ts` defining validation schemas for review filtering, review moderation (`approve` / `reject`), customization filtering, and processed line-art attachment.
   - Defined comprehensive response interfaces for review list items, summary rating KPIs, review details with customer photos, customization queue items, and customization detail workspaces.

2. **Service Layer Implementations**:
   - Implemented `src/services/admin-review.service.ts`:
     - `listAdminReviews`: Server-side filtering by moderation status (`pending`, `approved`, `rejected`), star rating (1..5★), product; searching across reviewer name, email, product title, and review body; server-side pagination; and calculation of average store rating and pending counts.
     - `getAdminReviewDetail`: Aggregates review, customer details, product details, order details, and attached review photos.
     - `moderateReview`: Approves or rejects reviews, setting `published_at = now()` on approval or clearing it on rejection, recording audit logs (`review.approved` / `review.rejected`), and publishing domain event `review.moderated`.
     - `deleteReviewImage`: Deletes review image record from `review_images` and records audit log (`review.image_deleted`).
   - Implemented `src/services/admin-customization.service.ts`:
     - `listAdminCustomizations`: Multi-asset custom book order queue joining `customizations` -> `order_items` -> `orders`, reporting total and processed asset counts, and tracking pending/processing/completed statuses.
     - `getAdminCustomizationDetail`: Multi-asset artwork workspace with original download URLs, line-art status, and completion state.
     - `startCustomizationProcessing`: Moves status to `processing`, logs audit trail (`customization.processing_started`), and emits domain event.
     - `setProcessedAsset`: Attaches converted coloring-book line-art path to individual assets in `customization_assets`, automatically advances customization to `processing`, logs audit trail, and emits `customization.asset_processed`.
     - `completeCustomization`: Enforces validation that all uploaded photos have attached line-art files before marking as `completed`, sets `completed_at`, logs audit trail (`customization.completed`), and emits domain event.

3. **RESTful Admin API Endpoints**:
   - `GET /api/admin/reviews` (List with filters/search/KPIs)
   - `GET /api/admin/reviews/[id]` (Detail)
   - `POST /api/admin/reviews/[id]/moderate` (Approve/Reject review)
   - `DELETE /api/admin/reviews/[id]/images/[imageId]` (Delete customer photo)
   - `GET /api/admin/customizations` (Queue with status filters and pending count)
   - `GET /api/admin/customizations/[id]` (Workspace detail)
   - `POST /api/admin/customizations/[id]/start` (Start processing)
   - `POST /api/admin/customizations/[id]/assets/[assetId]/processed` (Attach line-art)
   - `POST /api/admin/customizations/[id]/complete` (Mark artwork completed)

4. **Responsive Admin UI Pages**:
   - `src/app/admin/reviews/page.tsx`: Reviews moderation hub with 5 summary cards, search, status tabs, star rating dropdown, desktop table, mobile cards, and quick approve/reject actions.
   - `src/app/admin/reviews/[reviewId]/page.tsx`: Review moderation workspace with linked customer, product, and order cards, full review text, photo gallery, and moderation controls.
   - `src/app/admin/customizations/page.tsx`: Custom coloring-book operational queue with urgent pending counts, status filter tabs, search, progress bars, and workspace links.
   - `src/app/admin/customizations/[customizationId]/page.tsx`: Multi-asset artwork workspace with per-asset original download, line-art upload/replace modal, progress indicator, and completion gate.

5. **Automated Testing Suite**:
   - Created `tests/admin-reviews-and-customizations.test.ts` with 14 unit and integration tests covering review moderation, public storefront review isolation (ensuring pending/rejected reviews are never shown publicly), review image deletion, customization queue, per-asset line-art upload, completion gating, domain events, and multi-tenant security barriers.
   - **All 22 test files (222 tests) passed with 0 failures**.

---

## 2. Why the Changes Were Made

Store administrators require a moderation system to approve authentic customer product reviews and an operational workspace to manage customer-uploaded photos, convert them to printable coloring-book line art, and track artwork completion before physical print fulfillment.

---

## 3. Files Touched

- `src/types/admin-review-customization.ts`
- `src/services/admin-review.service.ts`
- `src/services/admin-customization.service.ts`
- `src/app/api/admin/reviews/route.ts`
- `src/app/api/admin/reviews/[id]/route.ts`
- `src/app/api/admin/reviews/[id]/moderate/route.ts`
- `src/app/api/admin/reviews/[id]/images/[imageId]/route.ts`
- `src/app/api/admin/customizations/route.ts`
- `src/app/api/admin/customizations/[id]/route.ts`
- `src/app/api/admin/customizations/[id]/start/route.ts`
- `src/app/api/admin/customizations/[id]/assets/[assetId]/processed/route.ts`
- `src/app/api/admin/customizations/[id]/complete/route.ts`
- `src/app/admin/reviews/page.tsx`
- `src/app/admin/reviews/[reviewId]/page.tsx`
- `src/app/admin/customizations/page.tsx`
- `src/app/admin/customizations/[customizationId]/page.tsx`
- `tests/admin-reviews-and-customizations.test.ts`

---

## 4. Follow-ups & Known Issues

- None. Automated AI/worker image processing can integrate directly with `setProcessedAsset` and `completeCustomization` in future pipeline automation phases.

---

## 5. Commit Message

```text
feat: implement admin reviews and customer customization management (Phase 6F)

- Add admin review service with moderation, average rating stats, and photo management
- Add admin customization service with multi-asset line-art tracking and completion gating
- Implement REST API routes for reviews moderation and customization artwork operations
- Build responsive admin pages for review hub, review detail, custom queue, and artwork workspace
- Add 14 integration tests covering review isolation, asset attachments, and multi-tenant security
```
