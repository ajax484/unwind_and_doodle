import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  createCampaign,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  validateCampaignForDelivery,
  sendCampaignTestEmailPlaceholder,
} from '@/services/marketing-campaign.service';
import {
  createSegment,
  getSegments,
} from '@/services/marketing-segment.service';
import {
  getSegmentCustomerCount,
} from '@/services/marketing-segmentation.service';
import {
  sanitizeHtml,
  replacePersonalizationTags,
} from '@/lib/sanitize-html';
import { MarketingCampaign } from '@/types/marketing';

describe('Step 1F — Marketing Campaign Composer', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgAlpha = 'org-11111111-1111-1111-1111-111111111111';
  const orgBeta = 'org-22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgAlpha, name: 'Alpha Brand', slug: 'alpha' },
        { id: orgBeta, name: 'Beta Brand', slug: 'beta' },
      ],
      marketing_segments: [
        {
          id: 'seg-1',
          organization_id: orgAlpha,
          name: 'Active VIPs',
          description: 'VIP Customers',
          rules: {
            match: 'all',
            conditions: [
              { field: 'order_count', operator: 'greater_than', value: 0 },
            ],
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'seg-beta',
          organization_id: orgBeta,
          name: 'Beta Segment',
          description: 'Belongs to Org Beta',
          rules: {
            match: 'all',
            conditions: [],
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      marketing_campaigns: [],
      customers: [
        {
          id: 'cust-1',
          organization_id: orgAlpha,
          email: 'vip1@example.com',
          first_name: 'Alice',
          last_name: 'Smith',
          email_marketing_consent: true,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'cust-2',
          organization_id: orgAlpha,
          email: 'vip2@example.com',
          first_name: 'Bob',
          last_name: 'Jones',
          email_marketing_consent: false, // NO CONSENT
          created_at: '2026-01-02T00:00:00Z',
        },
        {
          id: 'cust-3',
          organization_id: orgBeta,
          email: 'beta-user@example.com',
          first_name: 'Charlie',
          last_name: 'Brown',
          email_marketing_consent: true,
          created_at: '2026-01-03T00:00:00Z',
        },
      ],
      orders: [
        {
          id: 'order-1',
          organization_id: orgAlpha,
          customer_id: 'cust-1',
          total_amount: 15000,
          status: 'delivered',
          created_at: '2026-01-10T00:00:00Z',
        },
        {
          id: 'order-2',
          organization_id: orgAlpha,
          customer_id: 'cust-2',
          total_amount: 25000,
          status: 'delivered',
          created_at: '2026-01-11T00:00:00Z',
        },
      ],
    });
  });

  // ==========================================================================
  // 1. CAMPAIGN CREATION & VALIDATION
  // ==========================================================================
  describe('Campaign Creation & Delivery Validation', () => {
    it('creates a valid campaign draft', async () => {
      const campaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Spring Launch',
        type: 'email',
        subject: 'Welcome to Spring',
        preview_text: 'Fresh arrivals inside',
        sender_name: 'Unwind & Doodle',
        sender_email: 'no-reply@unwindanddoodle.com',
        segment_id: 'seg-1',
        content: { html: '<p>Hello world!</p>', text: 'Hello world!' },
      });

      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Spring Launch');
      expect(campaign.status).toBe('draft');
      expect(campaign.organization_id).toBe(orgAlpha);
    });

    it('rejects campaign creation if name is missing or empty', async () => {
      await expect(
        createCampaign(mockSupabase, orgAlpha, {
          name: '',
          type: 'email',
        })
      ).rejects.toThrow('Campaign name is required');
    });

    it('validates all required fields before campaign delivery or scheduling', () => {
      // Missing subject, sender, segment, and content
      const invalid = validateCampaignForDelivery({
        name: 'Incomplete Campaign',
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Subject is required');
      expect(invalid.errors).toContain('Sender name is required');
      expect(invalid.errors).toContain('Sender email is required');
      expect(invalid.errors).toContain('An audience segment must be selected');
      expect(invalid.errors).toContain('Email content cannot be empty');

      // Invalid sender email
      const invalidEmail = validateCampaignForDelivery({
        name: 'Valid Name',
        subject: 'Valid Subject',
        sender_name: 'Sender',
        sender_email: 'not-an-email',
        segment_id: 'seg-1',
        content: { html: '<p>Body</p>' },
      });
      expect(invalidEmail.valid).toBe(false);
      expect(invalidEmail.errors).toContain('Sender email is invalid');

      // Fully valid campaign
      const valid = validateCampaignForDelivery({
        name: 'Complete Campaign',
        subject: 'Valid Subject',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        segment_id: 'seg-1',
        content: { html: '<h1>Special Offer</h1><p>Enjoy our discounts!</p>' },
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // 2. AUDIENCE SELECTION & DYNAMIC COUNTING
  // ==========================================================================
  describe('Audience Selection & Dynamic Counting', () => {
    it('dynamically evaluates audience count and enforces email marketing consent', async () => {
      // seg-1 requires order_count > 0.
      // cust-1 has orders and email_marketing_consent = true.
      // cust-2 has orders but email_marketing_consent = false -> MUST BE EXCLUDED!
      const count = await getSegmentCustomerCount(mockSupabase, orgAlpha, 'seg-1');
      expect(count).toBe(1);
    });

    it('enforces organization boundary for segment audience resolution', async () => {
      // Trying to evaluate seg-beta (which belongs to orgBeta) under orgAlpha must fail
      await expect(
        getSegmentCustomerCount(mockSupabase, orgAlpha, 'seg-beta')
      ).rejects.toThrow(/not found|does not exist/);
    });

    it('rejects attaching a segment from a different organization to a campaign', async () => {
      await expect(
        createCampaign(mockSupabase, orgAlpha, {
          name: 'Cross Tenant Campaign',
          segment_id: 'seg-beta', // Belongs to orgBeta
        })
      ).rejects.toThrow(/does not exist or belong to this organization/);
    });
  });

  // ==========================================================================
  // 3. DRAFTS LIFECYCLE & PERSISTENCE
  // ==========================================================================
  describe('Drafts Lifecycle', () => {
    it('saves, reloads, edits, and preserves HTML content in draft state', async () => {
      const initialHtml = '<h1>Initial Title</h1><p>First draft paragraph.</p>';
      const created = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Draft Test',
        subject: 'Draft Subject',
        content: { html: initialHtml },
      });

      // Reload
      const loaded = await getCampaignById(mockSupabase, orgAlpha, created.id);
      expect(loaded).toBeDefined();
      expect((loaded?.content as { html: string }).html).toBe(initialHtml);

      // Edit draft
      const updatedHtml = '<h1>Updated Title</h1><p>Second draft paragraph with additions.</p>';
      const updated = await updateCampaign(mockSupabase, orgAlpha, created.id, {
        subject: 'Updated Subject',
        content: { html: updatedHtml },
      });

      expect(updated.subject).toBe('Updated Subject');
      expect((updated.content as { html: string }).html).toBe(updatedHtml);
      expect(updated.status).toBe('draft');
    });

    it('deletes draft campaign cleanly', async () => {
      const created = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Campaign To Delete',
      });

      await deleteCampaign(mockSupabase, orgAlpha, created.id);
      const after = await getCampaignById(mockSupabase, orgAlpha, created.id);
      expect(after).toBeNull();
    });
  });

  // ==========================================================================
  // 4. HTML CONTENT SANITIZATION
  // ==========================================================================
  describe('HTML Content Sanitization', () => {
    it('strips dangerous scripts and event handlers while preserving safe email markup', () => {
      const dirtyHtml = `
        <h1>Welcome!</h1>
        <script>alert("hacked");</script>
        <p onclick="stealCookies()">Click here for <a href="javascript:alert(1)">discount</a></p>
        <img src="x" onerror="alert(2)" />
        <a href="https://unwindanddoodle.com" target="_blank">Visit Store</a>
        <p style="color: blue;">Styled text</p>
      `;

      const cleaned = sanitizeHtml(dirtyHtml);

      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('stealCookies');
      expect(cleaned).not.toContain('javascript:alert(1)');
      expect(cleaned).not.toContain('onerror');
      expect(cleaned).toContain('<h1>Welcome!</h1>');
      expect(cleaned).toContain('href="https://unwindanddoodle.com"');
      expect(cleaned).toContain('rel="noopener noreferrer"');
      expect(cleaned).toContain('Styled text');
    });
  });

  // ==========================================================================
  // 5. PERSONALIZATION
  // ==========================================================================
  describe('Personalization Variable Substitution', () => {
    it('replaces {{first_name}} and {{last_name}} tokens with provided customer data', () => {
      const template = 'Hi {{first_name}} {{last_name}}, we have a special gift for you!';
      const rendered = replacePersonalizationTags(template, {
        first_name: 'Alice',
        last_name: 'Smith',
      });

      expect(rendered).toBe('Hi Alice Smith, we have a special gift for you!');
    });

    it('safely handles missing or undefined customer personalization values', () => {
      const template = 'Hello {{first_name}} {{last_name}}!';
      const rendered = replacePersonalizationTags(template, {
        first_name: null,
        last_name: undefined,
      });

      // Should not contain undefined or null
      expect(rendered).toBe('Hello  !');
      expect(rendered).not.toContain('null');
      expect(rendered).not.toContain('undefined');
    });
  });

  // ==========================================================================
  // 6. SCHEDULING
  // ==========================================================================
  describe('Campaign Scheduling', () => {
    it('correctly persists future scheduled_at and status scheduled without fake send', async () => {
      const campaign = await createCampaign(mockSupabase, orgAlpha, {
        name: 'Future Scheduled Campaign',
        subject: 'Scheduled Subject',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        segment_id: 'seg-1',
        content: { html: '<p>Scheduled message</p>' },
      });

      const futureDate = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days in future

      const scheduled = await updateCampaign(mockSupabase, orgAlpha, campaign.id, {
        status: 'scheduled',
        scheduled_at: futureDate,
      });

      expect(scheduled.status).toBe('scheduled');
      expect(scheduled.scheduled_at).toBe(futureDate);
      expect(scheduled.started_at ?? null).toBeNull();
      expect(scheduled.completed_at ?? null).toBeNull();
    });
  });

  // ==========================================================================
  // 7. TEST EMAIL BOUNDARY
  // ==========================================================================
  describe('Test Email Boundary (Step 1F)', () => {
    it('calls placeholder boundary and returns controlled not-configured response without fake success', async () => {
      const campaign: MarketingCampaign = {
        id: 'camp-test',
        organization_id: orgAlpha,
        name: 'Test Campaign',
        type: 'email',
        status: 'draft',
        subject: 'Test Subject',
        preview_text: 'Preview',
        sender_name: 'Unwind & Doodle',
        sender_email: 'no-reply@unwindanddoodle.com',
        segment_id: 'seg-1',
        content: { html: '<p>Content</p>' },
        scheduled_at: null,
        started_at: null,
        completed_at: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await sendCampaignTestEmailPlaceholder('admin@example.com', campaign);

      expect(result.success).toBe(false);
      expect(result.configured).toBe(false);
      expect(result.message).toContain('Test email service not configured');
    });
  });
});
