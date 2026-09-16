import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  MarketingAutomation,
  MarketingAutomationConfig,
  MarketingAutomationDelay,
  MarketingAutomationExecution,
  MarketingAutomationExecutionStatus,
} from '@/types/marketing';
import { matchesAutomationTrigger } from './marketing-automation.service';
import { getMarketingEmailProvider } from './marketing-provider/nodemailer-marketing.provider';
import { sanitizeHtml, replacePersonalizationTags } from '@/lib/sanitize-html';
import {
  generateMarketingUnsubscribeToken,
  generateMarketingTrackingToken,
} from '@/lib/marketing-token';
import { rewriteMarketingLinks, injectOpenTrackingPixel } from './marketing-dispatcher.service';
import { getConfig } from '@/lib/config';
import { captureError, recordBreadcrumb } from '@/lib/observability/error-monitoring';

export interface ProcessDueAutomationsResult {
  processed: number;
  completed: number;
  skipped: number;
  failed: number;
  errors?: string[];
}

export interface HandleAutomationEventResult {
  matched: number;
  scheduled: number;
  executed: number;
  executionIds: string[];
}

/**
 * Calculates the exact intended execution timestamp server-side based on delay configuration.
 */
export function calculateScheduledTime(now: Date, delay?: MarketingAutomationDelay): Date {
  if (!delay || typeof delay.amount !== 'number' || delay.amount <= 0) {
    return new Date(now.getTime());
  }

  const ms = now.getTime();
  const amount = Math.round(delay.amount);

  switch (delay.unit) {
    case 'minutes':
      return new Date(ms + amount * 60 * 1000);
    case 'hours':
      return new Date(ms + amount * 60 * 60 * 1000);
    case 'days':
      return new Date(ms + amount * 24 * 60 * 60 * 1000);
    default:
      return new Date(ms);
  }
}

/**
 * Resolves customer information from domain event payload and database state.
 */
export async function resolveEventCustomer(
  supabase: SupabaseClient<Database>,
  event: {
    event_type: string;
    aggregate_type?: string;
    aggregate_id?: string;
    organization_id?: string | null;
    payload?: Json;
  }
): Promise<{
  customerId: string | null;
  customerEmail: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emailConsent?: boolean;
}> {
  const payload = (
    event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
      ? event.payload
      : {}
  ) as Record<string, unknown>;

  const orgId = event.organization_id;

  // 1. Direct customer ID provided
  const directCustId = (payload.customerId || payload.customer_id) as string | undefined;
  if (directCustId) {
    const { data: cust } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, email_marketing_consent, organization_id')
      .eq('id', directCustId)
      .maybeSingle();

    if (cust && (!orgId || cust.organization_id === orgId)) {
      return {
        customerId: cust.id,
        customerEmail: cust.email?.trim().toLowerCase() || null,
        firstName: cust.first_name,
        lastName: cust.last_name,
        emailConsent: cust.email_marketing_consent ?? false,
      };
    }
  }

  // 2. Order event - resolve via order record
  const orderId = (payload.orderId || payload.order_id || (event.aggregate_type === 'order' ? event.aggregate_id : undefined)) as string | undefined;
  if (orderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, customer_id, organization_id')
      .eq('id', orderId)
      .maybeSingle();

    if (order?.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('id, email, first_name, last_name, email_marketing_consent, organization_id')
        .eq('id', order.customer_id)
        .maybeSingle();

      if (cust) {
        return {
          customerId: cust.id,
          customerEmail: cust.email?.trim().toLowerCase() || null,
          firstName: cust.first_name,
          lastName: cust.last_name,
          emailConsent: cust.email_marketing_consent ?? false,
        };
      }
    }
  }

  // 3. Email directly provided in payload (e.g. checkout abandonment or guest event)
  const directEmail = (payload.customerEmail || payload.email) as string | undefined;
  if (directEmail && typeof directEmail === 'string' && directEmail.trim()) {
    const normalizedEmail = directEmail.trim().toLowerCase();

    let query = supabase.from('customers').select('id, email, first_name, last_name, email_marketing_consent, organization_id').ilike('email', normalizedEmail);
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }
    const { data: cust } = await query.maybeSingle();

    if (cust) {
      return {
        customerId: cust.id,
        customerEmail: cust.email?.trim().toLowerCase() || normalizedEmail,
        firstName: cust.first_name,
        lastName: cust.last_name,
        emailConsent: cust.email_marketing_consent ?? false,
      };
    }

    return {
      customerId: null,
      customerEmail: normalizedEmail,
      firstName: (payload.firstName || payload.first_name) as string | null,
      lastName: (payload.lastName || payload.last_name) as string | null,
      emailConsent: Boolean(payload.emailConsent || payload.marketingConsent),
    };
  }

  return { customerId: null, customerEmail: null };
}

