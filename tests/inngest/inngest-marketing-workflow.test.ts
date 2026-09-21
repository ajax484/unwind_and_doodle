import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { inngest } from '@/inngest/client';
import { GET as inngestGet } from '@/app/api/inngest/route';
import {
  marketingEventOrchestrator,
  marketingAutomationRunner,
  formatInngestDelayDuration,
  dispatchScheduledCampaignsFunction,
  recoverStaleMarketingExecutionsFunction,
} from '@/inngest/functions/marketing';
import { normalizeAutomationSteps } from '@/services/marketing-automation.service';
import { createMockSupabaseClient } from '../mocks/supabase.mock';
import { setServiceSupabaseClient } from '@/lib/supabase/client';
import { sendInngestDomainEvent } from '@/services/events.service';
import { setMarketingEmailProvider } from '@/services/marketing-provider/nodemailer-marketing.provider';
import { MarketingEmailProvider, SendEmailOptions, SendEmailResult } from '@/services/marketing-provider/types';
import { processDueMarketingAutomations } from '@/services/marketing-executor.service';

describe('Step 14: Event Cancellation & Multi-Step Marketing Journeys', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockEmailProvider: MarketingEmailProvider;
  let sentEmails: SendEmailOptions[] = [];

  const orgAlpha = 'org-11111111-1111-1111-1111-111111111111';
  const orgBeta = 'org-22222222-2222-2222-2222-222222222222';
  const customerId = 'cust-inngest-test';
  const campaignIdWelcome = 'camp-inngest-welcome';
  const campaignIdFollowup = 'camp-inngest-followup';
  const campaignIdCart1 = 'camp-cart-reminder-1';
  const campaignIdCart2 = 'camp-cart-reminder-2';

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (process.env as Record<string, string | undefined>).INNGEST_DEV = '1';
    sentEmails = [];

    mockEmailProvider = {
      sendEmail: vi.fn(async (options: SendEmailOptions): Promise<SendEmailResult> => {
        sentEmails.push(options);
        return {
          success: true,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        };
      }),
    };
    setMarketingEmailProvider(mockEmailProvider);

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgAlpha, name: 'Alpha Org', slug: 'alpha' },
        { id: orgBeta, name: 'Beta Org', slug: 'beta' },
      ],
      customers: [
        {
          id: customerId,
          organization_id: orgAlpha,
          email: 'inngest.user@example.com',
          first_name: 'Inngest',
          last_name: 'Tester',
          email_marketing_consent: true,
          created_at: new Date().toISOString(),
        },
      ],
      marketing_segments: [
        {
          id: 'seg-inngest-all',
          organization_id: orgAlpha,
          name: 'All Alpha Customers',
          description: 'All Alpha customers',
          rules: {
            match: 'all',
            conditions: [
              {
                field: 'email_marketing_consent',
                operator: 'equals',
                value: true,
              },
            ],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      marketing_campaigns: [
        {
          id: campaignIdWelcome,
          organization_id: orgAlpha,
          name: 'Inngest Welcome',
          type: 'email',
          status: 'draft',
          subject: 'Welcome from Inngest, {{first_name}}!',
          sender_name: 'Unwind & Doodle',
          sender_email: 'hello@unwindanddoodle.com',
          content: { html: '<p>Welcome via Inngest!</p>' },
        },
        {
          id: campaignIdFollowup,
          organization_id: orgAlpha,
          name: 'Inngest Follow-up',
          type: 'email',
          status: 'draft',
          subject: 'How are you enjoying Unwind & Doodle, {{first_name}}?',
          sender_name: 'Unwind & Doodle',
          sender_email: 'hello@unwindanddoodle.com',
          content: { html: '<p>Checking in on your creative journey!</p>' },
        },
        {
          id: campaignIdCart1,
          organization_id: orgAlpha,
          name: 'Cart Reminder 1',
          type: 'email',
          status: 'draft',
          subject: 'You left something in your cart!',
          sender_name: 'Unwind & Doodle',
          sender_email: 'hello@unwindanddoodle.com',
          content: { html: '<p>Complete your purchase now.</p>' },
        },
        {
          id: campaignIdCart2,
          organization_id: orgAlpha,
          name: 'Cart Reminder 2',
          type: 'email',
          status: 'draft',
          subject: 'Final chance for your cart items!',
          sender_name: 'Unwind & Doodle',
          sender_email: 'hello@unwindanddoodle.com',
          content: { html: '<p>Your cart items will expire soon.</p>' },
        },
      ],
      marketing_automations: [
        {
          id: 'auto-legacy-single',
          organization_id: orgAlpha,
          name: 'Legacy Single Step',
          type: 'welcome',
          status: 'active',
          config: {
            trigger: { type: 'customer.created' },
            delay: { amount: 0, unit: 'minutes' },
            action: { type: 'email', campaignId: campaignIdWelcome },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'auto-multi-welcome',
          organization_id: orgAlpha,
          name: 'Multi-Step Welcome Journey',
          type: 'welcome',
          status: 'active',
          config: {
            trigger: { type: 'customer.created' },
            steps: [
              { id: 'w-step-1', type: 'send_email', campaignId: campaignIdWelcome },
              { id: 'w-step-2', type: 'delay', amount: 3, unit: 'days' },
              { id: 'w-step-3', type: 'send_email', campaignId: campaignIdFollowup },
            ],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'auto-multi-cart',
          organization_id: orgAlpha,
          name: 'Multi-Step Abandoned Cart Journey',
          type: 'abandoned_checkout',
          status: 'active',
          config: {
            trigger: { type: 'checkout.abandoned' },
            steps: [
              { id: 'c-step-1', type: 'wait_for_event', event: 'order.created', timeout: 2, unit: 'hours' },
              { id: 'c-step-2', type: 'send_email', campaignId: campaignIdCart1 },
              { id: 'c-step-3', type: 'wait_for_event', event: 'order.created', timeout: 24, unit: 'hours' },
              { id: 'c-step-4', type: 'send_email', campaignId: campaignIdCart2 },
            ],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      marketing_automation_executions: [],
      marketing_campaign_recipients: [],
      marketing_email_events: [],
      orders: [],
    });

    setServiceSupabaseClient(mockSupabase as any);
  });

  afterEach(() => {
    setServiceSupabaseClient(null);
    setMarketingEmailProvider(null);
    vi.restoreAllMocks();
  });

  // Helper to mock Inngest step runner
  const createMockStepRunner = () => {
    const sleepCalls: string[] = [];
    const sentEventsList: any[] = [];
    const waitForEventsList: any[] = [];
    let waitForEventReturn: any = null;

    return {
      sleepCalls,
      sentEventsList,
      waitForEventsList,
      setWaitForEventReturn: (val: any) => {
        waitForEventReturn = val;
      },
      step: {
        run: vi.fn(async (_name: string, fn: Function) => await fn()),
        sleep: vi.fn(async (name: string, duration: string) => {
          sleepCalls.push(`${name}:${duration}`);
        }),
        sendEvent: vi.fn(async (_name: string, events: any) => {
          sentEventsList.push(events);
        }),
        waitForEvent: vi.fn(async (name: string, opts: any) => {
          waitForEventsList.push({ name, opts });
          return waitForEventReturn;
        }),
      },
    };
  };

  // ============================================================================
  // 1. STEP NORMALIZATION & BACKWARD COMPATIBILITY
  // ============================================================================
  describe('Step Normalization & Backward Compatibility', () => {
    it('normalizes legacy config with zero delay into single send step', () => {
      const legacyConfig = {
        trigger: { type: 'customer.created' as const },
        delay: { amount: 0, unit: 'minutes' as const },
        action: { type: 'email' as const, campaignId: campaignIdWelcome },
      };
      const steps = normalizeAutomationSteps(legacyConfig);
      expect(steps.length).toBe(1);
      expect(steps[0].type).toBe('send_email');
      expect((steps[0] as any).campaignId).toBe(campaignIdWelcome);
    });

    it('normalizes legacy config with delay into delay + send steps', () => {
      const legacyConfig = {
        trigger: { type: 'checkout.abandoned' as const },
        delay: { amount: 2, unit: 'hours' as const },
        action: { type: 'email' as const, campaignId: campaignIdCart1 },
      };
      const steps = normalizeAutomationSteps(legacyConfig);
      expect(steps.length).toBe(2);
      expect(steps[0].type).toBe('delay');
      expect((steps[0] as any).amount).toBe(2);
      expect(steps[1].type).toBe('send_email');
      expect((steps[1] as any).campaignId).toBe(campaignIdCart1);
    });

    it('preserves modern multi-step configurations directly', () => {
      const multiStepConfig = {
        trigger: { type: 'customer.created' as const },
        steps: [
          { id: 's1', type: 'send_email' as const, campaignId: campaignIdWelcome },
          { id: 's2', type: 'delay' as const, amount: 3, unit: 'days' as const },
          { id: 's3', type: 'send_email' as const, campaignId: campaignIdFollowup },
        ],
      };
      const steps = normalizeAutomationSteps(multiStepConfig);
      expect(steps.length).toBe(3);
      expect(steps[0].id).toBe('s1');
      expect(steps[1].id).toBe('s2');
      expect(steps[2].id).toBe('s3');
    });
  });

  // ============================================================================
  // 2. MULTI-STEP WELCOME JOURNEY
  // ============================================================================
  describe('Multi-Step Welcome Journey', () => {
    it('executes full sequence: welcome email -> durable sleep -> follow-up email', async () => {
      const executionId = 'exec-multi-welcome-full';
      const initialSteps = [
        { id: 'w-step-1', type: 'send_email' as const, campaignId: campaignIdWelcome },
        { id: 'w-step-2', type: 'delay' as const, amount: 3, unit: 'days' as const },
        { id: 'w-step-3', type: 'send_email' as const, campaignId: campaignIdFollowup },
      ];

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-welcome',
        domain_event_id: 'evt-welcome-1',
        campaign_id: campaignIdWelcome,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'pending',
        engine: 'inngest',
        config_snapshot: { steps: initialSteps },
        step_states: [],
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const mockRunner = createMockStepRunner();
      const runnerEvent = {
        name: 'marketing/automation.execute' as const,
        data: {
          executionId,
          automationId: 'auto-multi-welcome',
          organizationId: orgAlpha,
          domainEventId: 'evt-welcome-1',
          triggerType: 'welcome',
          customerId,
        },
      };

      const runnerHandler = (marketingAutomationRunner as any)['fn'];
      const result = await runnerHandler({ event: runnerEvent, step: mockRunner.step });

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');

      // Verify sleep of 3 days was called
      expect(mockRunner.sleepCalls).toContain('sleep-step-w-step-2:3d');

      // Verify both emails were sent in sequence
      expect(sentEmails.length).toBe(2);
      expect(sentEmails[0].to).toBe('inngest.user@example.com');
      expect(sentEmails[0].subject).toBe('Welcome from Inngest, Inngest!');
      expect(sentEmails[1].to).toBe('inngest.user@example.com');
      expect(sentEmails[1].subject).toBe('How are you enjoying Unwind & Doodle, Inngest?');

      // Verify execution in database is marked completed with step states
      const exec = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
      expect(exec.status).toBe('completed');
      expect(exec.step_states.length).toBe(3);
    });

    it('JIT: halts journey before follow-up send if customer revoked consent during delay', async () => {
      const executionId = 'exec-welcome-consent-halt';
      const initialSteps = [
        { id: 'w-step-1', type: 'send_email' as const, campaignId: campaignIdWelcome },
        { id: 'w-step-2', type: 'delay' as const, amount: 3, unit: 'days' as const },
        { id: 'w-step-3', type: 'send_email' as const, campaignId: campaignIdFollowup },
      ];

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-welcome',
        domain_event_id: 'evt-welcome-consent',
        campaign_id: campaignIdWelcome,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'pending',
        engine: 'inngest',
        config_snapshot: { steps: initialSteps },
        step_states: [],
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const mockRunner = createMockStepRunner();
      // Simulate customer revoking consent during the sleep step
      mockRunner.step.sleep = vi.fn(async () => {
        const customer = (mockSupabase as any)._store.customers.find((c: any) => c.id === customerId);
        customer.email_marketing_consent = false;
      });

      const runnerEvent = {
        name: 'marketing/automation.execute' as const,
        data: {
          executionId,
          automationId: 'auto-multi-welcome',
          organizationId: orgAlpha,
          domainEventId: 'evt-welcome-consent',
          triggerType: 'welcome',
          customerId,
        },
      };

      const runnerHandler = (marketingAutomationRunner as any)['fn'];
      const result = await runnerHandler({ event: runnerEvent, step: mockRunner.step });

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('consent_revoked');

      // Only the first welcome email was sent, follow-up was halted
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].subject).toBe('Welcome from Inngest, Inngest!');
    });
  });

  // ============================================================================
  // 3. MULTI-STEP ABANDONED CART WITH EVENT CANCELLATION
  // ============================================================================
  describe('Multi-Step Abandoned Cart with Event Cancellation', () => {
    it('cancels remaining journey immediately when purchase event arrives during wait', async () => {
      const executionId = 'exec-cart-event-cancel';
      const initialSteps = [
        { id: 'c-step-1', type: 'wait_for_event' as const, event: 'order.created', timeout: 2, unit: 'hours' as const },
        { id: 'c-step-2', type: 'send_email' as const, campaignId: campaignIdCart1 },
        { id: 'c-step-3', type: 'wait_for_event' as const, event: 'order.created', timeout: 24, unit: 'hours' as const },
        { id: 'c-step-4', type: 'send_email' as const, campaignId: campaignIdCart2 },
      ];

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-cart',
        domain_event_id: 'evt-cart-cancel-1',
        campaign_id: campaignIdCart1,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'pending',
        engine: 'inngest',
        config_snapshot: { steps: initialSteps },
        step_states: [],
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const mockRunner = createMockStepRunner();
      // Simulate purchase event received during step 1 wait
      mockRunner.setWaitForEventReturn({
        name: 'commerce/domain.event',
        data: {
          domainEvent: {
            id: 'evt-purchased-during-wait',
            event_type: 'order.created',
            organization_id: orgAlpha,
            payload: { customerId },
          },
        },
      });

      const runnerEvent = {
        name: 'marketing/automation.execute' as const,
        data: {
          executionId,
          automationId: 'auto-multi-cart',
          organizationId: orgAlpha,
          domainEventId: 'evt-cart-cancel-1',
          triggerType: 'abandoned_checkout',
          customerId,
        },
      };

      const runnerHandler = (marketingAutomationRunner as any)['fn'];
      const result = await runnerHandler({ event: runnerEvent, step: mockRunner.step });

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('order_completed');

      // Zero reminder emails were sent
      expect(sentEmails.length).toBe(0);

      // Verify DB record marked skipped
      const exec = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
      expect(exec.status).toBe('skipped');
      expect(exec.skip_reason).toBe('order_completed');
    });

    it('TENANT ISOLATION: purchase from Org Beta does not cancel Org Alpha journey', async () => {
      const executionId = 'exec-cart-tenant-safe';
      const initialSteps = [
        { id: 'c-step-1', type: 'wait_for_event' as const, event: 'order.created', timeout: 2, unit: 'hours' as const },
        { id: 'c-step-2', type: 'send_email' as const, campaignId: campaignIdCart1 },
      ];

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-cart',
        domain_event_id: 'evt-cart-tenant-1',
        campaign_id: campaignIdCart1,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'pending',
        engine: 'inngest',
        config_snapshot: { steps: initialSteps },
        step_states: [],
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const mockRunner = createMockStepRunner();
      // Return purchase event from FOREIGN organization (Org Beta)
      mockRunner.setWaitForEventReturn({
        name: 'commerce/domain.event',
        data: {
          domainEvent: {
            id: 'evt-beta-order',
            event_type: 'order.created',
            organization_id: orgBeta, // Different tenant!
            payload: { customerId },
          },
        },
      });

      const runnerEvent = {
        name: 'marketing/automation.execute' as const,
        data: {
          executionId,
          automationId: 'auto-multi-cart',
          organizationId: orgAlpha,
          domainEventId: 'evt-cart-tenant-1',
          triggerType: 'abandoned_checkout',
          customerId,
        },
      };

      const runnerHandler = (marketingAutomationRunner as any)['fn'];
      const result = await runnerHandler({ event: runnerEvent, step: mockRunner.step });

      // Foreign event was ignored, reminder was sent
      expect(result.status).toBe('completed');
      expect(sentEmails.length).toBe(1);

      // Verify waitForEvent options were called with proper scoped `if` condition
      expect(mockRunner.waitForEventsList.length).toBe(1);
      expect(mockRunner.waitForEventsList[0].opts.if).toContain('async.data.domainEvent.organization_id == event.data.organizationId');
      expect(mockRunner.waitForEventsList[0].opts.if).toContain('async.data.domainEvent.payload.customerId == event.data.customerId');
    });

    it('CUSTOMER ISOLATION: purchase by Customer B does not cancel Customer A journey', async () => {
      const executionId = 'exec-cart-cust-isolation';
      const customerBId = 'cust-different-b';
      const initialSteps = [
        { id: 'c-step-1', type: 'wait_for_event' as const, event: 'order.created', timeout: 2, unit: 'hours' as const },
        { id: 'c-step-2', type: 'send_email' as const, campaignId: campaignIdCart1 },
      ];

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-cart',
        domain_event_id: 'evt-cart-cust-1',
        campaign_id: campaignIdCart1,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'pending',
        engine: 'inngest',
        config_snapshot: { steps: initialSteps },
        step_states: [],
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const mockRunner = createMockStepRunner();
      // Purchase event arrived from Customer B (same tenant, different customer)
      mockRunner.setWaitForEventReturn({
        name: 'commerce/domain.event',
        data: {
          domainEvent: {
            id: 'evt-cust-b-order',
            event_type: 'order.created',
            organization_id: orgAlpha,
            payload: { customerId: customerBId },
          },
        },
      });

      const runnerEvent = {
        name: 'marketing/automation.execute' as const,
        data: {
          executionId,
          automationId: 'auto-multi-cart',
          organizationId: orgAlpha,
          domainEventId: 'evt-cart-cust-1',
          triggerType: 'abandoned_checkout',
          customerId,
        },
      };

      const runnerHandler = (marketingAutomationRunner as any)['fn'];
      const result = await runnerHandler({ event: runnerEvent, step: mockRunner.step });

      // Event from customer B was ignored, reminder was sent to customer A
      expect(result.status).toBe('completed');
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe('inngest.user@example.com');
    });

    it('JIT FALLBACK: halts email dispatch if order was created in DB even if waitForEvent timed out', async () => {
      const executionId = 'exec-cart-jit-fallback';
      const initialSteps = [
        { id: 'c-step-1', type: 'wait_for_event' as const, event: 'order.created', timeout: 2, unit: 'hours' as const },
        { id: 'c-step-2', type: 'send_email' as const, campaignId: campaignIdCart1 },
      ];

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-cart',
        domain_event_id: 'evt-cart-jit-1',
        campaign_id: campaignIdCart1,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'pending',
        engine: 'inngest',
        config_snapshot: { steps: initialSteps },
        step_states: [],
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      });

      // Customer completed order in database after execution creation
      (mockSupabase as any)._store.orders.push({
        id: 'order-jit-completed',
        organization_id: orgAlpha,
        customer_id: customerId,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      });

      const mockRunner = createMockStepRunner();
      // waitForEvent timed out / returned null
      mockRunner.setWaitForEventReturn(null);

      const runnerEvent = {
        name: 'marketing/automation.execute' as const,
        data: {
          executionId,
          automationId: 'auto-multi-cart',
          organizationId: orgAlpha,
          domainEventId: 'evt-cart-jit-1',
          triggerType: 'abandoned_checkout',
          customerId,
        },
      };

      const runnerHandler = (marketingAutomationRunner as any)['fn'];
      const result = await runnerHandler({ event: runnerEvent, step: mockRunner.step });

      // JIT check halts email send
      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('order_completed');
      expect(sentEmails.length).toBe(0);
    });
  });

  // ============================================================================
  // 4. CONFIGURATION SNAPSHOTTING & ENROLLMENT DETERMINISM
  // ============================================================================
  describe('Configuration Snapshotting & Enrollment Determinism', () => {
    it('persists config_snapshot when marketingEventOrchestrator schedules executions', async () => {
      const orchestratorHandler = (marketingEventOrchestrator as any)['fn'];
      const mockRunner = createMockStepRunner();

      const domainEvent = {
        id: 'evt-orch-welcome-1',
        event_type: 'customer.created',
        organization_id: orgAlpha,
        payload: {
          customerId,
          customerEmail: 'inngest.user@example.com',
          firstName: 'Inngest',
          lastName: 'Tester',
        },
      };

      const result = await orchestratorHandler({
        event: { name: 'commerce/domain.event', data: { domainEvent } },
        step: mockRunner.step,
      });

      expect(result.matched).toBeGreaterThanOrEqual(1);
      expect(result.scheduled).toBeGreaterThanOrEqual(1);

      // Verify the execution record in store has config_snapshot populated
      const execution = (mockSupabase as any)._store.marketing_automation_executions.find(
        (e: any) => e.domain_event_id === 'evt-orch-welcome-1'
      );
      expect(execution).toBeDefined();
      expect(execution.engine).toBe('inngest');
      expect(execution.config_snapshot).toBeDefined();
      expect(execution.config_snapshot.trigger).toBeDefined();
    });

    it('running journey executes snapshotted steps even if automation is updated in database', async () => {
      const executionId = 'exec-snapshot-test';
      // Snapshotted with original campaign
      const snapshottedConfig = {
        steps: [
          { id: 's-orig-1', type: 'send_email' as const, campaignId: campaignIdWelcome },
        ],
      };

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-welcome',
        domain_event_id: 'evt-snap-1',
        campaign_id: campaignIdWelcome,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'pending',
        engine: 'inngest',
        config_snapshot: snapshottedConfig,
        step_states: [],
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Admin updates automation in database to point to a completely different campaign
      const autoInDb = (mockSupabase as any)._store.marketing_automations.find((a: any) => a.id === 'auto-multi-welcome');
      autoInDb.config = {
        steps: [
          { id: 's-new-1', type: 'send_email', campaignId: campaignIdCart2 },
        ],
      };

      const mockRunner = createMockStepRunner();
      const runnerEvent = {
        name: 'marketing/automation.execute' as const,
        data: {
          executionId,
          automationId: 'auto-multi-welcome',
          organizationId: orgAlpha,
          domainEventId: 'evt-snap-1',
          triggerType: 'welcome',
          customerId,
        },
      };

      const runnerHandler = (marketingAutomationRunner as any)['fn'];
      const result = await runnerHandler({ event: runnerEvent, step: mockRunner.step });

      expect(result.status).toBe('completed');

      // The email sent corresponds to the original snapshotted campaign (Welcome), not the mutated DB config (Cart2)
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].subject).toBe('Welcome from Inngest, Inngest!');
    });

    it('LIVE SAFETY: does not send if automation is paused/disabled in database despite valid snapshot', async () => {
      const executionId = 'exec-disabled-safety';
      const snapshottedConfig = {
        steps: [
          { id: 's-orig-1', type: 'send_email' as const, campaignId: campaignIdWelcome },
        ],
      };

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-welcome',
        domain_event_id: 'evt-snap-disabled',
        campaign_id: campaignIdWelcome,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'pending',
        engine: 'inngest',
        config_snapshot: snapshottedConfig,
        step_states: [],
        scheduled_for: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Admin pauses/disables the automation in the database
      const autoInDb = (mockSupabase as any)._store.marketing_automations.find((a: any) => a.id === 'auto-multi-welcome');
      autoInDb.status = 'paused';

      const mockRunner = createMockStepRunner();
      const runnerEvent = {
        name: 'marketing/automation.execute' as const,
        data: {
          executionId,
          automationId: 'auto-multi-welcome',
          organizationId: orgAlpha,
          domainEventId: 'evt-snap-disabled',
          triggerType: 'welcome',
          customerId,
        },
      };

      const runnerHandler = (marketingAutomationRunner as any)['fn'];
      const result = await runnerHandler({ event: runnerEvent, step: mockRunner.step });

      // Operational eligibility check stops execution
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('automation_inactive');
      expect(sentEmails.length).toBe(0);

      // Verify execution in database is marked skipped with automation_inactive
      const exec = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
      expect(exec.status).toBe('skipped');
      expect(exec.skip_reason).toBe('automation_inactive');
    });
  });

  // ============================================================================
  // 5. SCHEDULED CAMPAIGN DISPATCHER FUNCTION
  // ============================================================================
  describe('Scheduled Campaign Dispatcher Function', () => {
    it('is configured with 1-minute cron schedule', () => {
      const opts = (dispatchScheduledCampaignsFunction as any)['opts'];
      expect(opts.id).toBe('dispatch-scheduled-campaigns');
      expect(opts.name).toBe('Dispatch Scheduled Campaigns');
      expect(opts.triggers).toEqual([{ cron: '* * * * *' }]);
    });

    it('dispatches due scheduled campaigns across organizations', async () => {
      const campaignIdScheduled = 'camp-scheduled-due-1';
      const pastScheduledAt = new Date(Date.now() - 60000).toISOString();

      (mockSupabase as any)._store.marketing_campaigns.push({
        id: campaignIdScheduled,
        organization_id: orgAlpha,
        name: 'Scheduled Flash Sale',
        type: 'email',
        status: 'scheduled',
        scheduled_at: pastScheduledAt,
        segment_id: 'seg-inngest-all',
        subject: 'Flash Sale is LIVE, {{first_name}}!',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        content: { html: '<p>Don\'t miss our limited-time discount!</p>' },
      });

      const mockRunner = createMockStepRunner();
      const dispatcherHandler = (dispatchScheduledCampaignsFunction as any)['fn'];
      const result = await dispatcherHandler({ step: mockRunner.step });

      expect(result.processed).toBe(1);
      expect(result.dispatched).toBe(1);
      expect(result.failed).toBe(0);

      // Verify email sent via provider
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe('inngest.user@example.com');
      expect(sentEmails[0].subject).toBe('Flash Sale is LIVE, Inngest!');

      // Verify campaign status updated to 'sent' in database
      const campaign = (mockSupabase as any)._store.marketing_campaigns.find((c: any) => c.id === campaignIdScheduled);
      expect(campaign.status).toBe('sent');
      expect(campaign.completed_at).toBeDefined();
    });

    it('ignores future scheduled campaigns', async () => {
      const campaignIdFuture = 'camp-scheduled-future-1';
      const futureScheduledAt = new Date(Date.now() + 3600000).toISOString();

      (mockSupabase as any)._store.marketing_campaigns.push({
        id: campaignIdFuture,
        organization_id: orgAlpha,
        name: 'Future Event',
        type: 'email',
        status: 'scheduled',
        scheduled_at: futureScheduledAt,
        segment_id: 'seg-inngest-all',
        subject: 'Coming next week!',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        content: { html: '<p>Stay tuned!</p>' },
      });

      const mockRunner = createMockStepRunner();
      const dispatcherHandler = (dispatchScheduledCampaignsFunction as any)['fn'];
      const result = await dispatcherHandler({ step: mockRunner.step });

      expect(result.processed).toBe(0);
      expect(result.dispatched).toBe(0);
      expect(sentEmails.length).toBe(0);

      const campaign = (mockSupabase as any)._store.marketing_campaigns.find((c: any) => c.id === campaignIdFuture);
      expect(campaign.status).toBe('scheduled');
    });

    it('ignores cancelled campaigns', async () => {
      const campaignIdCancelled = 'camp-cancelled-1';
      const pastScheduledAt = new Date(Date.now() - 60000).toISOString();

      (mockSupabase as any)._store.marketing_campaigns.push({
        id: campaignIdCancelled,
        organization_id: orgAlpha,
        name: 'Cancelled Campaign',
        type: 'email',
        status: 'cancelled',
        scheduled_at: pastScheduledAt,
        segment_id: 'seg-inngest-all',
        subject: 'Never sent',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        content: { html: '<p>Cancelled!</p>' },
      });

      const mockRunner = createMockStepRunner();
      const dispatcherHandler = (dispatchScheduledCampaignsFunction as any)['fn'];
      const result = await dispatcherHandler({ step: mockRunner.step });

      expect(result.processed).toBe(0);
      expect(result.dispatched).toBe(0);
      expect(sentEmails.length).toBe(0);
    });

    it('concurrent safety: campaign claimed by another worker (status=sending) is safely skipped', async () => {
      const campaignIdClaimed = 'camp-already-sending';
      const pastScheduledAt = new Date(Date.now() - 60000).toISOString();

      (mockSupabase as any)._store.marketing_campaigns.push({
        id: campaignIdClaimed,
        organization_id: orgAlpha,
        name: 'Currently Sending Campaign',
        type: 'email',
        status: 'sending', // Already claimed by another worker!
        scheduled_at: pastScheduledAt,
        segment_id: 'seg-inngest-all',
        subject: 'Already in progress',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        content: { html: '<p>Processing...</p>' },
      });

      const mockRunner = createMockStepRunner();
      const dispatcherHandler = (dispatchScheduledCampaignsFunction as any)['fn'];
      const result = await dispatcherHandler({ step: mockRunner.step });

      // Ignored because status is not 'scheduled'
      expect(result.processed).toBe(0);
      expect(result.dispatched).toBe(0);
      expect(sentEmails.length).toBe(0);
    });

    it('retry safety: does not resend recipients already in sent status', async () => {
      const campaignIdRetry = 'camp-retry-dedup';
      const pastScheduledAt = new Date(Date.now() - 60000).toISOString();

      (mockSupabase as any)._store.marketing_campaigns.push({
        id: campaignIdRetry,
        organization_id: orgAlpha,
        name: 'Partially Sent Campaign',
        type: 'email',
        status: 'scheduled',
        scheduled_at: pastScheduledAt,
        segment_id: 'seg-inngest-all',
        subject: 'Retry subject, {{first_name}}!',
        sender_name: 'Unwind & Doodle',
        sender_email: 'hello@unwindanddoodle.com',
        content: { html: '<p>Check it out!</p>' },
      });

      // Recipient was already marked 'sent' from an earlier partial attempt
      (mockSupabase as any)._store.marketing_campaign_recipients.push({
        id: 'recip-already-sent',
        campaign_id: campaignIdRetry,
        customer_id: customerId,
        email: 'inngest.user@example.com',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      const mockRunner = createMockStepRunner();
      const dispatcherHandler = (dispatchScheduledCampaignsFunction as any)['fn'];
      const result = await dispatcherHandler({ step: mockRunner.step });

      expect(result.processed).toBe(1);
      // No new emails sent via provider because recipient is already sent
      expect(sentEmails.length).toBe(0);
    });
  });

  // ============================================================================
  // 6. STALE INNGEST AUTOMATION EXECUTION RECOVERY
  // ============================================================================
  describe('Stale Inngest Automation Execution Recovery', () => {
    it('is configured with hourly cron schedule', () => {
      const opts = (recoverStaleMarketingExecutionsFunction as any)['opts'];
      expect(opts.id).toBe('recover-stale-marketing-executions');
      expect(opts.name).toBe('Recover Stale Marketing Executions');
      expect(opts.triggers).toEqual([{ cron: '0 * * * *' }]);
    });

    it('recovers genuinely abandoned Inngest execution (processing for > 2h without active wait)', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const executionId = 'exec-inngest-stale-abandoned';

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-legacy-single',
        domain_event_id: 'evt-stale-inngest-1',
        campaign_id: campaignIdWelcome,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'processing', // Stuck in processing
        engine: 'inngest',
        config_snapshot: {
          steps: [{ id: 's1', type: 'send_email', campaignId: campaignIdWelcome }],
        },
        current_step_id: 's1',
        step_states: [],
        scheduled_for: threeHoursAgo,
        created_at: threeHoursAgo,
        updated_at: threeHoursAgo,
      });

      const mockRunner = createMockStepRunner();
      const recoveryHandler = (recoverStaleMarketingExecutionsFunction as any)['fn'];
      const result = await recoveryHandler({ step: mockRunner.step });

      expect(result.scanned).toBeGreaterThanOrEqual(1);
      expect(result.recovered).toBe(1);
      expect(result.recoveredIds).toContain(executionId);

      // Verify execution marked failed with error_message='stale_inngest_execution'
      const exec = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
      expect(exec.status).toBe('failed');
      expect(exec.error_message).toBe('stale_inngest_execution');

      // CRITICAL: Verify recovery NEVER sends messages to the customer
      expect(sentEmails.length).toBe(0);
    });

    it('preserves active delay sleep (e.g. 3-day wait is not marked stale after 1 day)', async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const executionId = 'exec-inngest-active-sleep';

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-welcome',
        domain_event_id: 'evt-active-sleep',
        campaign_id: campaignIdWelcome,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'processing',
        engine: 'inngest',
        config_snapshot: {
          steps: [
            { id: 'w-step-1', type: 'send_email', campaignId: campaignIdWelcome },
            { id: 'w-step-2', type: 'delay', amount: 3, unit: 'days' }, // 3-day sleep
            { id: 'w-step-3', type: 'send_email', campaignId: campaignIdFollowup },
          ],
        },
        current_step_id: 'w-step-2',
        step_states: [
          { step_id: 'w-step-1', type: 'send_email', status: 'completed' },
          { step_id: 'w-step-2', type: 'delay', status: 'completed' },
        ],
        scheduled_for: oneDayAgo,
        created_at: oneDayAgo,
        updated_at: oneDayAgo,
      });

      const mockRunner = createMockStepRunner();
      const recoveryHandler = (recoverStaleMarketingExecutionsFunction as any)['fn'];
      const result = await recoveryHandler({ step: mockRunner.step });

      expect(result.skippedActive).toBeGreaterThanOrEqual(1);

      // Verify execution remains untouched in 'processing' status
      const exec = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
      expect(exec.status).toBe('processing');
      expect(exec.error_message).toBeFalsy();
    });

    it('preserves active event wait (e.g. 24-hour wait is not marked stale after 6 hours)', async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const executionId = 'exec-inngest-active-event-wait';

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-multi-cart',
        domain_event_id: 'evt-active-event-wait',
        campaign_id: campaignIdCart1,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'processing',
        engine: 'inngest',
        config_snapshot: {
          steps: [
            { id: 'c-step-1', type: 'wait_for_event', event: 'order.created', timeout: 24, unit: 'hours' },
            { id: 'c-step-2', type: 'send_email', campaignId: campaignIdCart1 },
          ],
        },
        current_step_id: 'c-step-1',
        step_states: [],
        scheduled_for: sixHoursAgo,
        created_at: sixHoursAgo,
        updated_at: sixHoursAgo,
      });

      const mockRunner = createMockStepRunner();
      const recoveryHandler = (recoverStaleMarketingExecutionsFunction as any)['fn'];
      const result = await recoveryHandler({ step: mockRunner.step });

      expect(result.skippedActive).toBeGreaterThanOrEqual(1);

      const exec = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
      expect(exec.status).toBe('processing');
    });

    it('preserves completed and terminal executions', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const executionId = 'exec-already-completed';

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-legacy-single',
        domain_event_id: 'evt-already-completed',
        campaign_id: campaignIdWelcome,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'completed', // Completed
        engine: 'inngest',
        scheduled_for: threeHoursAgo,
        created_at: threeHoursAgo,
        updated_at: threeHoursAgo,
      });

      const mockRunner = createMockStepRunner();
      const recoveryHandler = (recoverStaleMarketingExecutionsFunction as any)['fn'];
      await recoveryHandler({ step: mockRunner.step });

      const exec = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
      expect(exec.status).toBe('completed');
    });

    it('atomic conflict guard: does not overwrite row if updated_at changed concurrently', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const executionId = 'exec-atomic-conflict';

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-legacy-single',
        domain_event_id: 'evt-atomic-conflict',
        campaign_id: campaignIdWelcome,
        customer_id: customerId,
        customer_email: 'inngest.user@example.com',
        status: 'processing',
        engine: 'inngest',
        config_snapshot: { steps: [{ id: 's1', type: 'send_email', campaignId: campaignIdWelcome }] },
        current_step_id: 's1',
        step_states: [],
        scheduled_for: threeHoursAgo,
        created_at: threeHoursAgo,
        updated_at: threeHoursAgo,
      });

      // Simulate a concurrent worker updating the record right after query but before update
      const origFrom = (mockSupabase as any).from;
      let intercepted = false;
      vi.spyOn(mockSupabase, 'from').mockImplementation((table: string) => {
        const builder = origFrom.call(mockSupabase, table);
        if (table === 'marketing_automation_executions' && !intercepted) {
          intercepted = true;
          // Mutate the store record's updated_at to simulate concurrent activity
          const stored = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
          if (stored) {
            stored.updated_at = new Date().toISOString();
            stored.status = 'completed';
          }
        }
        return builder;
      });

      const mockRunner = createMockStepRunner();
      const recoveryHandler = (recoverStaleMarketingExecutionsFunction as any)['fn'];
      const result = await recoveryHandler({ step: mockRunner.step });

      // The atomic condition eq('updated_at', threeHoursAgo) failed, so it was safely not modified
      expect(result.recovered).toBe(0);
      const exec = (mockSupabase as any)._store.marketing_automation_executions.find((e: any) => e.id === executionId);
      expect(exec.status).toBe('completed');
    });
  });
});
