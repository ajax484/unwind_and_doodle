import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { PaystackPaymentProvider } from './payment/paystack.provider';
import { FlutterwavePaymentProvider } from './payment/flutterwave.provider';
import { PaymentProvider, PaymentVerification } from './payment/provider.interface';
import { commitOrderReservations, releaseOrderReservations } from './inventory.service';
import { publishDomainEvent } from './events.service';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES, CURRENCY } from '../lib/constants';

export interface RevalidationOptions {
  paymentId?: string;
  reference?: string;
  orderId?: string;
  orderNumber?: string;
  triggeredBy?: 'customer' | 'admin' | 'cron' | 'callback';
  actorId?: string | null;
}

export interface RevalidationResult {
  success: boolean;
  verified: boolean;
  status: 'successful' | 'failed' | 'pending' | 'already_successful' | 'error';
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  message?: string;
  gatewayResponse?: PaymentVerification | null;
}

export interface SweepResults {
  processed: number;
  succeeded: number;
  failed: number;
  stillPending: number;
  errors: number;
  results: RevalidationResult[];
}

function getProviderInstance(providerName: string): PaymentProvider {
  switch (providerName.toLowerCase()) {
    case 'flutterwave':
    case 'flw':
      return new FlutterwavePaymentProvider();
    case 'paystack':
    default:
      return new PaystackPaymentProvider();
  }
}

/**
 * Revalidates a single pending payment against its payment gateway (Paystack / Flutterwave).
 * Transitions order state, commits/releases inventory reservations, and creates audit logs.
 */
export async function revalidatePayment(
  supabase: SupabaseClient<Database>,
  options: RevalidationOptions
): Promise<RevalidationResult> {
  const triggeredBy = options.triggeredBy || 'admin';

  // 1. Locate the payment record
  let payment: Database['public']['Tables']['payments']['Row'] | null = null;

  if (options.paymentId) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('id', options.paymentId)
      .maybeSingle();
    payment = data;
  } else if (options.reference) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_reference', options.reference.trim())
      .maybeSingle();
    payment = data;
  } else if (options.orderId) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', options.orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    payment = data;
  } else if (options.orderNumber) {
    const { data: ord } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', options.orderNumber.trim())
      .maybeSingle();

    if (ord) {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', ord.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      payment = data;
    }
  }

  if (!payment) {
    throw new Error('Payment record not found for the provided identifier');
  }

  // 2. Fetch associated order
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, total, status, customer_id, organization_id')
    .eq('id', payment.order_id)
    .maybeSingle();

  if (!order) {
    throw new Error(`Associated order ${payment.order_id} not found`);
  }

  // 3. If already successful, return idempotent confirmation
  if (payment.status === PAYMENT_STATUS.SUCCESSFUL) {
    return {
      success: true,
      verified: true,
      status: 'already_successful',
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.order_number,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      reference: payment.provider_reference || '',
      message: 'Payment has already been verified and processed',
    };
  }

  const reference = payment.provider_reference;
  if (!reference) {
    throw new Error(`Payment ${payment.id} has no provider reference to revalidate`);
  }

  // 4. Verify transaction with live gateway API
  const provider = getProviderInstance(payment.provider);
  let verifiedTx: PaymentVerification;

  try {
    verifiedTx = await provider.verifyTransaction(reference);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gateway verification request failed';
    return {
      success: false,
      verified: false,
      status: 'error',
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.order_number,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      reference,
      message,
    };
  }

  // 5. Handle Successful Payment
  if (
    verifiedTx.status === 'successful' &&
    Math.abs(verifiedTx.amount - payment.amount) < 0.01 &&
    verifiedTx.currency.toUpperCase() === CURRENCY.NGN
  ) {
    // Update payment record
    const updatedMetadata = {
      ...(payment.metadata && typeof payment.metadata === 'object'
        ? (payment.metadata as Record<string, unknown>)
        : {}),
      channel: verifiedTx.channel,
      paid_at: verifiedTx.paidAt,
      revalidated_at: new Date().toISOString(),
      revalidated_by: triggeredBy,
    };

    await supabase
      .from('payments')
      .update({
        status: PAYMENT_STATUS.SUCCESSFUL,
        metadata: updatedMetadata as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
      } as unknown as Database['public']['Tables']['payments']['Update'])
      .eq('id', payment.id);

    // Commit inventory reservation hold
    await commitOrderReservations(supabase, order.id);

    // Transition order state to pending if created, and update payment_status if present
    const orderUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (order.status === ORDER_STATUS.CREATED) {
      orderUpdates.status = ORDER_STATUS.PENDING;
    }
    if ('payment_status' in (order as Record<string, unknown>)) {
      orderUpdates.payment_status = PAYMENT_STATUS.SUCCESSFUL;
    }

    await supabase
      .from('orders')
      .update(orderUpdates as unknown as Database['public']['Tables']['orders']['Update'])
      .eq('id', order.id);

    // Record order status history
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      to_status: ORDER_STATUS.PENDING,
      from_status: order.status,
      status: ORDER_STATUS.PENDING,
      previous_status: order.status,
      note: `Payment revalidated via ${payment.provider} reference ${reference} (${triggeredBy})`,
    } as unknown as Database['public']['Tables']['order_status_history']['Insert']);

    // Log audit trail
    if (order.organization_id) {
      await supabase.from('audit_logs').insert({
        organization_id: order.organization_id,
        actor_id: options.actorId || null,
        user_id: options.actorId || null,
        action: 'payment.verified',
        entity_type: 'payment',
        entity_id: payment.id,
        before_data: { status: payment.status },
        old_values: { status: payment.status },
        after_data: {
          status: PAYMENT_STATUS.SUCCESSFUL,
          provider: payment.provider,
          amount: payment.amount,
          reference,
          source: `revalidation_${triggeredBy}`,
        },
        new_values: {
          status: PAYMENT_STATUS.SUCCESSFUL,
          provider: payment.provider,
          amount: payment.amount,
          reference,
          source: `revalidation_${triggeredBy}`,
        },
      } as unknown as Database['public']['Tables']['audit_logs']['Insert']);
    }

    // Publish domain event
    await publishDomainEvent(supabase, {
      eventType: DOMAIN_EVENT_TYPES.PAYMENT_COMPLETED,
      aggregateType: 'payment',
      aggregateId: payment.id,
      payload: {
        paymentId: payment.id,
        orderId: order.id,
        orderNumber: order.order_number,
        provider: payment.provider,
        providerReference: reference,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: verifiedTx.paidAt || new Date().toISOString(),
        customerId: order.customer_id,
        revalidatedBy: triggeredBy,
      },
    });

    return {
      success: true,
      verified: true,
      status: 'successful',
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.order_number,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      reference,
      gatewayResponse: verifiedTx,
      message: 'Payment confirmed and verified successfully',
    };
  }

  // 6. Handle Explicit Failed Payment
  if (verifiedTx.status === 'failed') {
    await supabase
      .from('payments')
      .update({
        status: PAYMENT_STATUS.FAILED,
        metadata: {
          ...(payment.metadata && typeof payment.metadata === 'object'
            ? (payment.metadata as Record<string, unknown>)
            : {}),
          revalidated_at: new Date().toISOString(),
          revalidated_by: triggeredBy,
          gateway_failure_reason: ((verifiedTx.rawResponse?.gateway_response as string) || 'Payment failed at gateway'),
        } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
      } as unknown as Database['public']['Tables']['payments']['Update'])
      .eq('id', payment.id);

    // Release reservations if still held in created state and update order payment_status if present
    if (order.status === ORDER_STATUS.CREATED) {
      await releaseOrderReservations(supabase, order.id);
    }
    if ('payment_status' in (order as Record<string, unknown>)) {
      await supabase
        .from('orders')
        .update({
          payment_status: PAYMENT_STATUS.FAILED,
          updated_at: new Date().toISOString(),
        } as unknown as Database['public']['Tables']['orders']['Update'])
        .eq('id', order.id);
    }

    return {
      success: true,
      verified: false,
      status: 'failed',
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.order_number,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      reference,
      gatewayResponse: verifiedTx,
      message: 'Gateway confirmed that this transaction failed',
    };
  }

  // 7. Still Pending at Gateway
  return {
    success: true,
    verified: false,
    status: 'pending',
    paymentId: payment.id,
    orderId: order.id,
    orderNumber: order.order_number,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    reference,
    gatewayResponse: verifiedTx,
    message: 'Payment is still awaiting customer completion at the gateway',
  };
}

