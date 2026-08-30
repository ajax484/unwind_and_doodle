import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { PaymentProvider } from './payment/provider.interface';
import { PaystackPaymentProvider } from './payment/paystack.provider';
import { commitOrderReservations } from './inventory.service';
import { incrementDiscountUsageAtomic } from './discount.service';
import { publishDomainEvent } from './events.service';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES, CURRENCY } from '../lib/constants';

export interface ProcessWebhookOptions {
  supabase: SupabaseClient<Database>;
  rawBody: string;
  headers: Headers | Record<string, string | null | undefined>;
  paymentProvider?: PaymentProvider;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  orderId?: string;
  paymentId?: string;
  alreadyProcessed?: boolean;
}

/**
 * Handles incoming payment provider webhooks (Paystack) with strict signature/hash validation,
 * API cross-verification, idempotency, inventory commit, order state update, audit logging, and domain events.
 */
export async function processPaymentWebhook(
  options: ProcessWebhookOptions
): Promise<WebhookResult> {
  const { supabase, rawBody, headers } = options;
  const paymentProvider = options.paymentProvider || new PaystackPaymentProvider();

  // 1. Validate webhook authentication headers and extract transaction reference
  const verification = await paymentProvider.verifyWebhook(rawBody, headers);
  if (!verification.isValid) {
    throw new Error(`Invalid ${paymentProvider.name} webhook signature/hash`);
  }

  const reference = verification.reference;
  if (!reference) {
    return {
      success: true,
      message: 'Ignored webhook with no transaction reference',
    };
  }

  // 2. Find payment record by provider_reference
  const { data: payment, error: payError } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_reference', reference)
    .maybeSingle();

  if (payError || !payment) {
    throw new Error(`Payment not found for reference: ${reference}`);
  }

  // 3. Idempotency check: if payment is already marked successful, return immediately
  if (payment.status === PAYMENT_STATUS.SUCCESSFUL) {
    return {
      success: true,
      message: 'Payment already processed successfully',
      orderId: payment.order_id,
      paymentId: payment.id,
      alreadyProcessed: true,
    };
  }

  // 4. Verify transaction with Payment Provider API directly (never trust webhook payload alone)
  const verifiedTx = await paymentProvider.verifyTransaction(reference, verification.transactionId);

  if (verifiedTx.status !== 'successful') {
    throw new Error(`Provider reported non-successful transaction status: ${verifiedTx.status}`);
  }

  // 5. Verify transaction amount matches order amount
  if (Math.abs(verifiedTx.amount - payment.amount) > 0.01) {
    throw new Error(
      `Transaction amount mismatch. Expected: ${payment.amount}, Got: ${verifiedTx.amount}`
    );
  }

  // 6. Verify currency
  if (verifiedTx.currency.toUpperCase() !== CURRENCY.NGN) {
    throw new Error(
      `Transaction currency mismatch. Expected: ${CURRENCY.NGN}, Got: ${verifiedTx.currency}`
    );
  }

  // 7. Update payment status to successful
  const existingMetadata = (
    payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
      ? payment.metadata
      : {}
  ) as Record<string, unknown>;

  const { error: updatePayError } = await supabase
    .from('payments')
    .update({
      status: PAYMENT_STATUS.SUCCESSFUL,
      metadata: {
        ...existingMetadata,
        channel: verifiedTx.channel,
        provider_transaction_ref: verifiedTx.providerReference,
        paid_at: verifiedTx.paidAt,
      },
    } as unknown as Database['public']['Tables']['payments']['Update'])
    .eq('id', payment.id);

  if (updatePayError) {
    throw new Error(`Failed to update payment status: ${updatePayError.message}`);
  }

  // 8. Commit the inventory reservation & increment discount usage count if applied
  await commitOrderReservations(supabase, payment.order_id);

  // Update order_payment_requests if this was a manual order payment link
  await supabase
    .from('order_payment_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Database['public']['Tables']['order_payment_requests']['Update'])
    .eq('order_id', payment.order_id);

  const { data: orderDisc } = await supabase
    .from('orders')
    .select('discount_id, organization_id')
    .eq('id', payment.order_id)
    .maybeSingle();

  if (orderDisc && (orderDisc as Record<string, unknown>).discount_id) {
    await incrementDiscountUsageAtomic(
      supabase,
      (orderDisc as Record<string, unknown>).discount_id as string,
      (orderDisc as Record<string, unknown>).organization_id as string
    );
  }

  // 9. Change order status from 'created' to 'pending' and update payment_status if present
  const orderUpdates: Record<string, unknown> = {
    status: ORDER_STATUS.PENDING,
    updated_at: new Date().toISOString(),
  };
  if ('payment_status' in (payment as Record<string, unknown>)) {
    orderUpdates.payment_status = PAYMENT_STATUS.SUCCESSFUL;
  }

  const { error: updateOrderError } = await supabase
    .from('orders')
    .update(orderUpdates as any)
    .eq('id', payment.order_id);

  if (updateOrderError) {
    throw new Error(`Failed to update order status: ${updateOrderError.message}`);
  }

  // 10. Record order status history
  await supabase.from('order_status_history').insert({
    order_id: payment.order_id,
    from_status: ORDER_STATUS.CREATED,
    to_status: ORDER_STATUS.PENDING,
    status: ORDER_STATUS.PENDING,
    previous_status: ORDER_STATUS.CREATED,
    note: `Payment confirmed via ${paymentProvider.name} reference ${reference}`,
  } as unknown as Database['public']['Tables']['order_status_history']['Insert']);

  // 11. Create audit log for payment verification
  await supabase.from('audit_logs').insert({
    organization_id: '88c7af2e-afd4-4504-a43f-b14cc45d6263',
    actor_id: null,
    user_id: null,
    action: 'payment.verified',
    entity_type: 'payment',
    entity_id: payment.id,
    before_data: { status: PAYMENT_STATUS.PENDING },
    old_values: { status: PAYMENT_STATUS.PENDING },
    after_data: {
      status: PAYMENT_STATUS.SUCCESSFUL,
      provider: paymentProvider.name,
      amount: payment.amount,
      currency: payment.currency,
      reference,
    },
    new_values: {
      status: PAYMENT_STATUS.SUCCESSFUL,
      provider: paymentProvider.name,
      amount: payment.amount,
      currency: payment.currency,
      reference,
    },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 12. Create domain event: payment.completed
  const { data: order } = await supabase
    .from('orders')
    .select('order_number, customer_id')
    .eq('id', payment.order_id)
    .maybeSingle();

  await publishDomainEvent(supabase, {
    eventType: DOMAIN_EVENT_TYPES.PAYMENT_COMPLETED,
    aggregateType: 'payment',
    aggregateId: payment.id,
    payload: {
      paymentId: payment.id,
      orderId: payment.order_id,
      orderNumber: order?.order_number || '',
      provider: paymentProvider.name,
      providerReference: reference,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: verifiedTx.paidAt || new Date().toISOString(),
      customerId: order?.customer_id || '',
    },
  });

  return {
    success: true,
    message: 'Payment verified and processed successfully',
    orderId: payment.order_id,
    paymentId: payment.id,
    alreadyProcessed: false,
  };
}