/**
 * Ingests a domain event, finds matching active automations, schedules executions,
 * and immediately executes zero-delay automations.
 */
export async function handleMarketingAutomationEvent(
  supabase: SupabaseClient<Database>,
  event: {
    id: string;
    event_type: string;
    aggregate_type?: string;
    aggregate_id?: string;
    organization_id?: string | null;
    payload?: Json;
    created_at?: string;
  }
): Promise<HandleAutomationEventResult> {
  const result: HandleAutomationEventResult = {
    matched: 0,
    scheduled: 0,
    executed: 0,
    executionIds: [],
  };

  if (!event.organization_id) {
    return result;
  }

  // 1. Query active automations for the organization
  const { data: automations, error: autoErr } = await supabase
    .from('marketing_automations')
    .select('*')
    .eq('organization_id', event.organization_id)
    .eq('status', 'active');

  if (autoErr || !automations || automations.length === 0) {
    return result;
  }

  // 2. Filter automations that match this domain event
  const matchingAutomations = automations.filter((auto) =>
    matchesAutomationTrigger(auto, event)
  );

  result.matched = matchingAutomations.length;
  if (matchingAutomations.length === 0) {
    return result;
  }

  // 3. Resolve customer
  const customerContext = await resolveEventCustomer(supabase, event);
  if (!customerContext.customerEmail) {
    console.warn(
      `[marketing_automation.skip_missing_email] event_id=${event.id} type=${event.event_type}`
    );
    return result;
  }

  const now = new Date();

  // 4. Schedule or execute each matching automation
  for (const auto of matchingAutomations) {
    const config = auto.config as unknown as MarketingAutomationConfig;
    if (!config || !config.action || config.action.type !== 'email' || !config.action.campaignId) {
      continue;
    }

    const scheduledFor = calculateScheduledTime(now, config.delay);
    const isImmediate = scheduledFor.getTime() <= now.getTime();

    // Enforce database-level and in-memory idempotency on (automation_id, domain_event_id)
    const { data: existingExecution } = await (supabase as any)
      .from('marketing_automation_executions')
      .select('id')
      .eq('automation_id', auto.id)
      .eq('domain_event_id', event.id)
      .maybeSingle();

    if (existingExecution) {
      console.info(
        `[marketing_automation.idempotent_skip] automation_id=${auto.id} event_id=${event.id}`
      );
      continue;
    }

    const executionPayload = {
      organization_id: auto.organization_id,
      automation_id: auto.id,
      domain_event_id: event.id,
      campaign_id: config.action.campaignId,
      customer_id: customerContext.customerId,
      customer_email: customerContext.customerEmail,
      status: 'pending' as MarketingAutomationExecutionStatus,
      scheduled_for: scheduledFor.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Insert execution record
    const { data: execution, error: insertErr } = await (supabase as any)
      .from('marketing_automation_executions')
      .insert(executionPayload)
      .select('id')
      .maybeSingle();

    if (insertErr) {
      // If unique constraint violation or error, duplicate event was safely ignored
      console.info(
        `[marketing_automation.idempotent_skip] automation_id=${auto.id} event_id=${event.id}`
      );
      continue;
    }

    if (!execution?.id) {
      continue;
    }

    result.scheduled++;
    result.executionIds.push(execution.id);

    // If no delay, execute immediately
    if (isImmediate) {
      try {
        const execSummary = await executeSingleAutomation(supabase, execution.id);
        if (execSummary.success) {
          result.executed++;
        }
      } catch (err: unknown) {
        console.error(`[marketing_automation.immediate_exec_failed] id=${execution.id}`, err);
      }
    }
  }

  return result;
}

/**
 * Executes an individual automation execution record with just-in-time eligibility,
 * consent re-checks, abandoned checkout verification, and provider dispatch.
 */
export async function executeSingleAutomation(
  supabase: SupabaseClient<Database>,
  executionId: string
): Promise<{ success: boolean; status: MarketingAutomationExecutionStatus; reason?: string }> {
  const now = new Date().toISOString();

  // 1. Atomically claim execution record to prevent race conditions
  const { data: execution, error: claimErr } = await (supabase as any)
    .from('marketing_automation_executions')
    .update({ status: 'processing', updated_at: now })
    .eq('id', executionId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (claimErr || !execution) {
    return { success: false, status: 'pending', reason: 'Already claimed or not pending' };
  }

  const markSkipped = async (reason: string) => {
    await (supabase as any)
      .from('marketing_automation_executions')
      .update({
        status: 'skipped',
        skip_reason: reason,
        executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    console.info(`[marketing_automation.skipped] id=${executionId} reason=${reason}`);
    return { success: false, status: 'skipped' as MarketingAutomationExecutionStatus, reason };
  };

  const markFailed = async (errorMessage: string) => {
    await (supabase as any)
      .from('marketing_automation_executions')
      .update({
        status: 'failed',
        error_message: errorMessage,
        executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    console.error(`[marketing_automation.failed] id=${executionId} error=${errorMessage}`);
    captureError(new Error(errorMessage), {
      tags: { operation: 'marketing_automation.failed', executionId },
      extra: { automationId: execution.automation_id },
    });
    return { success: false, status: 'failed' as MarketingAutomationExecutionStatus, reason: errorMessage };
  };

  // 2. Verify automation is still active
  const { data: automation } = await supabase
    .from('marketing_automations')
    .select('id, organization_id, status, type, config')
    .eq('id', execution.automation_id)
    .maybeSingle();

  if (!automation || automation.status !== 'active') {
    return markSkipped('automation_inactive');
  }

  if (automation.organization_id !== execution.organization_id) {
    return markSkipped('organization_mismatch');
  }

  // 3. Re-check customer eligibility & marketing consent at execution time
  if (execution.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, organization_id, email, first_name, last_name, email_marketing_consent')
      .eq('id', execution.customer_id)
      .maybeSingle();

    if (!customer) {
      return markSkipped('customer_not_found');
    }

    if (customer.organization_id !== execution.organization_id) {
      return markSkipped('customer_organization_mismatch');
    }

    if (customer.email_marketing_consent !== true) {
      return markSkipped('consent_revoked');
    }
  }

  // 4. Abandoned checkout safety check: Re-verify checkout is still abandoned
  if (automation.type === 'abandoned_checkout') {
    // If an order was completed/paid for this customer after the execution was created, skip
    if (execution.customer_id) {
      const { data: completedOrder } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .eq('customer_id', execution.customer_id)
        .eq('organization_id', execution.organization_id)
        .gte('created_at', execution.created_at)
        .in('status', ['created', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'received'] as any)
        .limit(1)
        .maybeSingle();

      if (completedOrder) {
        return markSkipped('order_completed');
      }
    }
  }

  // 5. Verify Campaign template
  const { data: campaign } = await supabase
    .from('marketing_campaigns')
    .select('id, organization_id, name, subject, preview_text, sender_name, sender_email, content')
    .eq('id', execution.campaign_id)
    .maybeSingle();

  if (!campaign || campaign.organization_id !== execution.organization_id) {
    return markFailed('Referenced campaign not found in this organization');
  }

  if (!campaign.subject?.trim()) {
    return markFailed('Campaign subject is required');
  }

  if (!campaign.sender_email?.trim()) {
    return markFailed('Campaign sender email is required');
  }

  // 6. Fetch customer details for personalization
  let firstName = '';
  let lastName = '';

  if (execution.customer_id) {
    const { data: cust } = await supabase
      .from('customers')
      .select('first_name, last_name')
      .eq('id', execution.customer_id)
      .maybeSingle();

    firstName = cust?.first_name || '';
    lastName = cust?.last_name || '';
  }

  const personalizationData = {
    first_name: firstName,
    last_name: lastName,
    email: execution.customer_email,
  };

  const { appUrl } = getConfig();
  const provider = getMarketingEmailProvider();
  const content = campaign.content as { html?: string; text?: string } | null;
  const baseHtml = content?.html || '';
  const baseText = content?.text || '';

  // 7. Insert or resolve recipient record
  let recipientId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { data: recData } = await supabase
    .from('marketing_campaign_recipients')
    .insert({
      campaign_id: campaign.id,
      customer_id: execution.customer_id || null,
      email: execution.customer_email,
      status: 'sending',
    })
    .select('id')
    .maybeSingle();

  if (recData?.id) {
    recipientId = recData.id;
  }

  // 8. Generate tokens, unsubscribe link, and tracking pixel
  const unsubscribeToken = generateMarketingUnsubscribeToken(
    execution.customer_id || '',
    execution.organization_id,
    campaign.id
  );
  const unsubscribeUrl = `${appUrl}/unsubscribe?token=${unsubscribeToken}`;

  let personalizedHtml = replacePersonalizationTags(baseHtml, personalizationData);
  personalizedHtml = sanitizeHtml(personalizedHtml);

  const unsubscribeFooter = `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; font-family: sans-serif;">
      <p>You received this email because you subscribed to updates from ${campaign.sender_name || 'Unwind & Doodle'}.</p>
      <p><a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from marketing emails</a></p>
    </div>
  `;
  personalizedHtml += unsubscribeFooter;

  const trackingToken = generateMarketingTrackingToken(
    campaign.id,
    recipientId,
    execution.customer_id || undefined
  );

  personalizedHtml = rewriteMarketingLinks(personalizedHtml, trackingToken, appUrl);
  personalizedHtml = injectOpenTrackingPixel(personalizedHtml, trackingToken, appUrl);

  const personalizedText = baseText
    ? `${replacePersonalizationTags(baseText, personalizationData)}\n\nUnsubscribe: ${unsubscribeUrl}`
    : undefined;

  // 9. Deliver via email provider
  try {
    const sendResult = await provider.sendEmail({
      to: execution.customer_email,
      subject: replacePersonalizationTags(campaign.subject, personalizationData),
      senderName: campaign.sender_name || 'Unwind & Doodle',
      senderEmail: campaign.sender_email,
      html: personalizedHtml,
      text: personalizedText,
      headers: {
        'X-Campaign-Id': campaign.id,
        'X-Automation-Id': execution.automation_id,
        'X-Automation-Execution-Id': execution.id,
        'X-Campaign-Recipient-Id': recipientId,
        'X-Customer-Id': execution.customer_id || '',
      },
      tags: {
        automation_id: execution.automation_id,
        campaign_id: campaign.id,
        execution_id: execution.id,
      },
    });

    if (!sendResult.success) {
      // Mark failed
      await supabase
        .from('marketing_campaign_recipients')
        .update({
          status: 'failed',
          error: sendResult.error || 'Provider rejected email',
        })
        .eq('id', recipientId);

      return markFailed(sendResult.error || 'Provider rejection');
    }

    const executedNow = new Date().toISOString();

    // 10. Provider accepted: Mark recipient as 'sent'
    await supabase
      .from('marketing_campaign_recipients')
      .update({
        status: 'sent',
        sent_at: executedNow,
      })
      .eq('id', recipientId);

    // 11. Record in marketing_email_events
    await supabase.from('marketing_email_events').insert({
      campaign_id: campaign.id,
      campaign_recipient_id: recipientId,
      customer_id: execution.customer_id || null,
      event_type: 'sent',
      occurred_at: executedNow,
      metadata: {
        automation_id: execution.automation_id,
        execution_id: execution.id,
        provider_message_id: sendResult.providerMessageId || null,
      },
    });

    // 12. Mark execution completed
    await (supabase as any)
      .from('marketing_automation_executions')
      .update({
        status: 'completed',
        executed_at: executedNow,
        provider_message_id: sendResult.providerMessageId || null,
        updated_at: executedNow,
      })
      .eq('id', executionId);

    console.info(
      `[marketing_automation.completed] id=${executionId} recipient=${execution.customer_email}`
    );

    return { success: true, status: 'completed' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unexpected send exception';
    return markFailed(errorMsg);
  }
}

/**
 * Finds all due automation executions across organizations and dispatches them.
 * Safe to be called repeatedly by cron or schedulers.
 */
export async function processDueMarketingAutomations(
  supabase: SupabaseClient<Database>,
  options?: { limit?: number; organizationId?: string }
): Promise<ProcessDueAutomationsResult> {
  const now = new Date().toISOString();
  const limit = options?.limit || 50;

  let query = (supabase as any)
    .from('marketing_automation_executions')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (options?.organizationId) {
    query = query.eq('organization_id', options.organizationId);
  }

  const { data: dueItems, error } = await query;

  if (error || !dueItems || dueItems.length === 0) {
    return { processed: 0, completed: 0, skipped: 0, failed: 0 };
  }

  const summary: ProcessDueAutomationsResult = {
    processed: dueItems.length,
    completed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const item of dueItems) {
    try {
      const res = await executeSingleAutomation(supabase, item.id);
      if (res.status === 'completed') {
        summary.completed++;
      } else if (res.status === 'skipped') {
        summary.skipped++;
      } else if (res.status === 'failed') {
        summary.failed++;
        if (res.reason) summary.errors?.push(res.reason);
      }
    } catch (err: unknown) {
      summary.failed++;
      const msg = err instanceof Error ? err.message : 'Unknown execution exception';
      summary.errors?.push(msg);
      console.error(`[process_due_automations.exception] id=${item.id}`, err);
    }
  }

  return summary;
}
