import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  computeMarketingWebhookSignature,
  verifyMarketingWebhookSignature,
} from '@/services/marketing-provider/webhook-verifier';
import {
  normalizeEmailWebhookPayload,
  canTransitionRecipientStatus,
  normalizeEventType,
} from '@/services/marketing-provider/webhook-normalizer';
import { processEmailWebhook } from '@/services/marketing-webhook.service';
import { GET as webhookGetHandler } from '@/app/api/webhooks/email/route';
import { getCampaignAnalytics } from '@/services/marketing-analytics.service';
import { getSegmentCustomers } from '@/services/marketing-segmentation.service';
import {
  MarketingCampaign,
  MarketingCampaignRecipient,
  MarketingEmailEvent,
  MarketingRecipientStatus,
} from '@/types/marketing';

describe('Step 1H — Email Tracking, Webhooks, and Campaign Analytics', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgAlpha = 'org-11111111-1111-1111-1111-111111111111';
  const orgBeta = 'org-22222222-2222-2222-2222-222222222222';
  const testSecret = 'whsec_test_secret_key_1234567890';

  const campAlphaId = 'camp-alpha-100';
  const customerAliceId = 'cust-alice-100';
  const customerBobId = 'cust-bob-200';
  const recipientAliceId = 'recip-alice-100';
  const recipientBobId = 'recip-bob-200';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgAlpha, name: 'Alpha Org', slug: 'alpha-org' },
        { id: orgBeta, name: 'Beta Org', slug: 'beta-org' },
      ],
      customers: [
        {
          id: customerAliceId,
          organization_id: orgAlpha,
          email: 'alice@example.com',
          first_name: 'Alice',
          last_name: 'Smith',
          email_marketing_consent: true,
          created_at: new Date('2026-01-01').toISOString(),
          updated_at: new Date('2026-01-01').toISOString(),
        },
        {
          id: customerBobId,
          organization_id: orgAlpha,
          email: 'bob@example.com',
          first_name: 'Bob',
          last_name: 'Jones',
          email_marketing_consent: true,
          created_at: new Date('2026-01-01').toISOString(),
          updated_at: new Date('2026-01-01').toISOString(),
        },
      ],
      marketing_campaigns: [
        {
          id: campAlphaId,
          organization_id: orgAlpha,
          name: 'Summer Sale 2026',
          type: 'email',
          status: 'sent',
          subject: 'Big Summer Sale!',
          sender_name: 'Unwind & Doodle',
          sender_email: 'no-reply@unwindanddoodle.com',
          content: { html: '<p>Sale items</p>' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      marketing_campaign_recipients: [
        {
          id: recipientAliceId,
          campaign_id: campAlphaId,
          customer_id: customerAliceId,
          email: 'alice@example.com',
          status: 'sent',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: null,
          opened_at: null,
          clicked_at: null,
          unsubscribed_at: null,
          error: null,
          created_at: '2026-09-12T09:59:00Z',
        },
        {
          id: recipientBobId,
          campaign_id: campAlphaId,
          customer_id: customerBobId,
          email: 'bob@example.com',
          status: 'sent',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: null,
          opened_at: null,
          clicked_at: null,
          unsubscribed_at: null,
          error: null,
          created_at: '2026-09-12T09:59:00Z',
        },
      ],
      marketing_email_events: [
        {
          id: 'evt-sent-alice',
          campaign_id: campAlphaId,
          campaign_recipient_id: recipientAliceId,
          customer_id: customerAliceId,
          event_type: 'sent',
          metadata: { provider_message_id: 'msg_alice_123' },
          occurred_at: '2026-09-12T10:00:00Z',
        },
        {
          id: 'evt-sent-bob',
          campaign_id: campAlphaId,
          campaign_recipient_id: recipientBobId,
          customer_id: customerBobId,
          event_type: 'sent',
          metadata: { provider_message_id: 'msg_bob_456' },
          occurred_at: '2026-09-12T10:00:00Z',
        },
      ],
    } as any);
  });

  // ============================================================================
  // 1. WEBHOOK SECURITY & SIGNATURE VERIFICATION
  // ============================================================================
  describe('Webhook Security & Signature Verification', () => {
    it('verifies valid HMAC-SHA256 signatures with constant-time equality', () => {
      const payload = JSON.stringify({ event: 'delivered', recipient_id: recipientAliceId });
      const signature = computeMarketingWebhookSignature(payload, testSecret);

      const isValid = verifyMarketingWebhookSignature({
        rawBody: payload,
        headers: { 'x-webhook-signature': signature },
        secret: testSecret,
      });

      expect(isValid).toBe(true);
    });

    it('rejects tampered webhook bodies', () => {
      const validPayload = JSON.stringify({ event: 'delivered', recipient_id: recipientAliceId });
      const signature = computeMarketingWebhookSignature(validPayload, testSecret);
      const tamperedPayload = JSON.stringify({ event: 'delivered', recipient_id: 'forged-recipient' });

      const isValid = verifyMarketingWebhookSignature({
        rawBody: tamperedPayload,
        headers: { 'x-webhook-signature': signature },
        secret: testSecret,
      });

      expect(isValid).toBe(false);
    });

    it('rejects missing or empty signature headers', () => {
      const payload = JSON.stringify({ event: 'delivered' });

      const isValid = verifyMarketingWebhookSignature({
        rawBody: payload,
        headers: {},
        secret: testSecret,
      });

      expect(isValid).toBe(false);
    });

    it('rejects when secret key is not configured', () => {
      const payload = JSON.stringify({ event: 'delivered' });

      const isValid = verifyMarketingWebhookSignature({
        rawBody: payload,
        headers: { 'x-webhook-signature': 'dummy_signature' },
        secret: '',
      });

      expect(isValid).toBe(false);
    });

    it('verifies webhooks using pre-shared secret header (X-Webhook-Secret / X-ZeptoMail-Secret)', () => {
      const payload = JSON.stringify({ event: 'delivered', recipient_id: recipientAliceId });

      const isValid = verifyMarketingWebhookSignature({
        rawBody: payload,
        headers: { 'x-webhook-secret': testSecret },
        secret: testSecret,
      });

      expect(isValid).toBe(true);
    });

    it('verifies webhooks using Authorization Bearer token header', () => {
      const payload = JSON.stringify({ event: 'delivered', recipient_id: recipientAliceId });

      const isValid = verifyMarketingWebhookSignature({
        rawBody: payload,
        headers: { authorization: `Bearer ${testSecret}` },
        secret: testSecret,
      });

      expect(isValid).toBe(true);
    });

    it('verifies webhooks using querySecret (?secret=...) parameter', () => {
      const payload = JSON.stringify({ event: 'delivered', recipient_id: recipientAliceId });

      const isValid = verifyMarketingWebhookSignature({
        rawBody: payload,
        headers: {},
        secret: testSecret,
        querySecret: testSecret,
      });

      expect(isValid).toBe(true);
    });

    it('processEmailWebhook throws error when signature verification fails', async () => {
      const payload = JSON.stringify({ event: 'delivered' });

      await expect(
        processEmailWebhook({
          supabase: mockSupabase as any,
          rawBody: payload,
          headers: { 'x-webhook-signature': 'invalid_sig' },
          webhookSecret: testSecret,
        })
      ).rejects.toThrow('Invalid email webhook signature');
    });

    it('processEmailWebhook throws error when JSON is malformed', async () => {
      const malformedBody = '{"event": "delivered", invalid json';
      const sig = computeMarketingWebhookSignature(malformedBody, testSecret);

      await expect(
        processEmailWebhook({
          supabase: mockSupabase as any,
          rawBody: malformedBody,
          headers: { 'x-webhook-signature': sig },
          webhookSecret: testSecret,
        })
      ).rejects.toThrow('Malformed webhook JSON payload');
    });

    it('returns 200 OK on GET /api/webhooks/email diagnostic check', async () => {
      const res = await webhookGetHandler();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe('active');
      expect(json.service).toBe('email_webhook_receiver');
    });
  });

  // ============================================================================
  // 2. EVENT NORMALIZATION
  // ============================================================================
  describe('Event Normalization', () => {
    it('normalizes all canonical provider event types', () => {
      expect(normalizeEventType('delivered')).toBe('delivered');
      expect(normalizeEventType('email.delivered')).toBe('delivered');
      expect(normalizeEventType('open')).toBe('opened');
      expect(normalizeEventType('opened')).toBe('opened');
      expect(normalizeEventType('click')).toBe('clicked');
      expect(normalizeEventType('clicked')).toBe('clicked');
      expect(normalizeEventType('hard_bounce')).toBe('bounced');
      expect(normalizeEventType('bounced')).toBe('bounced');
      expect(normalizeEventType('failure')).toBe('failed');
      expect(normalizeEventType('failed')).toBe('failed');
      expect(normalizeEventType('unsubscribe')).toBe('unsubscribed');
      expect(normalizeEventType('unsubscribed')).toBe('unsubscribed');
      expect(normalizeEventType('unknown_event_random')).toBeNull();
    });

    it('normalizes single payload with nested data and metadata', () => {
      const payload = {
        type: 'email.opened',
        created_at: '2026-09-12T10:05:00Z',
        data: {
          id: 'evt_open_1',
          email_id: 'msg_alice_123',
          to: 'alice@example.com',
          tags: {
            recipient_id: recipientAliceId,
            campaign_id: campAlphaId,
          },
        },
      };

      const normalized = normalizeEmailWebhookPayload(payload);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].eventType).toBe('opened');
      expect(normalized[0].recipientId).toBe(recipientAliceId);
      expect(normalized[0].campaignId).toBe(campAlphaId);
      expect(normalized[0].providerMessageId).toBe('msg_alice_123');
      expect(normalized[0].occurredAt.toISOString()).toBe(new Date('2026-09-12T10:05:00Z').toISOString());
    });

    it('normalizes array payloads (SendGrid batch format)', () => {
      const payload = [
        {
          event: 'delivered',
          id: 'sg_evt_1',
          sg_message_id: 'msg_alice_123',
          recipient_id: recipientAliceId,
          timestamp: 1789214400,
        },
        {
          event: 'click',
          id: 'sg_evt_2',
          url: 'https://unwindanddoodle.com/shop',
          recipient_id: recipientAliceId,
        },
      ];

      const normalized = normalizeEmailWebhookPayload(payload);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].eventType).toBe('delivered');
      expect(normalized[1].eventType).toBe('clicked');
      expect(normalized[1].metadata.link_url).toBe('https://unwindanddoodle.com/shop');
    });
  });

  // ============================================================================
  // 3. RECIPIENT CORRELATION
  // ============================================================================
  describe('Recipient Correlation Strategies', () => {
    it('correlates by recipient ID in payload', async () => {
      const payload = JSON.stringify({
        event: 'delivered',
        id: 'evt_deliv_1',
        recipient_id: recipientAliceId,
        occurred_at: '2026-09-12T10:02:00Z',
      });
      const sig = computeMarketingWebhookSignature(payload, testSecret);

      const result = await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);

      const alice = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipientAliceId
      );
      expect(alice.status).toBe('delivered');
      expect(alice.delivered_at).toBe(new Date('2026-09-12T10:02:00Z').toISOString());
    });

    it('correlates Zoho ZeptoMail webhooks using client_reference (from X-TM-CLIENT-REF)', async () => {
      const payload = JSON.stringify({
        event: 'softbounce',
        id: 'zm_evt_999',
        client_reference: recipientAliceId,
        occurred_at: '2026-09-12T10:03:00Z',
        bounce_reason: 'Mailbox full',
      });
      const sig = computeMarketingWebhookSignature(payload, testSecret);

      const result = await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);

      const alice = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipientAliceId
      );
      expect(alice.status).toBe('bounced');
    });

    it('correlates by provider_message_id when recipient ID is absent', async () => {
      // Bob has sent event with provider_message_id = 'msg_bob_456'
      const payload = JSON.stringify({
        event: 'opened',
        id: 'evt_open_bob',
        message_id: 'msg_bob_456',
        occurred_at: '2026-09-12T10:05:00Z',
      });
      const sig = computeMarketingWebhookSignature(payload, testSecret);

      const result = await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);

      const bob = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipientBobId
      );
      expect(bob.status).toBe('opened');
      expect(bob.opened_at).toBe(new Date('2026-09-12T10:05:00Z').toISOString());
    });

    it('safely ignores uncorrelatable recipient without creating orphan rows', async () => {
      const payload = JSON.stringify({
        event: 'delivered',
        id: 'evt_unknown',
        recipient_id: 'recip-non-existent',
      });
      const sig = computeMarketingWebhookSignature(payload, testSecret);

      const result = await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
      expect(result.events[0].idempotentSkip).toBe(true);
    });
  });

  // ============================================================================
  // 4. IDEMPOTENCY & STATUS ORDERING
  // ============================================================================
  describe('Idempotency & Status Progression Ordering', () => {
    it('deduplicates replayed webhooks with identical provider_event_id', async () => {
      const payload = JSON.stringify({
        event: 'delivered',
        id: 'evt_deliv_dup_1',
        recipient_id: recipientAliceId,
      });
      const sig = computeMarketingWebhookSignature(payload, testSecret);

      // First execution
      const firstRun = await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });
      expect(firstRun.processedCount).toBe(1);

      const eventsCountAfterFirst = (mockSupabase as any)._store.marketing_email_events.length;

      // Duplicate retry execution
      const secondRun = await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });
      expect(secondRun.processedCount).toBe(0);
      expect(secondRun.events[0].idempotentSkip).toBe(true);

      const eventsCountAfterSecond = (mockSupabase as any)._store.marketing_email_events.length;
      expect(eventsCountAfterSecond).toBe(eventsCountAfterFirst);
    });

    it('canTransitionRecipientStatus prevents regressions when webhooks arrive out-of-order', () => {
      // opened -> delivered regression must be rejected
      expect(canTransitionRecipientStatus('opened', 'delivered')).toBe(false);
      // clicked -> opened regression must be rejected
      expect(canTransitionRecipientStatus('clicked', 'opened')).toBe(false);
      // delivered -> sent regression must be rejected
      expect(canTransitionRecipientStatus('delivered', 'sent')).toBe(false);

      // Forward progressions must be allowed
      expect(canTransitionRecipientStatus('sent', 'delivered')).toBe(true);
      expect(canTransitionRecipientStatus('delivered', 'opened')).toBe(true);
      expect(canTransitionRecipientStatus('opened', 'clicked')).toBe(true);
      expect(canTransitionRecipientStatus('clicked', 'unsubscribed')).toBe(true);
    });

    it('does not regress status if delivered event arrives after opened event', async () => {
      // 1. Process 'opened' event first
      const openPayload = JSON.stringify({
        event: 'opened',
        id: 'evt_open_alice_first',
        recipient_id: recipientAliceId,
        occurred_at: '2026-09-12T10:05:00Z',
      });
      await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: openPayload,
        headers: { 'x-webhook-signature': computeMarketingWebhookSignature(openPayload, testSecret) },
        webhookSecret: testSecret,
      });

      let alice = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipientAliceId
      );
      expect(alice.status).toBe('opened');

      // 2. Delayed 'delivered' event arrives later
      const delivPayload = JSON.stringify({
        event: 'delivered',
        id: 'evt_deliv_alice_delayed',
        recipient_id: recipientAliceId,
        occurred_at: '2026-09-12T10:01:00Z',
      });
      await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: delivPayload,
        headers: { 'x-webhook-signature': computeMarketingWebhookSignature(delivPayload, testSecret) },
        webhookSecret: testSecret,
      });

      alice = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipientAliceId
      );
      // Status MUST still be 'opened', not regressed to 'delivered'
      expect(alice.status).toBe('opened');
      // But delivered_at timestamp must still be captured
      expect(alice.delivered_at).toBe(new Date('2026-09-12T10:01:00Z').toISOString());
    });
  });

  // ============================================================================
  // 5. BOUNCES, FAILURES & UNSUBSCRIBE CONSENT
  // ============================================================================
  describe('Bounces, Failures, and Unsubscribe Consent', () => {
    it('records bounced event and marks recipient as bounced with bounce reason', async () => {
      const payload = JSON.stringify({
        event: 'bounced',
        id: 'evt_bounce_bob',
        recipient_id: recipientBobId,
        bounce: { message: '550 User mailbox does not exist' },
      });
      const sig = computeMarketingWebhookSignature(payload, testSecret);

      await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });

      const bob = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipientBobId
      );
      expect(bob.status).toBe('bounced');
      expect(bob.error).toBe('550 User mailbox does not exist');
    });

    it('records failed event with error details', async () => {
      const payload = JSON.stringify({
        event: 'failed',
        id: 'evt_fail_bob',
        recipient_id: recipientBobId,
        error: 'SMTP relay connection timeout',
      });
      const sig = computeMarketingWebhookSignature(payload, testSecret);

      await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });

      const bob = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipientBobId
      );
      expect(bob.status).toBe('failed');
      expect(bob.error).toBe('SMTP relay connection timeout');
    });

    it('updates customer marketing consent on unsubscribe event and excludes from future cohorts', async () => {
      const custBefore = (mockSupabase as any)._store.customers.find((c: any) => c.id === customerAliceId);
      expect(custBefore.email_marketing_consent).toBe(true);

      const payload = JSON.stringify({
        event: 'unsubscribed',
        id: 'evt_unsub_alice',
        recipient_id: recipientAliceId,
        occurred_at: '2026-09-12T10:30:00Z',
      });
      const sig = computeMarketingWebhookSignature(payload, testSecret);

      await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: payload,
        headers: { 'x-webhook-signature': sig },
        webhookSecret: testSecret,
      });

      // Recipient marked unsubscribed
      const alice = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipientAliceId
      );
      expect(alice.status).toBe('unsubscribed');
      expect(alice.unsubscribed_at).toBe(new Date('2026-09-12T10:30:00Z').toISOString());

      // Canonical customer email_marketing_consent flipped to false
      const custAfter = (mockSupabase as any)._store.customers.find((c: any) => c.id === customerAliceId);
      expect(custAfter.email_marketing_consent).toBe(false);

      // Verify segmentation engine excludes Alice
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: 'seg-active-customers',
          organization_id: orgAlpha,
          name: 'All Subscribed Customers',
          active: true,
          rules: {
            match: 'all',
            conditions: [{ field: 'email', operator: 'contains', value: 'example.com' }],
          },
        },
      ];

      const cohort = await getSegmentCustomers(mockSupabase as any, orgAlpha, 'seg-active-customers');
      expect(cohort.find((c) => c.id === customerAliceId)).toBeUndefined();
      expect(cohort.find((c) => c.id === customerBobId)).toBeDefined();
    });
  });

  // ============================================================================
  // 6. CAMPAIGN ANALYTICS AGGREGATION & UNIQUE RECIPIENT SEMANTICS
  // ============================================================================
  describe('Campaign Analytics Aggregation', () => {
    it('counts unique recipients for opens and clicks even if multiple events exist', async () => {
      // Alice opens 5 times and clicks 3 times
      for (let i = 1; i <= 5; i++) {
        const payload = JSON.stringify({
          event: 'opened',
          id: `evt_alice_open_${i}`,
          recipient_id: recipientAliceId,
          occurred_at: `2026-09-12T10:0${i}:00Z`,
        });
        await processEmailWebhook({
          supabase: mockSupabase as any,
          rawBody: payload,
          headers: { 'x-webhook-signature': computeMarketingWebhookSignature(payload, testSecret) },
          webhookSecret: testSecret,
        });
      }

      for (let i = 1; i <= 3; i++) {
        const payload = JSON.stringify({
          event: 'clicked',
          id: `evt_alice_click_${i}`,
          recipient_id: recipientAliceId,
          occurred_at: `2026-09-12T10:1${i}:00Z`,
        });
        await processEmailWebhook({
          supabase: mockSupabase as any,
          rawBody: payload,
          headers: { 'x-webhook-signature': computeMarketingWebhookSignature(payload, testSecret) },
          webhookSecret: testSecret,
        });
      }

      // Bob bounces
      const bobBounce = JSON.stringify({
        event: 'bounced',
        id: 'evt_bob_bounce',
        recipient_id: recipientBobId,
      });
      await processEmailWebhook({
        supabase: mockSupabase as any,
        rawBody: bobBounce,
        headers: { 'x-webhook-signature': computeMarketingWebhookSignature(bobBounce, testSecret) },
        webhookSecret: testSecret,
      });

      const analytics = await getCampaignAnalytics(mockSupabase as any, campAlphaId);

      expect(analytics.recipients).toBe(2);
      expect(analytics.sent).toBe(2);
      expect(analytics.delivered).toBe(1); // Only Alice was delivered
      expect(analytics.opened).toBe(1); // Alice counts as 1 unique open
      expect(analytics.clicked).toBe(1); // Alice counts as 1 unique click
      expect(analytics.bounced).toBe(1); // Bob bounced

      // Rates
      // deliveryRate = 1 / 2 = 0.5
      expect(analytics.deliveryRate).toBe(0.5);
      // openRate = 1 / 1 = 1.0
      expect(analytics.openRate).toBe(1.0);
      // clickRate = 1 / 1 = 1.0
      expect(analytics.clickRate).toBe(1.0);
      // bounceRate = 1 / 2 = 0.5
      expect(analytics.bounceRate).toBe(0.5);
    });

    it('safely returns zero for rates when denominators are zero', async () => {
      (mockSupabase as any)._store.marketing_campaign_recipients = [];

      const analytics = await getCampaignAnalytics(mockSupabase as any, campAlphaId);

      expect(analytics.recipients).toBe(0);
      expect(analytics.sent).toBe(0);
      expect(analytics.delivered).toBe(0);
      expect(analytics.deliveryRate).toBe(0);
      expect(analytics.openRate).toBe(0);
      expect(analytics.clickRate).toBe(0);
      expect(analytics.bounceRate).toBe(0);
      expect(analytics.unsubscribeRate).toBe(0);
    });
  });

  // ============================================================================
  // 7. ORGANIZATION ISOLATION
  // ============================================================================
  describe('Organization Isolation', () => {
    it('prevents cross-tenant campaign analytics and recipient access', async () => {
      // Create campaign in Org Beta
      const campBetaId = 'camp-beta-999';
      (mockSupabase as any)._store.marketing_campaigns.push({
        id: campBetaId,
        organization_id: orgBeta,
        name: 'Beta Org Campaign',
        status: 'sent',
      });
      (mockSupabase as any)._store.marketing_campaign_recipients.push({
        id: 'recip-beta-1',
        campaign_id: campBetaId,
        email: 'beta-user@example.com',
        status: 'delivered',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
      });

      // Analytics for Beta campaign are isolated
      const betaAnalytics = await getCampaignAnalytics(mockSupabase as any, campBetaId);
      expect(betaAnalytics.recipients).toBe(1);
      expect(betaAnalytics.delivered).toBe(1);

      // Alpha analytics should not include Beta recipients
      const alphaAnalytics = await getCampaignAnalytics(mockSupabase as any, campAlphaId);
      expect(alphaAnalytics.recipients).toBe(2);
    });
  });
});
