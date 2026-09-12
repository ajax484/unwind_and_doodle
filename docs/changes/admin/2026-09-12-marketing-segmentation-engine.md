# 2026-09-12 — Marketing Step 1D: Segmentation Engine

Implementation of the marketing segmentation engine, enabling dynamic execution of `marketing_segments.rules` across customer profiles and purchase history with strict multi-tenant isolation and mandatory email marketing consent enforcement.

## What Changed

1. **Domain Types (`src/types/marketing.ts`)**:
   - Added `SegmentField` distinguishing customer fields (`email`, `first_name`, `last_name`, `email_marketing_consent`, `whatsapp_marketing_consent`, `created_at`) and purchase fields (`last_order_at`, `order_count`, `total_spent`).
   - Added `SegmentOperator` supporting 14 operators (`equals`, `not_equals`, `contains`, `starts_with`, `ends_with`, `before`, `after`, `between`, `greater_than`, `less_than`, `greater_than_or_equal`, `less_than_or_equal`, `is_null`, `is_not_null`).
   - Added `SegmentCondition`, `SegmentRules`, `SegmentCustomer`, `SegmentCustomerOptions`, and `SegmentCustomerPreviewResult`.
   - Added `SegmentRuleValidationError` for granular rule diagnostic errors.

2. **Segmentation Service (`src/services/marketing-segmentation.service.ts`)**:
   - `validateSegmentRules`: Dedicated validation layer enforcing field-operator compatibility, value type correctness, valid ISO date strings, valid finite numbers, 2-element arrays for `between`, and presence of `match` ('all' or 'any') and conditions.
   - `getSegmentCustomers`: Resolves customers matching segment rules while strictly enforcing `email_marketing_consent = true` and organization boundaries. Supports pagination via `limit` and `offset`.
   - `getSegmentCustomerCount`: Returns the current audience size directly without loading all records into memory.
   - `previewSegment`: Previews matched customers respecting a configurable `limit` (default: 20) alongside the exact total audience count.
   - **Purchase Cohort Aggregation**: Derived purchase fields count only valid orders (`status NOT IN ('cancelled', 'refunded')`). Customers with no orders are safely assigned `order_count = 0`, `total_spent = 0`, and `last_order_at = null`.

3. **Unit Tests (`tests/services/marketing-segmentation.test.ts`)**:
   - Added 14 unit tests covering rule validation, field-operator compatibility, customer and purchase field evaluation, logical `all` and `any` matching, zero-order customer handling, consent enforcement, organization isolation, and count/preview functions.

## Why

To make `marketing_segments.rules` executable against customer records and purchase data, allowing the application to dynamically resolve target audiences for upcoming campaign creation without manual list maintenance or privacy violations.

## Files Touched

- `src/types/marketing.ts`
- `src/services/marketing-segmentation.service.ts`
- `tests/services/marketing-segmentation.test.ts`
- `docs/changes/admin/2026-09-12-marketing-segmentation-engine.md`

## Follow-ups / Known Issues

- None for Step 1D.
- Step 1E will integrate campaign execution (audience snapshot generation, campaign recipients creation, and dispatch preparation).

## Commit Message

feat(marketing): build segmentation engine and rule validation layer
