# Marketing Step 1H — Email Tracking, Webhooks, and Campaign Analytics

Connects email provider delivery events to the existing marketing event model, processes verified webhooks idempotently, tracks recipient delivery lifecycles safely (preventing status regression from out-of-order events), canonicalizes unsubscribe consent, and exposes accurate unique-recipient campaign analytics in the admin UI.

## What Changed

1. **Provider Webhook Verification & Normalization (`src/services/marketing-provider/`)**:
   - Implemented `verifyMarketingWebhookSignature` in `webhook-verifier.ts` using constant-time HMAC-SHA256 comparison (`crypto.timingSafeEqual`) supporting standard headers (`x-webhook-signature`, `x-signature`, `x-email-signature`) and Svix standard signatures (`svix-signature`, `svix-id`, `svix-timestamp`) via `MARKETING_WEBHOOK_SECRET` / `EMAIL_WEBHOOK_SECRET`.
   - Implemented typed normalization in `webhook-normalizer.ts` mapping provider events to canonical `marketing_email_event_type` (`sent`, `delivered`, `opened`, `clicked`, `bounced`, `failed`, `unsubscribed`).
   - Implemented non-regressing status lifecycle state machine (`canTransitionRecipientStatus`) ensuring out-of-order webhooks (e.g., `delivered` arriving after `opened`) cannot regress status, while still updating milestone timestamps (`delivered_at`, `opened_at`, `clicked_at`, `unsubscribed_at`).

2. **Webhook Ingestion Engine & Route (`src/services/marketing-webhook.service.ts` & `src/app/api/webhooks/email/route.ts`)**:
   - Created `POST /api/webhooks/email` route handler that parses raw payloads, validates cryptographic signatures (rejecting unsigned/invalid requests with 401 Unauthorized), and delegates to `processEmailWebhook`.
   - Correlation: Reliably matches recipients via `recipientId` (from custom header `X-Campaign-Recipient-Id` / tags / metadata), falls back to matching `provider_message_id` from initial sent events, or `campaign_id` + `email`.
   - Idempotency: Deduplicates replayed webhooks matching `provider_event_id` within `marketing_email_events.metadata`.
   - Bounces & Failures: Records bounce reason and error metadata, transitioning recipient status without erasing delivery histories.
   - Canonical Unsubscribe Sync: When an `unsubscribed` event is processed, updates `customers.email_marketing_consent = false` for the linked customer, guaranteeing exclusion from future segmentation cohorts.

3. **Outgoing Header Correlation (`src/services/marketing-dispatcher.service.ts`)**:
   - Enhanced `SendMarketingEmailInput` with optional `headers` and `tags`.
   - Updated `NodemailerMarketingEmailProvider` and `dispatchCampaign` to forward correlation headers (`X-Campaign-Recipient-Id`, `X-Campaign-Id`, `X-Customer-Id`) and tags on outgoing messages.

4. **Campaign Analytics Service & Admin APIs (`src/services/marketing-analytics.service.ts` & `src/app/api/admin/marketing/campaigns/[id]/`)**:
   - Strengthened `getCampaignAnalytics` with unique recipient semantics (counting distinct recipients for opened/clicked metrics rather than raw row counts) and zero-denominator safe rates (`deliveryRate`, `openRate`, `clickRate`, `bounceRate`, `unsubscribeRate`).
   - Added `GET /api/admin/marketing/campaigns/[id]/analytics` returning real-time performance analytics.
   - Added `GET /api/admin/marketing/campaigns/[id]/recipients` returning paginated recipient delivery statuses and timestamps.

5. **Campaign Analytics UI (`src/components/admin/marketing/CampaignAnalyticsView.tsx` & `src/app/admin/marketing/campaigns/[id]/page.tsx`)**:
   - Created responsive `CampaignAnalyticsView` component adapting to all campaign states:
     - **Draft**: Audience estimate and pre-flight notices.
     - **Scheduled**: Scheduled dispatch time and audience estimate.
     - **Sending**: Active dispatch progress indicator with live polling.
     - **Sent / Completed**: 8-metric volume grid (Recipients, Sent, Delivered, Opened, Clicked, Bounced, Failed, Unsubscribed), 5 visual rate cards with progress bars, and a searchable/filterable recipient audit table with status badges and milestone timestamps.
     - **Failed**: Failure banner with error diagnostics and partial tallies.

6. **Automated Tests (`tests/admin/marketing-email-tracking.test.ts`)**:
   - 21 comprehensive tests covering valid/tampered/missing signatures, event normalization, multi-strategy recipient correlation, idempotent replay deduplication, out-of-order status non-regression, bounce/failure logging, canonical unsubscribe consent revocation, unique recipient analytics counting, zero-denominator rate safety, and organization isolation.
   - Added `.contains()` JSONB query filtering to `tests/mocks/supabase.mock.ts`.

## Why

Step 1H closes the delivery loop by bridging email provider webhooks with the marketing data model. It provides business operators with verifiable delivery metrics, accurate engagement tracking, and delivery log auditing, while enforcing data privacy preferences and preventing webhook replay anomalies.

## Files Touched

- `src/lib/config.ts`
- `src/services/marketing-provider/marketing-provider.interface.ts`
- `src/services/marketing-provider/nodemailer-marketing.provider.ts`
- `src/services/marketing-provider/webhook-verifier.ts`
- `src/services/marketing-provider/webhook-normalizer.ts`
- `src/services/marketing-dispatcher.service.ts`
- `src/services/marketing-webhook.service.ts`
- `src/services/marketing-analytics.service.ts`
- `src/app/api/webhooks/email/route.ts`
- `src/app/api/admin/marketing/campaigns/[id]/analytics/route.ts`
- `src/app/api/admin/marketing/campaigns/[id]/recipients/route.ts`
- `src/components/admin/marketing/CampaignAnalyticsView.tsx`
- `src/app/admin/marketing/campaigns/[id]/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/admin/marketing-email-tracking.test.ts`
- `docs/changes/admin/2026-09-12-marketing-email-tracking-analytics.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

```git
feat(marketing): implement email tracking webhooks and campaign analytics

- Add HMAC-SHA256 and Svix email webhook signature verification
- Normalize provider delivery events into canonical marketing types
- Implement recipient correlation and idempotent webhook processing
- Prevent status regression from out-of-order webhooks
- Automatically update canonical customer marketing consent on unsubscribe
- Aggregate unique-recipient campaign performance metrics and rates
- Build responsive CampaignAnalyticsView dashboard with recipient delivery logs
- Add comprehensive automated test suite for tracking and analytics
```
