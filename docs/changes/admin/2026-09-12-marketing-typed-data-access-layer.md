# 2026-09-12 — Marketing Step 1C: Server-Side Typed Data Access Layer

Implementation of the server-side typed data access layer for the marketing foundation (`marketing_segments`, `marketing_campaigns`, `marketing_campaign_recipients`, `marketing_email_events`, `marketing_automations`), enforcing multi-tenant organization isolation and deriving application types directly from Supabase database types.

## What Changed

1. **Supabase Database Types (`src/lib/supabase/types.ts`)**:
   - Added `marketing_segments`, `marketing_campaigns`, `marketing_campaign_recipients`, `marketing_email_events`, and `marketing_automations` tables with `Row`, `Insert`, `Update`, and foreign-key `Relationships`.
   - Added 6 marketing enums (`marketing_campaign_type`, `marketing_campaign_status`, `marketing_recipient_status`, `marketing_automation_type`, `marketing_automation_status`, `marketing_email_event_type`) to `Database["public"]["Enums"]` and `Constants.public.Enums`.
   - Exported typed aliases: `MarketingCampaignType`, `MarketingCampaignStatus`, `MarketingRecipientStatus`, `MarketingAutomationType`, `MarketingAutomationStatus`, and `MarketingEmailEventType`.

2. **Domain & Input Types (`src/types/marketing.ts`)**:
   - Derived typed models: `MarketingSegment`, `MarketingCampaign`, `MarketingCampaignRecipient`, `MarketingEmailEvent`, `MarketingAutomation`.
   - Defined strict input and filter interfaces: `CreateMarketingSegmentInput`, `UpdateMarketingSegmentInput`, `CreateMarketingCampaignInput`, `UpdateMarketingCampaignInput`, `CreateMarketingAutomationInput`, `UpdateMarketingAutomationInput`, `MarketingSegmentFilter`, `MarketingCampaignFilter`, `MarketingRecipientFilter`, `MarketingEmailEventFilter`, `MarketingAutomationFilter`.
   - Defined aggregated count and analytics interfaces: `RecipientStatusCounts`, `CampaignEventCounts`, `CampaignAnalytics`.
   - Defined standardized pagination helpers: `PaginationParams`, `PaginatedResult<T>`.

3. **Data Access Services (`src/services/`)**:
   - `marketing-segment.service.ts`: Implemented `getSegments`, `getSegmentById`, `createSegment`, `updateSegment`, `deleteSegment` with organization scoping, active status filtering, search querying, and pagination.
   - `marketing-campaign.service.ts`: Implemented `getCampaigns` with explicit projection columns, `getCampaignById` with full entity projection, `createCampaign` with segment organization verification, `updateCampaign`, `updateCampaignStatus`, and `deleteCampaign`.
   - `marketing-recipient.service.ts`: Implemented `getCampaignRecipients`, `getCampaignRecipientById`, `getCampaignRecipientCounts` (aggregating all 9 recipient statuses), `getCampaignEvents`, `getRecipientEvents`, and `getCampaignEventCounts` (aggregating all 7 event types).
   - `marketing-analytics.service.ts`: Implemented `getCampaignAnalytics` calculating recipients, sent, delivered, opened, clicked, bounced, failed, and unsubscribed counts alongside safe zero-denominator rates (`deliveryRate`, `openRate`, `clickRate`, `bounceRate`, `unsubscribeRate`).
   - `marketing-automation.service.ts`: Implemented `getAutomations`, `getAutomationById`, `createAutomation`, `updateAutomation`, `updateAutomationStatus`, and `deleteAutomation` with organization scoping.

4. **Test Infrastructure & Test Suite**:
   - Updated `tests/mocks/supabase.mock.ts` with initial mock stores for all 5 marketing tables.
   - Added `tests/services/marketing-data-access.test.ts` with 19 comprehensive Vitest unit tests verifying multi-tenant isolation, CRUD, counts, filtering, analytics rate calculations, and zero-denominator handling.

## Why

To establish a clean, strictly typed, and organization-isolated server-side data access layer between the database foundation and upcoming marketing workflows (segment rule evaluation, campaign creation, and analytics dashboards) without leaking server secrets or bypassing RLS.

## Files Touched

- `src/lib/supabase/types.ts`
- `src/types/marketing.ts`
- `src/services/marketing-segment.service.ts`
- `src/services/marketing-campaign.service.ts`
- `src/services/marketing-recipient.service.ts`
- `src/services/marketing-analytics.service.ts`
- `src/services/marketing-automation.service.ts`
- `tests/mocks/supabase.mock.ts`
- `tests/services/marketing-data-access.test.ts`
- `docs/changes/admin/2026-09-12-marketing-typed-data-access-layer.md`

## Follow-ups / Known Issues

- None for Step 1C.
- Step 1D will implement segment audience rule evaluation and customer filtering.

## Commit Message

feat(marketing): implement typed server-side data access layer
