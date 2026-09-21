import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient } from '../mocks/supabase.mock';
import { setServiceSupabaseClient } from '@/lib/supabase/client';
import {
  validateAutomationConfig,
  matchesAutomationTrigger,
  getAutomationTypeMetadata,
  getAutomationTriggerTypes,
  createAutomation,
  getAutomations,
  getAutomationById,
  updateAutomation,
  updateAutomationStatus,
  deleteAutomation,
} from '@/services/marketing-automation.service';
import {
  GET as getAutomationsRoute,
  POST as createAutomationRoute,
} from '@/app/api/admin/marketing/automations/route';
import {
  GET as getAutomationByIdRoute,
  PATCH as updateAutomationRoute,
  DELETE as deleteAutomationRoute,
} from '@/app/api/admin/marketing/automations/[id]/route';
import { PATCH as updateAutomationStatusRoute } from '@/app/api/admin/marketing/automations/[id]/status/route';
import { MarketingAutomation, MarketingAutomationConfig } from '@/types/marketing';

describe('Step 2A: Marketing Automation Foundation', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgAlpha = 'org-11111111-1111-1111-1111-111111111111';
  const orgBeta = 'org-22222222-2222-2222-2222-222222222222';
  const adminId = 'user-admin-alpha';

  const validCampaignId = 'camp-alpha-1';
  const otherOrgCampaignId = 'camp-beta-1';
  const invalidCampaignId = 'camp-alpha-missing-subject';

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgAlpha, name: 'Alpha Org', slug: 'alpha' },
        { id: orgBeta, name: 'Beta Org', slug: 'beta' },
      ],
      organization_members: [
        {
          id: 'mem-alpha',
          organization_id: orgAlpha,
          user_id: adminId,
          role: 'admin',
        },
      ],
      marketing_campaigns: [
        {
          id: validCampaignId,
          organization_id: orgAlpha,
          name: 'Welcome Email Template',
          type: 'email',
          status: 'draft',
          subject: 'Welcome to Unwind & Doodle!',
          preview_text: 'Thanks for joining our community.',
          sender_name: 'Unwind & Doodle',
          sender_email: 'hello@unwindanddoodle.com',
          content: { html: '<p>Welcome!</p>' },
        },
        {
          id: otherOrgCampaignId,
          organization_id: orgBeta,
          name: 'Beta Campaign',
          type: 'email',
          status: 'draft',
          subject: 'Beta Subject',
          sender_name: 'Beta',
          sender_email: 'beta@example.com',
        },
        {
          id: invalidCampaignId,
          organization_id: orgAlpha,
          name: 'Missing Subject Campaign',
          type: 'email',
          status: 'draft',
          subject: '',
          sender_email: 'hello@unwindanddoodle.com',
        },
      ],
      marketing_automations: [],
    });

    setServiceSupabaseClient(mockSupabase as any);
  });

  afterEach(() => {
    setServiceSupabaseClient(null);
  });

  function createAdminRequest(
    url: string,
    options: {
      method?: string;
      body?: any;
      unauthenticated?: boolean;
    } = {}
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!options.unauthenticated) {
      headers['x-admin-user-id'] = adminId;
      headers['x-test-admin-id'] = adminId;
      headers['x-organization-id'] = orgAlpha;
    }

    return new NextRequest(`http://localhost:3000${url}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  // ============================================================================
  // 1. CONFIGURATION VALIDATION
  // ============================================================================
  describe('Configuration Validation', () => {
    it('validates and accepts a correct automation configuration', async () => {
      const config: MarketingAutomationConfig = {
        trigger: { type: 'customer.created' },
        delay: { amount: 2, unit: 'hours' },
        action: { type: 'email', campaignId: validCampaignId },
      };

      const result = await validateAutomationConfig(
        mockSupabase as any,
        orgAlpha,
        'welcome',
        config
      );

      expect(result.trigger.type).toBe('customer.created');
      expect(result.delay?.amount).toBe(2);
      expect(result.delay?.unit).toBe('hours');
      expect(result.action?.campaignId).toBe(validCampaignId);
    });

    it('rejects non-object configuration', async () => {
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', null)
      ).rejects.toThrow(/must be a valid object/);

      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', 'invalid')
      ).rejects.toThrow(/must be a valid object/);
    });

    it('rejects missing or invalid trigger event types', async () => {
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          action: { type: 'email', campaignId: validCampaignId },
        })
      ).rejects.toThrow(/Trigger configuration is required/);

      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'nonexistent.event' as any },
          action: { type: 'email', campaignId: validCampaignId },
        })
      ).rejects.toThrow(/Invalid trigger event type/);
    });

    it('rejects trigger incompatible with automation type', async () => {
      // 'order.paid' is not compatible with 'welcome'
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'order.paid' },
          action: { type: 'email', campaignId: validCampaignId },
        })
      ).rejects.toThrow(/not compatible with automation type "welcome"/);
    });

    it('rejects negative or invalid delay amounts', async () => {
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'customer.created' },
          delay: { amount: -5, unit: 'hours' },
          action: { type: 'email', campaignId: validCampaignId },
        })
      ).rejects.toThrow(/Delay amount must be a non-negative number/);

      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'customer.created' },
          delay: { amount: 10, unit: 'centuries' as any },
          action: { type: 'email', campaignId: validCampaignId },
        })
      ).rejects.toThrow(/Delay unit must be "minutes", "hours", or "days"/);
    });

    it('rejects delay exceeding maximum limit of 90 days', async () => {
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'customer.created' },
          delay: { amount: 95, unit: 'days' },
          action: { type: 'email', campaignId: validCampaignId },
        })
      ).rejects.toThrow(/Delay cannot exceed 90 days/);
    });

    it('rejects non-email action or missing campaignId', async () => {
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'customer.created' },
          action: { type: 'sms' as any, campaignId: validCampaignId },
        })
      ).rejects.toThrow(/Only "email" action type is currently supported/);

      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: '' },
        })
      ).rejects.toThrow(/valid campaign ID is required/);
    });

    it('rejects campaign that does not exist', async () => {
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: 'non-existent-campaign-id' },
        })
      ).rejects.toThrow(/Referenced campaign does not exist/);
    });

    it('rejects campaign belonging to a different organization', async () => {
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: otherOrgCampaignId },
        })
      ).rejects.toThrow(/does not belong to your organization/);
    });

    it('rejects campaign with missing subject line', async () => {
      await expect(
        validateAutomationConfig(mockSupabase as any, orgAlpha, 'welcome', {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: invalidCampaignId },
        })
      ).rejects.toThrow(/must have a valid subject line/);
    });
  });

  // ============================================================================
  // 2. TRIGGER MATCHING FOUNDATION
  // ============================================================================
  describe('Trigger Matching Foundation', () => {
    const activeAutomation: MarketingAutomation = {
      id: 'auto-1',
      organization_id: orgAlpha,
      name: 'Order Paid Automation',
      type: 'post_purchase',
      status: 'active',
      config: {
        trigger: { type: 'order.paid' },
        delay: { amount: 1, unit: 'days' },
        action: { type: 'email', campaignId: validCampaignId },
      },
      created_by: adminId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('matches when active automation matches event type, organization, and valid payload', () => {
      const match = matchesAutomationTrigger(activeAutomation, {
        event_type: 'order.paid',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-123',
          customerEmail: 'customer@example.com',
        },
      });

      expect(match).toBe(true);
    });

    it('rejects trigger match when automation is in draft or paused status', () => {
      const draftAuto: MarketingAutomation = { ...activeAutomation, status: 'draft' };
      const pausedAuto: MarketingAutomation = { ...activeAutomation, status: 'paused' };

      expect(
        matchesAutomationTrigger(draftAuto, {
          event_type: 'order.paid',
          organization_id: orgAlpha,
          payload: { orderId: 'ord-123', customerEmail: 'test@example.com' },
        })
      ).toBe(false);

      expect(
        matchesAutomationTrigger(pausedAuto, {
          event_type: 'order.paid',
          organization_id: orgAlpha,
          payload: { orderId: 'ord-123', customerEmail: 'test@example.com' },
        })
      ).toBe(false);
    });

    it('rejects trigger match when organization IDs do not match', () => {
      const match = matchesAutomationTrigger(activeAutomation, {
        event_type: 'order.paid',
        organization_id: orgBeta,
        payload: { orderId: 'ord-123', customerEmail: 'test@example.com' },
      });

      expect(match).toBe(false);
    });

    it('rejects trigger match when event type does not match trigger config', () => {
      const match = matchesAutomationTrigger(activeAutomation, {
        event_type: 'customer.created',
        organization_id: orgAlpha,
        payload: { customerId: 'cust-123' },
      });

      expect(match).toBe(false);
    });

    it('rejects trigger match when event payload lacks required context', () => {
      // Missing customer identifier
      const matchMissingCustomer = matchesAutomationTrigger(activeAutomation, {
        event_type: 'order.paid',
        organization_id: orgAlpha,
        payload: { orderId: 'ord-123' },
      });
      expect(matchMissingCustomer).toBe(false);

      // Missing order identifier
      const matchMissingOrder = matchesAutomationTrigger(activeAutomation, {
        event_type: 'order.paid',
        organization_id: orgAlpha,
        payload: { customerEmail: 'test@example.com' },
      });
      expect(matchMissingOrder).toBe(false);
    });

    it('correctly validates payloads for welcome and abandoned checkout triggers', () => {
      const welcomeAuto: MarketingAutomation = {
        ...activeAutomation,
        type: 'welcome',
        config: {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: validCampaignId },
        },
      };

      expect(
        matchesAutomationTrigger(welcomeAuto, {
          event_type: 'customer.created',
          organization_id: orgAlpha,
          payload: { customerId: 'cust-99' },
        })
      ).toBe(true);

      expect(
        matchesAutomationTrigger(welcomeAuto, {
          event_type: 'customer.created',
          organization_id: orgAlpha,
          payload: {},
        })
      ).toBe(false);

      const cartAuto: MarketingAutomation = {
        ...activeAutomation,
        type: 'abandoned_checkout',
        config: {
          trigger: { type: 'checkout.abandoned' },
          action: { type: 'email', campaignId: validCampaignId },
        },
      };

      expect(
        matchesAutomationTrigger(cartAuto, {
          event_type: 'checkout.abandoned',
          organization_id: orgAlpha,
          payload: { checkoutId: 'chk-1', email: 'guest@example.com' },
        })
      ).toBe(true);

      expect(
        matchesAutomationTrigger(cartAuto, {
          event_type: 'checkout.abandoned',
          organization_id: orgAlpha,
          payload: {},
        })
      ).toBe(false);
    });
  });

  // ============================================================================
  // 3. SERVICE HELPERS & METADATA
  // ============================================================================
  describe('Metadata & Helper Functions', () => {
    it('returns type metadata and all valid trigger types', () => {
      const meta = getAutomationTypeMetadata('welcome');
      expect(meta.label).toBe('Welcome Series');
      expect(meta.compatibleEventTypes).toContain('customer.created');

      const triggerTypes = getAutomationTriggerTypes();
      expect(triggerTypes).toContain('customer.created');
      expect(triggerTypes).toContain('order.paid');
      expect(triggerTypes).toContain('checkout.abandoned');
    });
  });

  // ============================================================================
  // 4. DATA ACCESS & SCOPING
  // ============================================================================
  describe('Data Access Layer', () => {
    it('creates, retrieves, and lists automations scoped to an organization', async () => {
      const auto = await createAutomation(mockSupabase as any, orgAlpha, {
        name: 'Alpha Welcome',
        type: 'welcome',
        config: {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: validCampaignId },
        },
      });

      expect(auto.id).toBeDefined();
      expect(auto.name).toBe('Alpha Welcome');
      expect(auto.organization_id).toBe(orgAlpha);

      const fetched = await getAutomationById(mockSupabase as any, orgAlpha, auto.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Alpha Welcome');

      // Org Beta cannot access Alpha's automation
      const fetchedByBeta = await getAutomationById(mockSupabase as any, orgBeta, auto.id);
      expect(fetchedByBeta).toBeNull();

      const list = await getAutomations(mockSupabase as any, orgAlpha);
      expect(list.data.length).toBe(1);
    });

    it('updates automation and enforces config validation when activating', async () => {
      const auto = await createAutomation(mockSupabase as any, orgAlpha, {
        name: 'Post Purchase',
        type: 'post_purchase',
        config: {
          trigger: { type: 'order.paid' },
          action: { type: 'email', campaignId: validCampaignId },
        },
      });

      const updated = await updateAutomation(mockSupabase as any, orgAlpha, auto.id, {
        name: 'Post Purchase v2',
      });
      expect(updated.name).toBe('Post Purchase v2');

      const activated = await updateAutomationStatus(
        mockSupabase as any,
        orgAlpha,
        auto.id,
        'active',
        { validateConfig: true }
      );
      expect(activated.status).toBe('active');

      await deleteAutomation(mockSupabase as any, orgAlpha, auto.id);
      const afterDelete = await getAutomationById(mockSupabase as any, orgAlpha, auto.id);
      expect(afterDelete).toBeNull();
    });
  });

  // ============================================================================
  // 5. API ROUTES VERIFICATION
  // ============================================================================
  describe('Admin API Routes', () => {
    it('GET /api/admin/marketing/automations returns list of automations', async () => {
      await createAutomation(mockSupabase as any, orgAlpha, {
        name: 'API Auto 1',
        type: 'welcome',
        config: {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: validCampaignId },
        },
      });

      const req = createAdminRequest('/api/admin/marketing/automations');
      const res = await getAutomationsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].name).toBe('API Auto 1');
    });

    it('POST /api/admin/marketing/automations creates automation with validated config', async () => {
      const req = createAdminRequest('/api/admin/marketing/automations', {
        method: 'POST',
        body: {
          name: 'Cart Recovery Automation',
          type: 'abandoned_checkout',
          status: 'draft',
          config: {
            trigger: { type: 'checkout.abandoned' },
            delay: { amount: 2, unit: 'hours' },
            action: { type: 'email', campaignId: validCampaignId },
          },
        },
      });

      const res = await createAutomationRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Cart Recovery Automation');
    });

    it('POST /api/admin/marketing/automations rejects invalid input', async () => {
      const req = createAdminRequest('/api/admin/marketing/automations', {
        method: 'POST',
        body: {
          name: '',
          type: 'welcome',
        },
      });

      const res = await createAutomationRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/name is required/i);
    });

    it('GET, PATCH, and DELETE /api/admin/marketing/automations/[id]', async () => {
      const auto = await createAutomation(mockSupabase as any, orgAlpha, {
        name: 'Route Detail Auto',
        type: 'welcome',
        config: {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: validCampaignId },
        },
      });

      // GET
      const getReq = createAdminRequest(`/api/admin/marketing/automations/${auto.id}`);
      const getRes = await getAutomationByIdRoute(getReq, {
        params: Promise.resolve({ id: auto.id }),
      });
      const getJson = await getRes.json();
      expect(getRes.status).toBe(200);
      expect(getJson.data.name).toBe('Route Detail Auto');

      // PATCH
      const patchReq = createAdminRequest(`/api/admin/marketing/automations/${auto.id}`, {
        method: 'PATCH',
        body: { name: 'Renamed Route Auto' },
      });
      const patchRes = await updateAutomationRoute(patchReq, {
        params: Promise.resolve({ id: auto.id }),
      });
      const patchJson = await patchRes.json();
      expect(patchRes.status).toBe(200);
      expect(patchJson.data.name).toBe('Renamed Route Auto');

      // STATUS TOGGLE
      const statusReq = createAdminRequest(`/api/admin/marketing/automations/${auto.id}/status`, {
        method: 'PATCH',
        body: { status: 'active' },
      });
      const statusRes = await updateAutomationStatusRoute(statusReq, {
        params: Promise.resolve({ id: auto.id }),
      });
      const statusJson = await statusRes.json();
      expect(statusRes.status).toBe(200);
      expect(statusJson.data.status).toBe('active');

      // DELETE
      const deleteReq = createAdminRequest(`/api/admin/marketing/automations/${auto.id}`, {
        method: 'DELETE',
      });
      const deleteRes = await deleteAutomationRoute(deleteReq, {
        params: Promise.resolve({ id: auto.id }),
      });
      expect(deleteRes.status).toBe(200);
    });

    it('enforces authentication on automations routes', async () => {
      const unauthReq = createAdminRequest('/api/admin/marketing/automations', {
        unauthenticated: true,
      });
      const res = await getAutomationsRoute(unauthReq);
      expect(res.status).toBe(403);
    });
  });
});
