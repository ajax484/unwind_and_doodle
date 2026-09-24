import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { publishDomainEvent } from './events.service';
import { calculateEstimatedDelivery } from './delivery-estimate.service';
import { DeliveryEstimateConfig, DEFAULT_DELIVERY_ESTIMATE_CONFIG } from '@/types/marketing';

export const ABANDONED_CART_THRESHOLD_HOURS = 2;
export const CUSTOMER_INACTIVITY_THRESHOLD_DAYS = 30;
export const WIN_BACK_COOLDOWN_DAYS = 30;
export const DEFAULT_SCAN_BATCH_LIMIT = 50;

export interface AbandonedCartScanResult {
  scanned: number;
  abandoned: number;
  skipped: number;
}

export interface InactiveCustomerScanResult {
  scanned: number;
  inactiveEmitted: number;
  skipped: number;
}

/**
 * Scans for stale active carts that satisfy the abandonment threshold,
 * atomically updates their status to 'abandoned', and emits 'checkout.abandoned' domain events.
 * Uses atomic row updates for natural database idempotency across concurrent scanner runs.
 */
export async function scanAndEmitAbandonedCheckouts(
  supabase: SupabaseClient<Database>,
  options?: {
    organizationId?: string;
    thresholdHours?: number;
    batchLimit?: number;
  }
): Promise<AbandonedCartScanResult> {
  const thresholdHours = options?.thresholdHours ?? ABANDONED_CART_THRESHOLD_HOURS;
  const batchLimit = options?.batchLimit ?? DEFAULT_SCAN_BATCH_LIMIT;

  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  let query = (supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: unknown) => {
          not: (col: string, op: string, val: unknown) => {
            lt: (col: string, val: string) => {
              limit: (n: number) => Promise<{ data: unknown[] | null; error: Error | null }>;
            };
          };
        };
      };
    };
  })
    .from('carts')
    .select('id, organization_id, customer_id, session_id, status, updated_at, cart_items(id, quantity, product_id)')
    .eq('status', 'active')
    .not('customer_id', 'is', null)
    .lt('updated_at', cutoffIso)
    .limit(batchLimit);

  const { data: staleCarts, error } = await query;

  if (error || !staleCarts || staleCarts.length === 0) {
    return { scanned: 0, abandoned: 0, skipped: 0 };
  }

  let abandonedCount = 0;
  let skippedCount = 0;

  for (const rawCart of staleCarts) {
    const cart = rawCart as {
      id: string;
      organization_id: string;
      customer_id: string;
      session_id?: string | null;
      status: string;
      cart_items?: Array<{ id: string; quantity: number; product_id: string; price?: number }>;
    };

    // Filter by organization if specified
    if (options?.organizationId && cart.organization_id !== options.organizationId) {
      skippedCount++;
      continue;
    }

    // Skip carts with 0 items
    if (!cart.cart_items || cart.cart_items.length === 0) {
      skippedCount++;
      continue;
    }

    // Resolve customer email and consent
    const { data: customer } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, email_marketing_consent, organization_id')
      .eq('id', cart.customer_id)
      .maybeSingle();

    if (!customer?.email) {
      skippedCount++;
      continue;
    }

    // Atomically transition cart status from 'active' to 'abandoned'
    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await (supabase as unknown as {
      from: (table: string) => {
        update: (payload: unknown) => {
          eq: (c1: string, v1: string) => {
            eq: (c2: string, v2: string) => {
              select: (cols: string) => {
                maybeSingle: () => Promise<{ data: { id: string } | null; error: Error | null }>;
              };
            };
          };
        };
      };
    })
      .from('carts')
      .update({ status: 'abandoned', updated_at: nowIso })
      .eq('id', cart.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (updateErr || !updated) {
      // Race condition: Cart was already updated or converted by another process
      skippedCount++;
      continue;
    }

    // Emit domain event for checkout abandonment
    await publishDomainEvent(supabase, {
      eventType: 'checkout.abandoned',
      aggregateType: 'cart',
      aggregateId: cart.id,
      organizationId: cart.organization_id,
      payload: {
        cartId: cart.id,
        checkoutId: cart.id,
        sessionId: cart.session_id || null,
        customerId: customer.id,
        customerEmail: customer.email.trim().toLowerCase(),
        customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || undefined,
        itemCount: cart.cart_items.length,
        items: cart.cart_items,
        abandonedAt: nowIso,
      },
    });

    abandonedCount++;
  }

  return {
    scanned: staleCarts.length,
    abandoned: abandonedCount,
    skipped: skippedCount,
  };
}

