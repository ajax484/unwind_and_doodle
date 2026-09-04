import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../lib/supabase/types';
import { DEFAULT_ORGANIZATION_ID } from '../lib/constants';

export type DomainEventHandler = (event: {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Json;
  createdAt: string;
}) => Promise<void>;

const registeredHandlers = new Map<string, DomainEventHandler[]>();

/**
 * Registers an asynchronous handler for a specific domain event type.
 */
export function registerDomainEventHandler(
  eventType: string,
  handler: DomainEventHandler
): void {
  const existing = registeredHandlers.get(eventType) || [];
  existing.push(handler);
  registeredHandlers.set(eventType, existing);
}

/**
 * Publishes a domain event into the `domain_events` table (Outbox pattern).
 * Sets `processed_at` to null so it can be picked up by the asynchronous processor.
 */
export async function publishDomainEvent(
  supabase: SupabaseClient<Database>,
  params: {
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Json;
    organizationId?: string | null;
  }
): Promise<string> {
  const DEFAULT_ORG_ID = DEFAULT_ORGANIZATION_ID;
  let orgId =
    params.organizationId ||
    (params.payload && typeof params.payload === 'object'
      ? ((params.payload as Record<string, unknown>).organizationId as string | undefined) ||
        ((params.payload as Record<string, unknown>).organization_id as string | undefined)
      : undefined);

  if (!orgId) {
    try {
      if (params.aggregateType === 'order') {
        const { data: order } = await supabase
          .from('orders')
          .select('organization_id')
          .eq('id', params.aggregateId)
          .maybeSingle();
        if (order?.organization_id) orgId = order.organization_id;
      } else if (params.aggregateType === 'payment') {
        const { data: payment } = await supabase
          .from('payments')
          .select('order_id')
          .eq('id', params.aggregateId)
          .maybeSingle();
        if (payment?.order_id) {
          const { data: order } = await supabase
            .from('orders')
            .select('organization_id')
            .eq('id', payment.order_id)
            .maybeSingle();
          if (order?.organization_id) orgId = order.organization_id;
        }
      }
    } catch {
      // Silent fallback to default tenant ID if DB query fails
    }
  }

  orgId = orgId || DEFAULT_ORG_ID;

  try {
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        insert: (payload: unknown) => {
          select: (col: string) => {
            single: () => Promise<{ data?: { id: string }; error?: { message: string } }>;
          };
        };
      };
    })
      .from('domain_events')
      .insert({
        event_type: params.eventType,
        aggregate_type: params.aggregateType,
        aggregate_id: params.aggregateId,
        organization_id: orgId,
        payload: params.payload,
        processed_at: null,
      })
      .select('id')
      .single();

    const eventId = data?.id || `event_${Date.now()}`;
    console.info(`[domain_event.created] event_id=${eventId} type=${params.eventType}`);

    if (error) {
      console.warn(`Domain event publication warning: ${error.message}`);
    }

    return eventId;
  } catch (err) {
    console.warn(`Domain event publication exception:`, err);
    return `event_${Date.now()}`;
  }
}

export interface ProcessEventsResult {
  processedCount: number;
  failedCount: number;
  totalPending: number;
}

/**
 * Asynchronously processes pending domain events from the outbox table.
 * Executes registered event handlers, marks `processed_at` upon success,
 * and leaves failed events uncommitted for retry without crashing the pipeline.
 */
export async function processPendingDomainEvents(
  supabase: SupabaseClient<Database>,
  customHandlers?: Map<string, DomainEventHandler> | Record<string, DomainEventHandler>,
  options?: { batchSize?: number }
): Promise<ProcessEventsResult> {
  const limit = options?.batchSize || 50;

  // 1. Fetch pending unprocessed events
  const { data: events, error } = await supabase
    .from('domain_events')
    .select('*')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !events || events.length === 0) {
    return { processedCount: 0, failedCount: 0, totalPending: 0 };
  }

  let processedCount = 0;
  let failedCount = 0;

  for (const rawEvent of events) {
    const event = {
      id: rawEvent.id,
      eventType: rawEvent.event_type,
      aggregateType: rawEvent.aggregate_type,
      aggregateId: rawEvent.aggregate_id,
      payload: rawEvent.payload as Json,
      createdAt: rawEvent.created_at,
    };

    try {
      // Execute custom handlers if provided
      if (customHandlers) {
        const customFn =
          customHandlers instanceof Map
            ? customHandlers.get(event.eventType)
            : customHandlers[event.eventType];
        if (customFn) {
          await customFn(event);
        }
      }

      // Execute globally registered handlers
      const globalFns = registeredHandlers.get(event.eventType) || [];
      for (const fn of globalFns) {
        await fn(event);
      }

      // Mark event as processed
      const now = new Date().toISOString();
      await supabase
        .from('domain_events')
        .update({
          processed_at: now,
        })
        .eq('id', event.id);

      console.info(`[domain_event.processed] event_id=${event.id} type=${event.eventType}`);
      processedCount++;
    } catch (err: unknown) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : 'Unknown event processing error';
      console.error(
        `[domain_event.failed] event_id=${event.id} type=${event.eventType} error=${errorMessage}`
      );
      // Event remains with processed_at = null for next retry
    }
  }

  return {
    processedCount,
    failedCount,
    totalPending: events.length,
  };
}
