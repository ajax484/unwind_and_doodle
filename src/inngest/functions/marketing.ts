import { inngest } from '../client';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  matchesAutomationTrigger,
  normalizeAutomationSteps,
} from '@/services/marketing-automation.service';
import {
  resolveEventCustomer,
  calculateScheduledTime,
  executeJourneySendStep,
  recoverStaleInngestExecutions,
} from '@/services/marketing-executor.service';
import {
  MarketingAutomationConfig,
  MarketingAutomationDelay,
  MarketingAutomationExecutionStatus,
  MarketingJourneyStep,
} from '@/types/marketing';
import { recordBreadcrumb, captureError } from '@/lib/observability/error-monitoring';
import {
  scanAndEmitAbandonedCheckouts,
  scanAndEmitInactiveCustomers,
} from '@/services/marketing-scanner.service';
import { dispatchDueScheduledCampaigns } from '@/services/marketing-dispatcher.service';

/**
 * Validates and converts a MarketingAutomationDelay into an Inngest-compatible duration string.
 * Returns null if delay is 0 (immediate).
 * Throws an error if delay amount is negative or invalid.
 */
export function formatInngestDelayDuration(delay?: MarketingAutomationDelay | { amount: number; unit: string }): string | null {
  if (!delay || typeof delay.amount !== 'number' || delay.amount <= 0) {
    return null;
  }

  if (isNaN(delay.amount) || !isFinite(delay.amount) || delay.amount < 0) {
    throw new Error(`Invalid delay amount: ${delay.amount}`);
  }

  const rounded = Math.round(delay.amount);
  switch (delay.unit) {
    case 'minutes':
      return `${rounded}m`;
    case 'hours':
      return `${rounded}h`;
    case 'days':
      return `${rounded}d`;
    default:
      throw new Error(`Invalid delay unit: ${delay.unit}`);
  }
}

/**
 * 1. Marketing Event Orchestrator (Fan-out Workflow)
 * Listens to commerce domain events, matches active tenant automations,
 * snapshots automation config into PostgreSQL execution record with status 'pending' (engine: 'inngest'),
 * and dispatches individual `marketing/automation.execute` events for isolated multi-step journeys.
 */
