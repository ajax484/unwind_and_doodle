import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { commitOrderReservations } from './inventory.service';
import { incrementDiscountUsageAtomic } from './discount.service';
import { publishDomainEvent } from './events.service';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DOMAIN_EVENT_TYPES,
  DEFAULT_ORGANIZATION_ID,
} from '../lib/constants';

export interface VerifiedPaymentDetails {
  amount: number;
  currency: string;
  channel?: string;
  paidAt?: string;
  providerReference?: string;
  rawMetadata?: Record<string, unknown>;
}

export interface FulfillSuccessfulPaymentParams {
  supabase: SupabaseClient<Database>;
  orderId: string;
  paymentId: string;
  provider: string;
  reference: string;
  verifiedDetails: VerifiedPaymentDetails;
  source: 'webhook' | 'return_callback' | 'revalidation_cron' | 'manual_admin' | string;
  actorId?: string | null;
  cartSessionId?: string | null;
}

export interface FulfillPaymentResult {
  alreadyProcessed: boolean;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentId: string;
  paymentStatus: string;
}

/**
 * Authoritative, idempotent payment fulfillment orchestrator.
 * Handles the complete post-payment lifecycle:
 * 1. Checks idempotency (bails if payment is already successful)
 * 2. Updates payment record with success status & gateway metadata
 * 3. Commits physical and virtual inventory reservations
 * 4. Updates manual order payment requests if applicable
 * 5. Atomically increments discount coupon usage count
 * 6. Safely transitions order status (created -> pending) without regressing downstream statuses
 * 7. Records status transition history and audit logs
 * 8. Emits payment.completed domain event for email/in-app notifications
 * 9. Converts active cart sessions
 */