/**
 * Sweeps all pending payments created in the last N hours and revalidates each one.
 */
export async function sweepPendingPayments(
  supabase: SupabaseClient<Database>,
  options?: {
    organizationId?: string;
    limit?: number;
    maxAgeHours?: number;
  }
): Promise<SweepResults> {
  const limit = options?.limit || 50;
  const maxAgeHours = options?.maxAgeHours || 24;
  const sinceDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('payments')
    .select('id, provider_reference, order_id, created_at')
    .eq('status', PAYMENT_STATUS.PENDING)
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data: pendingPayments, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending payments for sweep: ${error.message}`);
  }

  const results: RevalidationResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let stillPending = 0;
  let errors = 0;

  for (const p of pendingPayments || []) {
    try {
      const res = await revalidatePayment(supabase, {
        paymentId: p.id,
        triggeredBy: 'cron',
      });

      results.push(res);
      if (res.status === 'successful' || res.status === 'already_successful') {
        succeeded++;
      } else if (res.status === 'failed') {
        failed++;
      } else if (res.status === 'pending') {
        stillPending++;
      } else {
        errors++;
      }
    } catch (err: unknown) {
      errors++;
      results.push({
        success: false,
        verified: false,
        status: 'error',
        paymentId: p.id,
        orderId: p.order_id,
        orderNumber: '',
        amount: 0,
        currency: 'NGN',
        provider: '',
        reference: p.provider_reference || '',
        message: err instanceof Error ? err.message : 'Unknown sweep error',
      });
    }
  }

  return {
    processed: pendingPayments?.length || 0,
    succeeded,
    failed,
    stillPending,
    errors,
    results,
  };
}
