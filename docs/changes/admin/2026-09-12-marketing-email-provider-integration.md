# Marketing Step 1G — Email Provider Integration

Connects the marketing campaign composer to the application's existing email infrastructure (**Nodemailer** / SMTP), enabling live test email dispatching, full campaign sending with dynamic consent re-verification, recipient snapshot creation, personalized delivery, signed unsubscribe links, and scheduled execution.

## What Changed

1. **Provider Abstraction (`src/services/marketing-provider/`)**:
   - Defined `MarketingEmailProvider`, `SendMarketingEmailInput`, and `SendMarketingEmailResult` contracts.
   - Implemented `NodemailerMarketingEmailProvider` reusing existing SMTP configuration from `src/lib/config.ts` and `getTransporter()` from `src/services/notification.service.ts` (with `jsonTransport` fallback in testing/dev environments).
   - Provided `getMarketingEmailProvider()` and `setMarketingEmailProvider()` for runtime dependency injection and test mocking.

2. **Unsubscribe Token & Security (`src/lib/marketing-token.ts`)**:
   - Implemented HMAC-SHA256 signed token generation (`generateMarketingUnsubscribeToken`) and validation (`verifyMarketingUnsubscribeToken`) for tamper-proof unsubscribe links containing `customerId`, `organizationId`, and `campaignId`.
   - Created public `/unsubscribe` page (`src/app/unsubscribe/page.tsx`) and API route (`src/app/api/marketing/unsubscribe/route.ts`) that permanently sets `customers.email_marketing_consent = false` for that organization and logs an `unsubscribed` event in `marketing_email_events`.

3. **Campaign Dispatcher Engine (`src/services/marketing-dispatcher.service.ts`)**:
   - **`sendTestEmail`**: Validates campaign and dispatches a single test email without creating recipient records or analytics events.
   - **`dispatchCampaign`**:
     - Concurrency prevention via atomic campaign status transition from `draft`/`scheduled` to `sending`.
     - Dynamically re-evaluates audience via `getSegmentCustomers`, strictly enforcing `email_marketing_consent = true` and organization boundaries.
     - Creates recipient snapshot records in `marketing_campaign_recipients` as `pending`.
     - Delivers emails in controlled batches of 25 with personalized variables (`{{first_name}}`, `{{last_name}}`, `{{email}}`) and signed unsubscribe links.
     - Updates recipient status to `sent` or `failed` with error logging.
     - Inserts `sent` / `failed` events in `marketing_email_events` with `provider_message_id`.
     - Transitions campaign status to `sent` or `failed`.
   - **`dispatchDueScheduledCampaigns`**: Finds all due scheduled campaigns (`scheduled_at <= NOW() AND status = 'scheduled'`) and triggers execution.

4. **API Routes (`src/app/api/admin/marketing/` & `src/app/api/marketing/`)**:
   - Updated `POST /api/admin/marketing/campaigns/[id]/test-send` to deliver live test emails via `sendTestEmail`.
   - Added `POST /api/admin/marketing/campaigns/[id]/send` to execute live campaign dispatch.
   - Added `GET /api/admin/marketing/campaigns/[id]/progress` to return real-time 9-status recipient counts.
   - Added `POST /api/admin/marketing/campaigns/dispatch-scheduled` to trigger due scheduled campaign processing.
   - Added `GET/POST /api/marketing/unsubscribe` to process signed unsubscribe requests.

5. **UI Updates (`src/components/admin/marketing/` & `src/app/admin/`)**:
   - Updated `TestSendModal.tsx` to handle live provider dispatch responses.
   - Connected "Send Now" in `CampaignComposer.tsx` to trigger immediate live campaign dispatch.
   - Added a live Delivery Progress dashboard on `src/app/admin/marketing/campaigns/[id]/page.tsx` showing audience total, sent count, failed count, and in-queue status with auto-polling while sending.

6. **Automated Tests (`tests/admin/marketing-provider-integration.test.ts`)**:
   - 14 comprehensive tests covering provider delivery, failure handling, test email isolation, dynamic consent re-check, recipient snapshotting, personalization substitution, signed unsubscribe tokens, customer consent revocation, idempotency/double-dispatch prevention, cross-tenant isolation, and scheduled execution.
   - Updated `tests/mocks/supabase.mock.ts` to support `.upsert()` with `onConflict` and conflict ignoring.

## Why

Step 1G bridges the gap between campaign composition and real delivery. It ensures store owners can reliably send campaigns to consenting customers, respect privacy preferences with cryptographic unsubscribe links, maintain database audit trails, and schedule future announcements without pulling in secondary email providers or exposing secrets to the browser.

## Files Touched

- `src/services/marketing-provider/marketing-provider.interface.ts`
- `src/services/marketing-provider/nodemailer-marketing.provider.ts`
- `src/lib/marketing-token.ts`
- `src/services/marketing-dispatcher.service.ts`
- `src/app/api/admin/marketing/campaigns/[id]/test-send/route.ts`
- `src/app/api/admin/marketing/campaigns/[id]/send/route.ts`
- `src/app/api/admin/marketing/campaigns/[id]/progress/route.ts`
- `src/app/api/admin/marketing/campaigns/dispatch-scheduled/route.ts`
- `src/app/api/marketing/unsubscribe/route.ts`
- `src/app/unsubscribe/page.tsx`
- `src/components/admin/marketing/TestSendModal.tsx`
- `src/components/admin/marketing/CampaignComposer.tsx`
- `src/app/admin/marketing/campaigns/[id]/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/admin/marketing-provider-integration.test.ts`
- `docs/changes/admin/2026-09-12-marketing-email-provider-integration.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

- None for Step 1G.
- Step 1H will implement delivery webhooks, bounce/open/click tracking, and provider event ingestion.

## Commit Message

feat(marketing): integrate nodemailer provider, live campaign dispatch, and unsubscribe system
