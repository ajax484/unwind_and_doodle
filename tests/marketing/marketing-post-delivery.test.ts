import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  matchesAutomationTrigger,
  normalizeAutomationSteps,
  createCanonicalPostDeliveryJourney,
} from '@/services/marketing-automation.service';
import {
  calculateEstimatedDelivery,
  isLagosOrAbujaState,
  checkOrderHasCustomItems,
} from '@/services/delivery-estimate.service';
import {
  handleMarketingAutomationEvent,
  executeJourneySendStep,
} from '@/services/marketing-executor.service';
import { scanAndEmitEstimatedDeliveries } from '@/services/marketing-scanner.service';
import { resolveMarketingContext } from '@/services/marketing-context.service';
import * as eventsService from '@/services/events.service';
import { MarketingAutomation } from '@/types/marketing';
import { createMockSupabaseClient } from '../mocks/supabase.mock';
import { setMarketingEmailProvider } from '@/services/marketing-provider/nodemailer-marketing.provider';

describe('Step 17C: Post-Delivery Lifecycle & Retention Journeys', () => {
  const orgAlpha = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const orgBeta = '00000000-0000-0000-0000-000000000002';
  const validCampaignId = '00000000-0000-0000-0000-000000000010';
  const crossSellCampaignId = '00000000-0000-0000-0000-000000000020';
  const nurtureCampaignId = '00000000-0000-0000-0000-000000000030';

  beforeEach(() => {
    vi.clearAllMocks();
    setMarketingEmailProvider({
      sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-mock-123' }),
    });
  });

  const canonicalJourneyConfig = {
    trigger: { type: 'order.received' as const },
    steps: createCanonicalPostDeliveryJourney({
      reviewCampaignId: validCampaignId,
      crossSellCampaignId,
      nurtureCampaignId,
    }),
  };

  const canonicalPostDeliveryAutomation: MarketingAutomation = {
    id: 'auto-post-delivery-1',
    organization_id: orgAlpha,
    name: 'Post-Delivery Retention Journey',
    type: 'post_purchase',
    status: 'active',
    config: canonicalJourneyConfig as any,
    created_by: 'user-admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // ============================================================================
  // 1. TRIGGER SEMANTICS: ORDER.RECEIVED VS ORDER.PAID
  // ============================================================================
  describe('Trigger Semantics: order.received vs order.paid', () => {
    it('matches order.received domain event to post-purchase retention journey', () => {
      const orderReceivedEvent = {
        event_type: 'order.received',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-1001',
          orderNumber: 'ORD-1001',
          customerId: 'cust-101',
          organizationId: orgAlpha,
          deliverySource: 'actual',
        },
      };

      const matched = matchesAutomationTrigger(canonicalPostDeliveryAutomation, orderReceivedEvent);
      expect(matched).toBe(true);
    });

    it('matches order.delivery_estimated fallback as canonical order.received trigger', () => {
      const estimatedDeliveryEvent = {
        event_type: 'order.delivery_estimated',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-1002',
          orderNumber: 'ORD-1002',
          customerId: 'cust-102',
          organizationId: orgAlpha,
          deliverySource: 'estimated',
        },
      };

      const matched = matchesAutomationTrigger(canonicalPostDeliveryAutomation, estimatedDeliveryEvent);
      expect(matched).toBe(true);
    });

    it('CRITICAL: order.paid does NOT trigger post-delivery retention automation', () => {
      const orderPaidEvent = {
        event_type: 'order.paid',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-1001',
          orderNumber: 'ORD-1001',
          customerId: 'cust-101',
        },
      };

      const matched = matchesAutomationTrigger(canonicalPostDeliveryAutomation, orderPaidEvent);
      expect(matched).toBe(false);
    });

    it('CRITICAL: payment.completed does NOT trigger post-delivery retention automation', () => {
      const paymentCompletedEvent = {
        event_type: 'payment.completed',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-1001',
          orderNumber: 'ORD-1001',
          customerId: 'cust-101',
          amount: 12500,
        },
      };

      const matched = matchesAutomationTrigger(canonicalPostDeliveryAutomation, paymentCompletedEvent);
      expect(matched).toBe(false);
    });

    it('enforces tenant isolation on order.received', () => {
      const foreignDeliveryEvent = {
        event_type: 'order.received',
        organization_id: orgBeta,
        payload: {
          orderId: 'ord-foreign',
          customerId: 'cust-foreign',
        },
      };

      const matched = matchesAutomationTrigger(canonicalPostDeliveryAutomation, foreignDeliveryEvent);
      expect(matched).toBe(false);
    });
  });

  // ============================================================================
  // 2. JOURNEY TIMING & NORMALIZATION
  // ============================================================================
  describe('Journey Timing & Normalization (+2d, +10d, +21d)', () => {
    it('creates canonical 3-step sequence with cumulative delays matching playbook', () => {
      const steps = createCanonicalPostDeliveryJourney({
        reviewCampaignId: validCampaignId,
        crossSellCampaignId,
        nurtureCampaignId,
      });

      expect(steps).toHaveLength(6);
      expect(steps[0]).toEqual({ id: 'step-delay-2d', type: 'delay', amount: 2, unit: 'days' });
      expect(steps[1]).toEqual({ id: 'step-send-review', type: 'send_email', campaignId: validCampaignId });
      expect(steps[2]).toEqual({ id: 'step-delay-8d', type: 'delay', amount: 8, unit: 'days' }); // 2 + 8 = 10d
      expect(steps[3]).toEqual({ id: 'step-send-cross-sell', type: 'send_email', campaignId: crossSellCampaignId });
      expect(steps[4]).toEqual({ id: 'step-delay-11d', type: 'delay', amount: 11, unit: 'days' }); // 10 + 11 = 21d
      expect(steps[5]).toEqual({ id: 'step-send-nurture', type: 'send_email', campaignId: nurtureCampaignId });
    });

    it('normalizes automation config steps preserving multi-step structure', () => {
      const normalized = normalizeAutomationSteps(canonicalJourneyConfig);
      expect(normalized).toHaveLength(6);
      expect(normalized[0].type).toBe('delay');
      expect(normalized[1].type).toBe('send_email');
      expect(normalized[2].type).toBe('delay');
      expect(normalized[3].type).toBe('send_email');
      expect(normalized[4].type).toBe('delay');
      expect(normalized[5].type).toBe('send_email');
    });
  });

  // ============================================================================
  // 3. DELIVERY ESTIMATE CALCULATIONS FOR UNTRACKED ORDERS
  // ============================================================================
  describe('Delivery Estimate Calculations for Untracked Orders', () => {
    const baseDate = new Date('2026-09-01T10:00:00.000Z');

    it('identifies Lagos and Abuja destination states accurately', () => {
      expect(isLagosOrAbujaState('Lagos')).toBe(true);
      expect(isLagosOrAbujaState('lagos state')).toBe(true);
      expect(isLagosOrAbujaState('Abuja')).toBe(true);
      expect(isLagosOrAbujaState('Federal Capital Territory')).toBe(true);
      expect(isLagosOrAbujaState('FCT')).toBe(true);
      expect(isLagosOrAbujaState('Kano')).toBe(false);
      expect(isLagosOrAbujaState('Rivers')).toBe(false);
      expect(isLagosOrAbujaState('Oyo')).toBe(false);
    });

    it('detects custom items from customization flags and product names', () => {
      expect(checkOrderHasCustomItems([{ is_custom: true, product_name: 'Standard Book' }])).toBe(true);
      expect(
        checkOrderHasCustomItems([{ supports_theme_customization: true, product_name: 'Themed Book' }])
      ).toBe(true);
      expect(
        checkOrderHasCustomItems([
          { customization_data: { cover: 'Gold foil' }, product_name: 'Custom Journal' },
        ])
      ).toBe(true);
      expect(checkOrderHasCustomItems([{ product_name: 'Personalized Colouring Book' }])).toBe(true);
      expect(checkOrderHasCustomItems([{ product_name: 'Unwind & Doodle Vol 1' }])).toBe(false);
    });

    it('Lagos/Abuja standard item: estimates delivery at order date + 2 days', () => {
      const order = {
        id: 'ord-lagos-std',
        placed_at: baseDate.toISOString(),
        shipping_address: { state: 'Lagos' },
      };
      const items = [{ product_name: 'Colouring Book Vol 1' }];

      const estimate = calculateEstimatedDelivery(order, items);
      expect(estimate.isLagosOrAbuja).toBe(true);
      expect(estimate.hasCustomItems).toBe(false);
      expect(estimate.shippingDays).toBe(2);
      expect(estimate.productionDays).toBe(0);

      const expectedTime = baseDate.getTime() + 2 * 24 * 60 * 60 * 1000;
      expect(estimate.estimatedDeliveryAt.getTime()).toBe(expectedTime);
      expect(estimate.source).toBe('estimated');
    });

    it('Other Nigerian states standard item: estimates delivery at order date + 6 days', () => {
      const order = {
        id: 'ord-kano-std',
        placed_at: baseDate.toISOString(),
        shipping_address: { state: 'Kano' },
      };
      const items = [{ product_name: 'Colouring Book Vol 1' }];

      const estimate = calculateEstimatedDelivery(order, items);
      expect(estimate.isLagosOrAbuja).toBe(false);
      expect(estimate.hasCustomItems).toBe(false);
      expect(estimate.shippingDays).toBe(6);
      expect(estimate.productionDays).toBe(0);

      const expectedTime = baseDate.getTime() + 6 * 24 * 60 * 60 * 1000;
      expect(estimate.estimatedDeliveryAt.getTime()).toBe(expectedTime);
    });

    it('Custom item: adds 3 days production delay + applicable shipping delay', () => {
      // Lagos + Custom = 2 + 3 = 5 days
      const lagosCustomOrder = {
        id: 'ord-lagos-custom',
        placed_at: baseDate.toISOString(),
        shipping_address: { state: 'Lagos' },
      };
      const customItems = [{ is_custom: true, product_name: 'Custom Name Book' }];

      const lagosEstimate = calculateEstimatedDelivery(lagosCustomOrder, customItems);
      expect(lagosEstimate.shippingDays).toBe(2);
      expect(lagosEstimate.productionDays).toBe(3);
      expect(lagosEstimate.estimatedDeliveryAt.getTime()).toBe(
        baseDate.getTime() + 5 * 24 * 60 * 60 * 1000
      );

      // Rivers + Custom = 6 + 3 = 9 days
      const riversCustomOrder = {
        id: 'ord-rivers-custom',
        placed_at: baseDate.toISOString(),
        shipping_address: { state: 'Rivers' },
      };
      const riversEstimate = calculateEstimatedDelivery(riversCustomOrder, customItems);
      expect(riversEstimate.shippingDays).toBe(6);
      expect(riversEstimate.productionDays).toBe(3);
      expect(riversEstimate.estimatedDeliveryAt.getTime()).toBe(
        baseDate.getTime() + 9 * 24 * 60 * 60 * 1000
      );
    });
  });

  // ============================================================================
  // 4. IDEMPOTENCY & ACTUAL DELIVERY SUPERSEDING ESTIMATE
  // ============================================================================
  describe('Idempotency & Actual Delivery Superseding Estimate', () => {
    it('creates execution with order_id and delivery_source = actual on order.received', async () => {
      const mockSupabase = createMockSupabaseClient({
        marketing_automations: [
          {
            ...canonicalPostDeliveryAutomation,
            config: {
              trigger: { type: 'order.received' },
              action: { type: 'email', campaignId: validCampaignId },
              delay: { amount: 2, unit: 'days' },
            },
          },
        ],
        customers: [
          {
            id: 'cust-101',
            email: 'sarah@example.com',
            first_name: 'Sarah',
            organization_id: orgAlpha,
            email_marketing_consent: true,
          },
        ],
        marketing_campaigns: [
          {
            id: validCampaignId,
            organization_id: orgAlpha,
            name: 'Review Campaign',
            type: 'email',
            status: 'active',
            subject: 'How is your coloring book, {{first_name}}?',
            sender_name: 'Unwind & Doodle',
            sender_email: 'hello@unwindanddoodle.com',
            content: { html: '<p>Enjoying your book?</p>' },
          },
        ],
      });

      const result = await handleMarketingAutomationEvent(mockSupabase as any, {
        id: 'evt-actual-1',
        event_type: 'order.received',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-1001',
          customerId: 'cust-101',
          deliverySource: 'actual',
        },
      });

      expect(result.matched).toBe(1);
      expect(result.scheduled).toBe(1);
      const inserted = (mockSupabase as any)._store.marketing_automation_executions;
      expect(inserted.length).toBe(1);
      expect(inserted[0].order_id).toBe('ord-1001');
      expect(inserted[0].delivery_source).toBe('actual');
      expect(inserted[0].domain_event_id).toBe('evt-actual-1');
    });

    it('deduplicates when same order.received event is sent twice', async () => {
      const mockSupabase = createMockSupabaseClient({
        marketing_automations: [
          {
            ...canonicalPostDeliveryAutomation,
            config: {
              trigger: { type: 'order.received' },
              action: { type: 'email', campaignId: validCampaignId },
              delay: { amount: 2, unit: 'days' },
            },
          },
        ],
        customers: [
          {
            id: 'cust-101',
            email: 'sarah@example.com',
            organization_id: orgAlpha,
            email_marketing_consent: true,
          },
        ],
        marketing_automation_executions: [
          {
            id: 'exec-existing-1',
            organization_id: orgAlpha,
            automation_id: canonicalPostDeliveryAutomation.id,
            domain_event_id: 'evt-actual-1',
            order_id: 'ord-1001',
            delivery_source: 'actual',
            customer_id: 'cust-101',
            customer_email: 'sarah@example.com',
            campaign_id: validCampaignId,
            status: 'pending',
          },
        ],
      });

      const result = await handleMarketingAutomationEvent(mockSupabase as any, {
        id: 'evt-actual-1',
        event_type: 'order.received',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-1001',
          customerId: 'cust-101',
        },
      });

      expect(result.matched).toBe(1);
      expect(result.scheduled).toBe(0); // Duplicate safely skipped
    });

    it('actual delivery supersedes estimated delivery without starting a second journey', async () => {
      const mockSupabase = createMockSupabaseClient({
        marketing_automations: [
          {
            ...canonicalPostDeliveryAutomation,
            config: {
              trigger: { type: 'order.received' },
              action: { type: 'email', campaignId: validCampaignId },
              delay: { amount: 2, unit: 'days' },
            },
          },
        ],
        customers: [
          {
            id: 'cust-101',
            email: 'sarah@example.com',
            organization_id: orgAlpha,
            email_marketing_consent: true,
          },
        ],
        marketing_automation_executions: [
          {
            id: 'exec-from-estimate',
            organization_id: orgAlpha,
            automation_id: canonicalPostDeliveryAutomation.id,
            domain_event_id: 'evt-estimate-99',
            order_id: 'ord-1001',
            delivery_source: 'estimated', // Previously estimated
            customer_id: 'cust-101',
            customer_email: 'sarah@example.com',
            campaign_id: validCampaignId,
            status: 'pending',
          },
        ],
      });

      const result = await handleMarketingAutomationEvent(mockSupabase as any, {
        id: 'evt-real-delivery',
        event_type: 'order.received',
        organization_id: orgAlpha,
        payload: {
          orderId: 'ord-1001',
          customerId: 'cust-101',
          deliverySource: 'actual',
        },
      });

      expect(result.matched).toBe(1);
      expect(result.scheduled).toBe(0); // Did NOT create a second execution!

      // Execution was superseded to 'actual' and domain_event_id updated
      const executions = (mockSupabase as any)._store.marketing_automation_executions;
      expect(executions.length).toBe(1);
      expect(executions[0].delivery_source).toBe('actual');
      expect(executions[0].domain_event_id).toBe('evt-real-delivery');
    });
  });

  // ============================================================================
  // 5. ESTIMATED DELIVERY SCANNER
  // ============================================================================
  describe('Estimated Delivery Scanner', () => {
    it('scans shipped orders and emits order.received with deliverySource: estimated', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent').mockResolvedValue('evt-estimate-1');
      const now = new Date('2026-09-08T12:00:00.000Z');

      const mockCandidates = [
        {
          id: 'ord-shipped-due',
          organization_id: orgAlpha,
          customer_id: 'cust-101',
          order_number: 'ORD-101',
          status: 'shipped',
          shipping_address: { state: 'Lagos' }, // 2 days
          placed_at: '2026-09-01T10:00:00.000Z',
          shipped_at: '2026-09-02T10:00:00.000Z',
          received_at: null,
          order_items: [{ product_name: 'Standard Book' }],
        },
      ];

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  is: () => ({
                    gte: () => ({
                      limit: async () => ({ data: mockCandidates, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'marketing_automation_executions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            };
          }
          if (table === 'domain_events') {
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const scanResult = await scanAndEmitEstimatedDeliveries(mockSupabase as any, {
        now,
      });

      expect(scanResult.scanned).toBe(1);
      expect(scanResult.estimatedDelivered).toBe(1);
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          eventType: 'order.received',
          aggregateId: 'ord-shipped-due',
          payload: expect.objectContaining({
            orderId: 'ord-shipped-due',
            deliverySource: 'estimated',
            isLagosOrAbuja: true,
            shippingDays: 2,
          }),
        })
      );
    });

    it('skips orders whose estimated delivery date is in the future', async () => {
      const publishSpy = vi.spyOn(eventsService, 'publishDomainEvent').mockResolvedValue('evt-estimate-2');
      const now = new Date('2026-09-02T12:00:00.000Z'); // Only 1 day after order date

      const mockCandidates = [
        {
          id: 'ord-shipped-not-due',
          organization_id: orgAlpha,
          customer_id: 'cust-102',
          order_number: 'ORD-102',
          status: 'shipped',
          shipping_address: { state: 'Lagos' }, // 2 days required
          placed_at: '2026-09-01T10:00:00.000Z',
          shipped_at: '2026-09-01T12:00:00.000Z',
          received_at: null,
          order_items: [{ product_name: 'Standard Book' }],
        },
      ];

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'orders') {
            return {
              select: () => ({
                eq: () => ({
                  is: () => ({
                    gte: () => ({
                      limit: async () => ({ data: mockCandidates, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'marketing_automation_executions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            };
          }
          if (table === 'domain_events') {
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const scanResult = await scanAndEmitEstimatedDeliveries(mockSupabase as any, {
        now,
      });

      expect(scanResult.scanned).toBe(1);
      expect(scanResult.estimatedDelivered).toBe(0);
      expect(scanResult.skipped).toBe(1);
      expect(publishSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 6. JIT SAFETY: CONSENT REVOCATION & AUTOMATION DISABLED
  // ============================================================================
  describe('JIT Safety Checks: Consent Revocation & Automation Inactivity', () => {
    it('halts journey send step if customer revokes consent between steps', async () => {
      const mockSupabase = createMockSupabaseClient({
        marketing_automations: [
          {
            id: 'auto-1',
            organization_id: orgAlpha,
            status: 'active',
            type: 'post_purchase',
          },
        ],
        customers: [
          {
            id: 'cust-1',
            organization_id: orgAlpha,
            email_marketing_consent: false, // CONSENT REVOKED
          },
        ],
        marketing_campaigns: [
          {
            id: crossSellCampaignId,
            organization_id: orgAlpha,
            name: 'Cross Sell',
            subject: 'Something new for you',
            sender_name: 'Unwind & Doodle',
            sender_email: 'hello@unwindanddoodle.com',
          },
        ],
        marketing_automation_executions: [
          {
            id: 'exec-1',
            organization_id: orgAlpha,
            automation_id: 'auto-1',
            customer_id: 'cust-1',
            customer_email: 'revoked@example.com',
            campaign_id: crossSellCampaignId,
            status: 'processing',
            step_states: [],
          },
        ],
      });

      const result = await executeJourneySendStep(
        mockSupabase as any,
        'exec-1',
        'step-send-cross-sell',
        crossSellCampaignId,
        false
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('consent_revoked');
    });

    it('halts journey send step if automation is disabled/paused mid-journey', async () => {
      const mockSupabase = createMockSupabaseClient({
        marketing_automations: [
          {
            id: 'auto-2',
            organization_id: orgAlpha,
            status: 'paused', // PAUSED
            type: 'post_purchase',
          },
        ],
        customers: [
          {
            id: 'cust-2',
            organization_id: orgAlpha,
            email_marketing_consent: true,
          },
        ],
        marketing_campaigns: [
          {
            id: nurtureCampaignId,
            organization_id: orgAlpha,
            name: 'Nurture',
            subject: 'How are you enjoying coloring?',
            sender_name: 'Unwind & Doodle',
            sender_email: 'hello@unwindanddoodle.com',
          },
        ],
        marketing_automation_executions: [
          {
            id: 'exec-2',
            organization_id: orgAlpha,
            automation_id: 'auto-2',
            customer_id: 'cust-2',
            customer_email: 'active@example.com',
            campaign_id: nurtureCampaignId,
            status: 'processing',
            step_states: [],
          },
        ],
      });

      const result = await executeJourneySendStep(
        mockSupabase as any,
        'exec-2',
        'step-send-nurture',
        nurtureCampaignId,
        true
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('automation_inactive');
    });
  });

  // ============================================================================
  // 7. RECOMMENDATION CONTEXT AT +10D
  // ============================================================================
  describe('Recommendation Context Integration', () => {
    it('resolves product recommendations from customer purchase history and excludes owned product', async () => {
      const mockSupabase = createMockSupabaseClient({
        customers: [
          {
            id: 'cust-rec-1',
            organization_id: orgAlpha,
            first_name: 'David',
            last_name: 'Adeleke',
            email: 'david@example.com',
          },
        ],
        orders: [
          {
            id: 'ord-prev-1',
            organization_id: orgAlpha,
            customer_id: 'cust-rec-1',
            order_number: 'ORD-1001',
            status: 'received',
            created_at: '2026-09-01T10:00:00Z',
          },
        ],
        order_items: [
          {
            id: 'item-1',
            order_id: 'ord-prev-1',
            product_id: 'prod-colouring-1',
            product_name: 'Affirmations Colouring Book',
            total: 7500,
            unit_price: 7500,
            sku: 'COL-AFF-01',
          },
        ],
        products: [
          {
            id: 'prod-colouring-1',
            organization_id: orgAlpha,
            name: 'Affirmations Colouring Book',
            slug: 'affirmations-colouring-book',
            sku: 'COL-AFF-01',
            is_active: true,
          },
          {
            id: 'prod-pencil-1',
            organization_id: orgAlpha,
            name: 'Dual-Tip Colouring Marker Set',
            slug: 'dual-tip-colouring-marker-set',
            sku: 'TOOL-MARK-01',
            is_active: true,
          },
        ],
      });

      const context = await resolveMarketingContext(mockSupabase as any, {
        organizationId: orgAlpha,
        customerId: 'cust-rec-1',
        customerEmail: 'david@example.com',
        automationType: 'post_purchase',
        domainEventPayload: {
          orderId: 'ord-prev-1',
          orderNumber: 'ORD-1001',
        },
      });

      expect(context.firstName).toBe('David');
      expect(context.orderNumber).toBe('ORD-1001');
      expect(context.lastProduct).toBe('Affirmations Colouring Book');
      expect(context.productRecommendation).not.toBeNull();
      expect(context.productRecommendation?.title).toBeDefined();
      // Crucial: Recommended product must not be the same as the owned product
      expect(context.productRecommendation?.title).not.toBe('Affirmations Colouring Book');
    });
  });
});
