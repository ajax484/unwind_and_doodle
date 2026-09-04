import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { PaymentProvider } from './payment/provider.interface';
import { PaystackPaymentProvider } from './payment/paystack.provider';
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

  // 7. Fulfill successful payment atomically via unified fulfillment service
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
