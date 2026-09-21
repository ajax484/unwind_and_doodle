import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { getPaymentProvider, PaymentProvider } from './payment';
import { fulfillSuccessfulPayment } from './payment-fulfillment.service';
import { PAYMENT_STATUS, CURRENCY } from '../lib/constants';

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
 * Handles incoming payment provider webhooks (Paystack / Flutterwave) with strict signature/hash validation,
 * database-level event deduplication (payment_events), API cross-verification, idempotency,
 * inventory commit, order state update, audit logging, and domain events.
 */
export async function processPaymentWebhook(
  options: ProcessWebhookOptions
): Promise<WebhookResult> {
  const { supabase, rawBody, headers } = options;
  const paymentProvider = options.paymentProvider || getPaymentProvider('paystack');

  // 1. Validate webhook signature/hash BEFORE touching database or mutating any state
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

  // 2. Extract unique provider event identifier
  const rawPayload = (verification.payload || {}) as Record<string, unknown>;
  const rawData = (rawPayload.data || {}) as Record<string, unknown>;
  const providerEventId = String(
    rawPayload.id ||
    rawPayload.event_id ||
    rawData.id ||
    `${verification.event || 'charge'}_${reference}`
  );

  // 3. Check for previously processed event in payment_events table (database-level deduplication)
  try {
    const { data: existingEvent } = await supabase
      .from('payment_events')
      .select('id, status, payment_id, order_id')
      .eq('provider', paymentProvider.name)
      .eq('provider_event_id', providerEventId)
      .maybeSingle();

    if (existingEvent && existingEvent.status === 'processed') {
      return {
        success: true,
        message: 'Payment event already processed successfully',
        orderId: existingEvent.order_id || undefined,
        paymentId: existingEvent.payment_id || undefined,
        alreadyProcessed: true,
      };
    }
  } catch (eventErr) {
    // If payment_events table query encounters an issue, proceed gracefully to payment status check
    console.warn('[webhook.event_dedup_check_failed]', eventErr);
  }

  // 4. Find payment record by provider_reference
  const { data: payment, error: payError } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_reference', reference)
    .maybeSingle();

  if (payError || !payment) {
    throw new Error(`Payment not found for reference: ${reference}`);
  }

  // Verify that the webhook provider matches the payment record's provider
  if (payment.provider && payment.provider.toLowerCase() !== paymentProvider.name.toLowerCase()) {
    throw new Error(
      `Payment provider mismatch: payment was created with ${payment.provider}, received webhook for ${paymentProvider.name}`
    );
  }

  // 5. Idempotency check: if payment is already marked successful, record event and return immediately
  if (payment.status === PAYMENT_STATUS.SUCCESSFUL) {
    try {
      await supabase.from('payment_events').upsert({
        provider: paymentProvider.name,
        provider_event_id: providerEventId,
        event_type: verification.event || 'charge.success',
        payment_id: payment.id,
        order_id: payment.order_id,
        payload: rawPayload as unknown as Database['public']['Tables']['payment_events']['Insert']['payload'],
        status: 'processed',
        processed_at: new Date().toISOString(),
      } as unknown as Database['public']['Tables']['payment_events']['Insert'], {
        onConflict: 'provider,provider_event_id',
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Payment already processed successfully',
      orderId: payment.order_id,
      paymentId: payment.id,
      alreadyProcessed: true,
    };
  }

  // 6. Verify transaction with live Payment Provider API directly (never trust webhook payload alone)
  const verifiedTx = await paymentProvider.verifyTransaction(reference, verification.transactionId);

  if (verifiedTx.status !== 'successful') {
    throw new Error(`Provider reported non-successful transaction status: ${verifiedTx.status}`);
  }

  // 7. Verify transaction amount matches order amount
  if (Math.abs(verifiedTx.amount - payment.amount) > 0.01) {
    throw new Error(
      `Transaction amount mismatch. Expected: ${payment.amount}, Got: ${verifiedTx.amount}`
    );
  }

  // 8. Verify currency
  if (verifiedTx.currency.toUpperCase() !== CURRENCY.NGN) {
    throw new Error(
      `Transaction currency mismatch. Expected: ${CURRENCY.NGN}, Got: ${verifiedTx.currency}`
    );
  }

  // 9. Fulfill successful payment atomically via unified fulfillment service
  const fulfillment = await fulfillSuccessfulPayment({
    supabase,
    orderId: payment.order_id,
    paymentId: payment.id,
    provider: paymentProvider.name,
    reference,
    verifiedDetails: {
      amount: verifiedTx.amount,
      currency: verifiedTx.currency,
      channel: verifiedTx.channel,
      paidAt: verifiedTx.paidAt,
      providerReference: verifiedTx.providerReference,
    },
    source: 'webhook',
  });

  // 10. Record processed event in payment_events table
  try {
    await supabase.from('payment_events').upsert({
      provider: paymentProvider.name,
      provider_event_id: providerEventId,
      event_type: verification.event || 'charge.success',
      payment_id: payment.id,
      order_id: payment.order_id,
      payload: rawPayload as unknown as Database['public']['Tables']['payment_events']['Insert']['payload'],
      status: 'processed',
      processed_at: new Date().toISOString(),
    } as unknown as Database['public']['Tables']['payment_events']['Insert'], {
      onConflict: 'provider,provider_event_id',
    });
  } catch (logErr) {
    console.warn('[webhook.event_log_failed]', logErr);
  }

  return {
    success: true,
    message: fulfillment.alreadyProcessed
      ? 'Payment already processed and marked successful'
      : 'Payment verified and processed successfully',
    orderId: fulfillment.orderId,
    paymentId: fulfillment.paymentId,
    alreadyProcessed: fulfillment.alreadyProcessed,
  };
}