/**
 * Scans for customers whose last purchase is older than the inactivity threshold (e.g. 30 days),
 * verifies marketing consent, checks cooldown to prevent duplicate emissions, and emits 'customer.inactive'.
 */
export async function scanAndEmitInactiveCustomers(
  supabase: SupabaseClient<Database>,
  options?: {
    organizationId?: string;
    inactivityDays?: number;
    cooldownDays?: number;
    batchLimit?: number;
  }
): Promise<InactiveCustomerScanResult> {
  const inactivityDays = options?.inactivityDays ?? CUSTOMER_INACTIVITY_THRESHOLD_DAYS;
  const cooldownDays = options?.cooldownDays ?? WIN_BACK_COOLDOWN_DAYS;
  const batchLimit = options?.batchLimit ?? DEFAULT_SCAN_BATCH_LIMIT;

  const cutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  const cooldownCutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);
  const cooldownIso = cooldownCutoff.toISOString();

  let queryBuilder = supabase
    .from('customers')
    .select('id, email, first_name, last_name, email_marketing_consent, organization_id, created_at')
    .eq('email_marketing_consent', true)
    .lt('created_at', cutoffIso);

  if (options?.organizationId) {
    queryBuilder = queryBuilder.eq('organization_id', options.organizationId);
  }

  const { data: customers, error } = await queryBuilder.limit(batchLimit);

  if (error || !customers || customers.length === 0) {
    return { scanned: 0, inactiveEmitted: 0, skipped: 0 };
  }

  let emittedCount = 0;
  let skippedCount = 0;

  for (const customer of customers) {
    if (!customer.email) {
      skippedCount++;
      continue;
    }

    // 1. Check most recent qualifying order
    const { data: latestOrder } = await supabase
      .from('orders')
      .select('id, created_at, status')
      .eq('customer_id', customer.id)
      .in('status', ['confirmed', 'shipped', 'received', 'created', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestOrder?.created_at) {
      // If customer has a recent order placed after the inactivity cutoff, they are active
      if (new Date(latestOrder.created_at) >= cutoff) {
        skippedCount++;
        continue;
      }
    }

    // 2. Cooldown check: Has customer.inactive been emitted within the cooldown window?
    const { data: recentEvent } = await supabase
      .from('domain_events')
      .select('id')
      .eq('aggregate_id', customer.id)
      .eq('event_type', 'customer.inactive')
      .gte('created_at', cooldownIso)
      .limit(1)
      .maybeSingle();

    if (recentEvent) {
      skippedCount++;
      continue;
    }

    // 3. Emit domain event for inactive customer
    await publishDomainEvent(supabase, {
      eventType: 'customer.inactive',
      aggregateType: 'customer',
      aggregateId: customer.id,
      organizationId: customer.organization_id,
      payload: {
        customerId: customer.id,
        customerEmail: customer.email.trim().toLowerCase(),
        firstName: customer.first_name,
        lastName: customer.last_name,
        daysInactive: inactivityDays,
        lastOrderAt: latestOrder?.created_at || null,
        lastOrderId: latestOrder?.id || null,
        detectedAt: new Date().toISOString(),
      },
    });

    emittedCount++;
  }

  return {
    scanned: customers.length,
    inactiveEmitted: emittedCount,
    skipped: skippedCount,
  };
}

export interface EstimatedDeliveryScanResult {
  scanned: number;
  estimatedDelivered: number;
  skipped: number;
}

/**
 * Scans for shipped orders that lack an actual order.received confirmation,
 * calculates delivery estimates based on location and customization,
 * and emits 'order.received' events with deliverySource: 'estimated'.
 *
 * Strict Guarantees:
 * - Bounded lookback prevents historical orders from being triggered.
 * - Idempotency checks prevent duplicate executions or event emissions.
 * - Does not alter database order status to preserve ground truth.
 */
