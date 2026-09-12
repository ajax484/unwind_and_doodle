# Marketing Step 1F — Campaign Composer

Builds the email marketing campaign creation, draft editing, dynamic audience preview, content editing with personalization tokens, visual preview, test email boundary, and scheduling experience for Unwind & Doodle.

## What Changed

1. **HTML Sanitization & Personalization Utility (`src/lib/sanitize-html.ts`)**:
   - Implemented a lightweight, robust HTML sanitizer (`sanitizeHtml`) that strips `<script>`, `<iframe>`, `<style>`, `<object>`, event handlers (`onload`, `onclick`), and `javascript:` URLs while allowing standard email tags and safe attributes (`href`, inline styles).
   - Added `replacePersonalizationTags` to substitute `{{first_name}}` and `{{last_name}}` with customer values and graceful fallbacks.

2. **Campaign Validation & Test Send Boundary (`src/services/marketing-campaign.service.ts`)**:
   - Added `validateCampaignForDelivery` to strictly validate required fields (`name`, `subject`, `sender_name`, `sender_email`, `segment_id`, `content`).
   - Added `sendCampaignTestEmailPlaceholder` as a dedicated server boundary for Step 1G, returning a controlled `configured: false` response in Step 1F without fake deliveries.

3. **Admin Marketing API Routes (`src/app/api/admin/marketing/`)**:
   - `GET /api/admin/marketing/campaigns` & `POST /api/admin/marketing/campaigns`: Campaign list and draft creation routes.
   - `GET /api/admin/marketing/campaigns/[id]`, `PATCH /api/admin/marketing/campaigns/[id]`, `DELETE /api/admin/marketing/campaigns/[id]`: Single campaign read, update, and deletion.
   - `POST /api/admin/marketing/campaigns/[id]/test-send`: Test email validation and provider-not-configured response boundary.
   - `GET /api/admin/marketing/segments`: Fetches active customer segments for audience dropdown.
   - `GET /api/admin/marketing/segments/[id]/count`: Fetches dynamic audience count via the Step 1D segmentation engine (enforcing consent and organization boundaries).

4. **Marketing UI Components (`src/components/admin/marketing/`)**:
   - `EmailEditor.tsx`: Rich text formatting toolbar (H1, H2, Paragraph, Bold, Italic, Lists, Links) and one-click personalization tokens (`{{first_name}}`, `{{last_name}}`).
   - `EmailPreview.tsx`: Realistic email client simulator with Desktop / Mobile viewport switcher tabs, envelope headers (From, To, Subject, Preview text), and sanitized email body.
   - `TestSendModal.tsx`: Modal for triggering test delivery validation with clear status messaging.
   - `ScheduleModal.tsx`: Confirmation dialog displaying campaign summary, dynamic audience caveat, and "Send Now" vs "Schedule for Later" with `datetime-local` input.
   - `CampaignComposer.tsx`: Unified composer client component supporting draft creation, editing, live audience count estimation, unsaved change tracking, and modal orchestration.

5. **Admin Pages & Layout (`src/app/admin/`)**:
   - `src/app/admin/marketing/campaigns/page.tsx`: Marketing campaign list page with status filter tabs, search, status badges, and "+ Create Campaign" action.
   - `src/app/admin/marketing/campaigns/new/page.tsx`: New campaign page hosting `CampaignComposer`.
   - `src/app/admin/marketing/campaigns/[id]/page.tsx`: Draft edit and view page hosting `CampaignComposer`.
   - `src/app/admin/AdminLayoutClient.tsx`: Registered Campaigns in sidebar navigation, page title mappings, and breadcrumb labels.

6. **Comprehensive Automated Tests (`tests/admin/marketing-campaign-composer.test.ts`)**:
   - 13 new unit and integration tests covering campaign creation validation, dynamic consent-aware audience counting, cross-tenant isolation, draft persistence, HTML sanitization, personalization substitutions, scheduling, and test-send boundary responses.

## Why

Step 1F completes the marketing campaign composition experience, enabling store admins to craft targeted email campaigns, verify dynamic segment sizes against consenting customer cohorts, format content with customer personalization, preview viewports, and schedule drafts without implementing live delivery infrastructure before Step 1G.

## Files Touched

- `src/lib/sanitize-html.ts`
- `src/services/marketing-campaign.service.ts`
- `src/app/api/admin/marketing/campaigns/route.ts`
- `src/app/api/admin/marketing/campaigns/[id]/route.ts`
- `src/app/api/admin/marketing/campaigns/[id]/test-send/route.ts`
- `src/app/api/admin/marketing/segments/route.ts`
- `src/app/api/admin/marketing/segments/[id]/count/route.ts`
- `src/components/admin/marketing/EmailEditor.tsx`
- `src/components/admin/marketing/EmailPreview.tsx`
- `src/components/admin/marketing/TestSendModal.tsx`
- `src/components/admin/marketing/ScheduleModal.tsx`
- `src/components/admin/marketing/CampaignComposer.tsx`
- `src/app/admin/marketing/campaigns/page.tsx`
- `src/app/admin/marketing/campaigns/new/page.tsx`
- `src/app/admin/marketing/campaigns/[id]/page.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `tests/admin/marketing-campaign-composer.test.ts`
- `docs/changes/admin/2026-09-12-marketing-campaign-composer.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

- None for Step 1F.
- Step 1G will connect the email delivery provider (Resend/SendGrid/SES) to `sendCampaignTestEmailPlaceholder` and campaign execution dispatch.

## Commit Message

feat(marketing): build campaign composer, email preview, and scheduling experience
