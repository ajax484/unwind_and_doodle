import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AUTOMATION_PRIORITY,
  AUTOMATION_TYPE_METADATA,
  matchesAutomationTrigger,
} from '@/services/marketing-automation.service';
import { subscribeCustomerToMarketing } from '@/services/marketing-subscription.service';

describe('Tier 1.1 — Email Automations (EML-AUTO-1 to EML-AUTO-5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('EML-AUTO-1: Subscription Model & Welcome Trigger Decoupling', () => {
    const welcomeAutomation = {
      id: 'auto-welcome-1',
      organization_id: 'org-1',
      name: 'Welcome Series',
      type: 'welcome' as const,
      status: 'active' as const,
      config: {
        trigger: { type: 'marketing.subscribed' },
        action: { type: 'email', campaignId: 'camp-1' },
      },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: null,
    };

    it('uses marketing.subscribed as the canonical trigger for welcome automations', () => {
      expect(AUTOMATION_TYPE_METADATA.welcome.compatibleEventTypes).toEqual(['marketing.subscribed']);
    });

    it('NEVER triggers welcome on customer.created (order placement / record creation)', () => {
      const matched = matchesAutomationTrigger(welcomeAutomation as any, {
        event_type: 'customer.created',
        organization_id: 'org-1',
        payload: { customerId: 'cust-1', email: 'buyer@example.com' },
      });
      expect(matched).toBe(false);
    });

    it('triggers welcome ONLY on explicit marketing.subscribed event', () => {
      const matched = matchesAutomationTrigger(welcomeAutomation as any, {
        event_type: 'marketing.subscribed',
        organization_id: 'org-1',
        payload: { customerId: 'cust-1', email: 'subscriber@example.com', source: 'newsletter' },
      });
      expect(matched).toBe(true);
    });

    it('still matches marketing.subscribed for legacy welcome rows configured with customer.created', () => {
      const legacyWelcome = {
        ...welcomeAutomation,
        config: {
          trigger: { type: 'customer.created' },
          action: { type: 'email', campaignId: 'camp-1' },
        },
      };
      expect(
        matchesAutomationTrigger(legacyWelcome as any, {
          event_type: 'customer.created',
          organization_id: 'org-1',
          payload: { customerId: 'cust-1', email: 'buyer@example.com' },
        })
      ).toBe(false);

      expect(
        matchesAutomationTrigger(legacyWelcome as any, {
          event_type: 'marketing.subscribed',
          organization_id: 'org-1',
          payload: { customerId: 'cust-1', email: 'subscriber@example.com' },
        })
      ).toBe(true);
    });

    it('records consent timestamp & source on new subscription and does NOT re-emit for existing subscribers', async () => {
      const insertedEvents: any[] = [];
      let existingCustomer: any = null;

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'customers') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              ilike: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(async () => ({ data: existingCustomer, error: null })),
              insert: vi.fn((row: any) => {
                existingCustomer = { id: 'cust-new-1', ...row };
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn(async () => ({ data: { id: 'cust-new-1' }, error: null })),
                };
              }),
              update: vi.fn(() => ({
                eq: vi.fn(async () => ({ error: null })),
              })),
            };
          }
          if (table === 'marketing_automations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              then: (resolve: any) => resolve({ data: [], error: null }),
            };
          }
          if (table === 'domain_events') {
            return {
              insert: vi.fn((row: any) => {
                insertedEvents.push(row);
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn(async () => ({
                    data: { id: `evt-${insertedEvents.length}`, ...row },
                    error: null,
                  })),
                };
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          };
        }),
      } as any;

      const first = await subscribeCustomerToMarketing(supabase, {
        organizationId: 'org-1',
        email: 'Ada@Example.com',
        source: 'newsletter',
      });

      expect(first.newlySubscribed).toBe(true);
      expect(first.alreadySubscribed).toBe(false);
      expect(first.email).toBe('ada@example.com');
      expect(first.source).toBe('newsletter');
      expect(first.subscribedAt).toBeTruthy();
      expect(insertedEvents.filter((e) => e.event_type === 'marketing.subscribed')).toHaveLength(1);

      // Re-subscribing an existing subscriber must NOT re-emit marketing.subscribed
      const second = await subscribeCustomerToMarketing(supabase, {
        organizationId: 'org-1',
        email: 'ada@example.com',
        source: 'checkout',
      });

      expect(second.alreadySubscribed).toBe(true);
      expect(second.newlySubscribed).toBe(false);
      expect(insertedEvents.filter((e) => e.event_type === 'marketing.subscribed')).toHaveLength(1);
    });
  });

  describe('EML-AUTO-4: Post-Purchase Trigger Only on Received (Not Shipped)', () => {
    const postPurchaseAutomation = {
      id: 'auto-pp-1',
      organization_id: 'org-1',
      name: 'Post-Delivery Follow-up',
      type: 'post_purchase' as const,
      status: 'active' as const,
      config: {
        trigger: { type: 'order.received' },
        action: { type: 'email', campaignId: 'camp-pp' },
      },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: null,
    };

    it('matches order.received and rejects order.shipped', () => {
      expect(
        matchesAutomationTrigger(postPurchaseAutomation as any, {
          event_type: 'order.received',
          organization_id: 'org-1',
          payload: { orderId: 'ord-1', customerId: 'cust-1' },
        })
      ).toBe(true);

      expect(
        matchesAutomationTrigger(postPurchaseAutomation as any, {
          event_type: 'order.shipped',
          organization_id: 'org-1',
          payload: { orderId: 'ord-1', customerId: 'cust-1' },
        })
      ).toBe(false);
    });
  });

  describe('EML-AUTO-5: Priority Overlap Hierarchy', () => {
    it('enforces abandoned_checkout > post_purchase > welcome > win_back', () => {
      expect(AUTOMATION_PRIORITY.abandoned_checkout).toBeGreaterThan(AUTOMATION_PRIORITY.post_purchase);
      expect(AUTOMATION_PRIORITY.post_purchase).toBeGreaterThan(AUTOMATION_PRIORITY.welcome);
      expect(AUTOMATION_PRIORITY.welcome).toBeGreaterThan(AUTOMATION_PRIORITY.win_back);
    });
  });
});