export async function scanAndEmitEstimatedDeliveries(
  supabase: SupabaseClient<Database>,
  options?: {
    organizationId?: string;
    batchLimit?: number;
    config?: DeliveryEstimateConfig;
    now?: Date;
  }
): Promise<EstimatedDeliveryScanResult> {
  const batchLimit = options?.batchLimit ?? DEFAULT_SCAN_BATCH_LIMIT;
  const config = options?.config ?? DEFAULT_DELIVERY_ESTIMATE_CONFIG;
  const now = options?.now ?? new Date();

  // Bounded lookback: Only inspect orders shipped within maxEstimateLookbackDays
  const lookbackDate = new Date(
    now.getTime() - config.maxEstimateLookbackDays * 24 * 60 * 60 * 1000
  );

  let query = (supabase as any)
    .from('orders')
    .select(
      'id, organization_id, customer_id, order_number, status, shipping_address, created_at, placed_at, confirmed_at, shipped_at, received_at, order_items(id, product_name, product_id, sku, total, unit_price)'
    )
    .eq('status', 'shipped')
    .is('received_at', null)
    .gte('shipped_at', lookbackDate.toISOString())
    .limit(batchLimit);

  if (options?.organizationId) {
    query = query.eq('organization_id', options.organizationId);
  }

  const { data: candidates, error } = await query;
  if (error || !candidates || candidates.length === 0) {
    return { scanned: 0, estimatedDelivered: 0, skipped: 0 };
  }

  let emittedCount = 0;
  let skippedCount = 0;

  for (const rawOrder of candidates) {
    const order = rawOrder as {
      id: string;
      organization_id: string;
      customer_id?: string | null;
      order_number: string;
      status: string;
      shipping_address?: unknown;
      created_at?: string;
      placed_at?: string | null;
      confirmed_at?: string | null;
      shipped_at?: string | null;
      received_at?: string | null;
      order_items?: Array<{
        id: string;
        product_name: string;
        product_id?: string;
        sku?: string | null;
        total?: number;
        unit_price?: number;
      }>;
    };

    // Filter by organization if specified
    if (options?.organizationId && order.organization_id !== options.organizationId) {
      skippedCount++;
      continue;
    }

    // Check if retention automation execution already exists for this order
    const { data: existingExecution } = await (supabase as any)
      .from('marketing_automation_executions')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    if (existingExecution) {
      skippedCount++;
      continue;
    }

    // Check if order.received or order.delivery_estimated event was already emitted
    const { data: existingEvent } = await (supabase as any)
      .from('domain_events')
      .select('id')
      .eq('aggregate_id', order.id)
      .in('event_type', ['order.received', 'order.delivery_estimated'])
      .maybeSingle();

    if (existingEvent) {
      skippedCount++;
      continue;
    }

    // Compute estimate
    const estimate = calculateEstimatedDelivery(order, order.order_items, config);

    // If estimate is due (now >= estimatedDeliveryAt)
    if (now.getTime() >= estimate.estimatedDeliveryAt.getTime()) {
      await publishDomainEvent(supabase, {
        eventType: 'order.received',
        aggregateType: 'order',
        aggregateId: order.id,
        organizationId: order.organization_id,
        payload: {
          orderId: order.id,
          orderNumber: order.order_number,
          organizationId: order.organization_id,
          customerId: order.customer_id || null,
          deliverySource: 'estimated',
          estimatedDeliveryAt: estimate.estimatedDeliveryAt.toISOString(),
          shippingDays: estimate.shippingDays,
          productionDays: estimate.productionDays,
          isLagosOrAbuja: estimate.isLagosOrAbuja,
          hasCustomItems: estimate.hasCustomItems,
          timestamp: now.toISOString(),
        },
      });

      emittedCount++;
    } else {
      skippedCount++;
    }
  }

  return {
    scanned: candidates.length,
    estimatedDelivered: emittedCount,
    skipped: skippedCount,
  };
}
