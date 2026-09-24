# Historical Customer, Order & Product Import (Bumpa -> Unwind & Doodle)

## What Changed

1. **Database Schema & Migrations**:
   - Added `import_batches` table to track migration batches, status (`pending`, `validating`, `preview`, `importing`, `completed`, `failed`), customer/order/item counts, errors, and mappings.
   - Added `historical_product_mappings` table with unique constraint `(organization_id, source_system, normalized_title)` to persist confirmed merchant product mappings across import batches.
   - Added `source_system`, `source_record_id`, and `import_batch_id` with unique partial indexes to `customers` and `orders` for provenance and idempotent re-imports.
   - Modified `order_items`: made `product_id` nullable, added `mapping_status` (`'mapped' | 'unmapped' | 'ignored'`), `historical_product_title`, and `import_batch_id`.
   - Enabled Row-Level Security on all new tables with organization-scoped policies.

2. **Core Import Services & Parser**:
   - Created `src/lib/csv-parser.ts`: Zero-dependency, RFC 4180-compliant CSV parser and serializer supporting quoted fields, embedded commas, multiline values, escaped quotes, and UTF-8 BOM stripping.
   - Created `src/types/historical-import.ts`: TypeScript interfaces for parsed rows, product summaries, preview reports, batch results, and confirmed mappings.
   - Created `src/services/historical-import.service.ts`:
     - `parseAndValidateBumpaData()`: Auto-detects columns, normalizes emails and phones, parses dates and statuses, groups orders and items, and produces a validation preview report.
     - `executeHistoricalImport()`: Batched execution (50 orders per chunk) writing customers, orders, order items, and payments directly to the database.
     - Strict Marketing Automation Suppression: Never calls `publishDomainEvent` or schedules Inngest jobs for historical imports.
     - Consent Precedence: Preserves existing customer consent (`false` is never flipped to `true`); defaults new customers with unknown consent to `false`.
     - Idempotency: Duplicate source record IDs are skipped without duplicate creation.
     - Product Mapping: Matches against tenant catalog products and saved mappings; preserves unmapped items in history.

3. **Admin API Routes**:
   - `POST /api/admin/marketing/import/preview`: Validates CSV and returns preview metrics.
   - `POST /api/admin/marketing/import/execute`: Executes confirmed migration with merchant product mappings.
   - `GET /api/admin/marketing/import/batches`: Returns past import batch history.

4. **Admin UI**:
   - Created responsive 4-step wizard at `src/app/admin/marketing/import/page.tsx` (Upload & Validate → Product Mapping Review → Validation & Preview Report → Confirm & Execute).
   - Added "Historical Import" link under "Marketing & Growth" in `src/app/admin/AdminLayoutClient.tsx`.

5. **Automated Test Suite**:
   - Created `tests/marketing/historical-import.test.ts` covering CSV parsing, normalization, consent precedence, order status mapping, product mapping, idempotency, marketing isolation, downstream audience/recommendation integration, and multi-tenant isolation.

## Why

To unlock approximately 441 historical customers, 476 orders, and product ownership data from Bumpa for Unwind & Doodle's retention systems (product-aware audiences from Step 17B, dynamic recommendations from Step 17A, customer recognition, and LTV analytics) without accidentally triggering live marketing drips or sending unintended emails for years-old orders.

## Files Touched

- `supabase/migrations/20260922150000_historical_import_schema.sql`
- `src/lib/supabase/types.ts`
- `src/lib/csv-parser.ts`
- `src/types/historical-import.ts`
- `src/services/historical-import.service.ts`
- `src/app/api/admin/marketing/import/preview/route.ts`
- `src/app/api/admin/marketing/import/execute/route.ts`
- `src/app/api/admin/marketing/import/batches/route.ts`
- `src/app/admin/marketing/import/page.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `tests/marketing/historical-import.test.ts`

## Follow-ups / Known Issues

None

## Commit Message

feat(marketing): implement historical customer and order import from bumpa with idempotency and automation isolation
