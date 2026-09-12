# 2026-09-12 — Marketing Starter Seed Segments

Added the 6 standard customer seed segments across the Unwind & Doodle marketing platform: All Email Subscribers, New Customers, Never Purchased, Repeat Customers, High-Value Customers, and Customers Who Haven't Purchased Recently.

## What Changed

1. **Database Migration (`supabase/migrations/20260912000001_seed_marketing_segments.sql`)**:
   - Idempotent migration inserting the 6 seed segments into `public.marketing_segments` for each organization in `public.organizations`.
   - Prevents duplicate insertion by checking for existing segments with identical names per organization.

2. **Service Definitions & Seeder (`src/services/marketing-segment.service.ts`)**:
   - Exported `getSeedSegmentDefinitions()` with pre-configured rules and descriptions for all 6 starter segments:
     - **All Email Subscribers**: `email_marketing_consent = true`
     - **New Customers**: `order_count = 1`
     - **Never Purchased**: `order_count = 0`
     - **Repeat Customers**: `order_count >= 2`
     - **High-Value Customers**: `total_spent >= 50000`
     - **Customers Who Haven't Purchased Recently**: `order_count >= 1` AND `last_order_at < 90_days_ago`
   - Exported `seedDefaultSegments(supabase, organizationId)` to idempotently populate missing default segments.

3. **API Endpoint (`src/app/api/admin/marketing/segments/seed/route.ts`)**:
   - `POST /api/admin/marketing/segments/seed`: Authenticates the admin session and seeds missing starter segments for the tenant organization.

4. **Segment Form Templates (`src/components/admin/marketing/SegmentForm.tsx`)**:
   - Added a "Start from a Recommended Template" button group when creating a new segment, allowing administrators to pick from the 6 archetypes to autofill rules, description, and conditions with instant live audience preview.

5. **Segment List Quick Action (`src/app/admin/marketing/segments/page.tsx`)**:
   - Added a "🌱 Load Starter Segments" button in the header (when fewer than 6 segments exist) and directly in the empty state callout.

6. **Automated Unit Tests (`tests/admin/marketing-segments.test.ts`)**:
   - Added tests verifying that all 6 seed segment rules pass `validateSegmentRules` without errors.
   - Added tests for `seedDefaultSegments` idempotency and the `POST /api/admin/marketing/segments/seed` API route.

## Why

To provide store owners with immediate, industry-standard marketing cohorts out-of-the-box (such as first-time buyers, repeat purchasers, high-spenders, and winback targets) without requiring them to manually design common rule combinations from scratch.

## Files Touched

- `supabase/migrations/20260912000001_seed_marketing_segments.sql`
- `src/services/marketing-segment.service.ts`
- `src/app/api/admin/marketing/segments/seed/route.ts`
- `src/components/admin/marketing/SegmentForm.tsx`
- `src/app/admin/marketing/segments/page.tsx`
- `tests/admin/marketing-segments.test.ts`
- `docs/changes/admin/2026-09-12-marketing-seed-segments.md`

## Follow-ups / Known Issues

None

## Commit Message

```git
feat(marketing): add starter seed segments and template builder presets

- Add idempotent migration 20260912000001_seed_marketing_segments.sql for 6 starter cohorts
- Define getSeedSegmentDefinitions and seedDefaultSegments in marketing-segment.service.ts
- Create POST /api/admin/marketing/segments/seed API endpoint
- Add template quick-fill selector in SegmentForm and Load Starter Segments action in segments list
- Add comprehensive vitest coverage for rule validation, seeding, and endpoint security
```
