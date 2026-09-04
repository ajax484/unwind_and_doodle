import { SupabaseClient } from '@supabase/supabase-js';
import { Database, OrderStatus, Json } from '../lib/supabase/types';
import { releaseOrderReservations, commitOrderReservations } from './inventory.service';
import { publishDomainEvent } from './events.service';
import { ORDER_STATUS, DEFAULT_ORGANIZATION_ID } from '../lib/constants';

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.CREATED]: [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.RECEIVED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.RECEIVED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.REFUNDED]: [],
} as const;

/**
 * Checks whether transitioning from `currentStatus` to `targetStatus` is valid under business rules.
 */
export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  if (currentStatus === targetStatus) {
    return false;
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(targetStatus));
}

export interface TransitionOrderParams {
  supabase: SupabaseClient<Database>;
  orderId: string;
  targetStatus: OrderStatus;
  userId?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TransitionOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  updatedAt: string;
}

/**
 * Performs a validated, atomic order status transition.
 * Updates the order with appropriate server-side timestamps (shipped_at, received_at, cancelled_at, refunded_at),
 * records status history, writes an audit log, publishes domain events to the outbox,
 * and handles inventory adjustments if cancelled.
 */
export async function transitionOrderStatus(
  params: TransitionOrderParams
): Promise<TransitionOrderResult> {
  const { supabase, orderId, targetStatus, userId, note, metadata } = params;

  // 1. Fetch current order state
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const currentStatus = order.status;

  // 2. Validate state machine transition rules
  if (!canTransitionOrderStatus(currentStatus, targetStatus)) {
    throw new Error(
      `Invalid status transition from '${currentStatus}' to '${targetStatus}'`
    );
  }

  const now = new Date().toISOString();

  // 2b. Commit inventory reservations on fulfillment transition
  if (targetStatus === ORDER_STATUS.SHIPPED || targetStatus === ORDER_STATUS.CONFIRMED) {
    try {
      await commitOrderReservations(supabase, orderId);
    } catch (commitErr) {
      const msg = commitErr instanceof Error ? commitErr.message : 'Inventory commit failed';
      throw new Error(`Fulfillment failed: ${msg}`);
    }
  }

  // 2c. Release inventory reservations on cancellation transition
  if (targetStatus === ORDER_STATUS.CANCELLED) {
    try {
      await releaseOrderReservations(supabase, orderId);
    } catch (releaseErr) {
      console.error(`Failed to release reservations for cancelled order ${orderId}:`, releaseErr);
    }
  }

  // Prepare status timestamp updates
  const orderUpdatePayload: Record<string, unknown> = {
    status: targetStatus,
    updated_at: now,
  };

  if (targetStatus === ORDER_STATUS.CONFIRMED) {
    orderUpdatePayload.confirmed_at = now;
  } else if (targetStatus === ORDER_STATUS.SHIPPED) {
    orderUpdatePayload.shipped_at = now;
  } else if (targetStatus === ORDER_STATUS.RECEIVED) {
    orderUpdatePayload.received_at = now;
  } else if (targetStatus === ORDER_STATUS.CANCELLED) {
    orderUpdatePayload.cancelled_at = now;
  } else if (targetStatus === ORDER_STATUS.REFUNDED) {
    orderUpdatePayload.refunded_at = now;
  }

  // 3. Atomically update order status & timestamps
  const { error: updateError } = await supabase
    .from('orders')
    .update(orderUpdatePayload as unknown as Database['public']['Tables']['orders']['Update'])
    .eq('id', orderId);

  if (updateError) {
    throw new Error(`Failed to update order status: ${updateError.message}`);
  }

  // 4. Insert order_status_history record
  const { error: historyError } = await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: currentStatus,
    to_status: targetStatus,
    status: targetStatus,
    previous_status: currentStatus,
    note: note || null,
    changed_by: userId || null,
    created_by: userId || null,
  } as unknown as Database['public']['Tables']['order_status_history']['Insert']);

  if (historyError) {
    console.error('Failed to create order status history:', historyError.message);
  }

  // 5. Insert audit_logs record
  const orgId = order.organization_id || DEFAULT_ORGANIZATION_ID;
  const { error: auditError } = await supabase.from('audit_logs').insert({
    organization_id: orgId,
    actor_id: userId || null,
    user_id: userId || null,
    action: 'order.status_transition',
    entity_type: 'order',
    entity_id: orderId,
    before_data: { status: currentStatus },
    old_values: { status: currentStatus },
    after_data: {
      status: targetStatus,
      note: note || null,
      metadata: (metadata as Json) || null,
      timestamp: now,
    },
    new_values: {
      status: targetStatus,
      note: note || null,
      metadata: (metadata as Json) || null,
      timestamp: now,
    },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  if (auditError) {
    console.error('Failed to create audit log:', auditError.message);
  }

  // 6. Publish domain events (specific lifecycle event + general change event)
  await Promise.all([
    publishDomainEvent(supabase, {
      eventType: `order.${targetStatus}`,
      aggregateType: 'order',
      aggregateId: orderId,
      payload: {
        orderId,
        orderNumber: order.order_number,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        customerId: order.customer_id,
        updatedBy: userId || null,
        note: note || null,
        timestamp: now,
      },
    }),
    publishDomainEvent(supabase, {
      eventType: 'order.status_changed',
      aggregateType: 'order',
      aggregateId: orderId,
      payload: {
        orderId,
        orderNumber: order.order_number,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        updatedBy: userId || null,
        note: note || null,
        timestamp: now,
      },
    }),
  ]);

  console.info(`[order.transitioned] order_id=${orderId} from=${currentStatus} to=${targetStatus}`);

  return {
    success: true,
    orderId,
    orderNumber: order.order_number,
    previousStatus: currentStatus,
    newStatus: targetStatus,
    updatedAt: now,
  };
}
