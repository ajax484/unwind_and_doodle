import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  getSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
} from '@/services/marketing-segment.service';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
} from '@/services/marketing-campaign.service';
import {
  getCampaignRecipients,
  getCampaignRecipientById,
  getCampaignRecipientCounts,
  getCampaignEvents,
  getRecipientEvents,
  getCampaignEventCounts,
} from '@/services/marketing-recipient.service';
import { getCampaignAnalytics } from '@/services/marketing-analytics.service';
import {
  getAutomations,
  getAutomationById,
  createAutomation,
  updateAutomation,
  updateAutomationStatus,
  deleteAutomation,
} from '@/services/marketing-automation.service';

describe('Marketing Typed Data Access Layer', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgA = 'org-11111111-1111-1111-1111-111111111111';
  const orgB = 'org-22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Organization Alpha', slug: 'alpha' },
        { id: orgB, name: 'Organization Beta', slug: 'beta' },
      ],
      marketing_segments: [],
      marketing_campaigns: [],
      marketing_campaign_recipients: [],
      marketing_email_events: [],
      marketing_automations: [],
    });
  });

  // ==========================================================================
  // 1. SEGMENTS
  // ==========================================================================
  describe('Marketing Segments Data Access', () => {
    it('creates and retrieves a marketing segment scoped to an organization', async () => {
      const segment = await createSegment(mockSupabase as any, orgA, {
        name: 'VIP Customers',
        description: 'Customers with over 5 orders',
        rules: { min_orders: 5 },
        active: true,
      });

      expect(segment.id).toBeDefined();
      expect(segment.name).toBe('VIP Customers');
      expect(segment.organization_id).toBe(orgA);
      expect(segment.active).toBe(true);

      const fetched = await getSegmentById(mockSupabase as any, orgA, segment.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('VIP Customers');
    });

    it('enforces organization isolation for segments', async () => {
      const segA = await createSegment(mockSupabase as any, orgA, {
        name: 'Alpha Only Segment',
      });

      // Org B should not find it
      const fetchedByB = await getSegmentById(mockSupabase as any, orgB, segA.id);
      expect(fetchedByB).toBeNull();

      // Org B should not see it in listing
      const listB = await getSegments(mockSupabase as any, orgB);
      expect(listB.data.length).toBe(0);

      // Org B cannot update it
      await expect(
        updateSegment(mockSupabase as any, orgB, segA.id, { name: 'Hacked' })
      ).rejects.toThrow(/not found for this organization/);

      // Org B cannot delete it
      await expect(
        deleteSegment(mockSupabase as any, orgB, segA.id)
      ).rejects.toThrow(/not found for this organization/);
    });

    it('filters segments by active status and search query', async () => {
      await createSegment(mockSupabase as any, orgA, { name: 'Active Newsletter', active: true });
      await createSegment(mockSupabase as any, orgA, { name: 'Inactive Promo', active: false });
      await createSegment(mockSupabase as any, orgA, { name: 'Active VIP', active: true });

      const activeOnly = await getSegments(mockSupabase as any, orgA, { active: true });
      expect(activeOnly.data.length).toBe(2);

      const searchVip = await getSegments(mockSupabase as any, orgA, { search: 'VIP' });
      expect(searchVip.data.length).toBe(1);
      expect(searchVip.data[0].name).toBe('Active VIP');
    });

    it('updates and deletes a segment', async () => {
      const created = await createSegment(mockSupabase as any, orgA, { name: 'Initial Segment' });
      const updated = await updateSegment(mockSupabase as any, orgA, created.id, {
        name: 'Updated Segment',
        active: false,
      });
      expect(updated.name).toBe('Updated Segment');
      expect(updated.active).toBe(false);

      await deleteSegment(mockSupabase as any, orgA, created.id);
      const afterDelete = await getSegmentById(mockSupabase as any, orgA, created.id);
      expect(afterDelete).toBeNull();
    });
  });

  // ==========================================================================
  // 2. CAMPAIGNS
  // ==========================================================================
  describe('Marketing Campaigns Data Access', () => {
    it('creates, retrieves, and lists campaigns with projection', async () => {
      const seg = await createSegment(mockSupabase as any, orgA, { name: 'Holiday Segment' });

      const campaign = await createCampaign(mockSupabase as any, orgA, {
        name: 'Holiday Sale Announcement',
        subject: 'Big Discounts Inside!',
        preview_text: 'Open now for 20% off',
        sender_name: 'Store Team',
        sender_email: 'hello@store.com',
        segment_id: seg.id,
        content: { body: '<h1>Holiday Sale!</h1>' },
      });

      expect(campaign.id).toBeDefined();
      expect(campaign.status).toBe('draft');
      expect(campaign.type).toBe('email');
      expect(campaign.organization_id).toBe(orgA);

      // List campaigns
      const list = await getCampaigns(mockSupabase as any, orgA);
      expect(list.data.length).toBe(1);
      expect(list.data[0].name).toBe('Holiday Sale Announcement');
      expect(list.data[0].subject).toBe('Big Discounts Inside!');
    });

    it('enforces organization isolation for campaigns', async () => {
      const campA = await createCampaign(mockSupabase as any, orgA, {
        name: 'Alpha Campaign',
      });

      // Org B should not find it
      const fetchedByB = await getCampaignById(mockSupabase as any, orgB, campA.id);
      expect(fetchedByB).toBeNull();

      // Org B cannot list it
      const listB = await getCampaigns(mockSupabase as any, orgB);
      expect(listB.data.length).toBe(0);

      // Org B cannot update it or update status
      await expect(
        updateCampaign(mockSupabase as any, orgB, campA.id, { name: 'Hijacked' })
      ).rejects.toThrow(/not found for this organization/);

      await expect(
        updateCampaignStatus(mockSupabase as any, orgB, campA.id, 'scheduled')
      ).rejects.toThrow(/not found for this organization/);

      // Org B cannot delete it
      await expect(
        deleteCampaign(mockSupabase as any, orgB, campA.id)
      ).rejects.toThrow(/not found for this organization/);
    });

    it('updates campaign details and status', async () => {
      const camp = await createCampaign(mockSupabase as any, orgA, { name: 'Draft 1' });

      const updated = await updateCampaign(mockSupabase as any, orgA, camp.id, {
        name: 'Draft 1 Renamed',
        subject: 'New Subject',
      });
      expect(updated.name).toBe('Draft 1 Renamed');
      expect(updated.subject).toBe('New Subject');

      const statusUpdated = await updateCampaignStatus(mockSupabase as any, orgA, camp.id, 'scheduled');
      expect(statusUpdated.status).toBe('scheduled');

      await deleteCampaign(mockSupabase as any, orgA, camp.id);
      const afterDelete = await getCampaignById(mockSupabase as any, orgA, camp.id);
      expect(afterDelete).toBeNull();
    });

    it('rejects creating a campaign with a segment from another organization', async () => {
      const segB = await createSegment(mockSupabase as any, orgB, { name: 'Beta Segment' });

      await expect(
        createCampaign(mockSupabase as any, orgA, {
          name: 'Invalid Cross-tenant Campaign',
          segment_id: segB.id,
        })
      ).rejects.toThrow(/does not exist or belong to this organization/);
    });
  });

  // ==========================================================================
  // 3. RECIPIENTS
  // ==========================================================================
  describe('Marketing Recipients Data Access', () => {
    const campaignId1 = 'camp-00000001-0000-0000-0000-000000000001';
    const campaignId2 = 'camp-00000002-0000-0000-0000-000000000002';

    beforeEach(() => {
      // Seed recipients across 2 campaigns
      (mockSupabase as any)._store.marketing_campaign_recipients = [
        {
          id: 'recip-1',
          campaign_id: campaignId1,
          email: 'alice@example.com',
          status: 'delivered',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: '2026-09-12T10:01:00Z',
        },
        {
          id: 'recip-2',
          campaign_id: campaignId1,
          email: 'bob@example.com',
          status: 'opened',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: '2026-09-12T10:01:00Z',
          opened_at: '2026-09-12T10:05:00Z',
        },
        {
          id: 'recip-3',
          campaign_id: campaignId1,
          email: 'charlie@example.com',
          status: 'clicked',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: '2026-09-12T10:01:00Z',
          opened_at: '2026-09-12T10:05:00Z',
          clicked_at: '2026-09-12T10:06:00Z',
        },
        {
          id: 'recip-4',
          campaign_id: campaignId1,
          email: 'dave@example.com',
          status: 'bounced',
          sent_at: '2026-09-12T10:00:00Z',
          error: 'Mailbox full',
        },
        {
          id: 'recip-5',
          campaign_id: campaignId1,
          email: 'eve@example.com',
          status: 'unsubscribed',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: '2026-09-12T10:01:00Z',
          unsubscribed_at: '2026-09-12T10:10:00Z',
        },
        // Campaign 2 recipient
        {
          id: 'recip-6',
          campaign_id: campaignId2,
          email: 'other@example.com',
          status: 'pending',
        },
      ];
    });

    it('retrieves recipients isolated by campaign', async () => {
      const result1 = await getCampaignRecipients(mockSupabase as any, campaignId1);
      expect(result1.total).toBe(5);
      expect(result1.data.every((r) => r.campaign_id === campaignId1)).toBe(true);

      const result2 = await getCampaignRecipients(mockSupabase as any, campaignId2);
      expect(result2.total).toBe(1);
      expect(result2.data[0].email).toBe('other@example.com');
    });

    it('filters recipients by status and retrieves by ID', async () => {
      const opened = await getCampaignRecipients(mockSupabase as any, campaignId1, { status: 'opened' });
      expect(opened.total).toBe(1);
      expect(opened.data[0].email).toBe('bob@example.com');

      const recipient = await getCampaignRecipientById(mockSupabase as any, campaignId1, 'recip-1');
      expect(recipient).not.toBeNull();
      expect(recipient?.email).toBe('alice@example.com');

      // Wrong campaign returns null
      const wrongCamp = await getCampaignRecipientById(mockSupabase as any, campaignId2, 'recip-1');
      expect(wrongCamp).toBeNull();
    });

    it('aggregates accurate recipient counts for all statuses', async () => {
      const counts = await getCampaignRecipientCounts(mockSupabase as any, campaignId1);
      expect(counts.total).toBe(5);
      expect(counts.delivered).toBe(1);
      expect(counts.opened).toBe(1);
      expect(counts.clicked).toBe(1);
      expect(counts.bounced).toBe(1);
      expect(counts.unsubscribed).toBe(1);
      expect(counts.pending).toBe(0);
      expect(counts.failed).toBe(0);
    });
  });

  // ==========================================================================
  // 4. EMAIL EVENTS
  // ==========================================================================
  describe('Marketing Email Events Data Access', () => {
    const campaignId = 'camp-ev-001';
    const recipientId = 'recip-ev-001';

    beforeEach(() => {
      (mockSupabase as any)._store.marketing_email_events = [
        {
          id: 'ev-1',
          campaign_id: campaignId,
          campaign_recipient_id: recipientId,
          event_type: 'sent',
          occurred_at: '2026-09-12T12:00:00Z',
        },
        {
          id: 'ev-2',
          campaign_id: campaignId,
          campaign_recipient_id: recipientId,
          event_type: 'delivered',
          occurred_at: '2026-09-12T12:01:00Z',
        },
        {
          id: 'ev-3',
          campaign_id: campaignId,
          campaign_recipient_id: recipientId,
          event_type: 'opened',
          occurred_at: '2026-09-12T12:05:00Z',
        },
        {
          id: 'ev-4',
          campaign_id: campaignId,
          campaign_recipient_id: recipientId,
          event_type: 'clicked',
          occurred_at: '2026-09-12T12:06:00Z',
        },
        {
          id: 'ev-5',
          campaign_id: 'other-camp',
          campaign_recipient_id: 'other-recip',
          event_type: 'sent',
          occurred_at: '2026-09-12T12:00:00Z',
        },
      ];
    });

    it('retrieves events scoped to a campaign and supports filtering', async () => {
      const events = await getCampaignEvents(mockSupabase as any, campaignId);
      expect(events.total).toBe(4);

      const openEvents = await getCampaignEvents(mockSupabase as any, campaignId, { event_type: 'opened' });
      expect(openEvents.total).toBe(1);
      expect(openEvents.data[0].event_type).toBe('opened');
    });

    it('retrieves events for a specific recipient', async () => {
      const recipientEvs = await getRecipientEvents(mockSupabase as any, recipientId);
      expect(recipientEvs.total).toBe(4);
      expect(recipientEvs.data.every((e) => e.campaign_recipient_id === recipientId)).toBe(true);
    });

    it('aggregates accurate event counts by event type', async () => {
      const counts = await getCampaignEventCounts(mockSupabase as any, campaignId);
      expect(counts.sent).toBe(1);
      expect(counts.delivered).toBe(1);
      expect(counts.opened).toBe(1);
      expect(counts.clicked).toBe(1);
      expect(counts.bounced).toBe(0);
      expect(counts.failed).toBe(0);
      expect(counts.unsubscribed).toBe(0);
    });
  });

  // ==========================================================================
  // 5. CAMPAIGN ANALYTICS
  // ==========================================================================
  describe('Campaign Analytics Calculation', () => {
    it('calculates counts and conversion rates with proper denominators', async () => {
      const campId = 'camp-analytics-01';

      // 4 recipients:
      // - 1 delivered
      // - 1 opened
      // - 1 clicked
      // - 1 bounced
      // Total sent = 4. Delivered = 3. Opened = 2. Clicked = 1. Bounced = 1.
      (mockSupabase as any)._store.marketing_campaign_recipients = [
        {
          id: 'r1',
          campaign_id: campId,
          status: 'delivered',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: '2026-09-12T10:01:00Z',
        },
        {
          id: 'r2',
          campaign_id: campId,
          status: 'opened',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: '2026-09-12T10:01:00Z',
          opened_at: '2026-09-12T10:05:00Z',
        },
        {
          id: 'r3',
          campaign_id: campId,
          status: 'clicked',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: '2026-09-12T10:01:00Z',
          opened_at: '2026-09-12T10:05:00Z',
          clicked_at: '2026-09-12T10:06:00Z',
        },
        {
          id: 'r4',
          campaign_id: campId,
          status: 'bounced',
          sent_at: '2026-09-12T10:00:00Z',
        },
      ];

      const analytics = await getCampaignAnalytics(mockSupabase as any, campId);

      expect(analytics.recipients).toBe(4);
      expect(analytics.sent).toBe(4);
      expect(analytics.delivered).toBe(3);
      expect(analytics.opened).toBe(2);
      expect(analytics.clicked).toBe(1);
      expect(analytics.bounced).toBe(1);

      // deliveryRate = 3 / 4 = 0.75
      expect(analytics.deliveryRate).toBe(0.75);
      // openRate = 2 / 3 = 0.6667
      expect(analytics.openRate).toBe(0.6667);
      // clickRate = 1 / 3 = 0.3333
      expect(analytics.clickRate).toBe(0.3333);
      // bounceRate = 1 / 4 = 0.25
      expect(analytics.bounceRate).toBe(0.25);
    });

    it('safely returns zero for rates when denominators are zero', async () => {
      const campId = 'camp-empty-analytics';
      (mockSupabase as any)._store.marketing_campaign_recipients = [];

      const analytics = await getCampaignAnalytics(mockSupabase as any, campId);

      expect(analytics.recipients).toBe(0);
      expect(analytics.sent).toBe(0);
      expect(analytics.delivered).toBe(0);
      expect(analytics.opened).toBe(0);
      expect(analytics.clicked).toBe(0);
      expect(analytics.deliveryRate).toBe(0);
      expect(analytics.openRate).toBe(0);
      expect(analytics.clickRate).toBe(0);
      expect(analytics.bounceRate).toBe(0);
      expect(analytics.unsubscribeRate).toBe(0);
    });
  });

  // ==========================================================================
  // 6. AUTOMATIONS
  // ==========================================================================
  describe('Marketing Automations Data Access', () => {
    it('creates, retrieves, and lists automations scoped to an organization', async () => {
      const auto = await createAutomation(mockSupabase as any, orgA, {
        name: 'Welcome Series',
        type: 'welcome',
        config: { delay_hours: 2 },
      });

      expect(auto.id).toBeDefined();
      expect(auto.name).toBe('Welcome Series');
      expect(auto.type).toBe('welcome');
      expect(auto.status).toBe('draft');
      expect(auto.organization_id).toBe(orgA);

      const fetched = await getAutomationById(mockSupabase as any, orgA, auto.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Welcome Series');

      const list = await getAutomations(mockSupabase as any, orgA);
      expect(list.data.length).toBe(1);
    });

    it('enforces organization isolation for automations', async () => {
      const autoA = await createAutomation(mockSupabase as any, orgA, {
        name: 'Alpha Welcome',
        type: 'welcome',
      });

      // Org B cannot access it
      const fetchedByB = await getAutomationById(mockSupabase as any, orgB, autoA.id);
      expect(fetchedByB).toBeNull();

      const listB = await getAutomations(mockSupabase as any, orgB);
      expect(listB.data.length).toBe(0);

      await expect(
        updateAutomation(mockSupabase as any, orgB, autoA.id, { name: 'Hacked' })
      ).rejects.toThrow(/not found for this organization/);

      await expect(
        updateAutomationStatus(mockSupabase as any, orgB, autoA.id, 'active')
      ).rejects.toThrow(/not found for this organization/);

      await expect(
        deleteAutomation(mockSupabase as any, orgB, autoA.id)
      ).rejects.toThrow(/not found for this organization/);
    });

    it('updates automation configuration and operational status', async () => {
      const auto = await createAutomation(mockSupabase as any, orgA, {
        name: 'Cart Recovery',
        type: 'abandoned_checkout',
      });

      const updated = await updateAutomation(mockSupabase as any, orgA, auto.id, {
        name: 'Cart Recovery v2',
        config: { discount_code: 'COMEBACK10' },
      });
      expect(updated.name).toBe('Cart Recovery v2');

      const statusActive = await updateAutomationStatus(mockSupabase as any, orgA, auto.id, 'active');
      expect(statusActive.status).toBe('active');

      await deleteAutomation(mockSupabase as any, orgA, auto.id);
      const afterDelete = await getAutomationById(mockSupabase as any, orgA, auto.id);
      expect(afterDelete).toBeNull();
    });
  });
});
