import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  NodemailerMarketingEmailProvider,
  setMarketingEmailProvider,
  getMarketingEmailProvider,
} from '@/services/marketing-provider/nodemailer-marketing.provider';
import {
  MarketingEmailProvider,
  SendMarketingEmailInput,
  SendMarketingEmailResult,
} from '@/services/marketing-provider/marketing-provider.interface';
import {
  sendTestEmail,
  dispatchCampaign,
  dispatchDueScheduledCampaigns,
} from '@/services/marketing-dispatcher.service';
import { createCampaign, getCampaignById } from '@/services/marketing-campaign.service';
import {
  generateMarketingUnsubscribeToken,
  verifyMarketingUnsubscribeToken,
} from '@/lib/marketing-token';

// Mock in-memory provider for test tracking
class MockMarketingEmailProvider implements MarketingEmailProvider {
  public sentEmails: SendMarketingEmailInput[] = [];
  public shouldFail = false;
  public failureMessage = 'Simulated provider network timeout';

  async sendEmail(input: SendMarketingEmailInput): Promise<SendMarketingEmailResult> {
    if (!input.to || !input.to.trim()) {
      return { success: false, error: 'Recipient email address is required' };
    }
    if (!input.subject || !input.subject.trim()) {
      return { success: false, error: 'Subject is required' };
    }
    if (!input.html || !input.html.trim()) {
      return { success: false, error: 'HTML content cannot be empty' };
    }

    if (this.shouldFail) {
      return { success: false, error: this.failureMessage };
    }

    this.sentEmails.push({ ...input });
    return {
      success: true,
      providerMessageId: `mock_msg_${Date.now()}_${this.sentEmails.length}`,
    };
  }
}

