import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchesAutomationTrigger } from '@/services/marketing-automation.service';
import { resolveOrCreateCustomer } from '@/services/customer.service';
import { linkOrCreateCustomerAccount } from '@/services/customer-account.service';
import {
  scanAndEmitAbandonedCheckouts,
  scanAndEmitInactiveCustomers,
} from '@/services/marketing-scanner.service';
import * as eventsService from '@/services/events.service';
import { MarketingAutomation } from '@/types/marketing';

describe('Marketing Automation Trigger Pipeline & E-Commerce Integration', () => {
  const orgAlpha = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const orgBeta = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. PAYMENT.COMPLETED -> ORDER.PAID CANONICAL MAPPING
  // ============================================================================
  describe('Canonical Event Mapping: payment.completed -> order.paid', () => {
    const postPurchaseAutomation: MarketingAutomation = {
      id: 'auto-post-purchase-1',
      organization_id: orgAlpha,
      name: 'Thank you for your order',
      type: 'post_purchase',
      status: 'active',
      config: {
        trigger: { type: 'order.paid' },
        action: { type: 'email', campaignId: 'camp-thank-you' },
      },
      created_by: 'user-admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('matches payment.completed commerce event to order.paid automation trigger', () => {
      const paymentCompletedEvent = {
        event_type: 'payment.completed',
        organization_id: orgAlpha,
        payload: {
          paymentId: 'pay-123',
          orderId: 'ord-999',
          orderNumber: 'ORD-TEST-001',
          customerId: 'cust-123',
          amount: 14500,
        },
      };

      const matched = matchesAutomationTrigger(postPurchaseAutomation, paymentCompletedEvent);
      expect(matched).toBe(true);
    });

    it('preserves matching for direct order.paid events', () => {
      const orderPaidEvent = {
        event_type: 'order.paid',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-999',
          customerId: 'cust-123',
        },
      };

      const matched = matchesAutomationTrigger(postPurchaseAutomation, orderPaidEvent);
      expect(matched).toBe(true);
    });

    it('does not match order.paid automation if event is order.created', () => {
      const orderCreatedEvent = {
        event_type: 'order.created',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-999',
          customerId: 'cust-123',
        },
      };

      const matched = matchesAutomationTrigger(postPurchaseAutomation, orderCreatedEvent);
      expect(matched).toBe(false);
    });

    it('enforces multi-tenant isolation on payment.completed matching', () => {
      const foreignPaymentEvent = {
        event_type: 'payment.completed',
        organization_id: orgBeta,
        payload: {
          paymentId: 'pay-foreign',
          orderId: 'ord-foreign',
          customerId: 'cust-foreign',
        },
      };

      const matched = matchesAutomationTrigger(postPurchaseAutomation, foreignPaymentEvent);
      expect(matched).toBe(false);
    });
  });

  // ============================================================================
  // 2. CUSTOMER.CREATED EMISSION ON CREATION
  // ============================================================================
  describe('Customer Creation Domain Events', () => {
    it('guest checkout: emits customer.created when inserting a new customer', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent').mockResolvedValue('evt-cust-1');

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
                ilike: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'cust-new-123' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'customer_addresses') {
            return {
              select: () => ({
                eq: async () => ({ data: [], error: null }),
              }),
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'addr-new-123' }, error: null }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const result = await resolveOrCreateCustomer(
        mockSupabase as any,
        { email: 'new.shopper@example.com', firstName: 'New', lastName: 'Shopper', marketingConsent: true },
        { streetAddress: '123 Main St', city: 'Ikeja', state: 'Lagos' },
        'loc-1'
      );

      expect(result.customerId).toBe('cust-new-123');
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          eventType: 'customer.created',
          aggregateType: 'customer',
          aggregateId: 'cust-new-123',
          payload: expect.objectContaining({
            customerId: 'cust-new-123',
            email: 'new.shopper@example.com',
            firstName: 'New',
            lastName: 'Shopper',
            marketingConsent: true,
          }),
        })
      );
    });

    it('guest checkout: does NOT emit customer.created when updating an existing customer', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent').mockResolvedValue('evt-cust-2');

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'cust-existing-456', email: 'existing@example.com' },
                    error: null,
                  }),
                }),
                ilike: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'cust-existing-456', email: 'existing@example.com' },
                    error: null,
                  }),
                }),
              }),
              update: () => ({
                eq: async () => ({ data: null, error: null }),
              }),
            };
          }
          if (table === 'customer_addresses') {
            return {
              select: () => ({
                eq: async () => ({ data: [{ id: 'addr-existing', address_line_1: '123 Main St', state: 'Lagos' }], error: null }),
              }),
            };
          }
          return {};
        },
      };

      const result = await resolveOrCreateCustomer(
        mockSupabase as any,
        { email: 'existing@example.com', firstName: 'Existing', lastName: 'User', marketingConsent: true },
        { streetAddress: '123 Main St', city: 'Ikeja', state: 'Lagos' },
        'loc-1'
      );

      expect(result.customerId).toBe('cust-existing-456');
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('account registration: emits customer.created when a new profile is created', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent').mockResolvedValue('evt-cust-reg');

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'organizations') {
            return {
              select: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: orgAlpha }, error: null }),
                }),
              }),
            };
          }
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
                ilike: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: async () => ({
                    data: {
                      id: 'cust-reg-101',
                      user_id: 'auth-user-101',
                      email: 'registered@example.com',
                      first_name: 'Reg',
                      last_name: 'User',
                      phone: null,
                      whatsapp_number: null,
                      email_marketing_consent: true,
                      whatsapp_marketing_consent: false,
                      organization_id: orgAlpha,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const profile = await linkOrCreateCustomerAccount(mockSupabase as any, {
        id: 'auth-user-101',
        email: 'registered@example.com',
        user_metadata: { first_name: 'Reg', last_name: 'User' },
        acceptsMarketing: true,
      });

      expect(profile.id).toBe('cust-reg-101');
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          eventType: 'customer.created',
          aggregateId: 'cust-reg-101',
          organizationId: orgAlpha,
          payload: expect.objectContaining({
            customerId: 'cust-reg-101',
            email: 'registered@example.com',
            userId: 'auth-user-101',
            marketingConsent: true,
          }),
        })
      );
    });
  });

  // ============================================================================
  // 3. ABANDONED CHECKOUT SCANNER
  // ============================================================================
  describe('Abandoned Checkout Scanner', () => {
    it('finds stale active carts, atomically updates status to abandoned, and emits checkout.abandoned', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent').mockResolvedValue('evt-abandon-1');

      const mockCart = {
        id: 'cart-stale-1',
        organization_id: orgAlpha,
        customer_id: 'cust-abandon-1',
        session_id: 'sess-123',
        status: 'active',
        updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        cart_items: [
          { id: 'item-1', quantity: 2, product_id: 'prod-book-1', price: 5000 },
        ],
      };

      const mockCustomer = {
        id: 'cust-abandon-1',
        email: 'cart.abandoner@example.com',
        first_name: 'Cart',
        last_name: 'Abandoner',
        email_marketing_consent: true,
        organization_id: orgAlpha,
      };

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'carts') {
            return {
              select: () => ({
                eq: () => ({
                  not: () => ({
                    lt: () => ({
                      limit: async () => ({ data: [mockCart], error: null }),
                    }),
                  }),
                }),
              }),
              update: (payload: { status: string }) => ({
                eq: (c1: string, v1: string) => ({
                  eq: (c2: string, v2: string) => ({
                    select: () => ({
                      maybeSingle: async () => {
                        if (v1 === 'cart-stale-1' && v2 === 'active') {
                          return { data: { id: 'cart-stale-1' }, error: null };
                        }
                        return { data: null, error: null };
                      },
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: mockCustomer, error: null }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const result = await scanAndEmitAbandonedCheckouts(mockSupabase as any, {
        organizationId: orgAlpha,
        thresholdHours: 2,
      });

      expect(result.scanned).toBe(1);
      expect(result.abandoned).toBe(1);
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          eventType: 'checkout.abandoned',
          aggregateType: 'cart',
          aggregateId: 'cart-stale-1',
          organizationId: orgAlpha,
          payload: expect.objectContaining({
            cartId: 'cart-stale-1',
            customerId: 'cust-abandon-1',
            customerEmail: 'cart.abandoner@example.com',
            itemCount: 1,
          }),
        })
      );
    });

    it('idempotency: does not re-abandon or duplicate events if cart was already updated by another runner', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent');

      const mockCart = {
        id: 'cart-race-1',
        organization_id: orgAlpha,
        customer_id: 'cust-1',
        status: 'active',
        cart_items: [{ id: 'item-1', quantity: 1, product_id: 'prod-1' }],
      };

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'carts') {
            return {
              select: () => ({
                eq: () => ({
                  not: () => ({
                    lt: () => ({
                      limit: async () => ({ data: [mockCart], error: null }),
                    }),
                  }),
                }),
              }),
              update: () => ({
                eq: () => ({
                  eq: () => ({
                    select: () => ({
                      // Atomic update returns null simulating race loss
                      maybeSingle: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'cust-1', email: 'user@example.com' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const result = await scanAndEmitAbandonedCheckouts(mockSupabase as any, {
        organizationId: orgAlpha,
      });

      expect(result.scanned).toBe(1);
      expect(result.abandoned).toBe(0);
      expect(result.skipped).toBe(1);
      expect(publishSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 4. INACTIVE CUSTOMER SCANNER
  // ============================================================================
  describe('Inactive Customer Scanner', () => {
    it('identifies inactive customers (> 30 days) and emits customer.inactive', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent').mockResolvedValue('evt-inactive-1');

      const mockCustomer = {
        id: 'cust-inactive-1',
        email: 'inactive.user@example.com',
        first_name: 'Inactive',
        last_name: 'User',
        email_marketing_consent: true,
        organization_id: orgAlpha,
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockLatestOrder = {
        id: 'ord-old-1',
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'received',
      };

      const createCustomerMock = (customerList: any[]) => ({
        select: () => ({
          eq: () => ({
            lt: () => ({
              eq: () => ({
                limit: async () => ({ data: customerList, error: null }),
              }),
              limit: async () => ({ data: customerList, error: null }),
            }),
          }),
        }),
      });

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'customers') {
            return createCustomerMock([mockCustomer]);
          }
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: mockLatestOrder, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'domain_events') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    gte: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: null, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const result = await scanAndEmitInactiveCustomers(mockSupabase as any, {
        organizationId: orgAlpha,
        inactivityDays: 30,
        cooldownDays: 30,
      });

      expect(result.scanned).toBe(1);
      expect(result.inactiveEmitted).toBe(1);
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          eventType: 'customer.inactive',
          aggregateType: 'customer',
          aggregateId: 'cust-inactive-1',
          organizationId: orgAlpha,
          payload: expect.objectContaining({
            customerId: 'cust-inactive-1',
            customerEmail: 'inactive.user@example.com',
            daysInactive: 30,
            lastOrderId: 'ord-old-1',
          }),
        })
      );
    });

    it('respects 30-day cooldown: skips customer if customer.inactive was already emitted recently', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent');

      const mockCustomer = {
        id: 'cust-cooldown-1',
        email: 'cooldown.user@example.com',
        first_name: 'Cooldown',
        last_name: 'User',
        email_marketing_consent: true,
        organization_id: orgAlpha,
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  lt: () => ({
                    eq: () => ({
                      limit: async () => ({ data: [mockCustomer], error: null }),
                    }),
                    limit: async () => ({ data: [mockCustomer], error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({
                          data: { id: 'ord-old-2', created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString() },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'domain_events') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    gte: () => ({
                      limit: () => ({
                        // Already emitted 5 days ago
                        maybeSingle: async () => ({ data: { id: 'evt-recent-inactive' }, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const result = await scanAndEmitInactiveCustomers(mockSupabase as any, {
        organizationId: orgAlpha,
        inactivityDays: 30,
        cooldownDays: 30,
      });

      expect(result.scanned).toBe(1);
      expect(result.inactiveEmitted).toBe(0);
      expect(result.skipped).toBe(1);
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('skips customers who made a purchase within the 30-day window', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent');

      const mockCustomer = {
        id: 'cust-active-recent',
        email: 'recent.buyer@example.com',
        email_marketing_consent: true,
        organization_id: orgAlpha,
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockRecentOrder = {
        id: 'ord-recent-1',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        status: 'confirmed',
      };

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  lt: () => ({
                    eq: () => ({
                      limit: async () => ({ data: [mockCustomer], error: null }),
                    }),
                    limit: async () => ({ data: [mockCustomer], error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: mockRecentOrder, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const result = await scanAndEmitInactiveCustomers(mockSupabase as any, {
        organizationId: orgAlpha,
        inactivityDays: 30,
      });

      expect(result.scanned).toBe(1);
      expect(result.inactiveEmitted).toBe(0);
      expect(result.skipped).toBe(1);
      expect(publishSpy).not.toHaveBeenCalled();
    });
  });
});
