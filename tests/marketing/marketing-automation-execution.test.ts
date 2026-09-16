import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient } from '../mocks/supabase.mock';
import { setServiceSupabaseClient } from '@/lib/supabase/client';
import {
  handleMarketingAutomationEvent,
  executeSingleAutomation,
  processDueMarketingAutomations,
  calculateScheduledTime,
  resolveEventCustomer,
} from '@/services/marketing-executor.service';
import { POST as processDueRoute } from '@/app/api/admin/marketing/automations/process-due/route';
import { GET as getExecutionsRoute } from '@/app/api/admin/marketing/automations/[id]/executions/route';
import { setMarketingEmailProvider } from '@/services/marketing-provider/nodemailer-marketing.provider';
import { MarketingEmailProvider, SendEmailOptions, SendEmailResult } from '@/services/marketing-provider/types';

describe('Step 2B: Marketing Automation Execution', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockEmailProvider: MarketingEmailProvider;
  let sentEmails: SendEmailOptions[] = [];

  const orgAlpha = 'org-11111111-1111-1111-1111-111111111111';
  const orgBeta = 'org-22222222-2222-2222-2222-222222222222';
  const adminId = 'user-admin-alpha';

  const campaignIdAlpha = 'camp-welcome-alpha';
  const campaignIdAbandoned = 'camp-cart-alpha';
  const customerOptedInId = 'cust-opted-in';
  const customerOptedOutId = 'cust-opted-out';

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (process.env as Record<string, string | undefined>).CRON_SECRET = 'test-cron-secret-123';

    sentEmails = [];
    mockEmailProvider = {
      sendEmail: vi.fn(async (options: SendEmailOptions): Promise<SendEmailResult> => {
        sentEmails.push(options);
        return {
          success: true,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        };
      }),
    };
    setMarketingEmailProvider(mockEmailProvider);

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
      customers: [
        {
          id: customerOptedInId,
          organization_id: orgAlpha,
          email: 'alice@example.com',
          first_name: 'Alice',
          last_name: 'Smith',
          email_marketing_consent: true,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: customerOptedOutId,
          organization_id: orgAlpha,
          email: 'bob@example.com',
          first_name: 'Bob',
          last_name: 'Jones',
          email_marketing_consent: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      marketing_campaigns: [
        {
          id: campaignIdAlpha,
          organization_id: orgAlpha,
          name: 'Welcome Series Campaign',
          type: 'email',
          status: 'draft',
          subject: 'Welcome to our store, {{first_name}}!',
          preview_text: 'Excited to have you.',
          sender_name: 'Unwind & Doodle',
          sender_email: 'hello@unwindanddoodle.com',
          content: { html: '<p>Hi {{first_name}}! Welcome!</p>' },
        },
        {
          id: campaignIdAbandoned,
          organization_id: orgAlpha,
          name: 'Abandoned Cart Campaign',
          type: 'email',
          status: 'draft',
          subject: 'Did you forget something, {{first_name}}?',
          sender_name: 'Unwind & Doodle',
          sender_email: 'hello@unwindanddoodle.com',
          content: { html: '<p>Complete your purchase today.</p>' },
        },
      ],
      marketing_automations: [
        {
          id: 'auto-welcome',
          organization_id: orgAlpha,
          name: 'Welcome Automation',
          type: 'welcome',
          status: 'active',
          config: {
            trigger: { type: 'customer.created' },
            delay: { amount: 0, unit: 'minutes' }, // Instant
            action: { type: 'email', campaignId: campaignIdAlpha },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'auto-delayed-cart',
          organization_id: orgAlpha,
          name: 'Cart Recovery 2h',
          type: 'abandoned_checkout',
          status: 'active',
          config: {
            trigger: { type: 'checkout.abandoned' },
            delay: { amount: 2, unit: 'hours' },
            action: { type: 'email', campaignId: campaignIdAbandoned },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'auto-paused',
          organization_id: orgAlpha,
          name: 'Paused Welcome',
          type: 'welcome',
          status: 'paused',
          config: {
            trigger: { type: 'customer.created' },
            action: { type: 'email', campaignId: campaignIdAlpha },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      marketing_automation_executions: [],
      marketing_campaign_recipients: [],
      marketing_email_events: [],
      orders: [],
      domain_events: [],
    });

    setServiceSupabaseClient(mockSupabase as any);
  });

  afterEach(() => {
    setServiceSupabaseClient(null);
    setMarketingEmailProvider(null);
  });

  function createAdminRequest(
    url: string,
    options: {
      method?: string;
      body?: any;
      cronSecret?: string;
      unauthenticated?: boolean;
    } = {}
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.cronSecret) {
      headers['authorization'] = `Bearer ${options.cronSecret}`;
    } else if (!options.unauthenticated) {
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
  // 1. DELAY CALCULATION
  // ============================================================================
  describe('Delay Calculation', () => {
    const base = new Date('2026-09-16T10:00:00.000Z');

    it('returns exact base time if no delay or zero delay', () => {
      expect(calculateScheduledTime(base).toISOString()).toBe('2026-09-16T10:00:00.000Z');
      expect(
        calculateScheduledTime(base, { amount: 0, unit: 'minutes' }).toISOString()
      ).toBe('2026-09-16T10:00:00.000Z');
    });

    it('calculates minute delays accurately', () => {
      const scheduled = calculateScheduledTime(base, { amount: 30, unit: 'minutes' });
      expect(scheduled.toISOString()).toBe('2026-09-16T10:30:00.000Z');
    });

    it('calculates hour delays accurately', () => {
      const scheduled = calculateScheduledTime(base, { amount: 2, unit: 'hours' });
      expect(scheduled.toISOString()).toBe('2026-09-16T12:00:00.000Z');
    });

    it('calculates day delays accurately', () => {
      const scheduled = calculateScheduledTime(base, { amount: 3, unit: 'days' });
      expect(scheduled.toISOString()).toBe('2026-09-19T10:00:00.000Z');
    });
  });

  // ============================================================================
  // 2. TRIGGER EXECUTION & CUSTOMER RESOLUTION
  // ============================================================================
  describe('Event Trigger Ingestion & Immediate Execution', () => {
    it('executes immediate welcome automation on customer.created event', async () => {
      const event = {
        id: 'evt-cust-1',
        event_type: 'customer.created',
        organization_id: orgAlpha,
        payload: {
          customerId: customerOptedInId,
        },
      };

      const result = await handleMarketingAutomationEvent(mockSupabase as any, event);

      expect(result.matched).toBe(1);
      expect(result.scheduled).toBe(1);
      expect(result.executed).toBe(1);

      // Verify execution record
      const executions = (mockSupabase as any)._store.marketing_automation_executions;
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe('completed');
      expect(executions[0].customer_email).toBe('alice@example.com');

      // Verify email was dispatched via provider with personalization
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe('alice@example.com');
      expect(sentEmails[0].subject).toBe('Welcome to our store, Alice!');

      // Verify recipient record created
      const recipients = (mockSupabase as any)._store.marketing_campaign_recipients;
      expect(recipients.length).toBe(1);
      expect(recipients[0].status).toBe('sent');

      // Verify tracking event created
      const events = (mockSupabase as any)._store.marketing_email_events;
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe('sent');
    });

    it('schedules delayed automation without executing immediately', async () => {
      const event = {
        id: 'evt-cart-1',
        event_type: 'checkout.abandoned',
        organization_id: orgAlpha,
        payload: {
          checkoutId: 'chk-123',
          customerId: customerOptedInId,
        },
      };

      const result = await handleMarketingAutomationEvent(mockSupabase as any, event);

      expect(result.matched).toBe(1);
      expect(result.scheduled).toBe(1);
      expect(result.executed).toBe(0); // Delayed 2 hours, not immediate

      // Execution created in pending status
      const executions = (mockSupabase as any)._store.marketing_automation_executions;
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe('pending');

      // No email sent yet
      expect(sentEmails.length).toBe(0);
    });

    it('ignores domain events from other organizations', async () => {
      const event = {
        id: 'evt-beta-1',
        event_type: 'customer.created',
        organization_id: orgBeta,
        payload: {
          customerId: 'cust-beta',
        },
      };

      const result = await handleMarketingAutomationEvent(mockSupabase as any, event);

      expect(result.matched).toBe(0);
      expect(result.scheduled).toBe(0);
      expect(sentEmails.length).toBe(0);
    });

    it('ignores paused automations', async () => {
      // Modify welcome automation to paused
      (mockSupabase as any)._store.marketing_automations = (
        mockSupabase as any
      )._store.marketing_automations.map((a: any) =>
        a.id === 'auto-welcome' ? { ...a, status: 'paused' } : a
      );

      const event = {
        id: 'evt-cust-2',
        event_type: 'customer.created',
        organization_id: orgAlpha,
        payload: { customerId: customerOptedInId },
      };

      const result = await handleMarketingAutomationEvent(mockSupabase as any, event);
      expect(result.matched).toBe(0);
      expect(sentEmails.length).toBe(0);
    });
  });

  // ============================================================================
  // 3. IDEMPOTENCY
  // ============================================================================
  describe('Idempotency Safeguards', () => {
    it('prevents duplicate executions when same domain event is processed twice', async () => {
      const event = {
        id: 'evt-duplicate-1',
        event_type: 'customer.created',
        organization_id: orgAlpha,
        payload: { customerId: customerOptedInId },
      };

      // First run
      const result1 = await handleMarketingAutomationEvent(mockSupabase as any, event);
      expect(result1.executed).toBe(1);
      expect(sentEmails.length).toBe(1);

      // Duplicate delivery of same event
      const result2 = await handleMarketingAutomationEvent(mockSupabase as any, event);
      expect(result2.scheduled).toBe(0);
      expect(result2.executed).toBe(0);

      // Email was NOT sent twice
      expect(sentEmails.length).toBe(1);
    });

    it('prevents double-processing of scheduled executions', async () => {
      const executionId = 'exec-double-claim-test';
      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-welcome',
        domain_event_id: 'evt-100',
        campaign_id: campaignIdAlpha,
        customer_id: customerOptedInId,
        customer_email: 'alice@example.com',
        status: 'pending',
        scheduled_for: new Date(Date.now() - 1000).toISOString(), // Due
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Worker 1 claims and executes
      const res1 = await executeSingleAutomation(mockSupabase as any, executionId);
      expect(res1.success).toBe(true);
      expect(sentEmails.length).toBe(1);

      // Worker 2 attempts concurrent/duplicate execution
      const res2 = await executeSingleAutomation(mockSupabase as any, executionId);
      expect(res2.success).toBe(false);
      expect(res2.reason).toMatch(/already claimed/i);

      // Still only 1 email sent
      expect(sentEmails.length).toBe(1);
    });
  });

  // ============================================================================
  // 4. ELIGIBILITY & CONSENT RACE CONDITIONS
  // ============================================================================
  describe('Just-In-Time Consent & Eligibility Checks', () => {
    it('skips execution if customer lacks marketing consent', async () => {
      const event = {
        id: 'evt-cust-opted-out',
        event_type: 'customer.created',
        organization_id: orgAlpha,
        payload: { customerId: customerOptedOutId },
      };

      await handleMarketingAutomationEvent(mockSupabase as any, event);

      // Execution was marked skipped due to consent_revoked
      const executions = (mockSupabase as any)._store.marketing_automation_executions;
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe('skipped');
      expect(executions[0].skip_reason).toBe('consent_revoked');

      // No email was sent
      expect(sentEmails.length).toBe(0);
    });

    it('skips execution if customer revokes consent between scheduling and execution', async () => {
      const executionId = 'exec-consent-race';
      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-welcome',
        domain_event_id: 'evt-consent-race',
        campaign_id: campaignIdAlpha,
        customer_id: customerOptedInId,
        customer_email: 'alice@example.com',
        status: 'pending',
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Customer revokes consent in database
      const cust = (mockSupabase as any)._store.customers.find(
        (c: any) => c.id === customerOptedInId
      );
      cust.email_marketing_consent = false;

      // Scheduled execution runs
      const res = await executeSingleAutomation(mockSupabase as any, executionId);

      expect(res.status).toBe('skipped');
      expect(res.reason).toBe('consent_revoked');
      expect(sentEmails.length).toBe(0);
    });
  });

  // ============================================================================
  // 5. ABANDONED CHECKOUT SAFETY
  // ============================================================================
  describe('Abandoned Checkout Purchase Detection', () => {
    it('skips abandoned checkout email if customer completed a purchase in the meantime', async () => {
      const executionCreatedAt = new Date('2026-09-16T10:00:00Z').toISOString();
      const executionId = 'exec-cart-safety';

      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: executionId,
        organization_id: orgAlpha,
        automation_id: 'auto-delayed-cart',
        domain_event_id: 'evt-cart-recovery',
        campaign_id: campaignIdAbandoned,
        customer_id: customerOptedInId,
        customer_email: 'alice@example.com',
        status: 'pending',
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        created_at: executionCreatedAt,
        updated_at: executionCreatedAt,
      });

      // Customer completed an order 30 minutes later
      (mockSupabase as any)._store.orders.push({
        id: 'ord-completed-later',
        organization_id: orgAlpha,
        customer_id: customerOptedInId,
        status: 'paid',
        created_at: new Date('2026-09-16T10:30:00Z').toISOString(),
      });

      // Scheduled job runs
      const res = await executeSingleAutomation(mockSupabase as any, executionId);

      expect(res.status).toBe('skipped');
      expect(res.reason).toBe('order_completed');
      expect(sentEmails.length).toBe(0);
    });
  });

  // ============================================================================
  // 6. DUE AUTOMATIONS SCHEDULER & BATCHING
  // ============================================================================
  describe('processDueMarketingAutomations', () => {
    it('processes due executions and ignores future executions', async () => {
      const pastTime = new Date(Date.now() - 5000).toISOString();
      const futureTime = new Date(Date.now() + 3600000).toISOString();

      (mockSupabase as any)._store.marketing_automation_executions.push(
        {
          id: 'exec-due-1',
          organization_id: orgAlpha,
          automation_id: 'auto-welcome',
          domain_event_id: 'evt-due-1',
          campaign_id: campaignIdAlpha,
          customer_id: customerOptedInId,
          customer_email: 'alice@example.com',
          status: 'pending',
          scheduled_for: pastTime,
          created_at: pastTime,
          updated_at: pastTime,
        },
        {
          id: 'exec-future-1',
          organization_id: orgAlpha,
          automation_id: 'auto-delayed-cart',
          domain_event_id: 'evt-future-1',
          campaign_id: campaignIdAbandoned,
          customer_id: customerOptedInId,
          customer_email: 'alice@example.com',
          status: 'pending',
          scheduled_for: futureTime,
          created_at: pastTime,
          updated_at: pastTime,
        }
      );

      const summary = await processDueMarketingAutomations(mockSupabase as any);

      expect(summary.processed).toBe(1);
      expect(summary.completed).toBe(1);
      expect(summary.skipped).toBe(0);
      expect(summary.failed).toBe(0);
      expect(sentEmails.length).toBe(1);

      // Future execution remains pending
      const futureExec = (mockSupabase as any)._store.marketing_automation_executions.find(
        (e: any) => e.id === 'exec-future-1'
      );
      expect(futureExec.status).toBe('pending');
    });

    it('isolates failures so one failed automation does not stop others', async () => {
      // First email succeeds, second provider fails
      let callCount = 0;
      mockEmailProvider.sendEmail = vi.fn(async (): Promise<SendEmailResult> => {
        callCount++;
        if (callCount === 1) {
          return { success: false, error: 'Provider connection timeout' };
        }
        return { success: true, messageId: 'msg-success' };
      });

      const pastTime = new Date(Date.now() - 5000).toISOString();
      (mockSupabase as any)._store.marketing_automation_executions.push(
        {
          id: 'exec-fail-1',
          organization_id: orgAlpha,
          automation_id: 'auto-welcome',
          domain_event_id: 'evt-fail-1',
          campaign_id: campaignIdAlpha,
          customer_id: customerOptedInId,
          customer_email: 'alice@example.com',
          status: 'pending',
          scheduled_for: pastTime,
          created_at: pastTime,
          updated_at: pastTime,
        },
        {
          id: 'exec-succeed-2',
          organization_id: orgAlpha,
          automation_id: 'auto-welcome',
          domain_event_id: 'evt-succ-2',
          campaign_id: campaignIdAlpha,
          customer_id: customerOptedInId,
          customer_email: 'alice@example.com',
          status: 'pending',
          scheduled_for: pastTime,
          created_at: pastTime,
          updated_at: pastTime,
        }
      );

      const summary = await processDueMarketingAutomations(mockSupabase as any);

      expect(summary.processed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.completed).toBe(1);
    });
  });

  // ============================================================================
  // 7. API ROUTES
  // ============================================================================
  describe('Execution API Routes', () => {
    it('POST /api/admin/marketing/automations/process-due with CRON_SECRET executes due jobs', async () => {
      const pastTime = new Date(Date.now() - 5000).toISOString();
      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: 'exec-cron-route',
        organization_id: orgAlpha,
        automation_id: 'auto-welcome',
        domain_event_id: 'evt-cron',
        campaign_id: campaignIdAlpha,
        customer_id: customerOptedInId,
        customer_email: 'alice@example.com',
        status: 'pending',
        scheduled_for: pastTime,
        created_at: pastTime,
        updated_at: pastTime,
      });

      const req = createAdminRequest('/api/admin/marketing/automations/process-due', {
        method: 'POST',
        cronSecret: 'test-cron-secret-123',
      });

      const res = await processDueRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.completed).toBe(1);
      expect(sentEmails.length).toBe(1);
    });

    it('GET /api/admin/marketing/automations/[id]/executions returns execution records', async () => {
      (mockSupabase as any)._store.marketing_automation_executions.push({
        id: 'exec-get-test',
        organization_id: orgAlpha,
        automation_id: 'auto-welcome',
        domain_event_id: 'evt-1',
        campaign_id: campaignIdAlpha,
        customer_id: customerOptedInId,
        customer_email: 'alice@example.com',
        status: 'completed',
        scheduled_for: new Date().toISOString(),
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const req = createAdminRequest('/api/admin/marketing/automations/auto-welcome/executions');
      const res = await getExecutionsRoute(req, {
        params: Promise.resolve({ id: 'auto-welcome' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].customer_email).toBe('alice@example.com');
    });
  });
});