export const marketingEventOrchestrator = inngest.createFunction(
  {
    id: 'marketing-event-orchestrator',
    name: 'Marketing Event Orchestrator',
    retries: 3,
    triggers: { event: 'commerce/domain.event' },
  },
  async ({ event, step }) => {
    const domainEvent = event.data.domainEvent;
    if (!domainEvent || !domainEvent.organization_id) {
      return { skipped: true, reason: 'missing_domain_event_or_organization' };
    }

    recordBreadcrumb({
      category: 'inngest_orchestration',
      message: `Inngest processing domain event: ${domainEvent.event_type}`,
      data: {
        eventId: domainEvent.id,
        eventType: domainEvent.event_type,
        organizationId: domainEvent.organization_id,
      },
    });

    const supabase = getServiceSupabaseClient();

    // 1. Resolve matching active automations for the tenant
    const matchingAutomations = await step.run('find-matching-automations', async () => {
      const { data: automations, error } = await supabase
        .from('marketing_automations')
        .select('*')
        .eq('organization_id', domainEvent.organization_id!)
        .eq('status', 'active');

      if (error || !automations || automations.length === 0) {
        return [];
      }

      return automations.filter((auto) => matchesAutomationTrigger(auto, domainEvent));
    });

    if (matchingAutomations.length === 0) {
      return { matched: 0, scheduled: 0, dispatched: 0 };
    }

    // 2. Resolve customer information from event payload
    const customerContext = await step.run('resolve-customer-context', async () => {
      return await resolveEventCustomer(supabase, domainEvent);
    });

    if (!customerContext.customerEmail) {
      console.warn(
        `[inngest_marketing.skip_missing_email] event_id=${domainEvent.id} type=${domainEvent.event_type}`
      );
      return { matched: matchingAutomations.length, scheduled: 0, dispatched: 0, reason: 'missing_email' };
    }

    const now = new Date();
    const preparedExecutions: Array<{
      executionId: string;
      automationId: string;
      organizationId: string;
      triggerType?: string;
      customerId?: string | null;
      customerEmail?: string;
      cartId?: string | null;
    }> = [];

    // 3. Orchestrate execution records for each matched automation (database idempotency & snapshot boundary)
    for (const auto of matchingAutomations) {
      const config = auto.config as unknown as MarketingAutomationConfig;
      if (!config) {
        continue;
      }

      const steps = normalizeAutomationSteps(config);
      if (steps.length === 0) {
        continue;
      }

      const initialCampaignId =
        config.action?.campaignId ||
        (steps.find((s) => s.type === 'send_email') as any)?.campaignId ||
        '00000000-0000-0000-0000-000000000000';

      const scheduledFor = calculateScheduledTime(now, config.delay);

      const createdExecution = await step.run(`prepare-execution-${auto.id}`, async () => {
        // Enforce idempotency on (automation_id, domain_event_id)
        const { data: existing } = await (supabase as any)
          .from('marketing_automation_executions')
          .select('id, status')
          .eq('automation_id', auto.id)
          .eq('domain_event_id', domainEvent.id)
          .maybeSingle();

        if (existing) {
          console.info(
            `[inngest_marketing.idempotent_skip] automation_id=${auto.id} event_id=${domainEvent.id}`
          );
          return null;
        }

        const executionPayload = {
          organization_id: auto.organization_id,
          automation_id: auto.id,
          domain_event_id: domainEvent.id,
          campaign_id: initialCampaignId,
          customer_id: customerContext.customerId,
          customer_email: customerContext.customerEmail,
          status: 'pending' as MarketingAutomationExecutionStatus,
          engine: 'inngest',
          config_snapshot: auto.config,
          step_states: [],
          scheduled_for: scheduledFor.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        const { data: inserted, error: insertErr } = await (supabase as any)
          .from('marketing_automation_executions')
          .insert(executionPayload)
          .select('id')
          .maybeSingle();

        if (insertErr || !inserted?.id) {
          console.warn(
            `[inngest_marketing.insert_conflict_skip] automation_id=${auto.id} event_id=${domainEvent.id} error=${insertErr?.message || 'no_id'}`
          );
          return null;
        }

        return {
          id: inserted.id,
          automationId: auto.id,
          organizationId: auto.organization_id,
          triggerType: auto.type,
        };
      });

      if (createdExecution?.id) {
        const payload = (domainEvent.payload && typeof domainEvent.payload === 'object' && !Array.isArray(domainEvent.payload)
          ? domainEvent.payload
          : {}) as Record<string, unknown>;
        const cartId = (payload.cartId || payload.cart_id) as string | undefined;

        preparedExecutions.push({
          executionId: createdExecution.id,
          automationId: createdExecution.automationId,
          organizationId: createdExecution.organizationId,
          triggerType: createdExecution.triggerType,
          customerId: customerContext.customerId,
          customerEmail: customerContext.customerEmail,
          cartId: cartId || null,
        });
      }
    }

    if (preparedExecutions.length === 0) {
      return { matched: matchingAutomations.length, scheduled: 0, dispatched: 0 };
    }

    // 4. Fan out independent Inngest events for each execution
    const runnerEvents = preparedExecutions.map((item) => ({
      name: 'marketing/automation.execute' as const,
      data: {
        executionId: item.executionId,
        automationId: item.automationId,
        organizationId: item.organizationId,
        domainEventId: domainEvent.id,
        triggerType: item.triggerType,
        customerId: item.customerId,
        customerEmail: item.customerEmail,
        cartId: item.cartId,
      },
    }));

    await step.sendEvent('fan-out-automation-runners', runnerEvents);

    console.info(
      `[inngest_marketing.orchestrated] event_id=${domainEvent.id} matched=${matchingAutomations.length} scheduled=${preparedExecutions.length}`
    );

    return {
      matched: matchingAutomations.length,
      scheduled: preparedExecutions.length,
      dispatched: preparedExecutions.length,
      executionIds: preparedExecutions.map((e) => e.executionId),
    };
  }
);

/**
 * 2. Marketing Automation Runner (Multi-Step Journey Workflow)
 * Sequentially executes journey steps with durable sleep, event cancellation (tenant-safe),
 * and executes sends with full JIT checks.
 */
export const marketingAutomationRunner = inngest.createFunction(
  {
    id: 'marketing-automation-runner',
    name: 'Marketing Automation Runner',
    retries: 3,
    triggers: { event: 'marketing/automation.execute' },
  },
  async ({ event, step }) => {
    const {
      executionId,
      automationId,
      organizationId,
      triggerType,
      customerId,
    } = event.data;

    if (!executionId || !organizationId) {
      return { skipped: true, reason: 'missing_execution_or_org' };
    }

    const supabase = getServiceSupabaseClient();

    // 1. Fetch execution record
    const execution = await step.run('load-execution-record', async () => {
      const { data, error } = await (supabase as any)
        .from('marketing_automation_executions')
        .select('*')
        .eq('id', executionId)
        .maybeSingle();

      if (error || !data) {
        throw new Error(`Execution ${executionId} not found`);
      }
      return data;
    });

    if (execution.organization_id !== organizationId) {
      return { skipped: true, reason: 'organization_mismatch' };
    }

    if (execution.status === 'completed' || execution.status === 'skipped' || execution.status === 'failed') {
      return { skipped: true, reason: `already_in_terminal_status_${execution.status}` };
    }

    // 2. Check live automation operational status (tenant boundary and active status)
    const automationRecord = await step.run('verify-automation-status', async () => {
      const { data } = await (supabase as any)
        .from('marketing_automations')
        .select('id, organization_id, status, config')
        .eq('id', automationId)
        .maybeSingle();
      return data;
    });

    if (!automationRecord || automationRecord.organization_id !== organizationId) {
      return { skipped: true, reason: 'automation_not_found_or_org_mismatch' };
    }

    if (automationRecord.status !== 'active') {
      await step.run('mark-execution-automation-inactive', async () => {
        await (supabase as any)
          .from('marketing_automation_executions')
          .update({
            status: 'skipped',
            skip_reason: 'automation_inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', executionId);
      });
      return { skipped: true, reason: 'automation_inactive' };
    }

    // 3. Resolve normalized journey steps from snapshot (fallback to active automation only if legacy row without snapshot)
    let configSnapshot = (execution.config_snapshot || null) as MarketingAutomationConfig | null;

    if (!configSnapshot || Object.keys(configSnapshot).length === 0) {
      configSnapshot = (automationRecord?.config || {}) as MarketingAutomationConfig;
    }

    const steps = normalizeAutomationSteps(configSnapshot);

    if (steps.length === 0) {
      return { skipped: true, reason: 'no_steps_defined' };
    }

    const sendSteps = steps.filter((s) => s.type === 'send_email');

    // 4. Sequentially process each step in the journey
    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i];

      // A. Handle DELAY step
      if (currentStep.type === 'delay') {
        const duration = formatInngestDelayDuration({
          amount: currentStep.amount,
          unit: currentStep.unit,
        });

        if (duration) {
          recordBreadcrumb({
            category: 'journey_step_delay',
            message: `Journey sleeping for ${duration} at step ${currentStep.id}`,
            data: { executionId, stepId: currentStep.id, duration },
          });

          await step.sleep(`sleep-step-${currentStep.id}`, duration);

          // Update step state in DB if supported
          await step.run(`record-delay-step-${currentStep.id}`, async () => {
            try {
              const { data: currentRec } = await (supabase as any)
                .from('marketing_automation_executions')
                .select('*')
                .eq('id', executionId)
                .maybeSingle();

              if (currentRec && 'step_states' in currentRec) {
                const states = Array.isArray(currentRec.step_states) ? [...currentRec.step_states] : [];
                const existingIdx = states.findIndex((s: any) => s.step_id === currentStep.id);
                const stateObj = {
                  step_id: currentStep.id,
                  type: 'delay',
                  status: 'completed',
                  executed_at: new Date().toISOString(),
                };
                if (existingIdx >= 0) states[existingIdx] = stateObj;
                else states.push(stateObj);

                await (supabase as any)
                  .from('marketing_automation_executions')
                  .update({
                    current_step_id: currentStep.id,
                    step_states: states,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', executionId);
              } else {
                await (supabase as any)
                  .from('marketing_automation_executions')
                  .update({
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', executionId);
              }
            } catch {
              // Silently continue if step states column is omitted
            }
          });
        }
      }

      // B. Handle WAIT_FOR_EVENT step (or abandoned checkout cancellation)
      else if (currentStep.type === 'wait_for_event') {
        const duration = formatInngestDelayDuration({
          amount: currentStep.timeout,
          unit: currentStep.unit,
        }) || '24h';

        recordBreadcrumb({
          category: 'journey_step_wait_event',
          message: `Journey waiting for event ${currentStep.event} at step ${currentStep.id}`,
          data: { executionId, stepId: currentStep.id, event: currentStep.event },
        });

        const receivedEvent = await step.waitForEvent(`wait-event-step-${currentStep.id}`, {
          event: 'commerce/domain.event',
          timeout: duration,
          if: "async.data.domainEvent.organization_id == event.data.organizationId && async.data.domainEvent.payload.customerId == event.data.customerId",
        });

        // In-function defensive verification for tenant boundary & customer identity
        if (
          receivedEvent &&
          receivedEvent.data?.domainEvent &&
          receivedEvent.data.domainEvent.organization_id === organizationId
        ) {
          const payload = (receivedEvent.data.domainEvent.payload || {}) as Record<string, unknown>;
          const eventCustomerId = (payload.customerId || payload.customer_id) as string | undefined;

          if (!customerId || !eventCustomerId || eventCustomerId === customerId) {
            const evtType = receivedEvent.data.domainEvent.event_type;
            if (
              evtType === currentStep.event ||
              evtType === 'order.created' ||
              evtType === 'order.pending' ||
              evtType === 'payment.completed'
            ) {
              // Cancellation event arrived! Terminate journey
              await step.run(`mark-cancelled-on-event-${currentStep.id}`, async () => {
                await (supabase as any)
                  .from('marketing_automation_executions')
                  .update({
                    status: 'skipped',
                    skip_reason: 'order_completed',
                    executed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', executionId);
              });

              console.info(
                `[inngest_marketing.journey_cancelled_by_event] execution_id=${executionId} event=${evtType}`
              );
              return { success: false, status: 'skipped', reason: 'order_completed', stepId: currentStep.id };
            }
          }
        }
      }

      // C. Handle SEND_EMAIL step
      else if (currentStep.type === 'send_email') {
        const isFinalSend = sendSteps[sendSteps.length - 1]?.id === currentStep.id;

        const sendResult = await step.run(`send-step-${currentStep.id}`, async () => {
          try {
            return await executeJourneySendStep(
              supabase,
              executionId,
              currentStep.id,
              currentStep.campaignId,
              isFinalSend
            );
          } catch (err: unknown) {
            captureError(err, {
              tags: { operation: 'inngest_marketing.journey_send', executionId, stepId: currentStep.id },
            });
            throw err;
          }
        });

        // If JIT check halted journey (e.g. consent revoked, customer purchased, automation disabled)
        if (sendResult.status === 'skipped' || sendResult.status === 'failed') {
          console.info(
            `[inngest_marketing.journey_halted] execution_id=${executionId} step=${currentStep.id} status=${sendResult.status} reason=${sendResult.reason || 'unknown'}`
          );
          return {
            success: false,
            status: sendResult.status,
            reason: sendResult.reason,
            stoppedAtStep: currentStep.id,
          };
        }
      }
    }

    // 4. All journey steps completed successfully
    await step.run('finalize-journey-completion', async () => {
      await (supabase as any)
        .from('marketing_automation_executions')
        .update({
          status: 'completed',
          executed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId);
    });

    console.info(`[inngest_marketing.journey_completed] execution_id=${executionId}`);
    return { success: true, status: 'completed', totalSteps: steps.length };
  }
);

/**
 * 3. Scheduled Abandoned Checkout Scanner
 * Runs every 15 minutes to identify stale active carts older than the abandonment threshold (2h),
 * atomically updates their status to 'abandoned', and emits 'checkout.abandoned' domain events.
 */
export const scanAbandonedCheckoutsFunction = inngest.createFunction(
  {
    id: 'scan-abandoned-checkouts',
    name: 'Scan Abandoned Checkouts',
    retries: 2,
    triggers: [{ cron: '*/15 * * * *' }],
  },
  async ({ step }) => {
    const supabase = getServiceSupabaseClient();

    const scanResult = await step.run('scan-abandoned-checkouts-all-orgs', async () => {
      return await scanAndEmitAbandonedCheckouts(supabase);
    });

    recordBreadcrumb({
      category: 'inngest_scanner',
      message: `Abandoned checkout scan completed: ${scanResult.abandoned} abandoned out of ${scanResult.scanned} scanned.`,
      data: scanResult,
    });

    return scanResult;
  }
);

/**
 * 4. Scheduled Inactive Customer Scanner
 * Runs daily at 9:00 AM UTC to identify customers inactive for > 30 days,
 * enforces a 30-day win-back cooldown, and emits 'customer.inactive' domain events.
 */
export const scanInactiveCustomersFunction = inngest.createFunction(
  {
    id: 'scan-inactive-customers',
    name: 'Scan Inactive Customers',
    retries: 2,
    triggers: [{ cron: '0 9 * * *' }],
  },
  async ({ step }) => {
    const supabase = getServiceSupabaseClient();

    const scanResult = await step.run('scan-inactive-customers-all-orgs', async () => {
      return await scanAndEmitInactiveCustomers(supabase);
    });

    recordBreadcrumb({
      category: 'inngest_scanner',
      message: `Inactive customer scan completed: ${scanResult.inactiveEmitted} emitted out of ${scanResult.scanned} scanned.`,
      data: scanResult,
    });

    return scanResult;
  }
);

/**
 * 5. Scheduled Campaign Dispatcher
 * Runs every minute to find due scheduled campaigns across organizations and dispatches them.
 * Reuses existing atomic campaign claiming in dispatchDueScheduledCampaigns().
 */
export const dispatchScheduledCampaignsFunction = inngest.createFunction(
  {
    id: 'dispatch-scheduled-campaigns',
    name: 'Dispatch Scheduled Campaigns',
    retries: 2,
    triggers: [{ cron: '* * * * *' }],
  },
  async ({ step }) => {
    const supabase = getServiceSupabaseClient();

    recordBreadcrumb({
      category: 'inngest_scheduled_campaigns',
      message: 'Scheduled campaign scan started',
    });

    const dispatchResults = await step.run('dispatch-due-campaigns', async () => {
      console.info('[inngest_scheduled_campaigns.scan_started]');
      const results = await dispatchDueScheduledCampaigns(supabase);
      console.info(
        `[inngest_scheduled_campaigns.scan_completed] processed=${results.length} dispatched=${results.filter((r) => r.success).length} failed=${results.filter((r) => !r.success).length}`
      );
      return results;
    });

    const summary = {
      processed: dispatchResults.length,
      dispatched: dispatchResults.filter((r) => r.success).length,
      failed: dispatchResults.filter((r) => !r.success).length,
      results: dispatchResults.map((r) => ({
        campaignId: r.campaignId,
        success: r.success,
        processed: r.processed,
        sent: r.sent,
        failed: r.failed,
        message: r.message,
      })),
    };

    recordBreadcrumb({
      category: 'inngest_scheduled_campaigns',
      message: `Scheduled campaign dispatch completed: ${summary.dispatched} dispatched, ${summary.failed} failed out of ${summary.processed} due campaigns.`,
      data: summary,
    });

    return summary;
  }
);

/**
 * 6. Stale Marketing Execution Recovery Function
 * Runs every hour to identify genuinely abandoned Inngest executions and marks them failed,
 * protecting active durable sleeps and event waits, and preventing duplicate email sends.
 */
export const recoverStaleMarketingExecutionsFunction = inngest.createFunction(
  {
    id: 'recover-stale-marketing-executions',
    name: 'Recover Stale Marketing Executions',
    retries: 2,
    triggers: [{ cron: '0 * * * *' }], // Hourly
  },
  async ({ step }) => {
    const supabase = getServiceSupabaseClient();

    recordBreadcrumb({
      category: 'inngest_stale_recovery',
      message: 'Stale marketing execution scan started',
    });

    const recoveryResult = await step.run('recover-stale-executions', async () => {
      return await recoverStaleInngestExecutions(supabase);
    });

    recordBreadcrumb({
      category: 'inngest_stale_recovery',
      message: `Stale recovery completed: ${recoveryResult.recovered} recovered, ${recoveryResult.skippedActive} active skipped out of ${recoveryResult.scanned} scanned.`,
      data: recoveryResult,
    });

    return recoveryResult;
  }
);