export async function fulfillSuccessfulPayment(
  params: FulfillSuccessfulPaymentParams
): Promise<FulfillPaymentResult> {
  const {
    supabase,
    orderId,
    paymentId,
    provider,
    reference,
    verifiedDetails,
    source,
    actorId = null,
    cartSessionId,
  } = params;

  // 1. Fetch current payment and order state
  const [{ data: payment, error: payErr }, { data: order, error: ordErr }] = await Promise.all([
    supabase.from('payments').select('*').eq('id', paymentId).maybeSingle(),
    supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
  ]);

  if (payErr || !payment) {
    throw new Error(`Payment record not found: ${paymentId}`);
  }
  if (ordErr || !order) {
    throw new Error(`Order record not found: ${orderId}`);
  }

  // Idempotency check: if payment is already successful, do not repeat side-effects
  if (payment.status === PAYMENT_STATUS.SUCCESSFUL) {
    return {
      alreadyProcessed: true,
      orderId: order.id,
      orderNumber: order.order_number,
      orderStatus: order.status,
      paymentId: payment.id,
      paymentStatus: payment.status,
    };
  }

  const effectivePaidAt = verifiedDetails.paidAt || new Date().toISOString();
  const existingMetadata =
    payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
      ? (payment.metadata as Record<string, unknown>)
      : {};

  // 2. Update payment status to successful
  const updatedMetadata: Record<string, unknown> = {
    ...existingMetadata,
    ...(verifiedDetails.rawMetadata || {}),
    channel: verifiedDetails.channel || existingMetadata.channel,
    provider_transaction_ref: verifiedDetails.providerReference || reference,
    paid_at: effectivePaidAt,
    verified_via: source,
  };

  const { error: updatePayError } = await supabase
    .from('payments')
    .update({
      status: PAYMENT_STATUS.SUCCESSFUL,
      metadata: updatedMetadata as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
    } as unknown as Database['public']['Tables']['payments']['Update'])
    .eq('id', payment.id);

  if (updatePayError) {
    throw new Error(`Failed to update payment status: ${updatePayError.message}`);
  }

  // 3. Commit inventory reservations
  await commitOrderReservations(supabase, order.id);

  // 4. Update manual order payment requests if applicable
  try {
    await supabase
      .from('order_payment_requests')
      .update({
        status: 'paid',
        paid_at: effectivePaidAt,
        updated_at: new Date().toISOString(),
      } as unknown as Database['public']['Tables']['order_payment_requests']['Update'])
      .eq('order_id', order.id);
  } catch {
    // Non-blocking for orders without payment requests
  }

  // 5. Increment coupon discount usage count atomically if discount was applied
  const orderRecord = order as Record<string, unknown>;
  if (orderRecord.discount_id) {
    const orgId = (orderRecord.organization_id as string) || DEFAULT_ORGANIZATION_ID;
    try {
      await incrementDiscountUsageAtomic(supabase, orderRecord.discount_id as string, orgId);
    } catch (discErr) {
      console.warn(`[payment-fulfillment] Failed to increment discount usage:`, discErr);
    }
  }

  // 6. Safe order state transition
  // Only advance created -> pending to avoid overwriting downstream statuses (e.g. confirmed/shipped)
  const orderUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  let targetStatus = order.status;
  if (order.status === ORDER_STATUS.CREATED) {
    orderUpdates.status = ORDER_STATUS.PENDING;
    targetStatus = ORDER_STATUS.PENDING;
  }
  if ('payment_status' in orderRecord) {
    orderUpdates.payment_status = PAYMENT_STATUS.SUCCESSFUL;
  }

  const { error: updateOrderError } = await supabase
    .from('orders')
    .update(orderUpdates as unknown as Database['public']['Tables']['orders']['Update'])
    .eq('id', order.id);

  if (updateOrderError) {
    throw new Error(`Failed to update order status: ${updateOrderError.message}`);
  }

  // 7. Record status transition history
  await supabase.from('order_status_history').insert({
    order_id: order.id,
    from_status: order.status,
    to_status: targetStatus,
    status: targetStatus,
    previous_status: order.status,
    note: `Payment confirmed via ${provider} reference ${reference} (${source})`,
  } as unknown as Database['public']['Tables']['order_status_history']['Insert']);

  // 8. Record audit log
  const orgId = order.organization_id || DEFAULT_ORGANIZATION_ID;
  await supabase.from('audit_logs').insert({
    organization_id: orgId,
    actor_id: actorId,
    user_id: actorId,
    action: 'payment.verified',
    entity_type: 'payment',
    entity_id: payment.id,
    before_data: { status: payment.status },
    old_values: { status: payment.status },
    after_data: {
      status: PAYMENT_STATUS.SUCCESSFUL,
      provider,
      amount: payment.amount,
      reference,
      source,
    },
    new_values: {
      status: PAYMENT_STATUS.SUCCESSFUL,
      provider,
      amount: payment.amount,
      reference,
      source,
    },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 9. Emit domain event (payment.completed)
  await publishDomainEvent(supabase, {
    eventType: DOMAIN_EVENT_TYPES.PAYMENT_COMPLETED,
    aggregateType: 'payment',
    aggregateId: payment.id,
    organizationId: orgId,
    payload: {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.order_number,
      provider,
      providerReference: reference,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: effectivePaidAt,
      customerId: order.customer_id,
    },
  });

  // 10. Mark associated active cart converted
  try {
    if (order.customer_id) {
      await supabase
        .from('carts')
        .update({ status: 'converted', updated_at: new Date().toISOString() })
        .eq('customer_id', order.customer_id)
        .eq('status', 'active');
    } else if (cartSessionId) {
      await supabase
        .from('carts')
        .update({ status: 'converted', updated_at: new Date().toISOString() })
        .eq('session_id', cartSessionId.trim());
    }
  } catch {
    // Non-blocking conversion tracking
  }

  return {
    alreadyProcessed: false,
    orderId: order.id,
    orderNumber: order.order_number,
    orderStatus: targetStatus,
    paymentId: payment.id,
    paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
  };
}