describe('Step 1G — Marketing Email Provider Integration', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockProvider: MockMarketingEmailProvider;

  const orgAlpha = 'org-11111111-1111-1111-1111-111111111111';
  const orgBeta = 'org-22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockProvider = new MockMarketingEmailProvider();
    setMarketingEmailProvider(mockProvider);

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgAlpha, name: 'Alpha Brand', slug: 'alpha' },
        { id: orgBeta, name: 'Beta Brand', slug: 'beta' },
      ],
      marketing_segments: [
        {
          id: 'seg-newsletter',
          organization_id: orgAlpha,
          name: 'Newsletter Cohort',
          rules: {
            match: 'all',
            conditions: [
              { field: 'email_marketing_consent', operator: 'equals', value: true },
            ],
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'seg-beta',
          organization_id: orgBeta,
          name: 'Beta Cohort',
          rules: {
            match: 'all',
            conditions: [
              { field: 'email_marketing_consent', operator: 'equals', value: true },
            ],
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      marketing_campaigns: [],
      marketing_campaign_recipients: [],
      marketing_email_events: [],
      customers: [
        {
          id: 'cust-1',
          organization_id: orgAlpha,
          email: 'alice@example.com',
          first_name: 'Alice',
          last_name: 'Adams',
          email_marketing_consent: true,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'cust-2',
          organization_id: orgAlpha,
          email: 'bob@example.com',
          first_name: 'Bob',
          last_name: 'Baker',
          email_marketing_consent: false, // NO CONSENT -> MUST BE EXCLUDED!
          created_at: '2026-01-02T00:00:00Z',
        },
        {
          id: 'cust-3',
          organization_id: orgAlpha,
          email: 'carol@example.com',
          first_name: null, // Test missing name fallback
          last_name: null,
          email_marketing_consent: true,
          created_at: '2026-01-03T00:00:00Z',
        },
      ],
      orders: [],
    });
  });

  // ==========================================================================
  // 1. PROVIDER ABSTRACTION
  // ==========================================================================
  describe('Provider Abstraction & Validation', () => {
    it('successfully delivers via provider and captures message ID', async () => {
      const result = await mockProvider.sendEmail({
        to: 'test@example.com',
        subject: 'Hello World',
        senderName: 'Unwind & Doodle',
        senderEmail: 'no-reply@unwindanddoodle.com',
        html: '<p>Welcome!</p>',
      });

      expect(result.success).toBe(true);
      expect(result.providerMessageId).toBeDefined();
      expect(mockProvider.sentEmails).toHaveLength(1);
      expect(mockProvider.sentEmails[0].to).toBe('test@example.com');
    });

    it('returns structured error when provider fails', async () => {
      mockProvider.shouldFail = true;
      const result = await mockProvider.sendEmail({
        to: 'test@example.com',
        subject: 'Hello World',
        senderName: 'Unwind & Doodle',
        senderEmail: 'no-reply@unwindanddoodle.com',
        html: '<p>Welcome!</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Simulated provider network timeout');
      expect(mockProvider.sentEmails).toHaveLength(0);
    });

    it('rejects invalid inputs without invoking transport', async () => {
      const emptyRecipient = await mockProvider.sendEmail({
        to: '',
        subject: 'Hello',
        senderName: 'Sender',
        senderEmail: 'sender@example.com',
        html: '<p>Content</p>',
      });
      expect(emptyRecipient.success).toBe(false);
      expect(emptyRecipient.error).toContain('Recipient email address is required');

      const emptyHtml = await mockProvider.sendEmail({
        to: 'user@example.com',
        subject: 'Hello',
        senderName: 'Sender',
        senderEmail: 'sender@example.com',
        html: '',
      });
      expect(emptyHtml.success).toBe(false);
      expect(emptyHtml.error).toContain('HTML content cannot be empty');
    });
  });

  // ==========================================================================
  // 2. TEST EMAIL FLOW
  // ==========================================================================
  describe('Test Email Flow', () => {
    it('dispatches exactly one test email without modifying recipient rows or analytics', async () => {
      const campaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Launch Campaign',
        subject: 'Special Offer {{first_name}}',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>Hello {{first_name}} {{last_name}}!</p>' },
      });

      const result = await sendTestEmail(
        mockSupabase,
        orgAlpha,
        campaign.id,
        'tester@company.com'
      );

      expect(result.success).toBe(true);
      expect(mockProvider.sentEmails).toHaveLength(1);
      expect(mockProvider.sentEmails[0].to).toBe('tester@company.com');
      expect(mockProvider.sentEmails[0].subject).toBe('[Test] Special Offer {{first_name}}');

      // CRITICAL: No campaign recipients or email events created for a test email
      const { data: recipients } = await mockSupabase
        .from('marketing_campaign_recipients')
        .select('*');
      expect(recipients).toHaveLength(0);

      const { data: events } = await mockSupabase
        .from('marketing_email_events')
        .select('*');
      expect(events).toHaveLength(0);
    });

    it('reports failure when campaign validation fails for test send', async () => {
      const invalidCampaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Incomplete Draft',
        subject: '', // Missing subject
        content: { html: '' }, // Empty content
      });

      const result = await sendTestEmail(
        mockSupabase,
        orgAlpha,
        invalidCampaign.id,
        'tester@company.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Campaign validation failed');
      expect(mockProvider.sentEmails).toHaveLength(0);
    });

    it('succeeds delivering test email even if no audience segment is selected yet', async () => {
      const draftWithoutSegment = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Draft Without Segment',
        subject: 'Previewing Draft Email',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        segment_id: undefined, // No segment selected yet
        content: { html: '<p>Testing draft content!</p>' },
      });

      const result = await sendTestEmail(
        mockSupabase,
        orgAlpha,
        draftWithoutSegment.id,
        'designer@company.com'
      );

      expect(result.success).toBe(true);
      expect(mockProvider.sentEmails.some((e) => e.to === 'designer@company.com')).toBe(true);
    });
  });

  // ==========================================================================
  // 3. CAMPAIGN SENDING & AUDIENCE DYNAMIC RE-CHECK
  // ==========================================================================
  describe('Campaign Live Dispatch', () => {
    it('re-evaluates audience, filters non-consented customers, snapshots recipients, and delivers', async () => {
      const campaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Summer Sale',
        subject: 'Hey {{first_name}}, sale is on!',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>Special discounts for you!</p>' },
      });

      // cust-1: consented (Alice Adams)
      // cust-2: NOT consented (Bob Baker) -> MUST BE EXCLUDED!
      // cust-3: consented (Carol, missing name)
      const summary = await dispatchCampaign(mockSupabase, orgAlpha, campaign.id);

      expect(summary.success).toBe(true);
      expect(summary.sent).toBe(2); // Exactly cust-1 and cust-3
      expect(summary.failed).toBe(0);

      // Verify recipient snapshots in DB
      const { data: recipients } = await mockSupabase
        .from('marketing_campaign_recipients')
        .select('*')
        .eq('campaign_id', campaign.id);

      expect(recipients).toHaveLength(2);
      const recipientEmails = recipients?.map((r) => r.email);
      expect(recipientEmails).toContain('alice@example.com');
      expect(recipientEmails).toContain('carol@example.com');
      expect(recipientEmails).not.toContain('bob@example.com'); // Bob has no consent

      // Verify each recipient is marked 'sent' with sent_at timestamp
      expect(recipients?.every((r) => r.status === 'sent')).toBe(true);
      expect(recipients?.every((r) => r.sent_at !== null)).toBe(true);

      // Verify 'sent' events recorded in marketing_email_events
      const { data: events } = await mockSupabase
        .from('marketing_email_events')
        .select('*')
        .eq('campaign_id', campaign.id);

      expect(events).toHaveLength(2);
      expect(events?.every((e) => e.event_type === 'sent')).toBe(true);

      // Verify campaign status transitioned to 'sent'
      const updatedCampaign = await getCampaignById(mockSupabase, orgAlpha, campaign.id);
      expect(updatedCampaign?.status).toBe('sent');
      expect(updatedCampaign?.started_at).not.toBeNull();
      expect(updatedCampaign?.completed_at).not.toBeNull();
    });

    it('substitutes customer personalization and handles missing names safely', async () => {
      const campaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Personalized Promo',
        subject: 'Gift for {{first_name}}',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        segment_id: 'seg-newsletter',
        content: { html: '<h1>Hello {{first_name}} {{last_name}}!</h1>' },
      });

      await dispatchCampaign(mockSupabase, orgAlpha, campaign.id);

      const aliceEmail = mockProvider.sentEmails.find((e) => e.to === 'alice@example.com');
      expect(aliceEmail).toBeDefined();
      expect(aliceEmail?.subject).toBe('Gift for Alice');
      expect(aliceEmail?.html).toContain('Hello Alice Adams!');

      const carolEmail = mockProvider.sentEmails.find((e) => e.to === 'carol@example.com');
      expect(carolEmail).toBeDefined();
      expect(carolEmail?.subject).toBe('Gift for ');
      // Missing values should not output "null" or "undefined"
      expect(carolEmail?.html).not.toContain('null');
      expect(carolEmail?.html).not.toContain('undefined');
    });

    it('marks recipient as failed when provider fails without failing whole campaign', async () => {
      // Mock provider that fails for a specific recipient
      let sendCount = 0;
      setMarketingEmailProvider({
        async sendEmail(input: SendMarketingEmailInput) {
          sendCount++;
          if (input.to === 'carol@example.com') {
            return { success: false, error: 'Mailbox full' };
          }
          return { success: true, providerMessageId: `msg_${sendCount}` };
        },
      });

      const campaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Partial Failure Campaign',
        subject: 'Promo',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>Content</p>' },
      });

      const summary = await dispatchCampaign(mockSupabase, orgAlpha, campaign.id);

      expect(summary.sent).toBe(1); // Alice
      expect(summary.failed).toBe(1); // Carol

      const { data: recipients } = await mockSupabase
        .from('marketing_campaign_recipients')
        .select('*')
        .eq('campaign_id', campaign.id);

      const alice = recipients?.find((r) => r.email === 'alice@example.com');
      const carol = recipients?.find((r) => r.email === 'carol@example.com');

      expect(alice?.status).toBe('sent');
      expect(carol?.status).toBe('failed');
      expect(carol?.error).toBe('Mailbox full');
    });
  });

  // ==========================================================================
  // 4. UNSUBSCRIBE TOKEN & CONSENT REVOCATION
  // ==========================================================================
  describe('Unsubscribe Token & Compliance', () => {
    it('generates, verifies, and rejects tampered unsubscribe tokens', () => {
      const token = generateMarketingUnsubscribeToken('cust-1', orgAlpha, 'camp-123');
      const verified = verifyMarketingUnsubscribeToken(token);

      expect(verified.valid).toBe(true);
      expect(verified.customerId).toBe('cust-1');
      expect(verified.organizationId).toBe(orgAlpha);
      expect(verified.campaignId).toBe('camp-123');

      // Tampered token
      const tampered = token.slice(0, -5) + 'xxxxx';
      const tamperedResult = verifyMarketingUnsubscribeToken(tampered);
      expect(tamperedResult.valid).toBe(false);
      expect(tamperedResult.error).toContain('Invalid or tampered');
    });

    it('includes signed unsubscribe link in all dispatched marketing emails', async () => {
      const campaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Unsubscribe Link Check',
        subject: 'Subject',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>Body content</p>' },
      });

      await dispatchCampaign(mockSupabase, orgAlpha, campaign.id);

      expect(mockProvider.sentEmails).toHaveLength(2);
      for (const email of mockProvider.sentEmails) {
        expect(email.html).toContain('/unsubscribe?token=');
      }
    });

    it('removes customer from future campaigns after consent is revoked', async () => {
      // 1. Send first campaign: Alice is included
      const camp1 = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Camp 1',
        subject: 'First',
        sender_name: 'Sender',
        sender_email: 's@example.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>First</p>' },
      });
      await dispatchCampaign(mockSupabase, orgAlpha, camp1.id);
      expect(mockProvider.sentEmails.some((e) => e.to === 'alice@example.com')).toBe(true);

      // 2. Alice unsubscribes (sets email_marketing_consent = false)
      await mockSupabase
        .from('customers')
        .update({ email_marketing_consent: false })
        .eq('id', 'cust-1');

      // Clear provider log
      mockProvider.sentEmails = [];

      // 3. Send second campaign: Alice MUST NOT be included!
      const camp2 = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Camp 2',
        subject: 'Second',
        sender_name: 'Sender',
        sender_email: 's@example.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>Second</p>' },
      });
      await dispatchCampaign(mockSupabase, orgAlpha, camp2.id);

      expect(mockProvider.sentEmails.some((e) => e.to === 'alice@example.com')).toBe(false);
      expect(mockProvider.sentEmails.some((e) => e.to === 'carol@example.com')).toBe(true);
    });
  });

  // ==========================================================================
  // 5. IDEMPOTENCY & CONCURRENCY
  // ==========================================================================
  describe('Idempotency & Concurrency', () => {
    it('prevents double dispatch of an already sent campaign', async () => {
      const campaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Idempotent Campaign',
        subject: 'Subject',
        sender_name: 'Sender',
        sender_email: 's@example.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>Body</p>' },
      });

      // First dispatch
      await dispatchCampaign(mockSupabase, orgAlpha, campaign.id);

      // Second dispatch attempt must be rejected because status is now 'sent'
      await expect(
        dispatchCampaign(mockSupabase, orgAlpha, campaign.id)
      ).rejects.toThrow(/not in a sendable state/);
    });

    it('enforces cross-organization security on campaign dispatch', async () => {
      const betaCampaign = await createCampaign(mockSupabase, orgBeta, {
        name: 'Beta Campaign',
        subject: 'Subject',
        sender_name: 'Sender',
        sender_email: 's@example.com',
        segment_id: 'seg-beta',
        content: { html: '<p>Body</p>' },
      });

      // OrgAlpha attempting to dispatch OrgBeta campaign must fail
      await expect(
        dispatchCampaign(mockSupabase, orgAlpha, betaCampaign.id)
      ).rejects.toThrow(/not found for this organization/);
    });
  });

  // ==========================================================================
  // 6. SCHEDULED DISPATCHING
  // ==========================================================================
  describe('Scheduled Campaign Runner', () => {
    it('executes due scheduled campaigns and leaves future ones untouched', async () => {
      // Due campaign (scheduled 1 hour ago)
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const dueCampaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Due Campaign',
        subject: 'Due Promo',
        sender_name: 'Sender',
        sender_email: 's@example.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>Due Promo</p>' },
        status: 'scheduled',
        scheduled_at: pastDate,
      });

      // Future campaign (scheduled tomorrow)
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const futureCampaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Future Campaign',
        subject: 'Future Promo',
        sender_name: 'Sender',
        sender_email: 's@example.com',
        segment_id: 'seg-newsletter',
        content: { html: '<p>Future Promo</p>' },
        status: 'scheduled',
        scheduled_at: futureDate,
      });

      const summaries = await dispatchDueScheduledCampaigns(mockSupabase);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].campaignId).toBe(dueCampaign.id);
      expect(summaries[0].sent).toBe(2);

      // Verify due campaign is now 'sent'
      const updatedDue = await getCampaignById(mockSupabase, orgAlpha, dueCampaign.id);
      expect(updatedDue?.status).toBe('sent');

      // Verify future campaign remains 'scheduled'
      const updatedFuture = await getCampaignById(mockSupabase, orgAlpha, futureCampaign.id);
      expect(updatedFuture?.status).toBe('scheduled');
    });
  });
});
